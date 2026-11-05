import { Test, TestingModule } from '@nestjs/testing';
import { ApiCatalogController } from '../api-catalog.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { FlexibleAuthGuard } from '../../auth/flexible-auth.guard';
import { PermissionsGuard } from '../../auth/permission.guard';
import {
  ApiToolCategory,
  ApiToolAuthType,
  ApiToolPricingModel,
} from '../dto/submit-api-tool.dto';

const mockTool = {
  id: 'tool-uuid-123',
  name: 'iFixit API',
  shortDescription: 'Access repair guides and device information.',
  websiteUrl: 'https://www.ifixit.com',
  category: ApiToolCategory.REPAIR,
  authType: ApiToolAuthType.NONE,
  pricingModel: ApiToolPricingModel.FREE,
  isPubliclyAccessible: true,
  requiresAccount: false,
  requiresApiKey: false,
  tags: [],
  supportedFormats: [],
  endpoints: [],
  status: 'approved',
};

const mockPendingTool = { ...mockTool, id: 'tool-uuid-456', status: 'pending' };

const mockClientProxy = { send: jest.fn() };

describe('ApiCatalogController (gateway)', () => {
  let controller: ApiCatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiCatalogController],
      providers: [
        { provide: 'API_CATALOG_SERVICE', useValue: mockClientProxy },
      ],
    })
      .overrideGuard(FlexibleAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ApiCatalogController>(ApiCatalogController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // -------------------------------------------------------------------
  describe('listApproved', () => {
    it('should return approved tools', async () => {
      mockClientProxy.send.mockReturnValue(of([mockTool]));
      const result = await controller.listApproved();
      expect(result).toEqual([mockTool]);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'list_approved_tools' },
        {},
      );
    });

    it('should throw HttpException on service error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Service down')),
      );
      await expect(controller.listApproved()).rejects.toThrow(HttpException);
    });
  });

  // -------------------------------------------------------------------
  describe('getById', () => {
    it('should return a tool by id', async () => {
      mockClientProxy.send.mockReturnValue(of(mockTool));
      const result = await controller.getById('tool-uuid-123');
      expect(result).toEqual(mockTool);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_tool_by_id' },
        { id: 'tool-uuid-123' },
      );
    });

    it('should throw 404 when service returns null', async () => {
      mockClientProxy.send.mockReturnValue(of(null));
      await expect(controller.getById('bad-id')).rejects.toThrow(HttpException);
    });

    it('should throw HttpException on service error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Not found')),
      );
      await expect(controller.getById('bad-id')).rejects.toThrow(HttpException);
    });
  });

  // -------------------------------------------------------------------
  describe('submit', () => {
    it('should submit a tool with submitterUserId from JWT', async () => {
      const dto = {
        name: 'New API',
        shortDescription: 'A useful recycling API.',
        websiteUrl: 'https://example.com',
        category: ApiToolCategory.RECYCLING,
        authType: ApiToolAuthType.NONE,
        pricingModel: ApiToolPricingModel.FREE,
        isPubliclyAccessible: true,
        requiresAccount: false,
        requiresApiKey: false,
      };
      const req = { user: { sub: 'user-222' } };
      mockClientProxy.send.mockReturnValue(
        of({ ...dto, id: 'new-id', status: 'pending' }),
      );

      const result = await controller.submit(dto as any, req as any);
      expect(result.status).toBe('pending');
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'submit_tool' },
        { dto, submitterUserId: 'user-222' },
      );
    });

    it('should throw HttpException on service error', async () => {
      const dto = {
        name: 'API',
        shortDescription: 'Desc enough length.',
        websiteUrl: 'https://example.com',
        category: ApiToolCategory.OTHER,
        authType: ApiToolAuthType.NONE,
        pricingModel: ApiToolPricingModel.UNKNOWN,
        isPubliclyAccessible: false,
        requiresAccount: false,
        requiresApiKey: false,
      };
      const req = { user: { sub: 'user-222' } };
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Submit failed')),
      );
      await expect(controller.submit(dto as any, req as any)).rejects.toThrow(
        HttpException,
      );
    });
  });

  // -------------------------------------------------------------------
  describe('listPending', () => {
    it('should return pending tools', async () => {
      mockClientProxy.send.mockReturnValue(of([mockPendingTool]));
      const req = { user: { sub: 'admin-999' } };
      const result = await controller.listPending(req as any);
      expect(result).toEqual([mockPendingTool]);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'list_pending_tools' },
        {},
      );
    });

    it('should throw HttpException on service error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Service error')),
      );
      await expect(controller.listPending({} as any)).rejects.toThrow(
        HttpException,
      );
    });
  });

  // -------------------------------------------------------------------
  describe('approve', () => {
    it('should approve a tool and return updated result', async () => {
      const approved = { ...mockPendingTool, status: 'approved' };
      mockClientProxy.send.mockReturnValue(of(approved));
      const req = { user: { sub: 'admin-999' } };

      const result = await controller.approve(
        'tool-uuid-456',
        { isCommunity: false } as any,
        req as any,
      );
      expect(result.status).toBe('approved');
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'approve_tool' },
        { id: 'tool-uuid-456', adminUserId: 'admin-999', isCommunity: false },
      );
    });

    it('should default isCommunity to undefined when no body is provided', async () => {
      const approved = { ...mockPendingTool, status: 'approved' };
      mockClientProxy.send.mockReturnValue(of(approved));
      const req = { user: { sub: 'admin-999' } };

      await controller.approve('tool-uuid-456', undefined as any, req as any);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'approve_tool' },
        {
          id: 'tool-uuid-456',
          adminUserId: 'admin-999',
          isCommunity: undefined,
        },
      );
    });

    it('should throw HttpException on service error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Approve failed')),
      );
      await expect(
        controller.approve(
          'bad-id',
          {} as any,
          { user: { sub: 'admin-999' } } as any,
        ),
      ).rejects.toThrow(HttpException);
    });
  });

  // -------------------------------------------------------------------
  describe('reject', () => {
    it('should reject a tool with a reason', async () => {
      const rejected = {
        ...mockPendingTool,
        status: 'rejected',
        rejectionReason: 'Insufficient docs',
      };
      mockClientProxy.send.mockReturnValue(of(rejected));
      const req = { user: { sub: 'admin-999' } };

      const result = await controller.reject(
        'tool-uuid-456',
        { reason: 'Insufficient docs' },
        req as any,
      );
      expect(result.status).toBe('rejected');
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'reject_tool' },
        {
          id: 'tool-uuid-456',
          adminUserId: 'admin-999',
          reason: 'Insufficient docs',
        },
      );
    });

    it('should reject a tool without reason', async () => {
      const rejected = {
        ...mockPendingTool,
        status: 'rejected',
        rejectionReason: null,
      };
      mockClientProxy.send.mockReturnValue(of(rejected));
      const req = { user: { sub: 'admin-999' } };

      const result = await controller.reject('tool-uuid-456', {}, req as any);
      expect(result.status).toBe('rejected');
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'reject_tool' },
        { id: 'tool-uuid-456', adminUserId: 'admin-999', reason: undefined },
      );
    });

    it('should throw HttpException on service error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Reject failed')),
      );
      await expect(
        controller.reject('bad-id', {}, { user: { sub: 'admin-999' } } as any),
      ).rejects.toThrow(HttpException);
    });
  });
});
