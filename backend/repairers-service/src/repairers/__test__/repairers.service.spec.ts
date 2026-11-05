/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { RepairersService } from '../services/repairers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repairer } from '../repairer.entity';
import { RepairerDevice } from '../repairer-device.entity';
import { Brackets, Repository } from 'typeorm';
import { RepairerSearchService } from '../../search/repairer-search.service';

describe('RepairersService', () => {
  let service: RepairersService;
  let repairerRepo: jest.Mocked<Repository<Repairer>>;
  let repairerDeviceRepo: jest.Mocked<Repository<RepairerDevice>>;
  let mockRepairerQueryBuilder: any;
  let mockDeviceQueryBuilder: any;
  let mockRepairerSearchService: any;
  beforeEach(async () => {
    mockRepairerQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([{ repairer_id: '1', name: 'Test' }]),
    };

    mockDeviceQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockRepairerSearchService = {
      searchRepairersPaginated: jest.fn().mockResolvedValue({
        hits: [{ _id: '1' }],
        total: 1,
      }),
      indexRepairer: jest.fn(),
      removeRepairer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairersService,
        {
          provide: getRepositoryToken(Repairer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(mockRepairerQueryBuilder),
            metadata: {
              columns: [
                { databaseName: 'name', type: 'varchar', isPrimary: false },
                { databaseName: 'country', type: 'varchar', isPrimary: false },
                { databaseName: 'repairer_id', type: 'uuid', isPrimary: true },
              ],
              findColumnWithPropertyName: jest.fn(),
            },
          },
        },
        {
          provide: getRepositoryToken(RepairerDevice),
          useValue: {
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(mockDeviceQueryBuilder),
            metadata: {
              findColumnWithPropertyName: jest.fn(),
            },
          },
        },
        {
          provide: RepairerSearchService,
          useValue: mockRepairerSearchService,
        },
      ],
    }).compile();

    service = module.get<RepairersService>(RepairersService);
    repairerRepo = module.get(getRepositoryToken(Repairer));
    repairerDeviceRepo = module.get(getRepositoryToken(RepairerDevice));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all repairers', async () => {
    const repairers = [{ repairer_id: '1' }] as unknown as Repairer[];
    repairerRepo.find.mockResolvedValue(repairers);

    const result = await service.findAll();
    expect(result).toEqual(repairers);
    // Also what the sync command indexes: nothing unpublished.
    expect(repairerRepo.find).toHaveBeenCalledWith({
      where: { status: 'published' },
      relations: ['repairerDevices'],
    });
  });

  it('should return one repairer by id', async () => {
    const repairer = { repairer_id: '1', status: 'published' } as Repairer;
    repairerRepo.findOne.mockResolvedValue(repairer);

    const result = await service.findOne('1');
    expect(result).toEqual(repairer);
  });

  it("counts one contributor's repairers by status, and their waiting changes", async () => {
    const row = { repairers: 3, pending: 1, published: 1, rejected: 1, revisions: 1 };
    (repairerRepo as any).query = jest.fn().mockResolvedValue([row]);

    expect(await service.demoStatsOf(9)).toEqual(row);
    const [sql, params] = (repairerRepo as any).query.mock.calls[0];
    expect(sql).toContain('r.is_demo AND r.created_by = $1');
    expect(params).toEqual([9]);
  });

  describe('purgeDemo', () => {
    beforeEach(() => {
      repairerRepo.find.mockResolvedValue([
        { repairer_id: 'a', status: 'published' },
        { repairer_id: 'b', status: 'pending' },
      ] as Repairer[]);
    });

    it("counts the contributors' repairers in a preview", async () => {
      expect(await service.purgeDemo(true)).toEqual({ repairers: 2 });
      expect(repairerRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_demo: true } }),
      );
      expect(repairerRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes them, and the search document of a published one', async () => {
      expect(await service.purgeDemo(false)).toEqual({ repairers: 2 });
      expect(repairerRepo.delete).toHaveBeenCalledWith(['a', 'b']);
      // b was never indexed.
      expect(mockRepairerSearchService.removeRepairer).toHaveBeenCalledTimes(1);
      expect(mockRepairerSearchService.removeRepairer).toHaveBeenCalledWith('a');
    });

    it('does nothing when there are none', async () => {
      repairerRepo.find.mockResolvedValue([]);
      expect(await service.purgeDemo(false)).toEqual({ repairers: 0 });
      expect(repairerRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('a repairer not yet published', () => {
    const author = (createdBy: number | null) =>
      (mockRepairerQueryBuilder.getRawOne = jest
        .fn()
        .mockResolvedValue({ created_by: createdBy }));

    beforeEach(() => {
      repairerRepo.findOne.mockResolvedValue({
        repairer_id: '1',
        status: 'pending',
      } as Repairer);
    });

    it('is hidden from the public, as if it did not exist', async () => {
      author(7);
      await expect(service.findOne('1')).rejects.toThrow(
        'Repairer with id 1 not found',
      );
    });

    it('is hidden from another user', async () => {
      author(7);
      await expect(
        service.findOne('1', { created_by: 8, is_demo: false, admin: false }),
      ).rejects.toThrow('not found');
    });

    it('is shown to its author', async () => {
      author(7);
      await expect(
        service.findOne('1', { created_by: 7, is_demo: false, admin: false }),
      ).resolves.toMatchObject({ repairer_id: '1' });
    });

    it('is shown to an administrator without looking up its author', async () => {
      mockRepairerQueryBuilder.getRawOne = jest.fn();
      await expect(
        service.findOne('1', { created_by: 1, is_demo: false, admin: true }),
      ).resolves.toMatchObject({ repairer_id: '1' });
      expect(mockRepairerQueryBuilder.getRawOne).not.toHaveBeenCalled();
    });

    it('is never indexed by an update', async () => {
      repairerRepo.update.mockResolvedValue({ affected: 1 } as any);
      await service.update('1', { name: 'Updated' });
      expect(mockRepairerSearchService.indexRepairer).not.toHaveBeenCalled();
    });
  });

  it('should throw if repairer not found', async () => {
    repairerRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne('notfound')).rejects.toThrow(
      'Repairer with id notfound not found',
    );
  });

  it('should create a repairer', async () => {
    const repairer = { name: 'Test' } as Repairer;
    repairerRepo.save.mockResolvedValue(repairer);

    const result = await service.create(repairer);
    expect(result).toEqual(repairer);
  });

  it('should update a repairer', async () => {
    const repairer = { repairer_id: '1' } as Repairer;
    repairerRepo.update.mockResolvedValue({ affected: 1 } as any);
    repairerRepo.findOne.mockResolvedValue(repairer);

    const result = await service.update('1', { name: 'Updated' });
    expect(result).toEqual(repairer);
  });

  it('should delete a repairer, and its search document', async () => {
    repairerRepo.delete.mockResolvedValue({ affected: 1 } as any);
    await service.delete('1');
    expect(repairerRepo.delete).toHaveBeenCalledWith('1');
    expect(mockRepairerSearchService.removeRepairer).toHaveBeenCalledWith('1');
  });

  it('should refuse to delete a repairer that does not exist', async () => {
    repairerRepo.delete.mockResolvedValue({ affected: 0 } as any);
    await expect(service.delete('9')).rejects.toThrow(
      'Repairer with id 9 not found',
    );
    expect(mockRepairerSearchService.removeRepairer).not.toHaveBeenCalled();
  });

  it('should replace the device types an update carries', async () => {
    const deviceQb = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };
    (repairerDeviceRepo as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(deviceQb);
    (repairerDeviceRepo as any).create = jest.fn((d) => d);
    (repairerDeviceRepo as any).save = jest.fn().mockResolvedValue([]);
    repairerRepo.findOne.mockResolvedValue({
      repairer_id: '1',
      status: 'published',
    } as Repairer);

    await service.update('1', {
      repairerDevices: [{ device_type: 'laptop' }] as any,
    });

    // update() cannot write a relation: no field update, the rows replaced.
    expect(repairerRepo.update).not.toHaveBeenCalled();
    expect(deviceQb.where).toHaveBeenCalledWith('repairer_id = :id', {
      id: '1',
    });
    expect((repairerDeviceRepo as any).save).toHaveBeenCalledWith([
      { device_type: 'laptop', repairer: { repairer_id: '1' } },
    ]);
    expect(mockRepairerSearchService.indexRepairer).toHaveBeenCalled();
  });

  it('should get filters', async () => {
    (mockRepairerQueryBuilder.getRawMany as jest.Mock)
      .mockResolvedValueOnce([{ country: 'France' }, { country: 'Allemagne' }])
      .mockResolvedValueOnce([
        {
          device_type_lower: 'smartphones',
          device_type: 'Smartphones',
          count: '3',
        },
        {
          device_type_lower: 'consoles',
          device_type: 'Consoles',
          count: '1',
        },
      ]);

    const filters = await service.getFilters();

    expect(filters).toEqual([
      { id: 'Allemagne', category: 'country', name: 'Allemagne' },
      { id: 'France', category: 'country', name: 'France' },
      {
        id: 'Consoles',
        category: 'device_type',
        name: 'Consoles',
        count: 1,
      },
      {
        id: 'Smartphones',
        category: 'device_type',
        name: 'Smartphones',
        count: 3,
      },
    ]);
  });

  it('should return repairers based on search only', async () => {
    const result = await service.searchRepairers({
      search: 'test',
      filters: {},
    });

    expect(mockRepairerQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.any(Brackets),
    );
    expect(mockRepairerQueryBuilder.getMany).toHaveBeenCalled();
    expect(result).toEqual([{ repairer_id: '1', name: 'Test' }]);
  });

  it('should widen the search when no repairer declares the device type', async () => {
    (repairerRepo.metadata.findColumnWithPropertyName as any) = jest.fn(
      () => undefined,
    );
    (repairerDeviceRepo.metadata.findColumnWithPropertyName as any) = jest.fn(
      (name: string) =>
        name === 'device_type' ? { databaseName: 'device_type' } : undefined,
    );

    mockRepairerQueryBuilder.getMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ repairer_id: '1', name: 'Test' }]);

    const result = await service.searchRepairers({
      search: '',
      filters: { device_type: 'Washing machine / Combi dryer' },
    });

    expect(mockRepairerQueryBuilder.getMany).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ repairer_id: '1', name: 'Test' }]);
  });

  it('should not widen the search when the device type does match', async () => {
    (repairerRepo.metadata.findColumnWithPropertyName as any) = jest.fn(
      () => undefined,
    );
    (repairerDeviceRepo.metadata.findColumnWithPropertyName as any) = jest.fn(
      (name: string) =>
        name === 'device_type' ? { databaseName: 'device_type' } : undefined,
    );

    mockRepairerQueryBuilder.getMany.mockResolvedValueOnce([
      { repairer_id: '1', name: 'Test' },
    ]);

    await service.searchRepairers({
      search: '',
      filters: { device_type: 'laptop' },
    });

    expect(mockRepairerQueryBuilder.getMany).toHaveBeenCalledTimes(1);
  });

  it('should return repairers based on filters only', async () => {
    // simulate metadata lookup
    (repairerRepo.metadata.findColumnWithPropertyName as any) = jest.fn(
      (name) => {
        if (name === 'country') return { databaseName: 'country' };
        return undefined;
      },
    );

    const result = await service.searchRepairers({
      search: '',
      filters: { country: 'france' },
    });

    expect(mockRepairerQueryBuilder.andWhere).toHaveBeenCalledWith(
      'UPPER(repairer.country) = :country',
      { country: 'FR' },
    );
    expect(result).toEqual([{ repairer_id: '1', name: 'Test' }]);
  });

  it('should return repairers based on filters from repairerDevice', async () => {
    // simulate that country is not in repairer, but in repairerDevice
    (repairerRepo.metadata.findColumnWithPropertyName as any) = jest.fn(() => ({
      databaseName: 'device_type',
    }));
    (repairerDeviceRepo.metadata.findColumnWithPropertyName as any) = jest.fn(
      (name) => {
        if (name === 'device_type') return { databaseName: 'device_type' };
        return undefined;
      },
    );

    const result = await service.searchRepairers({
      search: '',
      filters: { device_type: 'smartphones' },
    });

    expect(mockRepairerQueryBuilder.andWhere).toHaveBeenCalledWith(
      'LOWER(device_type) LIKE :device_type',
      { device_type: '%smartphones%' },
    );
    expect(result).toEqual([{ repairer_id: '1', name: 'Test' }]);
  });

  it('should handle empty input gracefully', async () => {
    const result = await service.searchRepairers({
      search: '',
      filters: {},
    });

    expect(mockRepairerQueryBuilder.getMany).toHaveBeenCalled();
    expect(result).toEqual([{ repairer_id: '1', name: 'Test' }]);
  });

  describe('findNearestRepairer', () => {
    it('should find the nearest repairer and distance', async () => {
      const repairers = [
        { repairer_id: '1', latitude: 48.8566, longitude: 2.3522 }, // Paris
        { repairer_id: '2', latitude: 51.5074, longitude: 0.1278 }, // London
        { repairer_id: '3', latitude: 40.7128, longitude: -74.006 }, // New York
      ] as unknown as Repairer[];
      repairerRepo.find.mockResolvedValue(repairers);

      const result = await service.findNearestRepairer(48.8566, 2.3522);

      expect(result).toBeDefined();
      expect(result?.repairer.repairer_id).toBe('1');
      expect(result?.distance).toBeCloseTo(0);
    });

    it('should return null if no repairers are found', async () => {
      repairerRepo.find.mockResolvedValue([]);

      const result = await service.findNearestRepairer(0, 0);

      expect(result).toBeNull();
    });

    it('should return null if no repairers have coordinates', async () => {
      const repairers = [
        {
          repairer_id: '1',
          repairer_import_id: '',
          name: '',
          description: '',
          address: '',
          country: '',
          city: '',
          postal_code: '',
          phone: '',
          email: '',
          latitude: 0,
          longitude: 0,
          repairerDevices: [],
          source: '',
          website: '',
        },
      ] as unknown as Repairer[];
      repairerRepo.find.mockResolvedValue(repairers);

      const result = await service.findNearestRepairer(0, 0);

      expect(result).toBeNull();
    });

    it('should find the nearest repairer among multiple with valid coordinates', async () => {
      const repairers = [
        { repairer_id: '1', latitude: 48.8566, longitude: 2.3522 }, // Paris
        { repairer_id: '2', latitude: 48.8584, longitude: 2.2945 }, // Eiffel Tower (closer to Paris)
        { repairer_id: '3', latitude: 51.5074, longitude: 0.1278 }, // London
      ] as unknown as Repairer[];
      repairerRepo.find.mockResolvedValue(repairers);

      const result = await service.findNearestRepairer(48.857, 2.3); // Near Paris

      expect(result).toBeDefined();
      expect(result?.repairer.repairer_id).toBe('2'); // Eiffel Tower is closer
      expect(result?.distance).toBeLessThan(
        service['haversineDistance'](48.857, 2.3, 48.8566, 2.3522), // Compare to Paris distance
      );
    });
  });

  describe('findPaginated', () => {
    let paginatedQueryBuilder: any;

    beforeEach(() => {
      paginatedQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(25),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { repairer_id: '1', name: 'Repairer 1' },
          { repairer_id: '2', name: 'Repairer 2' },
        ]),
      };
      repairerRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(paginatedQueryBuilder);
    });

    it('should return paginated repairers without filters via ES', async () => {
      const mockResult = {
        hits: [{ _id: '1' }],
        total: 1,
      };
      mockRepairerSearchService.searchRepairersPaginated.mockResolvedValue(
        mockResult,
      );
      repairerRepo.find.mockResolvedValue([
        { repairer_id: '1', name: 'Repairer 1' },
      ] as any);

      const result = await service.findPaginated(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(
        mockRepairerSearchService.searchRepairersPaginated,
      ).toHaveBeenCalledWith('', 0, 10, { country: undefined });
    });

    it('should fallback to database if ES fails', async () => {
      mockRepairerSearchService.searchRepairersPaginated.mockRejectedValue(
        new Error('ES Down'),
      );
      paginatedQueryBuilder.getCount.mockResolvedValue(25);
      paginatedQueryBuilder.getMany.mockResolvedValue([
        { repairer_id: '1', name: 'Repairer 1' },
      ]);

      const result = await service.findPaginated(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(25);
      expect(paginatedQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should return paginated repairers without filters', async () => {
      const result = await service.findPaginated(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });
      expect(paginatedQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(paginatedQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply pagination correctly for page 2', async () => {
      await service.findPaginated(2, 10);

      expect(paginatedQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(paginatedQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should filter by country', async () => {
      await service.findPaginated(1, 10, { country: 'France' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'UPPER(repairer.country) = :country',
        { country: 'FR' },
      );
    });

    it('should filter by device_type with case-insensitive comparison', async () => {
      await service.findPaginated(1, 10, { device_type: 'Laptop' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(repairerDevices.device_type) = LOWER(:device_type)',
        { device_type: 'Laptop' },
      );
    });

    it('should filter by search term', async () => {
      await service.findPaginated(1, 10, { search: 'test' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(Brackets),
      );
    });

    it('should filter by partner_type', async () => {
      await service.findPaginated(1, 10, { partner_type: 'recycler' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'repairer.partner_type IN (:...partner_types)',
        { partner_types: ['recycler', 'both'] },
      );
    });

    it('should include the mixed partners when filtering on repairer', async () => {
      await service.findPaginated(1, 10, { partner_type: 'repairer' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'repairer.partner_type IN (:...partner_types)',
        { partner_types: ['repairer', 'both', 'repairer_reuse'] },
      );
    });

    it('should include repairers that also resell when filtering on reuse', async () => {
      await service.findPaginated(1, 10, { partner_type: 'reuse' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'repairer.partner_type IN (:...partner_types)',
        { partner_types: ['reuse', 'repairer_reuse'] },
      );
    });

    it('should match any of several partner types', async () => {
      await service.findPaginated(1, 10, { partner_type: ['repairer', 'reuse'] });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'repairer.partner_type IN (:...partner_types)',
        { partner_types: ['repairer', 'both', 'repairer_reuse', 'reuse'] },
      );
    });

    it('should not filter on an empty list of partner types', async () => {
      await service.findPaginated(1, 10, { partner_type: [] });

      expect(paginatedQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'repairer.partner_type IN (:...partner_types)',
        expect.anything(),
      );
    });

    it('should not widen the filter when partner_type is already "both"', async () => {
      await service.findPaginated(1, 10, { partner_type: 'both' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'repairer.partner_type IN (:...partner_types)',
        { partner_types: ['both'] },
      );
    });

    it('should not widen the filter when partner_type is "other"', async () => {
      await service.findPaginated(1, 10, { partner_type: 'other' });

      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'repairer.partner_type IN (:...partner_types)',
        { partner_types: ['other'] },
      );
    });

    it('should bypass Elasticsearch when partner_type filter is present', async () => {
      await service.findPaginated(1, 10, { partner_type: 'recycler' });

      expect(
        mockRepairerSearchService.searchRepairersPaginated,
      ).not.toHaveBeenCalled();
      expect(paginatedQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should combine multiple filters', async () => {
      await service.findPaginated(1, 10, {
        country: 'France',
        device_type: 'Laptop',
        partner_type: 'repairer',
        search: 'repair',
      });

      // The four filters, and the one every public read carries.
      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledTimes(5);
      expect(paginatedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'repairer.status = :published',
        { published: 'published' },
      );
    });

    it('should calculate total pages correctly', async () => {
      paginatedQueryBuilder.getCount = jest.fn().mockResolvedValue(27);

      const result = await service.findPaginated(1, 10);

      expect(result.meta.totalPages).toBe(3); // Math.ceil(27/10) = 3
    });

    it('should use default values for page and limit', async () => {
      const result = await service.findPaginated();

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(paginatedQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(paginatedQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should bypass ES and sort by distance when lat/lon are provided', async () => {
      paginatedQueryBuilder.getMany.mockResolvedValue([
        { repairer_id: '1', name: 'Far', latitude: 51.5074, longitude: 0.1278 }, // London
        {
          repairer_id: '2',
          name: 'Close',
          latitude: 48.8584,
          longitude: 2.2945,
        }, // Eiffel Tower
        {
          repairer_id: '3',
          name: 'Medium',
          latitude: 50.8503,
          longitude: 4.3517,
        }, // Brussels
      ]);
      paginatedQueryBuilder.getCount.mockResolvedValue(3);

      const result = await service.findPaginated(1, 10, {
        latitude: 48.8566,
        longitude: 2.3522, // Paris
      });

      expect(
        mockRepairerSearchService.searchRepairersPaginated,
      ).not.toHaveBeenCalled();
      expect(result.data[0].name).toBe('Close'); // Eiffel Tower — closest
      expect(result.data[1].name).toBe('Medium'); // Brussels
      expect(result.data[2].name).toBe('Far'); // London
      expect(result.meta.total).toBe(3);
      expect(paginatedQueryBuilder.skip).not.toHaveBeenCalled();
      expect(paginatedQueryBuilder.take).not.toHaveBeenCalled();
    });

    it('should paginate in-memory when sorting by distance', async () => {
      paginatedQueryBuilder.getMany.mockResolvedValue([
        { repairer_id: '1', name: 'Far', latitude: 51.5074, longitude: 0.1278 }, // London
        {
          repairer_id: '2',
          name: 'Close',
          latitude: 48.8584,
          longitude: 2.2945,
        }, // Eiffel Tower
        {
          repairer_id: '3',
          name: 'Medium',
          latitude: 50.8503,
          longitude: 4.3517,
        }, // Brussels
      ]);
      paginatedQueryBuilder.getCount.mockResolvedValue(3);

      const result = await service.findPaginated(1, 2, {
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Close');
      expect(result.data[1].name).toBe('Medium');
      expect(result.meta).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('should place repairers without coordinates last when sorting by distance', async () => {
      paginatedQueryBuilder.getMany.mockResolvedValue([
        { repairer_id: '1', name: 'NoCoords', latitude: null, longitude: null },
        {
          repairer_id: '2',
          name: 'Close',
          latitude: 48.8584,
          longitude: 2.2945,
        },
      ]);
      paginatedQueryBuilder.getCount.mockResolvedValue(2);

      const result = await service.findPaginated(1, 10, {
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result.data[0].name).toBe('Close');
      expect(result.data[1].name).toBe('NoCoords');
    });
  });

  describe('getFilters - normalization', () => {
    it('should deduplicate and normalize device types with different cases', async () => {
      const mockNormQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              device_type_lower: 'laptop',
              device_type: 'laptop',
              count: '1',
            },
            {
              device_type_lower: 'laptop',
              device_type: 'Laptop',
              count: '2',
            },
            {
              device_type_lower: 'laptop',
              device_type: 'LAPTOP',
              count: '1',
            },
            {
              device_type_lower: 'smartphone',
              device_type: 'smartphone',
              count: '5',
            },
          ]),
      };

      repairerRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockNormQueryBuilder);

      const filters = await service.getFilters();

      const deviceTypeFilters = filters.filter(
        (f) => f.category === 'device_type',
      );
      expect(deviceTypeFilters).toHaveLength(2); // Only 2 unique types
      expect(deviceTypeFilters).toContainEqual({
        id: 'Laptop',
        category: 'device_type',
        name: 'Laptop',
        count: 4, // summed across casing variants
      });
      expect(deviceTypeFilters).toContainEqual({
        id: 'Smartphone',
        category: 'device_type',
        name: 'Smartphone',
        count: 5,
      });
    });

    it('should include multiple device types when repository returns several types', async () => {
      const mockMultiQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              device_type_lower: 'consoles',
              device_type: 'consoles',
              count: '2',
            },
            {
              device_type_lower: 'smartphones',
              device_type: 'smartphones',
              count: '7',
            },
          ]),
      };

      repairerRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockMultiQueryBuilder);

      const filters = await service.getFilters();

      expect(filters).toContainEqual({
        id: 'Consoles',
        category: 'device_type',
        name: 'Consoles',
        count: 2,
      });
      expect(filters).toContainEqual({
        id: 'Smartphones',
        category: 'device_type',
        name: 'Smartphones',
        count: 7,
      });
    });
  });

  describe('searchRepairers - distance sorting', () => {
    it('should sort repairers by distance when latitude and longitude provided', async () => {
      const mockSearchQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            repairer_id: '1',
            name: 'Far',
            latitude: 51.5074,
            longitude: 0.1278,
          }, // London
          {
            repairer_id: '2',
            name: 'Close',
            latitude: 48.8566,
            longitude: 2.3522,
          }, // Paris
          {
            repairer_id: '3',
            name: 'Medium',
            latitude: 50.8503,
            longitude: 4.3517,
          }, // Brussels
        ]),
      };

      repairerRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockSearchQueryBuilder);

      const result = await service.searchRepairers({
        search: '',
        filters: {},
        latitude: 48.8566,
        longitude: 2.3522, // Paris coordinates
      });

      expect(result).toHaveLength(3);
      expect(result[0].repairer_id).toBe('2'); // Paris (closest)
      expect(result[1].repairer_id).toBe('3'); // Brussels (medium)
      expect(result[2].repairer_id).toBe('1'); // London (farthest)
    });
  });
});
