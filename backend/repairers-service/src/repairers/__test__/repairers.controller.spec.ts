import { Test, TestingModule } from '@nestjs/testing';
import { RepairersController } from '../repairers.controller';
import { RepairerImporterService } from '../services/repairerImporter.service';
import { RepairerReportsService } from '../services/repairer-reports.service';
import { RpcException } from '@nestjs/microservices';

const mockRepairersService = {
  findAll: jest.fn(),
  findPaginated: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getFilters: jest.fn(),
  searchRepairers: jest.fn(),
  findNearestRepairer: jest.fn(),
};

const mockImporterService = {
  importCsv: jest.fn(),
};

const mockRepairerReportsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  updateStatus: jest.fn(),
};

describe('RepairersController', () => {
  let controller: RepairersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepairersController],
      providers: [
        {
          provide: 'IRepairersService',
          useValue: mockRepairersService,
        },
        {
          provide: RepairerImporterService,
          useValue: mockImporterService,
        },
        {
          provide: RepairerReportsService,
          useValue: mockRepairerReportsService,
        },
      ],
    }).compile();

    controller = module.get<RepairersController>(RepairersController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should get all repairers', async () => {
    mockRepairersService.findAll.mockResolvedValue(['mockRepairer']);
    const result = await controller.getAllRepairers();
    expect(result).toEqual(['mockRepairer']);
  });

  it('should create a repairer', async () => {
    mockRepairersService.create.mockResolvedValue({ id: '1' });
    const result = await controller.createRepairer({ name: 'Test' });
    expect(result).toEqual({ id: '1' });
  });

  it('should get one repairer', async () => {
    mockRepairersService.findOne.mockResolvedValue({ id: '1' });
    const result = await controller.getRepairer({ id: '1' });
    expect(result).toEqual({ id: '1' });
  });

  it('should update a repairer', async () => {
    mockRepairersService.update.mockResolvedValue({ id: '1', name: 'Updated' });
    // The shape the gateway sends.
    const result = await controller.updateRepairer({
      id: '1',
      name: 'Updated',
    });
    expect(result).toEqual({ id: '1', name: 'Updated' });
    expect(mockRepairersService.update).toHaveBeenCalledWith('1', {
      name: 'Updated',
    });
  });

  it('should delete a repairer', async () => {
    mockRepairersService.delete.mockResolvedValue(true);
    const result = await controller.deleteRepairer('1');
    expect(result).toBe(true);
  });

  it('should import repairers', async () => {
    mockImporterService.importCsv.mockResolvedValue(undefined);
    const result = await controller.importRepairers();
    expect(result).toBe(true);
  });

  it('should get repairers filters', async () => {
    mockRepairersService.getFilters.mockResolvedValue(['brand', 'country']);
    const result = await controller.getRepairersFilters();
    expect(result).toEqual(['brand', 'country']);
  });

  it('should search repairers', async () => {
    const searchDto = { search: 'test', filters: {} };
    mockRepairersService.searchRepairers.mockResolvedValue(['filtered']);
    const result = await controller.searchRepairers({ body: { searchDto } });
    expect(result).toEqual(['filtered']);
  });

  it('should find the nearest repairer', async () => {
    const mockResult = { repairer: { id: '1' }, distance: 10 };
    mockRepairersService.findNearestRepairer.mockResolvedValue(mockResult);
    const result = await controller.findNearestRepairer({
      latitude: 10,
      longitude: 20,
    });
    expect(result).toEqual(mockResult);
    expect(mockRepairersService.findNearestRepairer).toHaveBeenCalledWith(
      10,
      20,
    );
  });

  it('should report a repairer', async () => {
    const mockReport = { id: 'r1', repairer_id: '1', status: 'pending' };
    mockRepairerReportsService.create.mockResolvedValue(mockReport);
    const result = await controller.reportRepairer({
      repairer_id: '1',
      reason: 'Not a repairer',
    });
    expect(result).toEqual(mockReport);
    expect(mockRepairerReportsService.create).toHaveBeenCalledWith(
      '1',
      'Not a repairer',
    );
  });

  it('should throw RpcException on reportRepairer error', async () => {
    mockRepairerReportsService.create.mockRejectedValue(new Error('Report error'));
    await expect(
      controller.reportRepairer({ repairer_id: '1' }),
    ).rejects.toThrow(RpcException);
  });

  it('should get repairer reports', async () => {
    const mockReports = [{ id: 'r1', status: 'pending' }];
    mockRepairerReportsService.findAll.mockResolvedValue(mockReports);
    const result = await controller.getRepairerReports({ status: 'pending' });
    expect(result).toEqual(mockReports);
    expect(mockRepairerReportsService.findAll).toHaveBeenCalledWith('pending');
  });

  it('should throw RpcException on getRepairerReports error', async () => {
    mockRepairerReportsService.findAll.mockRejectedValue(
      new Error('List error'),
    );
    await expect(controller.getRepairerReports({})).rejects.toThrow(
      RpcException,
    );
  });

  it('should update a repairer report status', async () => {
    const mockReport = { id: 'r1', status: 'reviewed' };
    mockRepairerReportsService.updateStatus.mockResolvedValue(mockReport);
    const result = await controller.updateRepairerReportStatus({
      id: 'r1',
      status: 'reviewed',
      reviewedBy: 'admin-1',
    });
    expect(result).toEqual(mockReport);
    expect(mockRepairerReportsService.updateStatus).toHaveBeenCalledWith(
      'r1',
      'reviewed',
      'admin-1',
    );
  });

  it('should throw RpcException on updateRepairerReportStatus error', async () => {
    mockRepairerReportsService.updateStatus.mockRejectedValue(
      new Error('Update status error'),
    );
    await expect(
      controller.updateRepairerReportStatus({ id: 'r1', status: 'dismissed' }),
    ).rejects.toThrow(RpcException);
  });

  it('should throw RpcException on service error', async () => {
    mockRepairersService.findAll.mockRejectedValue(new Error('DB failure'));
    await expect(controller.getAllRepairers()).rejects.toThrow(RpcException);
  });
  it('should throw RpcException on createRepairer error', async () => {
    mockRepairersService.create.mockRejectedValue(new Error('Create error'));
    await expect(controller.createRepairer({ name: 'Test' })).rejects.toThrow(
      RpcException,
    );
  });

  it('should throw RpcException on getRepairer error', async () => {
    mockRepairersService.findOne.mockRejectedValue(new Error('FindOne error'));
    await expect(controller.getRepairer({ id: '1' })).rejects.toThrow(
      RpcException,
    );
  });

  it('should throw RpcException on updateRepairer error', async () => {
    mockRepairersService.update.mockRejectedValue(new Error('Update error'));
    await expect(
      controller.updateRepairer({ repairer_id: '1', name: 'Updated' }),
    ).rejects.toThrow(RpcException);
  });

  it('should throw RpcException on deleteRepairer error', async () => {
    mockRepairersService.delete.mockRejectedValue(new Error('Delete error'));
    await expect(controller.deleteRepairer('1')).rejects.toThrow(RpcException);
  });

  it('should throw RpcException on importRepairers error', async () => {
    mockImporterService.importCsv.mockRejectedValue(new Error('Import error'));
    await expect(controller.importRepairers()).rejects.toThrow(RpcException);
  });

  it('should throw RpcException on getRepairersFilters error', async () => {
    mockRepairersService.getFilters.mockRejectedValue(
      new Error('Filters error'),
    );
    await expect(controller.getRepairersFilters()).rejects.toThrow(
      RpcException,
    );
  });

  it('should throw RpcException on searchRepairers error', async () => {
    mockRepairersService.searchRepairers.mockRejectedValue(
      new Error('Search error'),
    );
    const searchDto = { search: 'test', filters: {} };
    await expect(
      controller.searchRepairers({ body: { searchDto } }),
    ).rejects.toThrow(RpcException);
  });

  it('should get paginated repairers', async () => {
    const mockResult = {
      data: [{ id: '1' }, { id: '2' }],
      meta: { total: 25, page: 1, limit: 10, totalPages: 3 },
    };
    mockRepairersService.findPaginated = jest
      .fn()
      .mockResolvedValue(mockResult);
    const result = await controller.getRepairersPaginated({
      page: 1,
      limit: 10,
      country: undefined,
      device_type: undefined,
      search: undefined,
      latitude: undefined,
      longitude: undefined,
    });

    expect(result).toEqual(mockResult);
    expect(mockRepairersService.findPaginated).toHaveBeenCalledWith(1, 10, {
      country: undefined,
      device_type: undefined,
      search: undefined,
      latitude: undefined,
      longitude: undefined,
    });
  });

  it('should get paginated repairers with lat/lon for distance sorting', async () => {
    const mockResult = {
      data: [{ id: '1' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    mockRepairersService.findPaginated = jest
      .fn()
      .mockResolvedValue(mockResult);
    const result = await controller.getRepairersPaginated({
      page: 1,
      limit: 10,
      country: undefined,
      device_type: undefined,
      search: undefined,
      latitude: 48.8566,
      longitude: 2.3522,
    });

    expect(result).toEqual(mockResult);
    expect(mockRepairersService.findPaginated).toHaveBeenCalledWith(1, 10, {
      country: undefined,
      device_type: undefined,
      search: undefined,
      latitude: 48.8566,
      longitude: 2.3522,
    });
  });

  it('should get paginated repairers filtered by partner_type', async () => {
    const mockResult = {
      data: [{ id: '3' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    mockRepairersService.findPaginated = jest
      .fn()
      .mockResolvedValue(mockResult);
    const result = await controller.getRepairersPaginated({
      page: 1,
      limit: 10,
      country: undefined,
      device_type: undefined,
      partner_type: 'recycler',
      search: undefined,
      latitude: undefined,
      longitude: undefined,
    });

    expect(result).toEqual(mockResult);
    expect(mockRepairersService.findPaginated).toHaveBeenCalledWith(1, 10, {
      country: undefined,
      device_type: undefined,
      partner_type: 'recycler',
      search: undefined,
      latitude: undefined,
      longitude: undefined,
    });
  });

  it('should throw RpcException on findPaginated error', async () => {
    mockRepairersService.findPaginated = jest
      .fn()
      .mockRejectedValue(new Error('Pagination error'));

    await expect(
      controller.getRepairersPaginated({
        page: 1,
        limit: 10,
        country: undefined,
        device_type: undefined,
        search: undefined,
        latitude: undefined,
        longitude: undefined,
      }),
    ).rejects.toThrow(RpcException);
  });

  it('should throw RpcException on findNearestRepairer error', async () => {
    mockRepairersService.findNearestRepairer.mockRejectedValue(
      new Error('Nearest repairer error'),
    );

    await expect(
      controller.findNearestRepairer({ latitude: 10, longitude: 20 }),
    ).rejects.toThrow(RpcException);
  });
});
