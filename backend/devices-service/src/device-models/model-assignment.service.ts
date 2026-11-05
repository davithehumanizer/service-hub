import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Device } from '../entity/device.entity';
import { NormalizedModel, normalizeModel } from './normalize-model';
import { DEFAULT_RULES, NormalizationRules } from './normalization-rules';
import { recoverModelName } from './recover-model-name';
import { Placement, placeModel, resellerCandidates } from './place-model';
import { IMAGE_PROPERTIES } from './image-properties';
import { ModelIndexService } from './model-index.service';
import { VariantLabelService } from './variant-label.service';
import { LABEL_PROPERTIES } from './variant-label';

export interface CatalogueEntry {
  device_id: number;
  brand: string;
  model: string;
  product_code: string;
  category: string | null;
}

interface ModelRow {
  key: string;
  brand: string;
  name: string;
  fromManufacturer: boolean;
}

// What a name that lost its family is recovered from.
const RECOVERY_PROPERTIES = ['URL', 'LongDesc', 'LongDescription'];

// Other services' tables that name a variant, and so its model.
const DEPENDENTS: [table: string, deviceId: string][] = [
  ['ownerships', 'o."deviceId"'],
  ['repair_journeys', 'o."deviceId"'],
  // A varchar, which may hold a non-catalogue id: CASE, since PostgreSQL
  // does not promise to test the pattern before the cast.
  [
    'tutorial_subscriptions',
    `CASE WHEN o."deviceId" ~ '^[0-9]{1,9}$' THEN o."deviceId"::int END`,
  ],
];

/**
 * What an entry's model, that model's totals and its variants' labels are
 * computed from: an update that changes none of it has nothing to reassign.
 */
export function placementInputs(device: {
  brand: string;
  model: string;
  product_code: string;
  categories?: { id: number }[];
  informationalProperties?: { property_name: string; property_value: string }[];
  technicalProperties?: { property_name: string; property_value: string }[];
}): string {
  const watched = [...RECOVERY_PROPERTIES, ...IMAGE_PROPERTIES];
  return JSON.stringify([
    device.brand,
    device.model,
    device.product_code,
    (device.categories ?? []).map((c) => c.id).sort((a, b) => a - b),
    (device.informationalProperties ?? [])
      .filter((p) => watched.includes(p.property_name))
      .map((p) => `${p.property_name}=${p.property_value}`)
      .sort(),
    (device.technicalProperties ?? [])
      .filter((p) => LABEL_PROPERTIES.includes(p.property_name))
      .map((p) => `${p.property_name}=${p.property_value}`)
      .sort(),
  ]);
}

/**
 * Links catalogue entries to their device models, creating the models: for
 * one device when it is created or updated, in batches for models:assign.
 * Its SQL goes through the Device repository's manager, beyond that entity.
 */
@Injectable()
export class ModelAssignmentService {
  private readonly logger = new Logger(ModelAssignmentService.name);
  private cachedRules?: Promise<NormalizationRules>;

  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    private readonly modelIndex: ModelIndexService,
    private readonly labels: VariantLabelService,
  ) {}

  /**
   * Assigns one device to its model, moves what names it in other services
   * along, and refreshes the totals and the search documents of the model it
   * leaves and of the one it joins. Never throws: a new device left without
   * a model is taken by the next models:assign, a renamed one keeps its
   * former model until models:assign --all.
   */
  async assignDevice(deviceId: number): Promise<void> {
    try {
      const rules = await this.rules();
      const entries = await this.entries('d.device_id = $1', [deviceId]);
      if (entries.length === 0) return;
      const before = await this.modelOf(deviceId);
      await this.assign(entries, await this.normalize(entries, rules));
      const after = await this.modelOf(deviceId);
      await this.copyModelIds([deviceId]);
      const touched = [before, after].filter((id): id is number => id !== null);
      await this.refreshModels(rules, touched);
      await this.labels.labelModels(touched);
      await this.modelIndex.reindex([...new Set(touched)]);
    } catch (e) {
      this.logger.error(
        `Model assignment failed for device ${deviceId}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Puts a device under the given model, whatever its name makes of it: the
   * variant entered with a model created by hand, where assign() then leaves
   * it. The model it leaves, and what names it elsewhere, follow as in
   * assignDevice.
   */
  async moveDevice(deviceId: number, modelId: number): Promise<void> {
    const rules = await this.rules();
    const before = await this.modelOf(deviceId);
    await this.devices.manager.query(
      `UPDATE devices SET model_id = $2 WHERE device_id = $1`,
      [deviceId, modelId],
    );
    await this.copyModelIds([deviceId]);
    const touched = [...new Set([before ?? modelId, modelId])];
    await this.refreshModels(rules, touched);
    await this.labels.labelModels(touched);
    await this.modelIndex.reindex(touched);
  }

  /**
   * The default rules, with every brand of the catalogue known as itself.
   * Read once per process: a brand first seen later is used as it is spelt.
   */
  rules(): Promise<NormalizationRules> {
    // A failed read is not kept: the next call tries again.
    this.cachedRules ??= this.loadRules().catch((e) => {
      this.cachedRules = undefined;
      throw e;
    });
    return this.cachedRules;
  }

  private async loadRules(): Promise<NormalizationRules> {
    const brands: { brand: string }[] = await this.devices.manager.query(
      `SELECT trim(brand) AS brand FROM devices GROUP BY 1 ORDER BY min(device_id)`,
    );
    const rules = {
      ...DEFAULT_RULES,
      brandAliases: { ...DEFAULT_RULES.brandAliases },
    };
    for (const { brand } of brands) {
      const lower = brand.toLowerCase();
      if (
        lower &&
        !rules.resellerBrands.includes(lower) &&
        !rules.brandAliases[lower]
      ) {
        rules.brandAliases[lower] = brand;
      }
    }
    return rules;
  }

  /** Catalogue entries, with their first category by canonical name. */
  entries(where: string, params: unknown[]): Promise<CatalogueEntry[]> {
    return this.devices.manager.query(
      `SELECT d.device_id, d.brand, d.model, d.product_code,
         (SELECT c.name FROM device_category_device_link l
            JOIN device_categories c ON c.id = l."deviceCategoriesId"
           WHERE l."devicesDeviceId" = d.device_id ORDER BY c.name LIMIT 1) AS category
       FROM devices d WHERE ${where}`,
      params,
    );
  }

  /**
   * Normalises the entries, recovering first the name of those that lost
   * their family from the URL and description Icecat stored for them.
   */
  async normalize(
    entries: CatalogueEntry[],
    rules: NormalizationRules,
  ): Promise<NormalizedModel[]> {
    const normalize = (e: CatalogueEntry, model: string) =>
      normalizeModel(e.brand, model, rules, e.product_code, e.category ?? '');
    const normalized = entries.map((e) => normalize(e, e.model));
    const lost = entries.filter((_, i) => {
      const n = normalized[i];
      return !n.key || (n.brand === 'Dell' && n.groupedByCategory);
    });
    if (lost.length === 0) return normalized;

    const props: {
      device_id: number;
      property_name: string;
      value: string;
    }[] = await this.devices.manager.query(
      `SELECT device_id, property_name, left(property_value, 300) AS value
         FROM device_informational_properties
        WHERE device_id = ANY($1::int[])
          AND property_name = ANY($2::text[])`,
      [lost.map((e) => e.device_id), RECOVERY_PROPERTIES],
    );
    const byDevice = new Map<number, { url: string; description: string }>();
    for (const p of props) {
      const found = byDevice.get(p.device_id) ?? { url: '', description: '' };
      if (p.property_name === 'URL') found.url = p.value;
      else found.description = p.value;
      byDevice.set(p.device_id, found);
    }
    entries.forEach((e, i) => {
      const p = byDevice.get(e.device_id);
      if (!p) return;
      const brand = rules.brandAliases[e.brand.trim().toLowerCase()] ?? e.brand;
      const name = recoverModelName(brand, e.model, p.url, p.description);
      if (name) normalized[i] = normalize(e, name);
    });
    return normalized;
  }

  /**
   * Places the entries, creates or finds their models and links them, in one
   * transaction, and returns those models. Within the batch, an entry sees the
   * models the earlier ones make. An entry under a model made by hand stays
   * there: it was put there because its name places it elsewhere.
   */
  async assign(
    entries: CatalogueEntry[],
    normalized: NormalizedModel[],
    tally: (p: Placement) => void = () => undefined,
  ): Promise<number[]> {
    return this.devices.manager.transaction(async (manager) => {
      const kept: { device_id: number; model_id: number }[] =
        await manager.query(
          `SELECT d.device_id, d.model_id FROM devices d
             JOIN device_models m ON m.id = d.model_id AND m.is_manual
            WHERE d.device_id = ANY($1::int[])`,
          [entries.map((e) => e.device_id)],
        );
      const keptIds = new Set(kept.map((k) => k.device_id));
      const known = await this.knownModels(
        manager,
        normalized.flatMap((n) =>
          n.fromReseller ? resellerCandidates(n) : [],
        ),
      );
      const models = new Map<string, ModelRow>();
      const links: { deviceId: number; key: string; refurbished: boolean }[] =
        [];

      entries.forEach((e, i) => {
        if (keptIds.has(e.device_id)) return;
        const n = normalized[i];
        const placed = placeModel(n, e.brand, {
          fromManufacturer: (key) => known.get(key) === true,
          exists: (key) => known.has(key),
        });
        tally(placed.placement);
        // An isolated entry is a model of its own, under a key no name makes.
        const key =
          placed.key ?? `${placed.brand.toLowerCase()}|#${e.device_id}`;
        const fromManufacturer = !n.fromReseller;
        const name =
          n.name || e.product_code || e.model.trim() || `#${e.device_id}`;
        const row = models.get(key);
        if (row) row.fromManufacturer ||= fromManufacturer;
        else
          models.set(key, {
            key,
            brand: placed.brand,
            name,
            fromManufacturer,
          });
        known.set(key, known.get(key) === true || fromManufacturer);
        links.push({
          deviceId: e.device_id,
          key,
          refurbished: n.isRefurbished,
        });
      });

      const ids = await this.upsertModels(manager, [...models.values()]);
      await manager.query(
        `UPDATE devices d SET model_id = v.model_id, is_refurbished = v.refurbished
           FROM unnest($1::int[], $2::int[], $3::bool[]) AS v(device_id, model_id, refurbished)
          WHERE d.device_id = v.device_id`,
        [
          links.map((l) => l.deviceId),
          links.map((l) => ids.get(l.key)),
          links.map((l) => l.refurbished),
        ],
      );
      return [...new Set([...ids.values(), ...kept.map((k) => k.model_id)])];
    });
  }

  /**
   * Variant counts, whether a manufacturer lists the model, the variant it is
   * shown with (a manufacturer's before a reseller's, one with a picture
   * first), and its categories, from those of its variants: for the given
   * models, or for all. Only rows that are wrong are written, so a rerun
   * locks and rewrites nothing.
   */
  async refreshModels(
    rules: NormalizationRules,
    modelIds?: number[],
  ): Promise<void> {
    const ids = modelIds ?? null;
    await this.devices.manager.transaction(async (manager) => {
      await manager.query(
        `UPDATE device_models m SET variant_count = c.n
           FROM (SELECT m2.id, count(d.device_id)::int AS n
                   FROM device_models m2 LEFT JOIN devices d ON d.model_id = m2.id
                  WHERE $1::int[] IS NULL OR m2.id = ANY($1)
                  GROUP BY m2.id) c
          WHERE c.id = m.id AND m.variant_count <> c.n`,
        [ids],
      );
      // A model its last variant left goes, unless it was created by hand,
      // has photos of its own (their files are the gateway's to remove), or
      // another service names it.
      await manager.query(
        `DELETE FROM device_models m
          WHERE ($1::int[] IS NULL OR m.id = ANY($1)) AND m.variant_count = 0
            AND NOT m.is_manual
            AND NOT EXISTS (SELECT 1 FROM device_model_photos p WHERE p.model_id = m.id)
            AND NOT EXISTS (SELECT 1 FROM devices d WHERE d.model_id = m.id)
            AND NOT EXISTS (SELECT 1 FROM ownerships o WHERE o."modelId" = m.id)
            AND NOT EXISTS (SELECT 1 FROM repair_journeys j WHERE j."modelId" = m.id)
            AND NOT EXISTS (SELECT 1 FROM tutorial_subscriptions s WHERE s."modelId" = m.id)`,
        [ids],
      );
      await manager.query(
        `UPDATE device_models m SET has_manufacturer_variant = NOT m.has_manufacturer_variant
          WHERE ($2::int[] IS NULL OR m.id = ANY($2))
            AND m.has_manufacturer_variant <> EXISTS (
              SELECT 1 FROM devices d
               WHERE d.model_id = m.id AND lower(trim(d.brand)) <> ALL($1::text[]))`,
        [rules.resellerBrands, ids],
      );
      await manager.query(
        `UPDATE device_models m SET representative_device_id = r.device_id
           FROM (SELECT DISTINCT ON (d.model_id) d.model_id, d.device_id
                   FROM devices d
                  WHERE d.model_id IS NOT NULL
                    AND ($3::int[] IS NULL OR d.model_id = ANY($3))
                  ORDER BY d.model_id,
                    lower(trim(d.brand)) = ANY($1::text[]),
                    NOT (EXISTS (SELECT 1 FROM device_informational_properties p
                                  WHERE p.device_id = d.device_id
                                    AND p.property_name = ANY($2::text[]))
                         OR EXISTS (SELECT 1 FROM device_photos ph
                                     WHERE ph.device_id = d.device_id)),
                    d.device_id) r
          WHERE m.id = r.model_id
            AND m.representative_device_id IS DISTINCT FROM r.device_id`,
        [rules.resellerBrands, IMAGE_PROPERTIES, ids],
      );
      // A model kept without variant has no variant to show, nor colours.
      await manager.query(
        `UPDATE device_models SET representative_device_id = NULL, colours = '{}'
          WHERE variant_count = 0
            AND (representative_device_id IS NOT NULL OR colours <> '{}')
            AND ($1::int[] IS NULL OR id = ANY($1))`,
        [ids],
      );
      // The categories no variant has any more. A model created by hand, or
      // kept without variant, keeps the ones it had.
      await manager.query(
        `DELETE FROM device_model_categories mc
          USING device_models m
          WHERE mc.model_id = m.id AND m.variant_count > 0 AND NOT m.is_manual
            AND ($1::int[] IS NULL OR m.id = ANY($1))
            AND NOT EXISTS (
              SELECT 1 FROM devices d
                JOIN device_category_device_link l ON l."devicesDeviceId" = d.device_id
               WHERE d.model_id = m.id AND l."deviceCategoriesId" = mc.category_id)`,
        [ids],
      );
      await manager.query(
        `INSERT INTO device_model_categories (model_id, category_id)
         SELECT DISTINCT d.model_id, l."deviceCategoriesId"
           FROM devices d JOIN device_category_device_link l ON l."devicesDeviceId" = d.device_id
          WHERE d.model_id IS NOT NULL AND ($1::int[] IS NULL OR d.model_id = ANY($1))
         ON CONFLICT DO NOTHING`,
        [ids],
      );
    });
  }

  /**
   * Ownerships, journeys and subscriptions name the model of the variant they
   * point to, also once it moved to another: for the given variants, or for
   * all. A variant without a model leaves them as they are.
   */
  async copyModelIds(deviceIds?: number[]): Promise<Record<string, number>> {
    const copied: Record<string, number> = {};
    for (const [table, deviceId] of DEPENDENTS) {
      const [, count]: [unknown, number] = await this.devices.manager.query(
        `UPDATE ${table} o SET "modelId" = d.model_id
           FROM devices d
          WHERE d.device_id = ${deviceId} AND d.model_id IS NOT NULL
            AND ($1::int[] IS NULL OR d.device_id = ANY($1))
            AND o."modelId" IS DISTINCT FROM d.model_id`,
        [deviceIds ?? null],
      );
      copied[table] = count;
    }
    return copied;
  }

  private async modelOf(deviceId: number): Promise<number | null> {
    const rows: { model_id: number | null }[] =
      await this.devices.manager.query(
        `SELECT model_id FROM devices WHERE device_id = $1`,
        [deviceId],
      );
    return rows[0]?.model_id ?? null;
  }

  /** Key → whether a manufacturer lists the model, for the keys that exist. */
  private async knownModels(manager: EntityManager, keys: string[]) {
    const known = new Map<string, boolean>();
    if (keys.length === 0) return known;
    const rows: { key: string; has_manufacturer_variant: boolean }[] =
      await manager.query(
        `SELECT key, has_manufacturer_variant FROM device_models WHERE key = ANY($1::text[])`,
        [[...new Set(keys)]],
      );
    rows.forEach((r) => known.set(r.key, r.has_manufacturer_variant));
    return known;
  }

  private async upsertModels(manager: EntityManager, rows: ModelRow[]) {
    const returned: { id: number; key: string }[] = await manager.query(
      `INSERT INTO device_models (brand, name, key, has_manufacturer_variant)
       SELECT * FROM unnest($1::varchar[], $2::varchar[], $3::varchar[], $4::bool[])
       ON CONFLICT (key) DO UPDATE
         SET has_manufacturer_variant =
               device_models.has_manufacturer_variant OR EXCLUDED.has_manufacturer_variant,
             updated_at = now()
       RETURNING id, key`,
      [
        rows.map((r) => r.brand),
        rows.map((r) => r.name),
        rows.map((r) => r.key),
        rows.map((r) => r.fromManufacturer),
      ],
    );
    return new Map(returned.map((r) => [r.key, r.id]));
  }
}
