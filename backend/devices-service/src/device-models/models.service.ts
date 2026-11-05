import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entity/device.entity';
import { DeviceModelPhoto } from '../entity/device-model-photo.entity';
import { IDevicesService } from '../devices/interfaces/devices-service.interface';
import {
  ModelSearchOptions,
  ModelSearchResult,
  ModelSearchService,
  ModelSort,
} from '../search/model-search.service';
import { gtinVariants } from '../search/gtin';
import { localizeCategories } from '../devices/localize-categories';
import { DEFAULT_RULES } from './normalization-rules';
import { IMAGE_PROPERTIES, thumbnailSql } from './image-properties';
import { ModelAssignmentService } from './model-assignment.service';
import { ModelIndexService } from './model-index.service';
import { normalizeModel, toKey } from './normalize-model';
import { PART_KEYS } from './variant-label';
import { VariantLabelService } from './variant-label.service';
import { IMPORT_SOURCES, isOutsideSource } from './sources';
import {
  Author,
  Editor,
  mayEdit,
  NO_AUTHOR,
  NO_EDITOR,
} from '../types/author';

export interface ModelSummary {
  id: number;
  brand: string;
  name: string;
  variant_count: number;
  has_manufacturer_variant: boolean;
  representative_device_id: number | null;
  thumbnail: string;
  /**
   * `ifixit_wikiid`: the iFixit wiki the category maps to, for the tutorials;
   * `unukey`: its e-waste family, for the wizard's symptoms.
   */
  categories: {
    id: number;
    name: string;
    canonicalName?: string;
    ifixit_wikiid: string | null;
    unukey: string | null;
  }[];
  /** Its variants' colours, as Icecat names them. */
  colours: string[];
  /** Entered by a contributor: demonstration data. */
  is_demo: boolean;
}

export interface ModelVariant {
  device_id: number;
  /** Who sells it: the maker, or a reseller. */
  brand: string;
  /** The entry's own name, as its source spells it. */
  model: string;
  ean: string;
  product_code: string;
  variant_label: string | null;
  /** The label's parts by key, { storage: "256 GB", colour: "Black" }. */
  variant_parts: Record<string, string> | null;
  is_refurbished: boolean;
  is_demo: boolean;
  /** On a model's page: whether the viewer may change it. */
  editable?: boolean;
}

/** A variant entered by hand, or what changes in one. */
export interface NewVariant {
  ean?: string;
  product_code?: string;
  /** The outside source creating it through the API; MANUAL otherwise. */
  source?: string;
  /** Replace all of them when sent. */
  technicalProperties?: { property_name: string; property_value: string }[];
}

/** What changes in a model. */
export interface ModelChanges {
  brand?: string;
  name?: string;
  /** Category ids; replace the model's own. */
  categories?: number[];
}

/** A picture of the model itself, as its page shows it. */
export interface ModelPhoto {
  id: string;
  url: string;
  is_demo: boolean;
  /** Whether the viewer may delete it: theirs, or an administrator. */
  deletable: boolean;
}

/** One part the variants of a model differ by, and its values. */
export interface VariantFacet {
  key: string;
  /** Each value, with the variants that have it among those the other
   *  parts chosen leave; 0 for a value they rule out. */
  values: { value: string; count: number }[];
}

/** A model entered by hand. */
export interface NewModel {
  brand: string;
  name: string;
  /** Category ids. */
  categories?: number[];
  /** With either, the model gets its first variant. */
  ean?: string;
  product_code?: string;
  /** The outside source creating it through the API; by hand otherwise. */
  source?: string;
}

export interface Page<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const VARIANT_COLUMNS = `d.device_id, d.brand, d.model, d.ean, d.product_code,
  d.variant_label, d.variant_parts, d.is_refurbished, d.is_demo`;

/** Properties as stored: trimmed, the last of a name kept, none empty. */
const cleanProperties = (
  list: NewVariant['technicalProperties'] = [],
): { property_name: string; property_value: string }[] =>
  [
    ...new Map(
      list.map((p) => [p.property_name.trim(), p.property_value.trim()]),
    ),
  ]
    .filter(([name, value]) => name && value)
    .map(([property_name, property_value]) => ({
      property_name,
      property_value,
    }));

// "128 GB" before "1 TB", 13.3" before 15.6": a size where a value has one,
// else the words, numbers read as numbers.
const SIZES: Record<string, number> = { MB: 1 / 1024, GB: 1, TB: 1024 };
const size = (value: string): number | null => {
  const m = /^(\d+(?:\.\d+)?)\s*(MB|GB|TB|")/.exec(value);
  if (!m) return null;
  return Number(m[1]) * (m[2] === '"' ? 1 : SIZES[m[2]]);
};
const byValue = (a: string, b: string) => {
  const [x, y] = [size(a), size(b)];
  return x !== null && y !== null && x !== y
    ? x - y
    : a.localeCompare(b, 'en', { numeric: true });
};

// The SQL order matching the search's sorts, when Elasticsearch is away.
const SQL_SORTS: Record<ModelSort, string> = {
  relevance: 'm.has_manufacturer_variant DESC, m.variant_count DESC, m.id',
  brandAZ: 'lower(m.brand), lower(m.name), m.id',
  brandZA: 'lower(m.brand) DESC, lower(m.name) DESC, m.id',
  modelAZ: 'lower(m.name), lower(m.brand), m.id',
  modelZA: 'lower(m.name) DESC, lower(m.brand) DESC, m.id',
};

/**
 * Device models as the API serves them: searched, shown with their
 * variants, found by a barcode or a reference. The search goes through
 * Elasticsearch, and through the database when it is unreachable, as the
 * local stack always is; either way the models themselves are read from the
 * database, so a page never shows a count the index has not caught up with.
 */
@Injectable()
export class ModelsService {
  private readonly logger = new Logger(ModelsService.name);

  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    private readonly search: ModelSearchService,
    private readonly assignment: ModelAssignmentService,
    private readonly modelIndex: ModelIndexService,
    @Inject('IDevicesService') private readonly catalogue: IDevicesService,
    private readonly labels: VariantLabelService,
  ) {}

  async searchModels(
    options: Partial<ModelSearchOptions> & { locale?: string },
  ): Promise<
    Page<ModelSummary> & {
      categoryFacets: Record<string, number>;
      /** The variant a barcode or a reference typed as the search names. */
      variant?: ModelVariant;
    }
  > {
    const o: ModelSearchOptions = {
      page: Math.max(1, options.page ?? 1),
      limit: Math.min(100, Math.max(1, options.limit ?? 10)),
      search: options.search,
      strict: options.strict ?? false,
      categories: options.categories ?? [],
      sortBy: options.sortBy ?? 'relevance',
    };
    // A text search finds a model, an identifier a variant, and the index
    // holds no identifier: a barcode is looked up first, a reference only
    // when no name matches, since "p520" is a Lenovo before it is the
    // reference of a Samsung.
    const word = o.search?.trim() ?? '';
    const identifier = /\d/.test(word) && !/\s/.test(word);
    const barcode = /^\d{8,14}$/.test(word);
    if (barcode) {
      const identified = await this.identified(word, o.limit, options.locale);
      if (identified) return identified;
    }
    let found: ModelSearchResult;
    try {
      found = await this.search.searchModels(o);
    } catch (e) {
      this.logger.warn(
        `Model search falls back to the database: ${(e as Error).message}`,
      );
      found = await this.searchInDatabase(o);
    }
    if (found.total === 0 && identifier && !barcode) {
      const identified = await this.identified(word, o.limit, options.locale);
      if (identified) return identified;
    }
    return {
      data: await this.summaries(found.ids, options.locale),
      pagination: {
        page: o.page,
        limit: o.limit,
        total: found.total,
        totalPages: Math.ceil(found.total / o.limit),
      },
      categoryFacets: found.categoryFacets,
    };
  }

  /** The model a barcode or a reference names, as a page of one. */
  private async identified(code: string, limit: number, locale?: string) {
    try {
      const { model, variant } = await this.lookup(code, locale);
      return {
        data: [model],
        pagination: { page: 1, limit, total: 1, totalPages: 1 },
        categoryFacets: Object.fromEntries(
          model.categories.map((c) => [c.canonicalName ?? c.name, 1]),
        ),
        variant,
      };
    } catch (e) {
      if (!(e instanceof NotFoundException)) throw e;
      return null;
    }
  }

  /** Several models at once, in the order asked, those that exist. */
  getModels(ids: number[], locale?: string): Promise<ModelSummary[]> {
    return this.summaries([...new Set(ids)], locale);
  }

  /** Several variants at once, those that exist, for what names them. */
  async getVariants(ids: number[]): Promise<ModelVariant[]> {
    if (ids.length === 0) return [];
    return this.devices.manager.query(
      `SELECT ${VARIANT_COLUMNS} FROM devices d WHERE d.device_id = ANY($1::int[])`,
      [[...new Set(ids)]],
    );
  }

  /** A model and a page of its variants, the one it is shown with first. */
  async getModel(
    id: number,
    options: {
      page?: number;
      limit?: number;
      locale?: string;
      /** Words each variant must have in its label, reference, seller or barcode. */
      search?: string;
      /** The parts each variant must have, { storage: "256 GB" }. */
      parts?: Record<string, string>;
      /** The one variant to read, for its parts. */
      variant?: number;
      /** Who reads: what they may change is said. */
      viewer?: Editor;
    } = {},
  ): Promise<
    ModelSummary & {
      variants: Page<ModelVariant>;
      facets: VariantFacet[];
      configurations: number;
      editable: boolean;
      photos: ModelPhoto[];
    }
  > {
    const [model] = await this.summaries([id], options.locale);
    if (!model) throw new NotFoundException(`Device model ${id} not found`);
    const viewer = options.viewer ?? NO_EDITOR;
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    // A long list is searched by what tells its variants apart: "16 GB
    // Black" finds "i5-8350U · 16 GB RAM · 512 GB · Black".
    const params: unknown[] = [id];
    const p = (v: unknown) => `$${params.push(v)}`;
    const like = (v: string) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;
    const filter = (options.search ?? '')
      .split(/\s+/)
      .filter((word) => /[\p{L}\p{N}]/u.test(word))
      .map((word) => {
        const w = p(like(word));
        return `AND (d.variant_label ILIKE ${w} OR d.product_code ILIKE ${w}
                     OR d.brand ILIKE ${w} OR d.ean = ${p(word)})`;
      })
      .concat(
        Object.entries(options.parts ?? {}).map(
          ([key, value]) => `AND d.variant_parts->>${p(key)} = ${p(value)}`,
        ),
        options.variant ? [`AND d.device_id = ${p(options.variant)}`] : [],
      )
      .join(' ');
    const total: number = filter
      ? (
          await this.devices.manager.query(
            `SELECT count(*)::int AS n FROM devices d WHERE d.model_id = $1 ${filter}`,
            // A copy: the page's own parameters are added to params below.
            [...params],
          )
        )[0].n
      : model.variant_count;
    const data: ModelVariant[] = await this.devices.manager.query(
      `SELECT ${VARIANT_COLUMNS},
              CASE WHEN d.source = 'MANUAL'
                   THEN ${p(viewer.admin)}::boolean
                        OR coalesce(d.created_by = ${p(viewer.created_by)}::int, false)
                   -- An outside source's: an administrator's to change.
                   ELSE ${p(viewer.admin)}::boolean
                        AND d.source <> ALL(${p(IMPORT_SOURCES)}::text[])
              END AS editable
         FROM devices d
        WHERE d.model_id = $1 ${filter}
        ORDER BY d.device_id = ${p(model.representative_device_id ?? 0)} DESC,
                 lower(trim(d.brand)) = ANY(${p(DEFAULT_RULES.resellerBrands)}::text[]),
                 d.device_id
        LIMIT ${p(limit)} OFFSET ${p((page - 1) * limit)}`,
      params,
    );
    const [owner]: {
      created_by: number | null;
      is_manual: boolean;
      source: string | null;
    }[] = await this.devices.manager.query(
      `SELECT created_by, is_manual, source FROM device_models WHERE id = $1`,
      [id],
    );
    const photos: ModelPhoto[] = await this.devices.manager.query(
      `SELECT id, url, is_demo,
              $2::boolean OR coalesce(created_by = $3::int, false) AS deletable
         FROM device_model_photos WHERE model_id = $1 ORDER BY created_at`,
      [id, viewer.admin, viewer.created_by],
    );
    return {
      ...model,
      // The catalogue's own models follow its imports, not this form; an
      // outside source's are an administrator's to change.
      editable:
        !!owner?.is_manual &&
        (owner.source ? viewer.admin : mayEdit(viewer, owner.created_by)),
      photos,
      variants: {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      ...(model.variant_count < 2
        ? { facets: [], configurations: model.variant_count }
        : await this.facets(id, options.parts ?? {})),
    };
  }

  /**
   * The parts a model's variants differ by, in the label's order, each value
   * counted among the variants the other chosen parts leave: choosing a
   * storage does not hide the other storages, it says which are left in the
   * colour chosen.
   */
  private async facets(
    modelId: number,
    chosen: Record<string, string>,
  ): Promise<{ facets: VariantFacet[]; configurations: number }> {
    const params: unknown[] = [modelId];
    const p = (v: unknown) => `$${params.push(v)}`;
    const others = Object.entries(chosen)
      .map(
        ([key, value]) =>
          `AND (f.key = ${p(key)} OR d.variant_parts->>${p(key)} = ${p(value)})`,
      )
      .join(' ');
    // With how many variants the parts tell apart: "8 configurations" of 61.
    const rows: {
      key: string;
      value: string;
      n: number;
      configurations: number;
    }[] = await this.devices.manager.query(
      `SELECT f.key, f.value,
              count(*) FILTER (WHERE TRUE ${others})::int AS n,
              (SELECT count(DISTINCT variant_parts) FROM devices
                WHERE model_id = $1)::int AS configurations
         FROM devices d CROSS JOIN LATERAL jsonb_each_text(d.variant_parts) f
        WHERE d.model_id = $1
        GROUP BY 1, 2`,
      params,
    );
    const byKey = new Map<string, { value: string; count: number }[]>();
    for (const { key, value, n } of rows) {
      const values = byKey.get(key) ?? [];
      values.push({ value, count: n });
      byKey.set(key, values);
    }
    return {
      facets: PART_KEYS.filter((key) => (byKey.get(key)?.length ?? 0) > 1).map(
        (key) => ({
          key,
          values: byKey.get(key)!.sort((a, b) => byValue(a.value, b.value)),
        }),
      ),
      configurations: rows[0]?.configurations ?? 0,
    };
  }

  /**
   * The variant a barcode or a manufacturer's reference names, and its model.
   * A barcode also matches its other GTIN forms (EAN-13 of a GTIN-14 carton
   * code); a reference matches exactly, then in capitals.
   */
  async lookup(
    code: string,
    locale?: string,
  ): Promise<{ model: ModelSummary; variant: ModelVariant }> {
    const clean = code.replace(/\s+/g, '');
    const eans = gtinVariants(clean);
    let rows: (ModelVariant & { model_id: number | null })[] = [];
    if (/^\d{8,14}$/.test(clean)) {
      rows = await this.devices.manager.query(
        `SELECT ${VARIANT_COLUMNS}, d.model_id FROM devices d
          WHERE d.ean = ANY($1::text[]) ORDER BY d.device_id LIMIT 1`,
        [eans],
      );
    }
    for (const reference of new Set([clean, clean.toUpperCase()])) {
      if (rows.length > 0 || !reference) break;
      rows = await this.devices.manager.query(
        `SELECT ${VARIANT_COLUMNS}, d.model_id FROM devices d
          WHERE d.product_code = $1 LIMIT 1`,
        [reference],
      );
    }
    const [row] = rows;
    if (!row) throw new NotFoundException(`No device model for ${code}`);
    const { model_id, ...variant } = row;
    // An entry whose assignment failed gets its model now.
    let modelId = model_id;
    if (modelId === null) {
      await this.assignment.assignDevice(variant.device_id);
      const [after]: { model_id: number | null }[] =
        await this.devices.manager.query(
          `SELECT model_id FROM devices WHERE device_id = $1`,
          [variant.device_id],
        );
      modelId = after?.model_id ?? null;
    }
    const [model] = modelId ? await this.summaries([modelId], locale) : [];
    if (!model) throw new NotFoundException(`No device model for ${code}`);
    return { model, variant };
  }

  /**
   * Creates a model by hand, with a first variant when a barcode or a
   * reference comes with it. What exists is answered rather than
   * duplicated: a known barcode or reference names its model, and a name
   * the catalogue already has names that model, which then gets the new
   * variant. `created` says which.
   */
  async createModel(
    input: NewModel,
    locale?: string,
    author: Author = NO_AUTHOR,
  ): Promise<{
    created: boolean;
    model: ModelSummary;
    variant: ModelVariant | null;
  }> {
    const brand = input.brand?.trim() ?? '';
    const ean = input.ean?.replace(/\s+/g, '') ?? '';
    const reference = input.product_code?.trim() ?? '';
    // GS1 keeps prefixes 200-299 for in-store use: a demonstration barcode
    // is not a product's. The few the catalogue has are refused below.
    if (author.is_demo && ean && !ean.startsWith('2')) {
      throw new BadRequestException('A demonstration barcode starts with 2');
    }
    for (const code of [ean, reference].filter(Boolean)) {
      try {
        const known = await this.lookup(code, locale);
        // A contributor's code is invented: one the catalogue knows would
        // add nothing, silently.
        if (author.is_demo) {
          throw new ConflictException(`${code} is already in the catalogue`);
        }
        return { created: false, ...known };
      } catch (e) {
        if (!(e instanceof NotFoundException)) throw e;
      }
    }

    // The catalogue's key when the name is complete enough to have one, its
    // plain spelling otherwise: whoever types it means that model. A short
    // name is keyed within its first category, as the catalogue keys it.
    const [category]: { name: string }[] = await this.devices.manager.query(
      `SELECT name FROM device_categories WHERE id = ANY($1::int[])
        ORDER BY name LIMIT 1`,
      [input.categories ?? []],
    );
    const n = normalizeModel(
      brand,
      input.name?.trim() ?? '',
      await this.assignment.rules(),
      reference,
      category?.name ?? '',
    );
    const name = n.name || input.name?.trim() || '';
    if (!brand || !toKey(name)) {
      throw new BadRequestException('A device model needs a brand and a name');
    }
    const key = n.key ?? `${n.brand.toLowerCase()}|${toKey(name)}`;
    // One statement: a model deleted between an insert and a read would be
    // looked for in vain.
    const [{ id: modelId, inserted }]: { id: number; inserted: boolean }[] =
      await this.devices.manager.query(
        `INSERT INTO device_models (brand, name, key, is_manual, created_by, is_demo, source)
         VALUES ($1, $2, $3, true, $4, $5, $6)
         ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key
         RETURNING id, (xmax = 0) AS inserted`,
        [n.brand, name, key, author.created_by, author.is_demo, input.source ?? null],
      );
    if (inserted) {
      await this.devices.manager.query(
        `INSERT INTO device_model_categories (model_id, category_id)
         SELECT $1, c.id FROM device_categories c WHERE c.id = ANY($2::int[])
         ON CONFLICT DO NOTHING`,
        [modelId, input.categories ?? []],
      );
    }

    // A contributor's variant of a model already there takes its categories,
    // as one added from its page does: demonstration data never brings one
    // to a real model, where the purge could not tell it from the model's own.
    const categories =
      inserted || !author.is_demo
        ? (input.categories ?? [])
        : (
            await this.devices.manager.query(
              `SELECT category_id FROM device_model_categories WHERE model_id = $1`,
              [modelId],
            )
          ).map((r: { category_id: number }) => r.category_id);

    let variant: ModelVariant | null = null;
    if (ean || reference) {
      try {
        const device = await this.catalogue.createDevice({
          ean,
          product_code: reference,
          manufacturer: n.brand,
          brand: n.brand,
          model: name,
          device_type: '',
          categories,
          source: input.source ?? 'MANUAL',
          ...author,
        } as never);
        // An incomplete name places it on a model of its own: it belongs here.
        if (device.model_id !== modelId) {
          await this.assignment.moveDevice(device.device_id, modelId);
        }
        [variant] = await this.devices.manager.query(
          `SELECT ${VARIANT_COLUMNS} FROM devices d WHERE d.device_id = $1`,
          [device.device_id],
        );
      } catch (e) {
        // Nothing left half made: the model created for it goes too.
        if (inserted) {
          await this.devices.manager.query(
            `DELETE FROM device_models m WHERE m.id = $1
               AND NOT EXISTS (SELECT 1 FROM devices d WHERE d.model_id = m.id)`,
            [modelId],
          );
        }
        // The same barcode sent twice at once: the other request made it.
        for (const code of [ean, reference].filter(Boolean)) {
          try {
            return { created: false, ...(await this.lookup(code, locale)) };
          } catch (notFound) {
            if (!(notFound instanceof NotFoundException)) throw notFound;
          }
        }
        throw e;
      }
    } else if (inserted) {
      await this.modelIndex.reindex([modelId]);
    }
    const [model] = await this.summaries([modelId], locale);
    return { created: Boolean(inserted), model, variant };
  }

  /** Pictures of the model itself, uploaded by the gateway. */
  /**
   * A variant entered by hand under a model, with its technical properties:
   * the label (« 256 GB · Black ») is computed from them as for an import.
   * It needs a barcode or a reference, and neither may be the catalogue's
   * already.
   */
  async addVariant(
    modelId: number,
    input: NewVariant,
    author: Author = NO_AUTHOR,
  ): Promise<ModelVariant> {
    const [model] = await this.summaries([modelId]);
    if (!model) throw new NotFoundException(`Device model ${modelId} not found`);
    const ean = input.ean?.replace(/\s+/g, '') ?? '';
    const reference = input.product_code?.trim() ?? '';
    await this.checkVariantCodes(ean, reference, author);
    const device = await this.catalogue.createDevice({
      ean,
      product_code: reference,
      manufacturer: model.brand,
      brand: model.brand,
      model: model.name,
      device_type: '',
      categories: model.categories.map((c) => c.id),
      source: input.source ?? 'MANUAL',
      technicalProperties: cleanProperties(input.technicalProperties),
      ...author,
    } as never);
    // Its name may place it on a model of its own: it belongs here.
    if (device.model_id !== modelId) {
      await this.assignment.moveDevice(device.device_id, modelId);
    }
    const [variant] = await this.getVariants([device.device_id]);
    return variant;
  }

  /**
   * Brand, name or categories of a model, by its author or an
   * administrator. A name the catalogue has for another model is refused:
   * that model is the one meant.
   */
  async updateModel(
    modelId: number,
    changes: ModelChanges,
    editor: Editor,
  ): Promise<ModelSummary> {
    const [row]: {
      brand: string;
      name: string;
      key: string;
      created_by: number | null;
      is_manual: boolean;
      source: string | null;
    }[] = await this.devices.manager.query(
      `SELECT brand, name, key, created_by, is_manual, source
         FROM device_models WHERE id = $1`,
      [modelId],
    );
    if (!row) throw new NotFoundException(`Device model ${modelId} not found`);
    // Renamed, an imported model would be split by its variants' names,
    // which still give the old key.
    if (!row.is_manual) {
      throw new ForbiddenException('Only a model created by hand can be changed');
    }
    if (row.source && !editor.admin) {
      throw new ForbiddenException(
        'Only an administrator may change a model from an outside source',
      );
    }
    if (!mayEdit(editor, row.created_by)) {
      throw new ForbiddenException(
        'Only its author or an administrator may change this model',
      );
    }
    const brand = changes.brand?.trim() ?? row.brand;
    const named = changes.name?.trim() ?? row.name;
    if (brand !== row.brand || named !== row.name) {
      // Keyed as createModel keys it, within the first category.
      const [category]: { name: string }[] = await this.devices.manager.query(
        changes.categories
          ? `SELECT name FROM device_categories WHERE id = ANY($1::int[])
              ORDER BY name LIMIT 1`
          : `SELECT c.name FROM device_model_categories mc
               JOIN device_categories c ON c.id = mc.category_id
              WHERE mc.model_id = $1 ORDER BY c.name LIMIT 1`,
        [changes.categories ?? modelId],
      );
      const n = normalizeModel(
        brand,
        named,
        await this.assignment.rules(),
        '',
        category?.name ?? '',
      );
      const name = n.name || named;
      if (!brand || !toKey(name)) {
        throw new BadRequestException('A device model needs a brand and a name');
      }
      const key = n.key ?? `${n.brand.toLowerCase()}|${toKey(name)}`;
      const [other]: { id: number }[] = await this.devices.manager.query(
        `SELECT id FROM device_models WHERE key = $1 AND id <> $2`,
        [key, modelId],
      );
      if (other) {
        throw new ConflictException(`Model ${other.id} already has this name`);
      }
      await this.devices.manager.query(
        `UPDATE device_models SET brand = $2, name = $3, key = $4,
                updated_at = now()
          WHERE id = $1`,
        [modelId, n.brand, name, key],
      );
    }
    if (changes.categories) {
      await this.devices.manager.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM device_model_categories WHERE model_id = $1`,
          [modelId],
        );
        await manager.query(
          `INSERT INTO device_model_categories (model_id, category_id)
           SELECT $1, c.id FROM device_categories c WHERE c.id = ANY($2::int[])`,
          [modelId, changes.categories],
        );
        // The variants entered by hand, or by an outside source, follow, or
        // the next assignment would give the model their old categories back.
        await manager.query(
          `DELETE FROM device_category_device_link l USING devices d
            WHERE l."devicesDeviceId" = d.device_id
              AND d.model_id = $1 AND d.source <> ALL($2::text[])`,
          [modelId, IMPORT_SOURCES],
        );
        await manager.query(
          `INSERT INTO device_category_device_link ("devicesDeviceId", "deviceCategoriesId")
           SELECT d.device_id, c.id FROM devices d, device_categories c
            WHERE d.model_id = $1 AND d.source <> ALL($3::text[])
              AND c.id = ANY($2::int[])`,
          [modelId, changes.categories, IMPORT_SOURCES],
        );
      });
      // What Internal memory holds depends on them.
      await this.labels.labelModels([modelId]);
    }
    await this.modelIndex.reindex([modelId]);
    const [model] = await this.summaries([modelId]);
    return model;
  }

  /**
   * A variant's codes or technical properties, by its author or an
   * administrator; its label follows the properties.
   */
  async updateVariant(
    modelId: number,
    variantId: number,
    changes: NewVariant,
    editor: Editor,
  ): Promise<ModelVariant> {
    const [row]: {
      model_id: number | null;
      ean: string | null;
      product_code: string | null;
      created_by: number | null;
      source: string;
    }[] = await this.devices.manager.query(
      `SELECT model_id, ean, product_code, created_by, source
         FROM devices WHERE device_id = $1`,
      [variantId],
    );
    if (!row || row.model_id !== modelId) {
      throw new NotFoundException(`Variant ${variantId} not found`);
    }
    // An import's entry is rewritten by the next import.
    const outside = isOutsideSource(row.source);
    if (row.source !== 'MANUAL' && !outside) {
      throw new ForbiddenException(
        'Only a variant entered by hand can be changed',
      );
    }
    if (outside && !editor.admin) {
      throw new ForbiddenException(
        'Only an administrator may change a variant from an outside source',
      );
    }
    if (!mayEdit(editor, row.created_by)) {
      throw new ForbiddenException(
        'Only its author or an administrator may change this variant',
      );
    }
    const ean =
      changes.ean !== undefined
        ? changes.ean.replace(/\s+/g, '')
        : (row.ean ?? '');
    const reference =
      changes.product_code !== undefined
        ? changes.product_code.trim()
        : (row.product_code ?? '');
    if (ean !== (row.ean ?? '') || reference !== (row.product_code ?? '')) {
      await this.checkVariantCodes(ean, reference, editor, variantId);
    }
    await this.catalogue.updateDevice(variantId, {
      ean,
      product_code: reference,
      ...(changes.technicalProperties
        ? { technicalProperties: cleanProperties(changes.technicalProperties) }
        : {}),
    } as never);
    await this.labels.labelModels([modelId]);
    const [variant] = await this.getVariants([variantId]);
    return variant;
  }

  /**
   * A variant's barcode or reference: one of them at least, neither the
   * catalogue's already (but for the variant itself), and a contributor's
   * barcode starting with 2.
   */
  private async checkVariantCodes(
    ean: string,
    reference: string,
    author: Author,
    self?: number,
  ): Promise<void> {
    if (!ean && !reference) {
      throw new BadRequestException(
        'A variant needs a barcode or a reference',
      );
    }
    if (author.is_demo && ean && !ean.startsWith('2')) {
      throw new BadRequestException('A demonstration barcode starts with 2');
    }
    for (const code of [ean, reference].filter(Boolean)) {
      try {
        const known = await this.lookup(code);
        if (known.variant.device_id !== self) {
          throw new ConflictException(
            `${code} is already in the catalogue, model ${known.model.id}`,
          );
        }
      } catch (e) {
        if (!(e instanceof NotFoundException)) throw e;
      }
    }
  }

  async addModelPhotos(
    modelId: number,
    photoUrls: { url: string; key: string }[],
    author: Author = NO_AUTHOR,
  ): Promise<DeviceModelPhoto[]> {
    const [model] = await this.summaries([modelId]);
    if (!model)
      throw new NotFoundException(`Device model ${modelId} not found`);
    const photos = this.devices.manager.getRepository(DeviceModelPhoto);
    const saved = await photos.save(
      photoUrls.map((p) =>
        photos.create({
          modelId,
          url: p.url,
          key: p.key,
          createdBy: author.created_by,
          isDemo: author.is_demo,
        }),
      ),
    );
    // The thumbnail of a model without a picture of its variants changes.
    await this.modelIndex.reindex([modelId]);
    return saved;
  }

  /**
   * Removes a picture of a model, by whoever uploaded it or an
   * administrator; the key is the gateway's to delete. A photo of another
   * model is not found, whatever its id.
   */
  async deleteModelPhoto(
    modelId: number,
    photoId: string,
    editor: Editor = NO_EDITOR,
  ): Promise<{ key: string }> {
    const photos = this.devices.manager.getRepository(DeviceModelPhoto);
    const photo = await photos.findOne({
      where: { id: photoId, modelId },
      select: { id: true, modelId: true, key: true, createdBy: true },
    });
    if (!photo) throw new NotFoundException(`Photo ${photoId} not found`);
    if (!mayEdit(editor, photo.createdBy)) {
      throw new ForbiddenException(
        'Only its author or an administrator may delete this photo',
      );
    }
    await photos.remove(photo);
    await this.modelIndex.reindex([photo.modelId]);
    return { key: photo.key };
  }

  /** The models with these ids, in this order, categories localised. */
  private async summaries(
    ids: number[],
    locale?: string,
  ): Promise<ModelSummary[]> {
    if (ids.length === 0) return [];
    const rows: (ModelSummary & { thumbnail: string | null })[] =
      await this.devices.manager.query(
        `SELECT m.id, m.brand, m.name, m.variant_count,
                m.has_manufacturer_variant, m.representative_device_id, m.colours,
                m.is_demo,
                coalesce((SELECT json_agg(json_build_object('id', c.id, 'name', c.name,
                                                            'ifixit_wikiid', c.ifixit_wikiid, 'unukey', c.unukey)
                                          ORDER BY c.name)
                            FROM device_model_categories mc
                            JOIN device_categories c ON c.id = mc.category_id
                           WHERE mc.model_id = m.id), '[]') AS categories,
                ${thumbnailSql('m', '$1')} AS thumbnail
           FROM device_models m WHERE m.id = ANY($2::int[])`,
        [IMAGE_PROPERTIES, ids],
      );
    const byId = new Map(
      rows.map((r) => [r.id, { ...r, thumbnail: r.thumbnail ?? '' }]),
    );
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((m): m is ModelSummary => m !== undefined);
    return localizeCategories(ordered, locale, (sql, params) =>
      this.devices.manager.query(sql, params),
    );
  }

  /** The search, in SQL: every word in the brand, the name or a category. */
  private async searchInDatabase(
    o: ModelSearchOptions,
  ): Promise<ModelSearchResult> {
    // Each query numbers its own parameters. What is typed is matched as
    // typed: "%" and "_" are no wildcards.
    const like = (v: string) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;
    const textFilter = (params: unknown[]) => {
      const text = o.search?.trim();
      if (!text) return 'TRUE';
      const p = (v: unknown) => `$${params.push(v)}`;
      // "Brand,Model", as the photo identification sends it.
      if (o.strict) {
        return `(m.brand || ' ' || m.name) ILIKE ${p(like(text.replace(/\s*,\s*/g, ' ')))}`;
      }
      const words = text
        .split(/[\s,]+/)
        .filter((word) => /[\p{L}\p{N}]/u.test(word));
      if (words.length === 0) return 'TRUE';
      return words
        .map((word) => {
          const w = p(like(word));
          return `(m.brand ILIKE ${w} OR m.name ILIKE ${w} OR EXISTS (
            SELECT 1 FROM device_model_categories mc
              JOIN device_categories c ON c.id = mc.category_id
             WHERE mc.model_id = m.id AND c.name ILIKE ${w}))`;
        })
        .join(' AND ');
    };
    const filter = (params: unknown[]) => {
      const text = textFilter(params);
      if (!o.categories?.length) return text;
      params.push(o.categories);
      return `${text} AND EXISTS (
        SELECT 1 FROM device_model_categories mc
          JOIN device_categories c ON c.id = mc.category_id
         WHERE mc.model_id = m.id AND c.name = ANY($${params.length}::text[]))`;
    };

    const countParams: unknown[] = [];
    const [{ total }]: { total: number }[] = await this.devices.manager.query(
      `SELECT count(*)::int AS total FROM device_models m WHERE ${filter(countParams)}`,
      countParams,
    );
    const pageParams: unknown[] = [];
    const where = filter(pageParams);
    pageParams.push(o.limit, (o.page - 1) * o.limit);
    const page: { id: number }[] = await this.devices.manager.query(
      `SELECT m.id FROM device_models m WHERE ${where}
        ORDER BY ${SQL_SORTS[o.sortBy ?? 'relevance']}
        LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams,
    );
    // Facets before the category filter, as the index computes them.
    const facetParams: unknown[] = [];
    const facets: { name: string; n: number }[] =
      await this.devices.manager.query(
        `SELECT c.name, count(*)::int AS n
           FROM device_models m
           JOIN device_model_categories mc ON mc.model_id = m.id
           JOIN device_categories c ON c.id = mc.category_id
          WHERE ${textFilter(facetParams)}
          GROUP BY c.name`,
        facetParams,
      );
    return {
      ids: page.map((r) => r.id),
      total,
      categoryFacets: Object.fromEntries(facets.map((f) => [f.name, f.n])),
    };
  }
}
