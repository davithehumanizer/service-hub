import { ConflictException, NotFoundException } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { RepairMonitorController } from "../repair-monitor.controller";
import { RepairMonitorService } from "../repair-monitor.service";
import { RepairJourneyService } from "../repair-journey.service";

describe("RepairMonitorController", () => {
  const journeys = {
    linkPersonalDevice: jest.fn(),
    deviceOfJourney: jest.fn(),
    adoptModel: jest.fn(),
  };
  const controller = new RepairMonitorController(
    {} as RepairMonitorService,
    journeys as unknown as RepairJourneyService,
  );
  const data = {
    journeyId: "journey-1",
    userId: "42",
    device: { ownershipId: "own-1", modelId: 877165, deviceId: 7 },
  };

  beforeEach(() => {
    journeys.linkPersonalDevice.mockReset();
    journeys.deviceOfJourney.mockReset();
  });

  describe("link_journey_personal_device", () => {
    it("ties the journey to the device the gateway checked", async () => {
      journeys.linkPersonalDevice.mockResolvedValue({ id: "journey-1" });

      await expect(controller.linkJourneyPersonalDevice(data)).resolves.toEqual(
        { id: "journey-1" },
      );
      expect(journeys.linkPersonalDevice).toHaveBeenCalledWith(
        "journey-1",
        "42",
        data.device,
        false,
      );
    });

    it("lets the gateway give a journey the model of a device made from it", async () => {
      journeys.linkPersonalDevice.mockResolvedValue({ id: "journey-1" });

      await controller.linkJourneyPersonalDevice({ ...data, adopt: true });

      expect(journeys.linkPersonalDevice).toHaveBeenCalledWith(
        "journey-1",
        "42",
        data.device,
        true,
      );
    });

    // The gateway answers with this status: a refusal is not an outage.
    it("passes a refusal on with its status", async () => {
      journeys.linkPersonalDevice.mockRejectedValue(
        new ConflictException("The journey is about another model"),
      );

      const error = await controller
        .linkJourneyPersonalDevice(data)
        .catch((e: RpcException) => e);

      expect(error).toBeInstanceOf(RpcException);
      expect((error as RpcException).getError()).toEqual({
        message: "The journey is about another model",
        status: 409,
      });
    });
  });

  describe("get_journey_device", () => {
    it("reads a user's journey, and passes a refusal on with its status", async () => {
      journeys.deviceOfJourney.mockResolvedValue({ id: "journey-1" });
      await expect(
        controller.getJourneyDevice({ journeyId: "journey-1", userId: "42" }),
      ).resolves.toEqual({ id: "journey-1" });

      journeys.deviceOfJourney.mockRejectedValue(
        new NotFoundException("Journey not found"),
      );
      const error = await controller
        .getJourneyDevice({ journeyId: "journey-1", userId: "42" })
        .catch((e: RpcException) => e);
      expect((error as RpcException).getError()).toEqual({
        message: "Journey not found",
        status: 404,
      });
    });
  });

  describe("adopt_journey_model", () => {
    it("gives a user's journey its model", async () => {
      journeys.adoptModel.mockResolvedValue({ id: "journey-1", modelId: 590 });
      await controller.adoptJourneyModel({
        journeyId: "journey-1",
        userId: "42",
        modelId: 590,
      });
      expect(journeys.adoptModel).toHaveBeenCalledWith("journey-1", "42", 590);
    });
  });
});
