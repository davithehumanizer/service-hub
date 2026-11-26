/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { RepairersController } from '../repairers.controller';
import { UpdateRepairerDto } from '../dto/update-repairer.dto';
import { CreateRepairerDto } from '../dto/create-repairer.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { of, throwError } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';

const EMPTY_QUEUE = () => ({
  proposals: [] as any[],
  revisions: [] as any[],
  refused: { proposals: [] as any[], revisions: [] as any[] },
});

describe('RepairersController', () => {
  let controller: RepairersController;
  const mockClientProxy = { send: jest.fn() };
  const mockUsers = { send: jest.fn(), emit: jest.fn(() => of(undefined)) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepairersController],
      providers: [
        { provide: 'REPAIRERS_SERVICE', useValue: mockClientProxy },
        { provide: 'USER_SERVICE', useValue: mockUsers },
        mockAuthService(),
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
            // add other mocked methods if needed
          },
        },
      ],
    }).compile();
    controller = module.get<RepairersController>(RepairersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all repairers', async () => {
    mockClientProxy.send.mockReturnValue(of(['repairer']));
    const result = await controller.getAllRepairers();
    expect(result).toEqual(['repairer']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_repairers' },
      {},
    );
  });

  it('should throw on getAllRepairers error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getAllRepairers()).rejects.toThrow(HttpException);
  });

  it('should create repairer', async () => {
    const body = { name: 'r' };
    mockClientProxy.send.mockReturnValue(of({ created: true }));
    const result = await controller.createRepairer(body, {
      user: { id: 42, role: { name: 'contributor' } },
    });
    expect(result).toEqual({ created: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'create_repairer' },
      { ...body, created_by: 42, is_demo: true },
    );
  });

  it('should throw on createRepairer error', async () => {
    const body = { name: 'r' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.createRepairer(body, {})).rejects.toThrow(
      HttpException,
    );
  });

  it('should import repairers', async () => {
    mockClientProxy.send.mockReturnValue(of(['imported']));
    const result = await controller.importRepairers();
    expect(result).toEqual(['imported']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'import_repairers' },
      {},
    );
  });

  it('should throw on importRepairers error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.importRepairers()).rejects.toThrow(HttpException);
  });

  it('should get repairers filters', async () => {
    mockClientProxy.send.mockReturnValue(of(['filter']));
    const result = await controller.getRepairersFilters();
    expect(result).toEqual(['filter']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_repairers_filters' },
      {},
    );
  });

  it('should throw on getRepairersFilters error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getRepairersFilters()).rejects.toThrow(
      HttpException,
    );
  });

  it('should search repairers', async () => {
    const body = { search: 'test' };
    mockClientProxy.send.mockReturnValue(of(['result']));
    const result = await controller.searchRepairers(body);
    expect(result).toEqual(['result']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'search_repairers' },
      { body },
    );
  });

  it('should throw on searchRepairers error', async () => {
    const body = { search: 'test' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.searchRepairers(body)).rejects.toThrow(
      HttpException,
    );
  });

  it('should get repairer by id, as its viewer may see it', async () => {
    mockClientProxy.send.mockReturnValue(of({ id: '1' }));
    const result = await controller.getRepairer('1', {
      user: { id: 7, role: { name: 'user' } },
    });
    expect(result).toEqual({ id: '1' });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_repairer' },
      { id: '1', viewer: { created_by: 7, is_demo: false, admin: false } },
    );
  });

  it('should throw on getRepairer error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getRepairer('1', {})).rejects.toThrow(
      HttpException,
    );
  });

  it('answers 404 for a repairer not published and not the viewer\'s', async () => {
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('Repairer with id 1 not found')),
    );
    await expect(controller.getRepairer('1', {})).rejects.toMatchObject({
      status: 404,
    });
  });

  describe('proposals', () => {
    const req = { user: { id: 9, role: { name: 'contributor' } } };
    const admin = { user: { id: 1, role: { name: 'admin' } } };
    const editor = { created_by: 9, is_demo: true, admin: false };
    const reviewer = { created_by: 1, is_demo: false, admin: true };
    const ID = '0b754d36-ed26-416f-b425-b3001a61bec8';

    it('proposes, its author from the session', async () => {
      mockClientProxy.send.mockReturnValue(of({ repairer_id: ID }));
      await controller.proposeRepairer({ name: 'A' } as any, req);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'propose_repairer' },
        { changes: { name: 'A' }, editor },
      );
    });

    it('lists, changes and withdraws one\'s own', async () => {
      mockClientProxy.send.mockReturnValue(of([]));
      await controller.getMyRepairers(req);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_my_repairers' },
        { editor },
      );
      await controller.changeProposal(ID, { city: 'B' } as any, req);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'change_repairer_proposal' },
        { id: ID, changes: { city: 'B' }, editor },
      );
      await controller.withdrawProposal(ID, req);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'withdraw_repairer_proposal' },
        { id: ID, editor },
      );
    });

    it('reviews proposals and changes', async () => {
      mockClientProxy.send.mockReturnValue(of(EMPTY_QUEUE()));
      await controller.getPendingProposals();
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_pending_repairer_proposals' },
        {},
      );
      await controller.reviewProposal(ID, { decision: 'reject', note: 'No', version: 'v1' }, admin);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'review_repairer_proposal' },
        { id: ID, decision: 'reject', note: 'No', version: 'v1', editor: reviewer },
      );
      await controller.reviewRevision(ID, { decision: 'apply' }, admin);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'review_repairer_revision' },
        { id: ID, decision: 'apply', note: undefined, editor: reviewer },
      );
    });

    it('names who proposed each item of the queue, refused ones included', async () => {
      mockClientProxy.send.mockReturnValue(
        of({
          proposals: [{ repairer_id: 'r1', created_by: 9 }],
          revisions: [{ id: 'v1', created_by: 7 }],
          refused: { proposals: [{ repairer_id: 'r2', created_by: 9 }], revisions: [{ id: 'v2', created_by: null }] },
        }),
      );
      mockUsers.send.mockReturnValue(
        of([
          { id: 9, email: 'a@demo.test', role: 'contributor' },
          { id: 7, email: 'b@example.com', role: 'user' },
        ]),
      );

      const queue: any = await controller.getPendingProposals();

      expect(mockUsers.send).toHaveBeenCalledWith({ cmd: 'get_user_summaries' }, { ids: [9, 7] });
      expect(queue.proposals[0].author.email).toBe('a@demo.test');
      expect(queue.revisions[0].author.role).toBe('user');
      expect(queue.refused.proposals[0].author.id).toBe(9);
      expect(queue.refused.revisions[0].author).toBeNull();
    });

    it('shows the queue without authors when the accounts cannot be read', async () => {
      mockClientProxy.send.mockReturnValue(of({ ...EMPTY_QUEUE(), proposals: [{ repairer_id: 'r1', created_by: 9 }] }));
      mockUsers.send.mockReturnValue(throwError(() => new Error('connection reset')));
      const queue: any = await controller.getPendingProposals();
      expect(queue.proposals[0].author).toBeNull();
    });

    it('asks for no account when nobody is named', async () => {
      mockClientProxy.send.mockReturnValue(of(EMPTY_QUEUE()));
      await controller.getPendingProposals();
      expect(mockUsers.send).not.toHaveBeenCalled();
    });

    it('counts what waits, for the menu', async () => {
      mockClientProxy.send.mockReturnValue(of({ count: 3 }));
      expect(await controller.countPendingProposals()).toEqual({ count: 3 });
      expect(mockClientProxy.send).toHaveBeenCalledWith({ cmd: 'count_pending_repairer_proposals' }, {});
    });

    it('tells the author what was decided, with the reason of a refusal', async () => {
      mockClientProxy.send.mockReturnValue(of({ repairer_id: ID, name: 'Atelier', created_by: 9 }));
      await controller.reviewProposal(ID, { decision: 'reject', note: 'Closed', version: 'v1' }, admin);
      expect(mockUsers.emit).toHaveBeenCalledWith(
        { cmd: 'notify_repairer_decision' },
        { userId: 9, decision: 'rejected', repairerId: ID, repairerName: 'Atelier', note: 'Closed' },
      );

      await controller.reviewProposal(ID, { decision: 'publish', note: 'ignored', version: 'v1' }, admin);
      expect(mockUsers.emit).toHaveBeenLastCalledWith(
        { cmd: 'notify_repairer_decision' },
        expect.objectContaining({ decision: 'published', note: null }),
      );
    });

    it("tells a change's author through its repairer", async () => {
      mockClientProxy.send.mockReturnValue(
        of({ id: 'v1', created_by: 9, repairer: { repairer_id: ID, name: 'Atelier' } }),
      );
      await controller.reviewRevision('v1', { decision: 'apply' }, admin);
      expect(mockUsers.emit).toHaveBeenLastCalledWith(
        { cmd: 'notify_repairer_decision' },
        { userId: 9, decision: 'applied', repairerId: ID, repairerName: 'Atelier', note: null },
      );
      await controller.reviewRevision('v1', { decision: 'reject', note: 'Wrong' }, admin);
      expect(mockUsers.emit).toHaveBeenLastCalledWith(
        { cmd: 'notify_repairer_decision' },
        expect.objectContaining({ decision: 'change_rejected', note: 'Wrong' }),
      );
    });

    it('tells nobody about an administrator\'s own, or an author unknown', async () => {
      mockClientProxy.send.mockReturnValue(of({ repairer_id: ID, name: 'A', created_by: 1 }));
      await controller.reviewProposal(ID, { decision: 'publish', version: 'v1' }, admin);
      mockClientProxy.send.mockReturnValue(of({ repairer_id: ID, name: 'A', created_by: null }));
      await controller.reviewProposal(ID, { decision: 'publish', version: 'v1' }, admin);
      expect(mockUsers.emit).not.toHaveBeenCalled();
    });

    it('keeps the decision when the email cannot be sent', async () => {
      mockClientProxy.send.mockReturnValue(of({ repairer_id: ID, name: 'A', created_by: 9 }));
      mockUsers.emit.mockReturnValueOnce(throwError(() => new Error('connection reset')));
      await expect(
        controller.reviewProposal(ID, { decision: 'publish', version: 'v1' }, admin),
      ).resolves.toMatchObject({ repairer_id: ID });
    });

    it.each([
      ['Repairer with id x not found', 404],
      ['Only its author or an administrator can change this repairer', 403],
      ['Only an administrator can remove a published repairer', 403],
      ['This proposal has already been reviewed', 409],
      ['This proposal has changed since it was loaded', 409],
      ['This change has been replaced since', 409],
      ['city is required', 400],
      ['connection reset', 500],
    ])('answers "%s" with %i', async (message, status) => {
      mockClientProxy.send.mockReturnValue(throwError(() => new Error(message)));
      await expect(
        controller.changeProposal(ID, {} as any, req),
      ).rejects.toMatchObject({ status, message });
    });
  });

  it('should update repairer', async () => {
    const body = { name: 'updated' };
    mockClientProxy.send.mockReturnValue(of({ updated: true }));
    const result = await controller.updateRepairer('1', body);
    expect(result).toEqual({ updated: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'update_repairer' },
      { id: '1', ...body },
    );
  });

  // The ValidationPipe validates against this type: as CreateRepairerDto, a
  // partial update without a name was refused.
  it("keeps the site's own credit for the site, and takes the importers' credits", async () => {
    const errors = async (type: any, body: object) =>
      (await validate(plainToInstance(type, body) as object)).length;
    for (const type of [CreateRepairerDto, UpdateRepairerDto]) {
      const base = type === CreateRepairerDto ? { name: 'Atelier' } : {};
      for (const source of ['Service Hub', ' service  hub ', 'SERVICE HUB']) {
        expect(await errors(type, { ...base, source })).toBe(1);
      }
      for (const source of [
        'ACME Data – repairer directory',
        'Longue Vie Aux Objets | ADEME | ECOSYSTEM',
        '© OpenStreetMap contributors (ODbL)',
        'Service Hub partner',
      ]) {
        expect(await errors(type, { ...base, source })).toBe(0);
      }
    }
  });

  it('validates an update body as UpdateRepairerDto', () => {
    const types = Reflect.getMetadata(
      'design:paramtypes',
      RepairersController.prototype,
      'updateRepairer',
    );
    expect(types[1]).toBe(UpdateRepairerDto);
  });

  it('should throw on updateRepairer error', async () => {
    const body = { name: 'updated' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.updateRepairer('1', body)).rejects.toThrow(
      HttpException,
    );
  });

  it('should delete repairer', async () => {
    mockClientProxy.send.mockReturnValue(of({ deleted: true }));
    const result = await controller.deleteRepairer('1');
    expect(result).toEqual({ deleted: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'delete_repairer' },
      { id: '1' },
    );
  });

  it('should throw on deleteRepairer error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.deleteRepairer('1')).rejects.toThrow(HttpException);
  });

  it('should find nearest repairer', async () => {
    const body = { latitude: 10, longitude: 20 };
    mockClientProxy.send.mockReturnValue(
      of({ repairer: { id: '1' }, distance: 10 }),
    );
    const result = await controller.findNearestRepairer(body);
    expect(result).toEqual({ repairer: { id: '1' }, distance: 10 });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'find_nearest_repairer' },
      body,
    );
  });

  it('should throw on findNearestRepairer error', async () => {
    const body = { latitude: 10, longitude: 20 };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.findNearestRepairer(body)).rejects.toThrow(
      HttpException,
    );
  });

  it('should get all repairers paginated (v2)', async () => {
    const query = { page: 1, limit: 10 };
    mockClientProxy.send.mockReturnValue(of({ data: ['repairer'], total: 1 }));
    const result = await controller.getAllRepairersPaginated(query);
    expect(result).toEqual({ data: ['repairer'], total: 1 });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_repairers_paginated' },
      query,
    );
  });

  it('should throw on getAllRepairersPaginated error', async () => {
    const query = { page: 1, limit: 10 };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getAllRepairersPaginated(query)).rejects.toThrow(
      HttpException,
    );
  });

  it('should report a repairer', async () => {
    mockClientProxy.send.mockReturnValue(of({ id: 'r1', status: 'pending' }));
    const result = await controller.reportRepairer('1', {
      reason: 'Not a repairer',
    });
    expect(result).toEqual({ id: 'r1', status: 'pending' });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'report_repairer' },
      { repairer_id: '1', reason: 'Not a repairer' },
    );
  });

  it('should throw on reportRepairer error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.reportRepairer('1', {})).rejects.toThrow(
      HttpException,
    );
  });

  it('should list repairer reports', async () => {
    mockClientProxy.send.mockReturnValue(of([{ id: 'r1' }]));
    const result = await controller.getRepairerReports('pending');
    expect(result).toEqual([{ id: 'r1' }]);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_repairer_reports' },
      { status: 'pending' },
    );
  });

  it('should throw on getRepairerReports error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getRepairerReports()).rejects.toThrow(
      HttpException,
    );
  });

  it('should review a repairer report', async () => {
    mockClientProxy.send.mockReturnValue(of({ id: 'r1', status: 'reviewed' }));
    const result = await controller.reviewRepairerReport(
      'r1',
      { status: 'reviewed' },
      { user: { sub: 'admin-1' } },
    );
    expect(result).toEqual({ id: 'r1', status: 'reviewed' });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'update_repairer_report_status' },
      { id: 'r1', status: 'reviewed', reviewedBy: 'admin-1' },
    );
  });

  it('should throw on reviewRepairerReport error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      controller.reviewRepairerReport('r1', { status: 'dismissed' }, {}),
    ).rejects.toThrow(HttpException);
  });

  describe('error fallback – no message (covers || default branch)', () => {
    it('getAllRepairers uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.getAllRepairers()).rejects.toThrow(
        'Failed to get repairers',
      );
    });

    it('getAllRepairersPaginated uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(
        controller.getAllRepairersPaginated({ page: 1, limit: 10 } as any),
      ).rejects.toThrow('Failed to get paginated repairers');
    });

    it('createRepairer uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.createRepairer({} as any, {})).rejects.toThrow(
        'Failed to create repairer',
      );
    });

    it('importRepairers uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.importRepairers()).rejects.toThrow(HttpException);
    });

    it('getRepairersFilters uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.getRepairersFilters()).rejects.toThrow(
        'Failed to get repairers filters',
      );
    });

    it('searchRepairers uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.searchRepairers({} as any)).rejects.toThrow(
        'Failed to search repairers',
      );
    });

    it('getRepairer uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.getRepairer('1', {})).rejects.toThrow(
        'Failed to get repairer',
      );
    });

    it('updateRepairer uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.updateRepairer('1', {} as any)).rejects.toThrow(
        'Failed to update repairer',
      );
    });

    it('deleteRepairer uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.deleteRepairer('1')).rejects.toThrow(
        'Failed to delete repairer',
      );
    });

    it('findNearestRepairer uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(
        controller.findNearestRepairer({ latitude: 0, longitude: 0 } as any),
      ).rejects.toThrow('Failed to find nearest repairer');
    });
  });
});
