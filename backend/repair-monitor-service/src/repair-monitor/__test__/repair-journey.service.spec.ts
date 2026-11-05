import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  RepairJourneyService,
  TOKEN_LIFETIME_DAYS,
  PLATFORM_DATA_PROVIDER,
} from "../repair-journey.service";
import { RepairJourney } from "../entities/repair-journey.entity";
import { RepairRecord } from "../entities/repair-record.entity";
import { JourneyStatus } from "../enums/journey-status.enum";
import { JourneyOutcome } from "../enums/journey-outcome.enum";
import { RecordSource } from "../enums/record-source.enum";

const makeRepo = () => ({
  create: jest.fn((entity) => entity),
  save: jest.fn(async (entity) => ({ id: "journey-1", ...entity })),
  createQueryBuilder: jest.fn(),
  find: jest.fn(async (_options?: any): Promise<any[]> => []),
  findOne: jest.fn(async (_options?: any): Promise<any> => null),
  update: jest.fn(async (_id?: any, _changes?: any) => undefined),
});

const pendingJourney = (overrides: Partial<RepairJourney> = {}) =>
  ({
    id: "journey-1",
    declarationToken: "token-abc",
    tokenExpiresAt: new Date(Date.now() + 86_400_000),
    status: JourneyStatus.Pending,
    brand: "Bosch",
    problemTag: "BEHAVIOUR_SYMPTOM",
    estimatedAge: 4.5,
    ...overrides,
  }) as RepairJourney;

describe("RepairJourneyService", () => {
  let service: RepairJourneyService;
  let repo: ReturnType<typeof makeRepo>;
  let manager: { create: jest.Mock; save: jest.Mock; update: jest.Mock };
  let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  let recordRepo: { find: jest.Mock };

  /** Makes the token lookup return `journey`. */
  const givenJourney = (journey: RepairJourney | null) => {
    repo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(journey),
    });
  };

  beforeEach(async () => {
    repo = makeRepo();
    manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (data) => ({ id: "record-1", ...data })),
      update: jest.fn().mockResolvedValue(undefined),
    };
    recordRepo = { find: jest.fn(async (_options?: any): Promise<any[]> => []) };
    dataSource = {
      transaction: jest.fn(async (cb) => cb(manager)),
      getRepository: jest.fn(() => recordRepo),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairJourneyService,
        { provide: getRepositoryToken(RepairJourney), useValue: repo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RepairJourneyService>(RepairJourneyService);
  });

  it("stores the journey as pending and returns its id", async () => {
    const result = await service.create({ brand: "Bosch" });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "Bosch",
        status: JourneyStatus.Pending,
      }),
    );
    expect(result.id).toBe("journey-1");
  });

  it("mints a distinct declaration token for each journey", async () => {
    const first = await service.create({});
    const second = await service.create({});

    expect(first.declarationToken).toEqual(expect.any(String));
    expect(first.declarationToken).not.toEqual(second.declarationToken);
  });

  // The token is the only thing standing between a stranger and someone else's
  // declaration, so it must be what was persisted — not a fresh value.
  it("returns exactly the token it persisted", async () => {
    const result = await service.create({});

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ declarationToken: result.declarationToken }),
    );
  });

  it("expires the token after the documented lifetime", async () => {
    const before = Date.now();
    const { tokenExpiresAt } = await service.create({});

    const days = (tokenExpiresAt.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(days).toBeCloseTo(TOKEN_LIFETIME_DAYS, 1);
  });

  it("attaches the user when there is one, and does not invent one otherwise", async () => {
    await service.create({}, "user-7");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-7" }),
    );

    repo.create.mockClear();
    await service.create({});
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined }),
    );
  });

  describe("declareOutcome", () => {
    const validDeclaration = {
      declarationToken: "token-abc",
      outcome: JourneyOutcome.Fixed,
    };

    // The whole design rests on this: nothing reaches repair_records until the
    // user answers, because most visitors try the wizard with made-up data.
    it("is the only thing that writes a repair record, and marks it as platform data", async () => {
      givenJourney(pendingJourney());

      await service.declareOutcome("journey-1", validDeclaration);

      expect(manager.create).toHaveBeenCalledWith(
        RepairRecord,
        expect.objectContaining({
          source: RecordSource.Platform,
          dataProvider: PLATFORM_DATA_PROVIDER,
          repairStatus: JourneyOutcome.Fixed,
        }),
      );
    });

    it("carries the journey's context onto the record", async () => {
      givenJourney(pendingJourney());

      await service.declareOutcome("journey-1", {
        ...validDeclaration,
        yearOfManufacture: 2019,
      });

      expect(manager.create).toHaveBeenCalledWith(
        RepairRecord,
        expect.objectContaining({
          brand: "Bosch",
          problemTag: "BEHAVIOUR_SYMPTOM",
          productAge: 4.5,
          yearOfManufacture: 2019,
        }),
      );
    });

    it("writes the record and closes the journey in the same transaction", async () => {
      givenJourney(pendingJourney());

      const result = await service.declareOutcome(
        "journey-1",
        validDeclaration,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.update).toHaveBeenCalledWith(
        RepairJourney,
        "journey-1",
        expect.objectContaining({
          status: JourneyStatus.Declared,
          repairRecordId: "record-1",
        }),
      );
      expect(result.repairRecordId).toBe("record-1");
    });

    it("refuses a wrong token", async () => {
      givenJourney(pendingJourney());

      await expect(
        service.declareOutcome("journey-1", {
          ...validDeclaration,
          declarationToken: "token-xyz",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it("refuses a token of a different length without throwing", async () => {
      givenJourney(pendingJourney());

      await expect(
        service.declareOutcome("journey-1", {
          ...validDeclaration,
          declarationToken: "short",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuses a second declaration, so an outcome cannot be counted twice", async () => {
      givenJourney(pendingJourney({ status: JourneyStatus.Declared }));

      await expect(
        service.declareOutcome("journey-1", validDeclaration),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it("refuses an expired token", async () => {
      givenJourney(
        pendingJourney({ tokenExpiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.declareOutcome("journey-1", validDeclaration),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    // Recomputing it later would let someone's cumulative impact drift as
    // reference factors are revised. This is a record, not an estimate.
    it("freezes the impact it is handed, with its provenance", async () => {
      givenJourney(pendingJourney());

      await service.declareOutcome("journey-1", validDeclaration, undefined, {
        co2: 18.005,
        reference: { category: "Vacuum", products: 7 },
      });

      expect(manager.update).toHaveBeenCalledWith(
        RepairJourney,
        "journey-1",
        expect.objectContaining({
          co2Avoided: 18.005,
          co2ReferenceCategory: "Vacuum",
          co2ReferenceProducts: 7,
        }),
      );
    });

    // Null is "unknown". Storing a zero would quietly drag every average down.
    it("stores nothing rather than a zero when there is no figure", async () => {
      givenJourney(pendingJourney());

      await service.declareOutcome("journey-1", validDeclaration);

      expect(manager.update).toHaveBeenCalledWith(
        RepairJourney,
        "journey-1",
        expect.objectContaining({
          co2Avoided: null,
          co2ReferenceCategory: null,
          co2ReferenceProducts: null,
        }),
      );
    });

    it("reports an unknown journey as not found", async () => {
      givenJourney(null);

      await expect(
        service.declareOutcome("nope", validDeclaration),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    // Otherwise adopting a journey would buy nothing: the user who signed in
    // on their phone would still be told to produce a token their laptop holds.
    it("lets the owner answer without the browser token", async () => {
      givenJourney(pendingJourney({ userId: "user-7" }));

      await expect(
        service.declareOutcome(
          "journey-1",
          { outcome: JourneyOutcome.Fixed },
          "user-7",
        ),
      ).resolves.toEqual(
        expect.objectContaining({ repairRecordId: "record-1" }),
      );
    });

    it("refuses another signed-in user who holds no token", async () => {
      givenJourney(pendingJourney({ userId: "user-7" }));

      await expect(
        service.declareOutcome(
          "journey-1",
          { outcome: JourneyOutcome.Fixed },
          "user-99",
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    // An unattached journey has `userId` null on both sides; comparing them as
    // equal would hand it to any signed-out caller.
    it("does not treat an unclaimed journey as everyone's", async () => {
      givenJourney(pendingJourney());

      await expect(
        service.declareOutcome("journey-1", {
          outcome: JourneyOutcome.Fixed,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("list", () => {
    const declaredJourney = pendingJourney({
      id: "journey-2",
      status: JourneyStatus.Declared,
      repairRecordId: "record-1",
      declaredAt: new Date("2026-03-01T00:00:00Z"),
    });

    // Both a token and a session are authorisation. Neither must not degrade
    // into "show me everything".
    it("returns nothing, and asks nothing, without a token or a user", async () => {
      await expect(service.list([])).resolves.toEqual([]);
      expect(repo.find).not.toHaveBeenCalled();
    });

    it("matches on the browser's tokens or the account, whichever is offered", async () => {
      await service.list(["token-abc"], "user-7");

      const [{ where }] = repo.find.mock.calls[0];
      expect(where).toHaveLength(2);

      repo.find.mockClear();
      await service.list([], "user-7");
      expect(repo.find.mock.calls[0][0].where).toEqual([{ userId: "user-7" }]);
    });

    it("never hands back the declaration token", async () => {
      repo.find.mockResolvedValue([pendingJourney()]);

      const [summary] = await service.list(["token-abc"]);

      expect(summary).not.toHaveProperty("declarationToken");
      expect(JSON.stringify(summary)).not.toContain("token-abc");
    });

    it("reads the outcome off the record a declared journey was promoted into", async () => {
      repo.find.mockResolvedValue([declaredJourney]);
      recordRepo.find.mockResolvedValue([
        {
          id: "record-1",
          repairStatus: JourneyOutcome.Fixed,
          solutionTag: "Cleaning",
          repairBarrier: null,
          eventDate: "2026-03-01",
        },
      ]);

      const [summary] = await service.list(["token-abc"]);

      expect(summary).toEqual(
        expect.objectContaining({
          status: JourneyStatus.Declared,
          outcome: JourneyOutcome.Fixed,
          solutionTag: "Cleaning",
          eventDate: "2026-03-01",
        }),
      );
    });

    it("hands back the model and the personal device a journey is about", async () => {
      repo.find.mockResolvedValue([
        { ...pendingJourney(), modelId: 877165, ownershipId: "own-1" },
        pendingJourney(),
      ]);

      const [owned, typedIn] = await service.list(["token-abc"]);

      expect(owned).toEqual(
        expect.objectContaining({ modelId: 877165, ownershipId: "own-1" }),
      );
      expect(typedIn).toEqual(
        expect.objectContaining({ modelId: null, ownershipId: null }),
      );
    });

    it("skips the record read when nothing has been declared yet", async () => {
      repo.find.mockResolvedValue([pendingJourney()]);

      const [summary] = await service.list(["token-abc"]);

      expect(recordRepo.find).not.toHaveBeenCalled();
      expect(summary.outcome).toBeNull();
    });
  });

  describe("linkPersonalDevice", () => {
    const device = { ownershipId: "own-1", modelId: 877165, deviceId: 7 };

    it("ties the journey to the device, its model and, failing its own, its variant", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({
          userId: "42",
          modelId: 877165,
          visualCondition: "good",
          usageIntensity: "moderate",
        }),
      );

      const linked = await service.linkPersonalDevice("journey-1", "42", device);

      expect(repo.update).toHaveBeenCalledWith("journey-1", {
        ownershipId: "own-1",
        modelId: 877165,
        deviceId: 7,
      });
      expect(linked).toMatchObject({
        deviceId: 7,
        visualCondition: "good",
        usageIntensity: "moderate",
      });
    });

    it("keeps the variant the journey named", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({ userId: "42", modelId: 877165, deviceId: 9 }),
      );

      await service.linkPersonalDevice("journey-1", "42", device);

      expect(repo.update.mock.calls[0][1]?.deviceId).toBe(9);
    });

    it("answers another user's journey, or none, as not found", async () => {
      repo.findOne.mockResolvedValue(pendingJourney({ userId: "7" }));
      await expect(
        service.linkPersonalDevice("journey-1", "42", device),
      ).rejects.toBeInstanceOf(NotFoundException);
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.linkPersonalDevice("journey-1", "42", device),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("refuses a journey with no model, which cannot be checked", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({ userId: "42", modelId: null, deviceId: 9 }),
      );
      await expect(
        service.linkPersonalDevice("journey-1", "42", device),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("gives a journey typed in by hand the model of the device made from it", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({ userId: "42", modelId: null }),
      );

      await service.linkPersonalDevice(
        "journey-1",
        "42",
        { ownershipId: "own-1", modelId: 5120705, deviceId: null },
        true,
      );

      expect(repo.update).toHaveBeenCalledWith("journey-1", {
        ownershipId: "own-1",
        modelId: 5120705,
        deviceId: null,
      });
    });

    it("leaves a journey in the history it is in, and ties it again to the same device", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({
          userId: "42",
          modelId: 877165,
          deviceId: 7,
          ownershipId: "own-2",
        }),
      );
      await expect(
        service.linkPersonalDevice("journey-1", "42", device),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();

      repo.findOne.mockResolvedValue(
        pendingJourney({
          userId: "42",
          modelId: 877165,
          deviceId: 7,
          ownershipId: "own-1",
        }),
      );
      await service.linkPersonalDevice("journey-1", "42", device);
      expect(repo.update).toHaveBeenCalledWith("journey-1", {
        ownershipId: "own-1",
        modelId: 877165,
        deviceId: 7,
      });
    });

    it("refuses a device of another model, and a journey without an account", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({ userId: "42", modelId: 5 }),
      );
      await expect(
        service.linkPersonalDevice("journey-1", "42", device),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.linkPersonalDevice("journey-1", "", device),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("adoptModel", () => {
    it("gives a journey typed in by hand the model of its device", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({ userId: "42", modelId: null }),
      );

      await expect(
        service.adoptModel("journey-1", "42", 590),
      ).resolves.toEqual({ id: "journey-1", modelId: 590 });
      expect(repo.update).toHaveBeenCalledWith("journey-1", { modelId: 590 });
    });

    it("keeps the model a journey names, and refuses another", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({ userId: "42", modelId: 590 }),
      );
      await service.adoptModel("journey-1", "42", 590);
      expect(repo.update).not.toHaveBeenCalled();
      await expect(
        service.adoptModel("journey-1", "42", 7),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("answers another user's journey as not found, and refuses a guest", async () => {
      repo.findOne.mockResolvedValue(pendingJourney({ userId: "7" }));
      await expect(
        service.adoptModel("journey-1", "42", 590),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.adoptModel("journey-1", "", 590),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("deviceOfJourney", () => {
    it("reads the device and the state a user's journey recorded", async () => {
      repo.findOne.mockResolvedValue(
        pendingJourney({
          userId: "42",
          modelType: "SpotBot 3000",
          productCategory: "Robot vacuum cleaner",
          visualCondition: "good",
        }),
      );

      await expect(
        service.deviceOfJourney("journey-1", "42"),
      ).resolves.toMatchObject({
        id: "journey-1",
        ownershipId: null,
        modelId: null,
        brand: "Bosch",
        modelType: "SpotBot 3000",
        productCategory: "Robot vacuum cleaner",
        visualCondition: "good",
        estimatedAge: 4.5,
      });
    });

    it("answers another user's journey as not found, and refuses a guest", async () => {
      repo.findOne.mockResolvedValue(pendingJourney({ userId: "7" }));
      await expect(
        service.deviceOfJourney("journey-1", "42"),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.deviceOfJourney("journey-1", ""),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("claim", () => {
    const givenUpdateAffecting = (affected: number) => {
      const execute = jest.fn().mockResolvedValue({ affected });
      repo.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute,
      });
      return execute;
    };

    it("attaches matching journeys to the account", async () => {
      givenUpdateAffecting(2);

      await expect(service.claim(["a", "b"], "user-7")).resolves.toEqual({
        claimed: 2,
      });
    });

    it("does nothing when the browser holds no token", async () => {
      const execute = givenUpdateAffecting(0);

      await expect(service.claim([], "user-7")).resolves.toEqual({
        claimed: 0,
      });
      expect(execute).not.toHaveBeenCalled();
    });

    // The update would otherwise set null over null, count the rows as
    // affected, and hand back a success for an adoption that never happened.
    it("refuses to attach journeys to nobody", async () => {
      const execute = givenUpdateAffecting(3);

      await expect(service.claim(["a"], "")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(execute).not.toHaveBeenCalled();
    });
  });
});
