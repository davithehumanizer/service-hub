import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Device } from '../entity/device.entity';
import {
  LABEL_PROPERTIES,
  variantLabels,
  variantParts,
} from './variant-label';

const BATCH_SIZE = 500;

/**
 * Writes devices.variant_label for the variants of the given models, from
 * their technical properties, with the parts it is made of
 * (devices.variant_parts), and the colours each model comes in. A label
 * depends on the other variants of the model, so it is recomputed for a
 * whole model whenever its variants change.
 */
@Injectable()
export class VariantLabelService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
  ) {}

  /** Returns how many variants' labels or parts changed. */
  async labelModels(modelIds: number[]): Promise<number> {
    const ids = [...new Set(modelIds)];
    let changed = 0;
    for (let at = 0; at < ids.length; at += BATCH_SIZE) {
      changed += await this.labelBatch(ids.slice(at, at + BATCH_SIZE));
    }
    return changed;
  }

  /**
   * One labelling of a model at a time, so that the last to start, after
   * the last change of its variants, writes what they all are: two imports
   * of variants of one model would otherwise each write labels made without
   * the other's variant.
   */
  private labelBatch(modelIds: number[]): Promise<number> {
    return this.devices.manager.transaction(async (manager) => {
      // In one order, so that two batches never wait on each other.
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtext('variant_labels'), id)
           FROM (SELECT unnest($1::int[]) AS id ORDER BY 1) ids`,
        [modelIds],
      );
      return this.labelLocked(manager, modelIds);
    });
  }

  private async labelLocked(
    manager: EntityManager,
    modelIds: number[],
  ): Promise<number> {
    const rows: {
      model_id: number;
      device_id: number;
      properties: Record<string, string>;
    }[] = await manager.query(
      `SELECT d.model_id, d.device_id,
              coalesce(json_object_agg(t.property_name, t.property_value)
                         FILTER (WHERE t.property_name IS NOT NULL), '{}') AS properties
         FROM devices d
         LEFT JOIN device_technical_properties t
           ON t."deviceDeviceId" = d.device_id AND t.property_name = ANY($2::text[])
        WHERE d.model_id = ANY($1::int[])
        GROUP BY d.model_id, d.device_id`,
      [modelIds, LABEL_PROPERTIES],
    );
    // Canonical names: what Internal memory holds depends on them.
    const categories: { model_id: number; names: string[] }[] =
      await manager.query(
        `SELECT mc.model_id, array_agg(c.name) AS names
           FROM device_model_categories mc
           JOIN device_categories c ON c.id = mc.category_id
          WHERE mc.model_id = ANY($1::int[])
          GROUP BY mc.model_id`,
        [modelIds],
      );
    const categoriesOf = new Map(categories.map((c) => [c.model_id, c.names]));
    const byModel = new Map<number, typeof rows>();
    for (const r of rows) {
      const variants = byModel.get(r.model_id);
      if (variants) variants.push(r);
      else byModel.set(r.model_id, [r]);
    }
    await this.writeColours(manager, byModel);
    const deviceIds: number[] = [];
    const labels: (string | null)[] = [];
    const parts: string[] = [];
    for (const [modelId, variants] of byModel) {
      const read = variants.map((v) => ({
        id: v.device_id,
        properties: v.properties,
      }));
      const labelled = variantLabels(read, categoriesOf.get(modelId));
      const parted = variantParts(read, categoriesOf.get(modelId));
      labelled.forEach((label, id) => {
        deviceIds.push(id);
        labels.push(label);
        parts.push(JSON.stringify(parted.get(id) ?? {}));
      });
    }
    if (deviceIds.length === 0) return 0;
    const [, count]: [unknown, number] = await manager.query(
      `UPDATE devices d SET variant_label = v.label, variant_parts = v.parts
         FROM unnest($1::int[], $2::text[], $3::jsonb[]) AS v(device_id, label, parts)
        WHERE d.device_id = v.device_id
          AND (d.variant_label IS DISTINCT FROM v.label
               OR d.variant_parts IS DISTINCT FROM v.parts)`,
      [deviceIds, labels, parts],
    );
    return count;
  }

  /** Each model's colours, distinct and sorted, where they changed. */
  private async writeColours(
    manager: EntityManager,
    byModel: Map<number, { properties: Record<string, string> }[]>,
  ): Promise<void> {
    const models = [...byModel].map(([id, variants]) => ({
      id,
      colours: [
        ...new Set(
          variants
            .map((v) => v.properties['Product colour']?.trim())
            .filter((c): c is string => Boolean(c)),
        ),
      ].sort(),
    }));
    if (models.length === 0) return;
    await manager.query(
      `UPDATE device_models m SET colours = v.colours
         FROM (SELECT id, ARRAY(SELECT jsonb_array_elements_text(colours))::varchar[] AS colours
                 FROM jsonb_to_recordset($1::jsonb) AS r(id int, colours jsonb)) v
        WHERE m.id = v.id AND m.colours IS DISTINCT FROM v.colours`,
      [JSON.stringify(models)],
    );
  }
}
