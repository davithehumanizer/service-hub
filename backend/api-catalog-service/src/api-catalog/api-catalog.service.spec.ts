import { Test, TestingModule } from "@nestjs/testing";
import { ApiCatalogService } from "./api-catalog.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  ApiTool,
  ApiToolStatus,
  ApiToolCategory,
  ApiToolAuthType,
  ApiToolPricingModel,
} from "./entities/api-tool.entity";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";

const mockTool: Partial<ApiTool> = {
  id: "tool-uuid-123",
  name: "iFixit API",
  shortDescription: "Access repair guides and device information.",
  websiteUrl: "https://www.ifixit.com",
  category: ApiToolCategory.REPAIR,
  authType: ApiToolAuthType.NONE,
  pricingModel: ApiToolPricingModel.FREE,
  isPubliclyAccessible: true,
  requiresAccount: false,
  requiresApiKey: false,
  tags: ["repair", "guides"],
  supportedFormats: [],
  endpoints: [],
  status: ApiToolStatus.APPROVED,
  submitterUserId: "user-111",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockPendingTool: Partial<ApiTool> = {
  ...mockTool,
  id: "tool-uuid-456",
  status: ApiToolStatus.PENDING,
  approvedAt: null,
};

describe("ApiCatalogService", () => {
  let service: ApiCatalogService;
  let repo: Repository<ApiTool>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiCatalogService,
        {
          provide: getRepositoryToken(ApiTool),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiCatalogService>(ApiCatalogService);
    repo = module.get<Repository<ApiTool>>(getRepositoryToken(ApiTool));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------
  describe("listApproved", () => {
    it("should return approved tools ordered by approvedAt DESC", async () => {
      jest.spyOn(repo, "find").mockResolvedValue([mockTool] as ApiTool[]);
      const result = await service.listApproved();
      expect(result).toEqual([mockTool]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { status: ApiToolStatus.APPROVED },
        order: { isBuiltIn: "DESC", approvedAt: "DESC" },
      });
    });
  });

  // -------------------------------------------------------------------
  describe("listPending", () => {
    it("should return pending tools ordered by createdAt ASC", async () => {
      jest
        .spyOn(repo, "find")
        .mockResolvedValue([mockPendingTool] as ApiTool[]);
      const result = await service.listPending();
      expect(result).toEqual([mockPendingTool]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { status: ApiToolStatus.PENDING },
        order: { createdAt: "ASC" },
      });
    });
  });

  // -------------------------------------------------------------------
  describe("getById", () => {
    it("should return a tool by id", async () => {
      jest.spyOn(repo, "findOne").mockResolvedValue(mockTool as ApiTool);
      const result = await service.getById("tool-uuid-123");
      expect(result).toEqual(mockTool);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "tool-uuid-123" },
      });
    });

    it("should throw NotFoundException if tool not found", async () => {
      jest.spyOn(repo, "findOne").mockResolvedValue(null);
      await expect(service.getById("unknown-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------
  describe("submit", () => {
    it("should create a pending tool and save it", async () => {
      const dto = {
        name: "New API",
        shortDescription: "A useful API for recycling.",
        websiteUrl: "https://example.com",
        category: ApiToolCategory.RECYCLING,
        authType: ApiToolAuthType.API_KEY,
        pricingModel: ApiToolPricingModel.FREE,
        isPubliclyAccessible: false,
        requiresAccount: true,
        requiresApiKey: true,
      };
      const created = {
        ...dto,
        id: "new-uuid",
        status: ApiToolStatus.PENDING,
        submitterUserId: "user-222",
      };

      jest.spyOn(repo, "create").mockReturnValue(created as any);
      jest.spyOn(repo, "save").mockResolvedValue(created as any);

      const result = await service.submit(dto as any, "user-222");
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({
        ...dto,
        submitterUserId: "user-222",
        status: ApiToolStatus.PENDING,
      });
      expect(repo.save).toHaveBeenCalledWith(created);
    });
  });

  // -------------------------------------------------------------------
  describe("approve", () => {
    it("should set status to APPROVED and persist", async () => {
      const pending = { ...mockPendingTool } as ApiTool;
      jest.spyOn(service, "getById").mockResolvedValue(pending);
      jest.spyOn(repo, "save").mockImplementation(async (t: any) => t);

      const result = await service.approve("tool-uuid-456", "admin-999");
      expect(result.status).toBe(ApiToolStatus.APPROVED);
      expect(result.approvedBy).toBe("admin-999");
      expect(result.approvedAt).toBeInstanceOf(Date);
      expect(result.rejectionReason).toBeNull();
      expect(result.isCommunity).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(result);
    });

    it("should set isCommunity to false when explicitly passed", async () => {
      const pending = { ...mockPendingTool } as ApiTool;
      jest.spyOn(service, "getById").mockResolvedValue(pending);
      jest.spyOn(repo, "save").mockImplementation(async (t: any) => t);

      const result = await service.approve("tool-uuid-456", "admin-999", false);
      expect(result.isCommunity).toBe(false);
    });

    it("should throw NotFoundException if tool not found", async () => {
      jest.spyOn(service, "getById").mockRejectedValue(new NotFoundException());
      await expect(service.approve("bad-id", "admin-999")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------
  describe("reject", () => {
    it("should set status to REJECTED with reason and persist", async () => {
      const pending = { ...mockPendingTool } as ApiTool;
      jest.spyOn(service, "getById").mockResolvedValue(pending);
      jest.spyOn(repo, "save").mockImplementation(async (t: any) => t);

      const result = await service.reject(
        "tool-uuid-456",
        "admin-999",
        "Missing documentation",
      );
      expect(result.status).toBe(ApiToolStatus.REJECTED);
      expect(result.approvedBy).toBe("admin-999");
      expect(result.rejectionReason).toBe("Missing documentation");
      expect(repo.save).toHaveBeenCalledWith(result);
    });

    it("should reject with null reason when none provided", async () => {
      const pending = { ...mockPendingTool } as ApiTool;
      jest.spyOn(service, "getById").mockResolvedValue(pending);
      jest.spyOn(repo, "save").mockImplementation(async (t: any) => t);

      const result = await service.reject("tool-uuid-456", "admin-999");
      expect(result.rejectionReason).toBeNull();
    });

    it("should throw NotFoundException if tool not found", async () => {
      jest.spyOn(service, "getById").mockRejectedValue(new NotFoundException());
      await expect(service.reject("bad-id", "admin-999")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
