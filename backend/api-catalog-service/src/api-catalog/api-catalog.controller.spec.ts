import { Test, TestingModule } from "@nestjs/testing";
import { ApiCatalogController } from "./api-catalog.controller";
import { ApiCatalogService } from "./api-catalog.service";
import { NotFoundException } from "@nestjs/common";
import {
  ApiToolStatus,
  ApiToolCategory,
  ApiToolAuthType,
  ApiToolPricingModel,
} from "./entities/api-tool.entity";

const mockTool = {
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
  tags: ["repair"],
  supportedFormats: [],
  endpoints: [],
  status: ApiToolStatus.APPROVED,
  submitterUserId: "user-111",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockPendingTool = {
  ...mockTool,
  id: "tool-uuid-456",
  status: ApiToolStatus.PENDING,
};

describe("ApiCatalogController", () => {
  let controller: ApiCatalogController;
  let service: ApiCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiCatalogController],
      providers: [
        {
          provide: ApiCatalogService,
          useValue: {
            listApproved: jest.fn(),
            listPending: jest.fn(),
            getById: jest.fn(),
            submit: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApiCatalogController>(ApiCatalogController);
    service = module.get<ApiCatalogService>(ApiCatalogService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // -------------------------------------------------------------------
  describe("listApproved", () => {
    it("should return approved tools", async () => {
      jest.spyOn(service, "listApproved").mockResolvedValue([mockTool] as any);
      const result = await controller.listApproved();
      expect(result).toEqual([mockTool]);
      expect(service.listApproved).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  describe("listPending", () => {
    it("should return pending tools", async () => {
      jest
        .spyOn(service, "listPending")
        .mockResolvedValue([mockPendingTool] as any);
      const result = await controller.listPending();
      expect(result).toEqual([mockPendingTool]);
      expect(service.listPending).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  describe("getById", () => {
    it("should return a tool by id", async () => {
      jest.spyOn(service, "getById").mockResolvedValue(mockTool as any);
      const result = await controller.getById({ id: "tool-uuid-123" });
      expect(result).toEqual(mockTool);
      expect(service.getById).toHaveBeenCalledWith("tool-uuid-123");
    });

    it("should propagate NotFoundException when tool not found", async () => {
      jest.spyOn(service, "getById").mockRejectedValue(new NotFoundException());
      await expect(controller.getById({ id: "unknown" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------
  describe("submit", () => {
    it("should submit a tool and return the pending result", async () => {
      const dto = {
        name: "New API",
        shortDescription: "A useful recycling API.",
        websiteUrl: "https://example.com",
        category: ApiToolCategory.RECYCLING,
        authType: ApiToolAuthType.NONE,
        pricingModel: ApiToolPricingModel.FREE,
        isPubliclyAccessible: true,
        requiresAccount: false,
        requiresApiKey: false,
      };
      const created = { ...dto, id: "new-uuid", status: ApiToolStatus.PENDING };
      jest.spyOn(service, "submit").mockResolvedValue(created as any);

      const result = await controller.submit({
        dto: dto as any,
        submitterUserId: "user-222",
      });
      expect(result).toEqual(created);
      expect(service.submit).toHaveBeenCalledWith(dto, "user-222");
    });
  });

  // -------------------------------------------------------------------
  describe("approve", () => {
    it("should approve a tool", async () => {
      const approved = { ...mockPendingTool, status: ApiToolStatus.APPROVED };
      jest.spyOn(service, "approve").mockResolvedValue(approved as any);

      const result = await controller.approve({
        id: "tool-uuid-456",
        adminUserId: "admin-999",
        isCommunity: false,
      });
      expect(result).toEqual(approved);
      expect(service.approve).toHaveBeenCalledWith(
        "tool-uuid-456",
        "admin-999",
        false,
      );
    });

    it("should pass through undefined isCommunity when not provided", async () => {
      const approved = { ...mockPendingTool, status: ApiToolStatus.APPROVED };
      jest.spyOn(service, "approve").mockResolvedValue(approved as any);

      await controller.approve({
        id: "tool-uuid-456",
        adminUserId: "admin-999",
      });
      expect(service.approve).toHaveBeenCalledWith(
        "tool-uuid-456",
        "admin-999",
        undefined,
      );
    });

    it("should propagate NotFoundException when tool not found", async () => {
      jest.spyOn(service, "approve").mockRejectedValue(new NotFoundException());
      await expect(
        controller.approve({ id: "bad-id", adminUserId: "admin-999" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------
  describe("reject", () => {
    it("should reject a tool with a reason", async () => {
      const rejected = {
        ...mockPendingTool,
        status: ApiToolStatus.REJECTED,
        rejectionReason: "No docs",
      };
      jest.spyOn(service, "reject").mockResolvedValue(rejected as any);

      const result = await controller.reject({
        id: "tool-uuid-456",
        adminUserId: "admin-999",
        reason: "No docs",
      });
      expect(result).toEqual(rejected);
      expect(service.reject).toHaveBeenCalledWith(
        "tool-uuid-456",
        "admin-999",
        "No docs",
      );
    });

    it("should reject a tool without a reason", async () => {
      const rejected = {
        ...mockPendingTool,
        status: ApiToolStatus.REJECTED,
        rejectionReason: null,
      };
      jest.spyOn(service, "reject").mockResolvedValue(rejected as any);

      const result = await controller.reject({
        id: "tool-uuid-456",
        adminUserId: "admin-999",
      });
      expect(result).toEqual(rejected);
      expect(service.reject).toHaveBeenCalledWith(
        "tool-uuid-456",
        "admin-999",
        undefined,
      );
    });
  });
});
