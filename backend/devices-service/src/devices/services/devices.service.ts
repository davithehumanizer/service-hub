/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository, DeepPartial } from 'typeorm';
import { Device } from '../../entity/device.entity';
import { IDevicesService } from '../interfaces/devices-service.interface';
import { DeviceTechnicalProperty } from '../../entity/device-technical-property.entity';
import { DeviceInformationalProperty } from '../../entity/device-informational-property.entity';
import { DeviceCategory } from '../../entity/device-category.entity';
import { DevicePhoto } from '../../entity/device-photo.entity';
import { Filter } from '../../types/Filter';
import { DeviceCategoryTranslation } from '../../entity/device-category-translation.entity';
import { DeviceSearchService } from '../../search/device-search.service';
import { isGtin } from '../../search/gtin';
import {
  ModelAssignmentService,
  placementInputs,
} from '../../device-models/model-assignment.service';
import { localizeCategories } from '../localize-categories';
import {
  Author,
  Editor,
  mayEdit,
  NO_AUTHOR,
  NO_EDITOR,
} from '../../types/author';

@Injectable()
export class DevicesService implements IDevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(DeviceTechnicalProperty)
    private readonly deviceTechnicalPropertyRepository: Repository<DeviceTechnicalProperty>,
    @InjectRepository(DeviceInformationalProperty)
    private readonly deviceInformationalPropertyRepository: Repository<DeviceInformationalProperty>,
    @InjectRepository(DeviceCategory)
    private readonly deviceCategoryRepository: Repository<DeviceCategory>,
    @InjectRepository(DevicePhoto)
    private readonly devicePhotoRepository: Repository<DevicePhoto>,
    private readonly deviceSearchService: DeviceSearchService,
    private readonly modelAssignment: ModelAssignmentService,
  ) {}

  private applyLocaleToCategories(
    devices: Device[],
    locale?: string,
  ): Promise<Device[]> {
    return localizeCategories(devices, locale, (sql, params) =>
      this.deviceRepository.query(sql, params),
    );
  }

  async findAll(locale?: string): Promise<Device[]> {
    const devices = await this.deviceRepository.find({
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
      ],
    });
    return this.applyLocaleToCategories(devices, locale);
  }

  async findAllV2(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      categories?: string;
      sortBy?: string;
      withProperties?: boolean;
      bypassEs?: boolean;
      strict?: boolean;
      locale?: string;
    } = {},
  ): Promise<{
    data: Device[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    categoryFacets: Record<string, number>;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      categories,
      sortBy = 'relevance',
      withProperties = false,
      bypassEs: bypassEsOption = false,
      strict: strictOption = false,
      locale,
    } = options;

    // Strict mode matches brand + model, where a barcode never appears.
    const strict = strictOption && !(search && isGtin(search));

    // Non-relevance sorts require a DB query so ES (which sorts by score) is skipped
    const bypassEs = bypassEsOption || sortBy !== 'relevance';

    const categoriesArray = categories
      ? categories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    let ids: number[] = [];
    let total = 0;
    let categoryFacets: Record<string, number> = {};

    // Use Elasticsearch for search and pagination if not bypassed
    if (!bypassEs) {
      try {
        const searchResult =
          await this.deviceSearchService.searchDevicesPaginated({
            page,
            limit,
            search,
            strict,
            categories: categoriesArray,
          });
        ids = searchResult.data.map((d: any) => d.device_id);
        total = searchResult.total;
        categoryFacets = searchResult.categoryFacets;
        console.log('Elasticsearch search result:', searchResult);
      } catch (error) {
        console.error(
          'Elasticsearch search failed, falling back to database:',
          error.message,
        );
        // Fallback or bypass ES means we use DB logic below
      }
    }

    // Fallback to DB logic if ES bypassed or failed (check if we don't have results yet)
    if (bypassEs || total === 0) {
      const qb = this.deviceRepository
        .createQueryBuilder('device')
        .select('device.device_id');

      if (search && search.trim()) {
        if (strict) {
          // Strict mode: match the full phrase in CONCAT(brand, ' ', model)
          qb.andWhere(`CONCAT(device.brand, ' ', device.model) ILIKE :phrase`, {
            phrase: `%${search.trim()}%`,
          });
        } else {
          qb.leftJoin('device.categories', 'category');
          const keywords = search
            .split(/[\s,]+/)
            .map((word) => word.trim())
            .filter(Boolean);
          if (keywords.length > 0) {
            keywords.forEach((keyword, idx) => {
              const param = `kw${idx}`;
              const keywordGroup = [
                `device.brand ILIKE :${param}`,
                `device.device_type ILIKE :${param}`,
                `device.model ILIKE :${param}`,
                `category.name ILIKE :${param}`,
                `device.ean ILIKE :${param}`,
                `device.serial_number ILIKE :${param}`,
                `device.product_code ILIKE :${param}`,
              ];
              qb.andWhere(`(${keywordGroup.join(' OR ')})`, {
                [param]: `%${keyword}%`,
              });
            });
            qb.distinct(true);
          }
        }
      }

      // Apply category filter in DB fallback path
      if (categoriesArray.length > 0) {
        qb.innerJoin(
          'device.categories',
          'filterCat',
          'filterCat.name IN (:...catFilter)',
          { catFilter: categoriesArray },
        );
      }

      total = await qb.getCount();
      if (total > 0) {
        const offset = (page - 1) * limit;
        if (sortBy === 'brandAZ') {
          qb.orderBy('device.brand', 'ASC').addOrderBy('device.model', 'ASC');
        } else if (sortBy === 'brandZA') {
          qb.orderBy('device.brand', 'DESC').addOrderBy('device.model', 'DESC');
        } else if (sortBy === 'modelAZ') {
          qb.orderBy('device.model', 'ASC').addOrderBy('device.brand', 'ASC');
        } else if (sortBy === 'modelZA') {
          qb.orderBy('device.model', 'DESC').addOrderBy('device.brand', 'DESC');
        } else {
          qb.orderBy('device.device_id', 'ASC');
        }
        const rawIds = await qb.offset(offset).limit(limit).getRawMany();
        ids = rawIds.map((r) => r.device_device_id);
      }
    }

    // If no devices found, return empty early
    if (total === 0 || ids.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total, totalPages: 0 },
        categoryFacets,
      };
    }

    // Phase 2: Load full device entities with relations using 'query' strategy
    const relations = ['categories'];
    if (withProperties) {
      relations.push('technicalProperties', 'informationalProperties');
    }

    const data = await this.deviceRepository.find({
      where: { device_id: In(ids) },
      relations,
      relationLoadStrategy: 'query',
    });

    // Strategy 'query' doesn't guarantee order, so we re-sort to match the ES/DB ID order
    const dataMap = new Map(data.map((d) => [d.device_id.toString(), d]));
    const sortedData = ids
      .map((id) => dataMap.get(id.toString()))
      .filter(Boolean) as Device[];

    const totalPages = Math.ceil(total / limit);
    await this.applyLocaleToCategories(sortedData, locale);

    // If ES didn't provide facets (e.g. category_names not indexed), compute from DB
    if (Object.keys(categoryFacets).length === 0) {
      if (search) {
        // Text search active: compute per-category distribution from DB
        categoryFacets = await this.computeCategoryFacetsFromDb(search, strict);
      } else if (categoriesArray.length > 0) {
        // Category-only filter (no text): each category holds `total` devices
        categoryFacets = Object.fromEntries(
          categoriesArray.map((cat) => [cat, total]),
        );
      } else {
        // No text and no category filter: global per-category distribution
        categoryFacets = await this.computeCategoryFacetsFromDb(
          undefined,
          strict,
        );
      }
    }

    return {
      data: sortedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      categoryFacets,
    };
  }
  private async computeCategoryFacetsFromDb(
    search: string | undefined,
    strict: boolean,
  ): Promise<Record<string, number>> {
    const qb = this.deviceRepository
      .createQueryBuilder('fDevice')
      .select('fCat.name', 'categoryName')
      .addSelect('COUNT(DISTINCT fDevice.device_id)', 'cnt')
      .innerJoin('fDevice.categories', 'fCat');

    if (search && search.trim()) {
      if (strict) {
        qb.where(
          `CONCAT(fDevice.brand, ' ', fDevice.model) ILIKE :facetPhrase`,
          {
            facetPhrase: `%${search.trim()}%`,
          },
        );
      } else {
        qb.leftJoin('fDevice.categories', 'fCatSearch');
        const keywords = search
          .split(/[\s,]+/)
          .map((w) => w.trim())
          .filter(Boolean);
        keywords.forEach((keyword, idx) => {
          const p = `fkw${idx}`;
          qb.andWhere(
            `(fDevice.brand ILIKE :${p} OR fDevice.device_type ILIKE :${p} OR fDevice.model ILIKE :${p} OR fCatSearch.name ILIKE :${p} OR fDevice.ean ILIKE :${p} OR fDevice.serial_number ILIKE :${p} OR fDevice.product_code ILIKE :${p})`,
            { [p]: `%${keyword}%` },
          );
        });
      }
    }

    qb.groupBy('fCat.name');
    const rows = await qb.getRawMany<{ categoryName: string; cnt: string }>();
    return Object.fromEntries(
      rows.map((r) => [r.categoryName, parseInt(r.cnt, 10)]),
    );
  }

  async listDevicesMinimal(): Promise<
    {
      device_id: number;
      urn: string;
      brand: string;
      model: string;
      categoryNames: string[];
      categoryIfixitWikiIds: string[];
    }[]
  > {
    const devices = await this.deviceRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.categories', 'c')
      .select([
        'd.device_id',
        'd.urn',
        'd.brand',
        'd.model',
        'c.name',
        'c.ifixit_wikiid',
      ])
      .where("d.urn IS NOT NULL AND d.urn != ''")
      .getMany();
    return devices.map((d) => ({
      device_id: d.device_id,
      urn: d.urn,
      brand: d.brand,
      model: d.model,
      categoryNames: (d.categories || []).map((c) => c.name),
      categoryIfixitWikiIds: (d.categories || [])
        .map((c) => c.ifixit_wikiid)
        .filter((wikiid): wikiid is string => !!wikiid),
    }));
  }

  /**
   * The filter list, without the locale labels.
   *
   * Both queries below walk the whole device table — 1.1 million rows — and
   * the device search asks for them on every mount, so a busy afternoon meant
   * dozens of full scans in parallel. On 2026-09-10 the service was killed by
   * the heap limit in the middle of one, and stayed down: no restart policy.
   *
   * The list only changes when devices are imported, so it is held for an hour
   * and shared by every caller, including the ones that arrive while the first
   * query is still running.
   */
  private filtersCache?: { at: number; filters: Promise<Filter[]> };
  private static readonly FILTERS_TTL_MS = 60 * 60 * 1000;

  private async loadFilters(): Promise<Filter[]> {
    const filters: Filter[] = [];

    const brands = await this.deviceRepository
      .createQueryBuilder('device')
      .leftJoin('device.categories', 'category')
      .select('device.brand', 'brand')
      .addSelect(
        `array_agg(DISTINCT category.name) FILTER (WHERE category.name IS NOT NULL)`,
        'categories',
      )
      .groupBy('device.brand')
      .getRawMany();

    /*const models = await this.deviceRepository
      .createQueryBuilder('device')
      .select('DISTINCT device.model', 'model')
      .getRawMany();*/

    // fetch categories via the many-to-many relation
    const categories = await this.deviceRepository
      .createQueryBuilder('device')
      .leftJoin('device.categories', 'category')
      .select('DISTINCT category.name', 'device_category')
      .getRawMany();

    brands.forEach((b) => {
      if (b.brand) {
        filters.push({
          id: `brand-${b.brand}`,
          category: 'brand',
          name: b.brand,
          categories: b.categories || [],
        });
      }
    });

    /*models.forEach((m) => {
      if (m.model) {
        filters.push({
          id: `model-${m.model}`,
          category: 'model',
          name: m.model,
        });
      }
    });*/

    categories.forEach((c) => {
      if (c.device_category) {
        filters.push({
          id: `device_category-${c.device_category}`,
          category: 'device_category',
          name: c.device_category,
        });
      }
    });

    filters.sort((a, b) => {
      if (a.category.toLowerCase() < b.category.toLowerCase()) return -1;
      if (a.category.toLowerCase() > b.category.toLowerCase()) return 1;
      if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
      if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
      return 0;
    });

    return filters;
  }

  async getFilters(locale?: string): Promise<Filter[]> {
    const now = Date.now();
    if (
      !this.filtersCache ||
      now - this.filtersCache.at > DevicesService.FILTERS_TTL_MS
    ) {
      // Stored before it resolves, so callers that arrive during the query
      // wait for that one instead of starting another.
      const pending = this.loadFilters();
      this.filtersCache = { at: now, filters: pending };
      pending.catch(() => {
        // A failure must not be served for an hour.
        this.filtersCache = undefined;
      });
    }

    // Copied: the block below writes `label` on the entries, and the cached
    // list is shared by every locale.
    const filters = (await this.filtersCache.filters).map((f) => ({ ...f }));

    // Translate device_category filter labels if locale is provided
    if (locale && locale !== 'en') {
      const catNames = filters
        .filter((f) => f.category === 'device_category')
        .map((f) => f.name);
      if (catNames.length > 0) {
        const rows: { name: string; translated_name: string }[] =
          await this.deviceRepository.query(
            `SELECT c.name, COALESCE(t.translated_name, c.name) AS translated_name
             FROM device_categories c
             LEFT JOIN device_category_translations t ON c.id = t.category_id AND t.locale = $1
             WHERE c.name = ANY($2)`,
            [locale, catNames],
          );
        const translationMap = new Map(
          rows.map((r) => [r.name, r.translated_name]),
        );
        for (const f of filters) {
          if (f.category === 'device_category') {
            const translated = translationMap.get(f.name);
            if (translated && translated !== f.name) f.label = translated;
          }
        }
      }
    }

    return filters;
  }

  async searchDevices(
    query: string,
    strict = false,
    locale?: string,
  ): Promise<Device[]> {
    if (!query) return [];

    console.log('Recherche avec critères :', query, '| strict:', strict);

    const qb = this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.technicalProperties', 'technicalProperties')
      .leftJoinAndSelect(
        'device.informationalProperties',
        'informationalProperties',
      )
      .leftJoinAndSelect('device.categories', 'category');

    if (strict) {
      // Strict mode: match the full phrase in CONCAT(brand, ' ', model)
      qb.where(`CONCAT(device.brand, ' ', device.model) ILIKE :phrase`, {
        phrase: `%${query.trim()}%`,
      });
    } else {
      const keywords = query
        .split(',')
        .map((word) => word.trim())
        .filter(Boolean);

      if (keywords.length === 0) return qb.getMany();

      const whereParts: string[] = [];
      const params: Record<string, string> = {};

      keywords.forEach((keyword, idx) => {
        const param = `kw${idx}`;
        whereParts.push(`device.brand ILIKE :${param}`);
        whereParts.push(`device.device_type ILIKE :${param}`);
        whereParts.push(`device.model ILIKE :${param}`);
        whereParts.push(`category.name ILIKE :${param}`);
        params[param] = `%${keyword}%`;
      });

      qb.where(whereParts.join(' OR '), params);
    }

    // Use distinct because left joins can duplicate rows
    qb.distinct(true);

    const results = await qb.getMany();
    // In some runtime environments the QueryBuilder result may not include
    // the relation property (it can be undefined). If that happens, re-load
    // the devices using the repository with explicit relations to guarantee
    // the `categories` property is present in the returned objects.
    if (results.length === 0) return results;

    const firstHasCategories = Object.prototype.hasOwnProperty.call(
      results[0],
      'categories',
    );
    if (!firstHasCategories) {
      const ids = results.map((d) => d.device_id);
      const fallback = await this.deviceRepository.find({
        where: { device_id: In(ids) },
        relations: [
          'technicalProperties',
          'categories',
          'informationalProperties',
        ],
      });
      return this.applyLocaleToCategories(fallback, locale);
    }

    return this.applyLocaleToCategories(results, locale);
  }

  async getById(id: number, locale?: string): Promise<Device> {
    console.log('get by id', id);
    const device = await this.deviceRepository.findOne({
      where: { device_id: id }, // Parse id to number
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
        'photos',
      ],
      relationLoadStrategy: 'query',
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    await this.applyLocaleToCategories([device], locale);
    return device;
  }

  async getByUrn(urn: string, locale?: string): Promise<Device> {
    console.log('get by urn', urn);
    const device = await this.deviceRepository.findOne({
      where: { urn },
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
        'photos',
      ],
      relationLoadStrategy: 'query',
    });

    if (!device) {
      throw new NotFoundException(`Device with URN ${urn} not found`);
    }

    await this.applyLocaleToCategories([device], locale);
    return device;
  }

  async findBySourceId(sourceId: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { source_id: sourceId },
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
        'photos',
      ],
      relationLoadStrategy: 'query',
    });
  }

  /**
   * Lightweight check if a device exists by source_id (for import optimization)
   * Returns only device_id and source_id without loading relations
   */
  async existsBySourceId(
    sourceId: string,
  ): Promise<{ device_id: number } | null> {
    return this.deviceRepository.findOne({
      where: { source_id: sourceId },
      select: ['device_id'],
    });
  }
  async getDevicesByIds(ids: number[], locale?: string): Promise<Device[]> {
    const devices = await this.deviceRepository.find({
      where: { device_id: In(ids) },
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
      ],
    });
    if (devices.length !== ids.length) {
      const foundIds = devices.map((d) => d.device_id);
      const notFoundIds = ids.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Devices with IDs ${notFoundIds.join(', ')} not found`,
      );
    }
    return this.applyLocaleToCategories(devices, locale);
  }

  async createDevice(
    payload: Omit<
      Partial<Device>,
      'technicalProperties' | 'informationalProperties'
    > & {
      technicalProperties?: { property_name: string; property_value: string }[];
      informationalProperties?: {
        property_name: string;
        property_value: string;
      }[];
    },
  ): Promise<Device> {
    // If technical properties are provided, attach them to the device entity
    // and rely on the OneToMany cascade save to persist them in the same
    // transaction. This avoids separate inserts which can cause duplicate
    // key errors when sequences are out-of-sync or when race conditions occur.
    const deviceEntity = this.deviceRepository.create(
      payload as DeepPartial<Device>,
    );

    if (payload.technicalProperties && payload.technicalProperties.length) {
      deviceEntity.technicalProperties = payload.technicalProperties.map((p) =>
        this.deviceTechnicalPropertyRepository.create({
          property_name: p.property_name,
          property_value: p.property_value,
        }),
      );
    }

    if (
      payload.informationalProperties &&
      payload.informationalProperties.length
    ) {
      deviceEntity.informationalProperties =
        payload.informationalProperties.map((p) =>
          this.deviceInformationalPropertyRepository.create({
            property_name: p.property_name,
            property_value: p.property_value,
          }),
        );
    }

    // Handle categories array of IDs
    if (
      (payload as any).categories &&
      Array.isArray((payload as any).categories)
    ) {
      const ids: number[] = (payload as any).categories;
      if (ids.length > 0) {
        const categories = await this.deviceCategoryRepository.find({
          where: { id: In(ids) },
        });
        deviceEntity.categories = categories;
      }
    }

    const saved = await this.deviceRepository.save(deviceEntity);
    await this.modelAssignment.assignDevice(saved.device_id);
    await this.deviceSearchService.indexDevice(saved);

    // Update URN after insert (AfterInsert hook sets it but doesn't persist)
    if (saved.urn) {
      await this.deviceRepository.update(saved.device_id, { urn: saved.urn });
    }

    return this.getById(saved.device_id);
  }

  async updateDevice(
    id: number,
    payload: Omit<
      Partial<Device>,
      'technicalProperties' | 'informationalProperties'
    > & {
      technicalProperties?: { property_name: string; property_value: string }[];
      informationalProperties?: {
        property_name: string;
        property_value: string;
      }[];
    },
  ): Promise<Device> {
    const device = await this.getById(id);
    const placedFrom = placementInputs(device);
    const replaceTechnical = !!(payload as any).technicalProperties;
    const replaceInformational = !!(payload as any).informationalProperties;

    // Handle technical properties update if provided
    if (replaceTechnical) {
      // Create new properties
      const newProps = (payload as any).technicalProperties.map((p) =>
        this.deviceTechnicalPropertyRepository.create({
          property_name: p.property_name,
          property_value: p.property_value,
        }),
      );
      device.technicalProperties = newProps;
    }

    // Handle informational properties update if provided
    if (replaceInformational) {
      // Create new properties
      const newProps = (payload as any).informationalProperties.map((p) =>
        this.deviceInformationalPropertyRepository.create({
          property_name: p.property_name,
          property_value: p.property_value,
        }),
      );
      device.informationalProperties = newProps;
    }

    // Handle categories update if provided
    if (
      (payload as any).categories &&
      Array.isArray((payload as any).categories)
    ) {
      const ids: number[] = (payload as any).categories;
      if (ids.length > 0) {
        const categories = await this.deviceCategoryRepository.find({
          where: { id: In(ids) },
        });
        device.categories = categories;
      } else {
        device.categories = [];
      }
    }

    // Plain columns only: a relation sent as null would make TypeORM unlink
    // every row of it.
    const relations = [
      'technicalProperties',
      'informationalProperties',
      'categories',
      'photos',
    ];
    Object.assign(
      device,
      Object.fromEntries(
        Object.entries(payload).filter(([key]) => !relations.includes(key)),
      ),
    );

    // The old properties go in the transaction of the save: a save refused by
    // a unique index (an EAN another device holds) must not leave the device
    // without them.
    const saved = await this.deviceRepository.manager.transaction(
      async (manager) => {
        if (replaceTechnical) {
          await manager.delete(DeviceTechnicalProperty, {
            device: { device_id: id },
          });
        }
        if (replaceInformational) {
          await manager.delete(DeviceInformationalProperty, {
            device: { device_id: id },
          });
        }
        return manager.save(device);
      },
    );
    // A new name, category or picture can move the device or change its
    // model; a re-import that changes none of them costs nothing.
    if (placementInputs(saved) !== placedFrom) {
      await this.modelAssignment.assignDevice(id);
    }
    await this.deviceSearchService.indexDevice(saved);
    return this.getById(id);
  }

  async addDevicePhotos(
    deviceId: number,
    photoUrls: { url: string; key: string }[],
    author: Author = NO_AUTHOR,
  ): Promise<DevicePhoto[]> {
    const photos = photoUrls.map((p) =>
      this.devicePhotoRepository.create({
        deviceId,
        url: p.url,
        key: p.key,
        createdBy: author.created_by,
        isDemo: author.is_demo,
      }),
    );
    const saved = await this.devicePhotoRepository.save(photos);
    // A picture can make the variant its model's representative.
    await this.modelAssignment.assignDevice(deviceId);
    return saved;
  }

  /**
   * By whoever uploaded it or an administrator; a photo of another device
   * than the one named is not found.
   */
  async deleteDevicePhoto(
    photoId: string,
    editor: Editor = NO_EDITOR,
    deviceId?: number,
  ): Promise<{ key: string }> {
    const photo = await this.devicePhotoRepository.findOne({
      where: { id: photoId, ...(deviceId ? { deviceId } : {}) },
      select: { id: true, deviceId: true, key: true, createdBy: true },
    });
    if (!photo) {
      throw new NotFoundException(`Photo with ID ${photoId} not found`);
    }
    if (!mayEdit(editor, photo.createdBy)) {
      throw new ForbiddenException(
        'Only its author or an administrator may delete this photo',
      );
    }
    await this.devicePhotoRepository.remove(photo);
    await this.modelAssignment.assignDevice(photo.deviceId);
    return { key: photo.key };
  }
}
