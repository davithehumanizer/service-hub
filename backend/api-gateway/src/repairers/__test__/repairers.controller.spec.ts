/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { RepairersController } from '../repairers.controller';
import { UpdateRepairerDto } from '../dto/update-repairer.dto';
import { of, throwError } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';

describe('RepairersController', () => {
  let controller: RepairersController;
  const mockClientProxy = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepairersController],
      providers: [
        { provide: 'REPAIRERS_SERVICE', useValue: mockClientProxy },
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
    const result = await controller.createRepairer(body);
    expect(result).toEqual({ created: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'create_repairer' },
      body,
    );
  });

  it('should throw on createRepairer error', async () => {
    const body = { name: 'r' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.createRepairer(body)).rejects.toThrow(
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

  it('should get repairer by id', async () => {
    mockClientProxy.send.mockReturnValue(of({ id: '1' }));
    const result = await controller.getRepairer('1');
    expect(result).toEqual({ id: '1' });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_repairer' },
      { id: '1' },
    );
  });

  it('should throw on getRepairer error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getRepairer('1')).rejects.toThrow(HttpException);
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
      await expect(controller.createRepairer({} as any)).rejects.toThrow(
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
      await expect(controller.getRepairer('1')).rejects.toThrow(
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
