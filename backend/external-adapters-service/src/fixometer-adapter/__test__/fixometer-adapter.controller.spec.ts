import { Test, TestingModule } from "@nestjs/testing";
import { FixometerAdapterController } from "../fixometer-adapter.controller";
import { FixometerAdapterService } from "../fixometer-adapter.service";

describe("FixometerAdapterController", () => {
  let controller: FixometerAdapterController;
  let service: FixometerAdapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FixometerAdapterController],
      providers: [
        {
          provide: FixometerAdapterService,
          useValue: {
            fetchImpactMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FixometerAdapterController>(
      FixometerAdapterController,
    );
    service = module.get<FixometerAdapterService>(FixometerAdapterService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should call fetchImpactMetrics on the service with the category alone", () => {
    const fetchImpactMetricsSpy = jest.spyOn(service, "fetchImpactMetrics");

    controller.fetchImpactMetrics({ deviceType: "Kettle" });

    expect(fetchImpactMetricsSpy).toHaveBeenCalledWith("Kettle");
  });
});
