import { Repairer } from '../repairer.entity';
import { RepairerSearchDto } from '../types/repairer-search.dto';
import { RepairerFilter } from '../types/repairerFilter';
import { MapBounds, RepairerMarker } from '../services/repairers.service';
import { Editor } from '../../types/author';

export interface IRepairersService {
  findAll(): Promise<Repairer[]>;
  findPaginated(
    page?: number,
    limit?: number,
    filters?: {
      country?: string;
      device_type?: string;
      partner_type?: string | string[];
      search?: string;
      latitude?: number;
      longitude?: number;
      bounds?: MapBounds;
    },
  ): Promise<{
    data: Repairer[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  findMarkers(
    bounds: MapBounds,
    filters?: {
      country?: string;
      device_type?: string;
      partner_type?: string | string[];
      search?: string;
    },
    limit?: number,
  ): Promise<{
    markers: RepairerMarker[];
    total: number;
    truncated: boolean;
  }>;
  findOne(id: string, viewer?: Editor): Promise<Repairer>;
  authorOf(id: string): Promise<number | null>;
  create(data: Repairer): Promise<Repairer>;
  update(id: string, data: Partial<Repairer>): Promise<Repairer>;
  delete(id: string): Promise<{ message: string }>;
  purgeDemo(dryRun: boolean): Promise<{ repairers: number }>;
  demoStatsOf(contributorId: number): Promise<{
    repairers: number;
    pending: number;
    published: number;
    rejected: number;
    revisions: number;
  }>;
  getFilters(): Promise<RepairerFilter[]>;
  searchRepairers(searchDto: RepairerSearchDto): Promise<Repairer[]>;
  findNearestRepairer(
    latitude: number,
    longitude: number,
  ): Promise<{ repairer: Repairer; distance: number } | null>;
}
