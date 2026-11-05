/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { IfixitAdapterController } from "../ifixit-adapter.controller";
import { IfixitAdapterService } from "../ifixit-adapter.service";

describe("IfixitAdapterController", () => {
  let controller: IfixitAdapterController;
  let service: IfixitAdapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IfixitAdapterController],
      providers: [
        {
          provide: IfixitAdapterService,
          useValue: {
            getAllDevices: jest.fn(),
            getDeviceById: jest.fn(),
            getDeviceParts: jest.fn(),
            getDeviceGuide: jest.fn(),
            searchDevice: jest.fn(),
            suggestDevice: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IfixitAdapterController>(IfixitAdapterController);
    service = module.get<IfixitAdapterService>(IfixitAdapterService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getAllDevices", () => {
    it("should call ifixitAdapterService.getAllDevices with correct payload", async () => {
      const payload = { page: 1, limit: 10 };
      await controller.getAllDevices(payload);
      expect(service.getAllDevices).toHaveBeenCalledWith(
        payload.page,
        payload.limit,
      );
    });
  });

  describe("getDeviceById", () => {
    it("should call ifixitAdapterService.getDeviceById with correct payload", async () => {
      const payload = { id: "test-id" };
      await controller.getDeviceById(payload);
      expect(service.getDeviceById).toHaveBeenCalledWith(payload.id);
    });
  });

  describe("getDeviceParts", () => {
    it("should call ifixitAdapterService.getDeviceParts with correct payload", async () => {
      const payload = { id: "test-id" };
      await controller.getDeviceParts(payload);
      expect(service.getDeviceParts).toHaveBeenCalledWith(payload.id);
    });
  });

  describe("getDeviceGuide", () => {
    it("should call ifixitAdapterService.getDeviceGuide with correct payload", async () => {
      const payload = { id: "test-id", guideid: "test-guide-id" };
      await controller.getDeviceGuide(payload);
      expect(service.getDeviceGuide).toHaveBeenCalledWith(
        payload.id,
        payload.guideid,
      );
    });
  });

  describe("searchDevice", () => {
    it("should call ifixitAdapterService.searchDevice with correct payload", async () => {
      const payload = {
        query: "test-query",
        type: "test-type",
        subject: "test-subject",
        difficulty: "test-difficulty",
      };
      await controller.searchDevice(payload);
      expect(service.searchDevice).toHaveBeenCalledWith(
        payload.query,
        payload.type,
        payload.subject,
        payload.difficulty,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it("should call ifixitAdapterService.searchDevice with brand and category", async () => {
      const payload = {
        query: "test-query",
        type: "test-type",
        subject: "test-subject",
        difficulty: "test-difficulty",
        brand: "test-brand",
        category: "test-category",
        categoryWikiId: "Washing_Machine",
        lang: "de",
      };
      await controller.searchDevice(payload);
      expect(service.searchDevice).toHaveBeenCalledWith(
        payload.query,
        payload.type,
        payload.subject,
        payload.difficulty,
        payload.brand,
        payload.category,
        payload.categoryWikiId,
        payload.lang,
      );
    });
  });

  describe("suggestDevice", () => {
    it("should call ifixitAdapterService.suggestDevice with correct payload", async () => {
      const payload = { query: "test-query" };
      await controller.suggestDevice(payload);
      expect(service.suggestDevice).toHaveBeenCalledWith(payload.query);
    });
  });
});
