/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { YoutubeAdapterController } from "../youtube-adapter.controller";
import { YoutubeAdapterService } from "../youtube-adapter.service";

describe("YoutubeAdapterController", () => {
  let controller: YoutubeAdapterController;
  let service: YoutubeAdapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YoutubeAdapterController],
      providers: [
        {
          provide: YoutubeAdapterService,
          useValue: {
            searchRepairVideos: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<YoutubeAdapterController>(YoutubeAdapterController);
    service = module.get<YoutubeAdapterService>(YoutubeAdapterService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("searchRepairVideos", () => {
    it("should call youtubeAdapterService.searchRepairVideos with correct payload", async () => {
      const payload = { query: "iPhone 14" };
      await controller.searchRepairVideos(payload);
      expect(service.searchRepairVideos).toHaveBeenCalledWith(payload.query);
    });
  });
});
