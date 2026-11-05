/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { Repairer } from '../repairer.entity';
import { IRepairersService } from '../interfaces/repairers-service.interface';
import { RepairerDevice } from '../repairer-device.entity';
import { RepairerFilter } from '../types/repairerFilter';
import { RepairerSearchDto } from '../types/repairer-search.dto';
import { RepairerSearchService } from '../../search/repairer-search.service';
import { getCountryCode, getCountryName } from '../../utils/country-mapper';
import { partnerTypesMatching } from '../constants/partner-type-whitelist';

/** Geographic bounds of the visible map, as Leaflet reports them. */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Most markers a single viewport request will return.
 *
 * At country zoom the bounds can hold tens of thousands of repairers, and
 * shipping them all is the failure this endpoint exists to avoid. Past the cap
 * the caller is told the real count so it can invite the user to zoom rather
 * than silently showing a subset.
 */
export const MARKER_LIMIT = 500;

/** One marker: the least a map needs to draw a pin and open the right sheet. */
export interface RepairerMarker {
  id: string;
  lat: number;
  lng: number;
  partner_type: string | null;
}

/**
 * Service for managing repairers and their associated devices.
 *
 * Provides methods for CRUD operations, filtering, and searching repairers.
 */
@Injectable()
export class RepairersService implements IRepairersService {
  private readonly logger = new Logger(RepairersService.name);

  constructor(
    @InjectRepository(Repairer)
    private readonly repairerRepository: Repository<Repairer>,
    @InjectRepository(RepairerDevice)
    private readonly repairerDeviceRepository: Repository<RepairerDevice>,
    private readonly repairerSearchService: RepairerSearchService,
  ) {}

  /**
   * Retrieves all repairers with their associated devices.
   * @returns Array of Repairer entities.
   */
  async findAll(): Promise<Repairer[]> {
    return this.repairerRepository.find({
      relations: ['repairerDevices'],
      // take: 20,
    });
  }

  /**
   * Retrieves repairers with pagination and optional filters.
   * @param page Page number (1-indexed)
   * @param limit Items per page
   * @param filters Optional filters (country, device_type, search)
   * @returns Paginated response with repairers and metadata
   */
  async findPaginated(
    page: number = 1,
    limit: number = 50,
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
  }> {
    const from = (page - 1) * limit;
    const { latitude, longitude, bounds } = filters ?? {};
    const hasLocation = latitude != null && longitude != null;

    // Use Elasticsearch only when there is no device_type/partner_type filter AND
    // no location-based sorting. Neither device_type nor partner_type is indexed
    // in Elasticsearch, so we bypass it (like device_type) and use DB + haversine.
    // Bounds are not indexed there either, so they bypass it for the same reason:
    // going through ES would quietly ignore them and answer for the whole world.
    const partnerTypes = [filters?.partner_type ?? []].flat();
    const canUseEs =
      !filters?.device_type &&
      partnerTypes.length === 0 &&
      !hasLocation &&
      !bounds;

    if (canUseEs) {
      try {
        // Normalize country to ISO code before passing to ES
        const isoCountry = filters?.country
          ? (getCountryCode(filters.country) ?? filters.country).toUpperCase()
          : undefined;

        const searchResult =
          await this.repairerSearchService.searchRepairersPaginated(
            filters?.search || '',
            from,
            limit,
            { country: isoCountry },
          );

        const ids = searchResult.hits.map((hit: any) => hit._id);
        let data: Repairer[] = [];

        if (ids.length > 0) {
          data = await this.repairerRepository.find({
            where: { repairer_id: In(ids) },
            relations: ['repairerDevices'],
          });

          // Re-sort to match ES score order
          data.sort(
            (a, b) =>
              ids.indexOf(a.repairer_id.toString()) -
              ids.indexOf(b.repairer_id.toString()),
          );
        }

        return {
          data,
          meta: {
            total: searchResult.total,
            page,
            limit,
            totalPages: Math.ceil(searchResult.total / limit),
          },
        };
      } catch (error) {
        this.logger.error(
          `Elasticsearch search failed, falling back to DB: ${error.message}`,
        );
        // fall through to DB logic below
      }
    }

    // DB logic — runs when device_type filter is present, lat/lon provided, or ES failed
    const queryBuilder = this.repairerRepository
      .createQueryBuilder('repairer')
      .leftJoinAndSelect('repairer.repairerDevices', 'repairerDevices');

    if (filters?.country) {
      const isoCode = getCountryCode(filters.country) ?? filters.country;
      queryBuilder.andWhere('UPPER(repairer.country) = :country', {
        country: isoCode.toUpperCase(),
      });
    }

    if (filters?.device_type) {
      queryBuilder.andWhere(
        'LOWER(repairerDevices.device_type) = LOWER(:device_type)',
        { device_type: filters.device_type },
      );
    }

    if (partnerTypes.length > 0) {
      queryBuilder.andWhere('repairer.partner_type IN (:...partner_types)', {
        partner_types: partnerTypesMatching(partnerTypes),
      });
    }

    if (bounds) {
      this.applyBounds(queryBuilder, bounds);
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(repairer.name) LIKE LOWER(:search)', {
            search: `%${filters.search}%`,
          })
            .orWhere('LOWER(repairer.description) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            })
            .orWhere('LOWER(repairer.city) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }

    const total = await queryBuilder.getCount();

    if (hasLocation) {
      // Fetch all matching rows, sort by distance, then paginate in memory
      const all = await queryBuilder.getMany();
      all.sort((a, b) => {
        const dA =
          a.latitude != null && a.longitude != null
            ? this.haversineDistance(
                latitude,
                longitude,
                a.latitude,
                a.longitude,
              )
            : Infinity;
        const dB =
          b.latitude != null && b.longitude != null
            ? this.haversineDistance(
                latitude,
                longitude,
                b.latitude,
                b.longitude,
              )
            : Infinity;
        return dA - dB;
      });
      const skip = (page - 1) * limit;
      const data = all.slice(skip, skip + limit);
      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    const data = await queryBuilder.getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Restricts a query to repairers inside the visible map rectangle.
   *
   * Longitudes are normalised into [-180, 180] first: panning across several
   * copies of the world makes Leaflet report values outside that range, and
   * comparing those against stored coordinates matches nothing — an empty map
   * with no error, which reads as a broken feature rather than a wrapped one.
   *
   * When the rectangle straddles the antimeridian its west edge ends up east
   * of its east edge, so the longitude test becomes a union of two ranges
   * instead of an interval. Rare from Europe, but silent when wrong.
   */
  private applyBounds(
    queryBuilder: { andWhere: (...args: any[]) => any },
    bounds: MapBounds,
  ): void {
    const normaliseLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;
    const west = normaliseLng(bounds.west);
    const east = normaliseLng(bounds.east);

    queryBuilder.andWhere(
      'repairer.latitude BETWEEN :south AND :north',
      { south: Math.min(bounds.south, bounds.north), north: Math.max(bounds.south, bounds.north) },
    );

    if (west <= east) {
      queryBuilder.andWhere('repairer.longitude BETWEEN :west AND :east', {
        west,
        east,
      });
    } else {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('repairer.longitude >= :west', { west }).orWhere(
            'repairer.longitude <= :east',
            { east },
          );
        }),
      );
    }
  }

  /**
   * Repairers to draw inside the visible map rectangle.
   *
   * Deliberately not `findPaginated` with a large limit: this returns four
   * fields per row instead of whole entities with their devices. Listing every
   * repairer costs 25 MB; the same rows as markers cost a few tens of kilobytes,
   * and that difference is the whole point of the endpoint.
   *
   * `total` counts everything matching inside the bounds even when the response
   * is capped, so the interface can say how many are really there rather than
   * presenting the cap as the answer.
   */
  async findMarkers(
    bounds: MapBounds,
    filters?: {
      country?: string;
      device_type?: string;
      partner_type?: string | string[];
      search?: string;
    },
    limit: number = MARKER_LIMIT,
  ): Promise<{
    markers: RepairerMarker[];
    total: number;
    truncated: boolean;
  }> {
    const queryBuilder = this.repairerRepository
      .createQueryBuilder('repairer')
      .where('repairer.latitude IS NOT NULL')
      .andWhere('repairer.longitude IS NOT NULL');

    this.applyBounds(queryBuilder, bounds);

    if (filters?.country) {
      const isoCode = getCountryCode(filters.country) ?? filters.country;
      queryBuilder.andWhere('UPPER(repairer.country) = :country', {
        country: isoCode.toUpperCase(),
      });
    }

    const partnerTypes = [filters?.partner_type ?? []].flat();
    if (partnerTypes.length > 0) {
      queryBuilder.andWhere('repairer.partner_type IN (:...partner_types)', {
        partner_types: partnerTypesMatching(partnerTypes),
      });
    }

    // An inner join would multiply a repairer by its matching device rows, so
    // one repairer offering three matching types would be drawn three times on
    // the same spot. EXISTS keeps one row per repairer.
    if (filters?.device_type) {
      queryBuilder.andWhere(
        `EXISTS (
           SELECT 1 FROM repairer_devices rd
           WHERE rd.repairer_id = repairer.repairer_id
             AND LOWER(rd.device_type) = LOWER(:device_type)
         )`,
        { device_type: filters.device_type },
      );
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(repairer.name) LIKE LOWER(:search)', {
            search: `%${filters.search}%`,
          })
            .orWhere('LOWER(repairer.description) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            })
            .orWhere('LOWER(repairer.city) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }

    const total = await queryBuilder.getCount();

    const rows = await queryBuilder
      .select([
        'repairer.repairer_id AS id',
        'repairer.latitude AS lat',
        'repairer.longitude AS lng',
        'repairer.partner_type AS partner_type',
      ])
      .limit(limit)
      .getRawMany();

    return {
      // latitude and longitude are `decimal` columns, which the driver hands
      // back as strings. Leaflet needs numbers; a string pair places the pin
      // at (0, 0) — off the coast of Africa — rather than failing.
      markers: rows.map((row) => ({
        id: String(row.id),
        lat: Number(row.lat),
        lng: Number(row.lng),
        partner_type: row.partner_type ?? null,
      })),
      total,
      truncated: total > limit,
    };
  }

  /**
   * Creates a new repairer.
   * @param data The Repairer entity to create.
   * @returns The created Repairer entity.
   */
  async create(data: Repairer): Promise<Repairer> {
    const saved = await this.repairerRepository.save(data);
    await this.repairerSearchService.indexRepairer(saved);
    return saved;
  }

  /**
   * Finds a repairer by its ID, including associated devices.
   * @param id The repairer ID.
   * @returns The Repairer entity.
   * @throws Error if repairer is not found.
   */
  async findOne(id: string): Promise<Repairer> {
    const repairer = await this.repairerRepository.findOne({
      where: { repairer_id: id },
      relations: ['repairerDevices'],
    });
    if (!repairer) {
      throw new Error(`Repairer with id ${id} not found`);
    }
    return repairer;
  }

  /**
   * Updates a repairer by ID.
   * @param id The repairer ID.
   * @param data Partial Repairer data to update.
   * @returns The updated Repairer entity.
   */
  async update(id: string, data: Partial<Repairer>): Promise<Repairer> {
    await this.repairerRepository.update(id, data);
    const updated = await this.findOne(id);
    await this.repairerSearchService.indexRepairer(updated);
    return updated;
  }

  /**
   * Deletes a repairer by ID.
   * @param id The repairer ID.
   */
  async delete(id: string): Promise<{ message: string }> {
    await this.repairerRepository.delete(id);
    return { message: 'Repairer deleted' };
  }

  /**
   * Retrieves available filters for repairers, such as countries and device types.
   * @returns Array of RepairerFilter objects.
   */
  async getFilters(): Promise<RepairerFilter[]> {
    const filters: RepairerFilter[] = [];

    // 1️⃣ Retrieve distinct countries
    const countries = await this.repairerRepository
      .createQueryBuilder('repairer')
      .select('DISTINCT repairer.country', 'country')
      .where('repairer.country IS NOT NULL')
      .getRawMany();

    // 2️⃣ Retrieve distinct device types (case-insensitive) along with the
    // number of distinct repairers offering each device type.
    const deviceTypeCounts = await this.repairerRepository
      .createQueryBuilder('repairer')
      .innerJoin('repairer.repairerDevices', 'rd')
      .select('LOWER(rd.device_type)', 'device_type_lower')
      .addSelect('rd.device_type', 'device_type')
      .addSelect('COUNT(DISTINCT repairer.repairer_id)', 'count')
      .where('rd.device_type IS NOT NULL')
      .groupBy('LOWER(rd.device_type)')
      .addGroupBy('rd.device_type')
      .getRawMany();

    // Deduplicate device types by lowercase value, summing counts across
    // any differently-cased duplicates.
    const uniqueDeviceTypes = new Map<
      string,
      { device_type: string; count: number }
    >();
    deviceTypeCounts.forEach((d) => {
      const lowerType = d.device_type_lower;
      const count = Number(d.count) || 0;
      const existing = uniqueDeviceTypes.get(lowerType);
      if (existing) {
        existing.count += count;
      } else {
        uniqueDeviceTypes.set(lowerType, { device_type: d.device_type, count });
      }
    });

    // Add country filters — id is the ISO code (for filtering), name is the English display name
    filters.push(
      ...countries.map((c) => ({
        id: c.country,
        category: 'country',
        name: getCountryName(c.country),
      })),
    );

    // Add device type filters with normalized names and repairer counts
    filters.push(
      ...Array.from(uniqueDeviceTypes.values()).map(
        ({ device_type, count }) => ({
          id: this.normalizeDeviceType(device_type),
          category: 'device_type',
          name: this.normalizeDeviceType(device_type),
          count,
        }),
      ),
    );
    filters.sort((a, b) => {
      if (a.category.toLowerCase() < b.category.toLowerCase()) return -1;
      if (a.category.toLowerCase() > b.category.toLowerCase()) return 1;
      if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
      if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
      return 0;
    });
    return filters;
  }

  /**
   * Normalizes device type by capitalizing the first letter.
   * @param type The device type string.
   * @returns The normalized device type.
   */
  private normalizeDeviceType(type: string): string {
    if (!type) return type;
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  /**
   * Maps device type codes to human-readable names.
   * @param type The device type code.
   * @returns The human-readable device type name.
   */
  private mapDeviceType(type: string): string {
    const mapping = {
      smartphones: 'Smartphones',
      tablets: 'Tablettes',
      computers: 'Ordinateurs',
      consoles: 'Consoles',
    };
    return mapping[type] || type;
  }

  /**
   * Searches repairers based on a search string and filters.
   * @param searchDto Object containing search string and filters.
   * @returns Array of matching Repairer entities.
   */
  async searchRepairers(searchDto: RepairerSearchDto): Promise<Repairer[]> {
    const { search, filters, latitude, longitude } = searchDto;

    // Initialize query builder
    const queryBuilder = this.repairerRepository
      .createQueryBuilder('repairer')
      .leftJoinAndSelect('repairer.repairerDevices', 'repairerDevice');

    if (search) {
      // Try to resolve search term as a country name to also match ISO codes in DB
      const countryCodeFromSearch = getCountryCode(search);

      const searchConditions = this.repairerRepository.metadata.columns
        .map((column) => {
          // Exclude columns that are not strings or are IDs
          if (
            column.type == 'uuid' ||
            column.type == 'decimal' ||
            column.isPrimary
          )
            return '';
          return `LOWER(${column.databaseName}) LIKE :search`;
        })
        .filter(Boolean);

      if (searchConditions.length > 0) {
        queryBuilder.andWhere(
          new Brackets((qb) => {
            searchConditions.forEach((condition) => {
              qb.orWhere(condition, { search: `%${search.toLowerCase()}%` });
            });
            // If search term resolves to a country code, also match on exact ISO code
            if (countryCodeFromSearch) {
              qb.orWhere('LOWER(repairer.country) = :countryCode', {
                countryCode: countryCodeFromSearch.toLowerCase(),
              });
            }
          }),
        );
      }
    }
    if (filters) {
      Object.entries(filters).forEach(([filterKey, filterValue]) => {
        const column =
          this.repairerRepository.metadata.findColumnWithPropertyName(
            filterKey,
          );
        const repairerDeviceColumn =
          this.repairerDeviceRepository.metadata.findColumnWithPropertyName(
            filterKey,
          );
        if (column) {
          if (filterKey === 'country') {
            // Normalize: accept both ISO code ("FR") and full name ("France")
            const isoCode = getCountryCode(filterValue) ?? filterValue;
            queryBuilder.andWhere('UPPER(repairer.country) = :country', {
              country: isoCode.toUpperCase(),
            });
          } else {
            queryBuilder.andWhere(
              `LOWER(${column.databaseName}) LIKE :${filterKey}`,
              {
                [filterKey]: `%${filterValue.toLowerCase()}%`,
              },
            );
          }
        } else if (repairerDeviceColumn) {
          queryBuilder.andWhere(
            `LOWER(repairerDevice.${repairerDeviceColumn.databaseName}) LIKE :${filterKey}`,
            {
              [filterKey]: `%${filterValue.toLowerCase()}%`,
            },
          );
        }
      });
    }

    // Execute the query
    let repairers = await queryBuilder.getMany();

    // The device type is a preference, not a requirement: 286 of the 357 Icecat
    // categories the wizard sends match no repairer device type, so a strict
    // filter answers zero on ordinary appliances. Cannot recurse — the retry
    // carries no device_type.
    if (repairers.length === 0 && filters?.device_type) {
      const { device_type: droppedType, ...remainingFilters } = filters;

      this.logger.warn(
        `searchRepairers: no repairer declares device type "${droppedType}", widening the search`,
      );

      return this.searchRepairers({
        search,
        filters: remainingFilters,
        latitude,
        longitude,
      });
    }

    // Sort by distance if latitude and longitude are provided
    if (latitude && longitude) {
      repairers = repairers.sort((a, b) => {
        const distA = this.haversineDistance(
          latitude,
          longitude,
          a.latitude,
          a.longitude,
        );
        const distB = this.haversineDistance(
          latitude,
          longitude,
          b.latitude,
          b.longitude,
        );
        return distA - distB;
      });
    }

    return repairers;
  }

  /**
   * Finds the nearest repairer to a given geolocation.
   * @param latitude The latitude of the geolocation.
   * @param longitude The longitude of the geolocation.
   * @returns An object containing the nearest repairer and the distance to them in kilometers.
   */
  async findNearestRepairer(
    latitude: number,
    longitude: number,
  ): Promise<{ repairer: Repairer; distance: number } | null> {
    const allRepairers = await this.repairerRepository.find();

    let nearestRepairer: Repairer | null = null;
    let minDistance = Infinity;

    for (const repairer of allRepairers) {
      if (repairer.latitude && repairer.longitude) {
        const distance = this.haversineDistance(
          latitude,
          longitude,
          repairer.latitude,
          repairer.longitude,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestRepairer = repairer;
        }
      }
    }

    if (nearestRepairer) {
      return { repairer: nearestRepairer, distance: minDistance };
    }

    return null;
  }

  /**
   * Calculates the Haversine distance between two geographical points.
   * @param lat1 Latitude of the first point.
   * @param lon1 Longitude of the first point.
   * @param lat2 Latitude of the second point.
   * @param lon2 Longitude of the second point.
   * @returns Distance in kilometers.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Distance in kilometers
  }

  /**
   * Converts degrees to radians.
   * @param degrees The angle in degrees.
   * @returns The angle in radians.
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
