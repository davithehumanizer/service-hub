import { Test, TestingModule } from '@nestjs/testing';
import { RepairersController } from '../repairers.controller';
import { RepairerImporterService } from '../services/repairerImporter.service';
import { RepairerReportsService } from '../services/repairer-reports.service';
import { RepairerProposalsService } from '../services/repairer-proposals.service';
import { RpcException } from '@nestjs/microservices';

const mockRepairersService = {
  purgeDemo: jest.fn(),
  demoStatsOf: jest.fn(),
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

const mockProposalsService = {
  propose: jest.fn(),
  change: jest.fn(),
  withdraw: jest.fn(),
  mine: jest.fn(),
  pending: jest.fn(),
  pendingCount: jest.fn(),
  ofAuthor: jest.fn(),
  reviewProposal: jest.fn(),
  reviewRevision: jest.fn(),
};

const EDITOR = { created_by: 7, is_demo: false, admin: false };
const ADMIN = { created_by: 1, is_demo: false, admin: true };

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
        {
          provide: RepairerProposalsService,
          useValue: mockProposalsService,
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

  it('should get one repairer as its viewer may see it', async () => {
    mockRepairersService.findOne.mockResolvedValue({ id: '1' });
    await controller.getRepairer({ id: '1', viewer: EDITOR });
    expect(mockRepairersService.findOne).toHaveBeenCalledWith('1', EDITOR);
  });

  it("counts one contributor's repairers", async () => {
    mockRepairersService.demoStatsOf.mockResolvedValue({ repairers: 2 });
    expect(await controller.demoRepairerStatsOfContributor({ contributorId: 9 })).toEqual({ repairers: 2 });
    expect(mockRepairersService.demoStatsOf).toHaveBeenCalledWith(9);
    mockRepairersService.demoStatsOf.mockRejectedValueOnce(new Error('lock timeout'));
    await expect(controller.demoRepairerStatsOfContributor({ contributorId: 9 })).rejects.toThrow('lock timeout');
  });

  it('previews the purge of demo repairers unless told plainly not to', async () => {
    mockRepairersService.purgeDemo.mockResolvedValue({ repairers: 1 });
    await controller.purgeDemoRepairers({} as any);
    expect(mockRepairersService.purgeDemo).toHaveBeenLastCalledWith(true);
    await controller.purgeDemoRepairers({ dryRun: false });
    expect(mockRepairersService.purgeDemo).toHaveBeenLastCalledWith(false);
    mockRepairersService.purgeDemo.mockRejectedValueOnce(new Error('lock timeout'));
    await expect(controller.purgeDemoRepairers({ dryRun: false })).rejects.toThrow('lock timeout');
  });

  describe('proposals', () => {
    it('proposes, with the editor the gateway sends', async () => {
      mockProposalsService.propose.mockResolvedValue({ repairer_id: 'r' });
      await controller.proposeRepairer({ changes: { name: 'A' }, editor: EDITOR });
      expect(mockProposalsService.propose).toHaveBeenCalledWith({ name: 'A' }, EDITOR);
    });

    it('changes, withdraws and lists one\'s own', async () => {
      await controller.changeRepairerProposal({ id: 'r', changes: { city: 'B' }, editor: EDITOR });
      expect(mockProposalsService.change).toHaveBeenCalledWith('r', { city: 'B' }, EDITOR);
      await controller.withdrawRepairerProposal({ id: 'r', editor: EDITOR });
      expect(mockProposalsService.withdraw).toHaveBeenCalledWith('r', EDITOR);
      await controller.getMyRepairers({ editor: EDITOR });
      expect(mockProposalsService.mine).toHaveBeenCalledWith(EDITOR);
    });

    it('reviews, a missing reason being null', async () => {
      await controller.getPendingRepairerProposals();
      expect(mockProposalsService.pending).toHaveBeenCalled();
      mockProposalsService.pendingCount.mockResolvedValue(4);
      expect(await controller.countPendingRepairerProposals()).toEqual({ count: 4 });
      await controller.getRepairersOfAuthor({ authorId: 9 });
      expect(mockProposalsService.ofAuthor).toHaveBeenCalledWith(9);
      await controller.reviewRepairerProposal({ id: 'r', decision: 'publish', editor: ADMIN, version: 'v' });
      expect(mockProposalsService.reviewProposal).toHaveBeenCalledWith('r', 'publish', null, ADMIN, 'v');
      await controller.reviewRepairerRevision({ id: 'v', decision: 'reject', note: 'No', editor: ADMIN });
      expect(mockProposalsService.reviewRevision).toHaveBeenCalledWith('v', 'reject', 'No', ADMIN);
    });

    it('keeps a refusal\'s message for the gateway to read', async () => {
      const refusals: [jest.Mock, () => Promise<unknown>][] = [
        [mockProposalsService.propose, () => controller.proposeRepairer({ changes: {}, editor: EDITOR })],
        [mockProposalsService.change, () => controller.changeRepairerProposal({ id: 'r', changes: {}, editor: EDITOR })],
        [mockProposalsService.withdraw, () => controller.withdrawRepairerProposal({ id: 'r', editor: EDITOR })],
        [mockProposalsService.mine, () => controller.getMyRepairers({ editor: EDITOR })],
        [mockProposalsService.pending, () => controller.getPendingRepairerProposals()],
        [mockProposalsService.pendingCount, () => controller.countPendingRepairerProposals()],
        [mockProposalsService.ofAuthor, () => controller.getRepairersOfAuthor({ authorId: 9 })],
        [mockProposalsService.reviewProposal, () => controller.reviewRepairerProposal({ id: 'r', decision: 'reject', editor: ADMIN, version: 'v' })],
        [mockProposalsService.reviewRevision, () => controller.reviewRepairerRevision({ id: 'v', decision: 'apply', editor: ADMIN })],
      ];
      for (const [method, call] of refusals) {
        method.mockRejectedValueOnce(new Error('Only its author or an administrator can change this repairer'));
        await expect(call()).rejects.toThrow('Only its author');
      }
    });
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
    // The shape the gateway sends.
    const result = await controller.deleteRepairer({ id: '1' });
    expect(result).toBe(true);
    expect(mockRepairersService.delete).toHaveBeenCalledWith('1');
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
    await expect(controller.deleteRepairer({ id: '1' })).rejects.toThrow(
      RpcException,
    );
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
