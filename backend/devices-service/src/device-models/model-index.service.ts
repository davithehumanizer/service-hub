import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entity/device.entity';
import {
  ModelDocument,
  ModelSearchService,
} from '../search/model-search.service';
import { IMAGE_PROPERTIES, thumbnailSql } from './image-properties';

export interface ModelRow {
  id: number;
  brand: string;
  name: string;
  variant_count: number;
  has_manufacturer_variant: boolean;
  categories: string[];
  thumbnail: string | null;
}

const BATCH_SIZE = 1000;

// $1: the picture properties, best first; the caller's filter starts at $2.
const SELECT_ROWS = `
  SELECT m.id, m.brand, m.name, m.variant_count, m.has_manufacturer_variant,
         coalesce((SELECT array_agg(c.name ORDER BY c.name)
                     FROM device_model_categories mc
                     JOIN device_categories c ON c.id = mc.category_id
                    WHERE mc.model_id = m.id), '{}') AS categories,
         ${thumbnailSql('m', '$1')} AS thumbnail
    FROM device_models m`;

export function toModelDocument(row: ModelRow, syncedAt: Date): ModelDocument {
  return {
    model_id: row.id,
    brand: row.brand,
    name: row.name,
    title: `${row.brand} ${row.name}`.trim(),
    categories: row.categories,
    variant_count: row.variant_count,
    has_manufacturer_variant: row.has_manufacturer_variant,
    thumbnail: row.thumbnail ?? '',
    synced_at: syncedAt.toISOString(),
  };
}

/**
 * Keeps the device_models search index in step with the table: the models
 * an assignment touched, or all of them for search:sync-models.
 */
@Injectable()
export class ModelIndexService {
  private readonly logger = new Logger(ModelIndexService.name);

  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    private readonly search: ModelSearchService,
  ) {}

  /**
   * Rewrites the given models, and removes those the table no longer has.
   * Never throws: a model left behind is caught up by the next sync.
   */
  async reindex(modelIds: number[]): Promise<void> {
    if (modelIds.length === 0) return;
    try {
      const rows: ModelRow[] = await this.devices.manager.query(
        `${SELECT_ROWS} WHERE m.id = ANY($2::int[])`,
        [IMAGE_PROPERTIES, modelIds],
      );
      const now = new Date();
      await this.search.indexModels(rows.map((r) => toModelDocument(r, now)));
      const found = new Set(rows.map((r) => r.id));
      await this.search.removeModels(modelIds.filter((id) => !found.has(id)));
    } catch (e) {
      this.logger.error(
        `Search index not updated for models ${modelIds.join(', ')}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Every model, in batches, then removes the documents of deleted ones. Not
   * after a refusal: a refused document keeps its former date, and is still
   * the one served.
   */
  async syncAll(
    progress: (indexed: number) => void = () => undefined,
  ): Promise<{ indexed: number; refused: number; removed: number }> {
    const started = new Date();
    let cursor = 0;
    let indexed = 0;
    let refused = 0;
    for (;;) {
      const rows: ModelRow[] = await this.devices.manager.query(
        `${SELECT_ROWS} WHERE m.id > $2 ORDER BY m.id LIMIT $3`,
        [IMAGE_PROPERTIES, cursor, BATCH_SIZE],
      );
      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;
      refused += await this.search.indexModels(
        rows.map((r) => toModelDocument(r, started)),
      );
      indexed += rows.length;
      progress(indexed);
    }
    const removed = refused > 0 ? 0 : await this.search.removeUnseen(started);
    return { indexed, refused, removed };
  }
}
