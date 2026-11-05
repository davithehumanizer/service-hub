import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entity/device.entity';

export type AuthoredModel = {
  id: number;
  brand: string;
  name: string;
  is_demo: boolean;
  created_at: string | null;
  variant_count: number;
};

export type AuthoredVariant = {
  id: number;
  model_id: number | null;
  brand: string | null;
  model_name: string | null;
  variant_label: string | null;
  ean: string | null;
  is_demo: boolean;
};

export type Page<T> = { items: T[]; total: number };

const PAGE_MAX = 50;

/**
 * The models and variants an account entered, newest first: its own page
 * of contributions, and an administrator's page of a contributor.
 */
@Injectable()
export class ContributionsService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
  ) {}

  async modelsOf(authorId: number, offset = 0, limit = 20): Promise<Page<AuthoredModel>> {
    const [items, [{ total }]] = await Promise.all([
      this.devices.manager.query(
        `SELECT id, brand, name, is_demo, created_at, variant_count
           FROM device_models
          WHERE created_by = $1
          ORDER BY id DESC
          OFFSET $2 LIMIT $3`,
        [authorId, ...this.window(offset, limit)],
      ),
      this.devices.manager.query(
        `SELECT count(*)::int AS total FROM device_models WHERE created_by = $1`,
        [authorId],
      ),
    ]);
    return { items, total };
  }

  /** Variants carry no date: newest first is by id. */
  async variantsOf(authorId: number, offset = 0, limit = 20): Promise<Page<AuthoredVariant>> {
    const [items, [{ total }]] = await Promise.all([
      this.devices.manager.query(
        `SELECT d.device_id AS id, d.model_id, COALESCE(m.brand, d.brand) AS brand,
                m.name AS model_name, d.variant_label, d.ean, d.is_demo
           FROM devices d
           LEFT JOIN device_models m ON m.id = d.model_id
          WHERE d.created_by = $1
          ORDER BY d.device_id DESC
          OFFSET $2 LIMIT $3`,
        [authorId, ...this.window(offset, limit)],
      ),
      this.devices.manager.query(
        `SELECT count(*)::int AS total FROM devices WHERE created_by = $1`,
        [authorId],
      ),
    ]);
    return { items, total };
  }

  private window(offset: number, limit: number): [number, number] {
    return [
      Math.max(0, Math.floor(offset) || 0),
      Math.min(PAGE_MAX, Math.max(1, Math.floor(limit) || 20)),
    ];
  }
}
