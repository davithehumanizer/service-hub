import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { RepairMonitorService } from "../repair-monitor.service";
import { RepairRecord } from "../entities/repair-record.entity";
import { RepairCategory } from "../entities/repair-category.entity";
import { RepairCategoryTranslation } from "../entities/repair-category-translation.entity";
import { RepairCategoryDeviceMapping } from "../entities/repair-category-device-mapping.entity";
import { RepairStatus } from "../enums/repair-status.enum";

const makeRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  count: jest.fn().mockResolvedValue(1),
  create: jest.fn((dto) => dto),
  save: jest.fn(async (e) => ({ id: "uuid-1", ...e })),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  remove: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe("RepairMonitorService", () => {
  let service: RepairMonitorService;
  let repairRecordRepo: ReturnType<typeof makeRepo>;
  let repairCategoryRepo: ReturnType<typeof makeRepo>;
  let translationRepo: ReturnType<typeof makeRepo>;
  let mappingRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    repairRecordRepo = makeRepo();
    repairCategoryRepo = makeRepo();
    translationRepo = makeRepo();
    mappingRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairMonitorService,
        {
          provide: getRepositoryToken(RepairRecord),
          useValue: repairRecordRepo,
        },
        {
          provide: getRepositoryToken(RepairCategory),
          useValue: repairCategoryRepo,
        },
        {
          provide: getRepositoryToken(RepairCategoryTranslation),
          useValue: translationRepo,
        },
        {
          provide: getRepositoryToken(RepairCategoryDeviceMapping),
          useValue: mappingRepo,
        },
      ],
    }).compile();

    service = module.get<RepairMonitorService>(RepairMonitorService);
    jest.clearAllMocks();
    // Reset count to 1 to skip seeding in onModuleInit
    repairCategoryRepo.count.mockResolvedValue(1);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── onModuleInit / seeding ────────────────────────────────────────────────

  describe("onModuleInit", () => {
    it("should skip seeding when categories already exist", async () => {
      repairCategoryRepo.count.mockResolvedValue(5);
      await service.onModuleInit();
      expect(repairCategoryRepo.save).not.toHaveBeenCalled();
    });

    it("should seed categories when count is 0", async () => {
      repairCategoryRepo.count.mockResolvedValue(0);
      repairCategoryRepo.save.mockResolvedValue({
        id: 1,
        slug: "Computers",
        name: "Computers",
      });
      translationRepo.save.mockResolvedValue({});
      mappingRepo.save.mockResolvedValue({});
      await service.onModuleInit();
      expect(repairCategoryRepo.save).toHaveBeenCalled();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("should create and return a repair record", async () => {
      const dto = {
        brand: "Samsung",
        productCategory: "Phones",
        repairStatus: RepairStatus.Fixed,
        country: "BEL",
      } as any;
      repairRecordRepo.save.mockResolvedValue({
        id: "rec-1",
        ...dto,
      });

      const result = await service.create(dto, "user-123");

      expect(repairRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          submittedByUserId: "user-123",
        }),
      );
      expect(result.id).toBe("rec-1");
    });

    it("should create a record without userId", async () => {
      const dto = { brand: "Apple" } as any;
      repairRecordRepo.save.mockResolvedValue({ id: "rec-2", ...dto });
      const result = await service.create(dto);
      expect(result).toBeDefined();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("should return paginated records", async () => {
      const records = [{ id: "r1" }, { id: "r2" }] as RepairRecord[];
      repairRecordRepo.findAndCount.mockResolvedValue([records, 2]);

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(result.data).toEqual(records);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should apply country and brand filters", async () => {
      repairRecordRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({
        country: "BEL",
        brand: "Samsung",
        page: 1,
        limit: 5,
      } as any);
      expect(repairRecordRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ country: "BEL" }),
        }),
      );
    });

    it("should apply date range filter", async () => {
      repairRecordRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      } as any);
      expect(repairRecordRepo.findAndCount).toHaveBeenCalled();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe("findOne", () => {
    it("should return a record by id", async () => {
      const record = { id: "rec-1", brand: "Samsung" } as RepairRecord;
      repairRecordRepo.findOne.mockResolvedValue(record);

      const result = await service.findOne("rec-1");

      expect(result).toEqual(record);
      expect(repairRecordRepo.findOne).toHaveBeenCalledWith({
        where: { id: "rec-1" },
      });
    });

    it("should throw NotFoundException when record does not exist", async () => {
      repairRecordRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("should update and return the record", async () => {
      const existing = { id: "rec-1", brand: "Samsung" } as RepairRecord;
      repairRecordRepo.findOne.mockResolvedValue(existing);
      repairRecordRepo.save.mockResolvedValue({ ...existing, brand: "Apple" });

      const result = await service.update("rec-1", { brand: "Apple" } as any);

      expect(result.brand).toBe("Apple");
    });

    it("should throw NotFoundException if record not found", async () => {
      repairRecordRepo.findOne.mockResolvedValue(null);
      await expect(service.update("bad-id", {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("should remove the record", async () => {
      const record = { id: "rec-1" } as RepairRecord;
      repairRecordRepo.findOne.mockResolvedValue(record);

      await service.remove("rec-1");

      expect(repairRecordRepo.remove).toHaveBeenCalledWith(record);
    });

    it("should throw NotFoundException if record not found", async () => {
      repairRecordRepo.findOne.mockResolvedValue(null);
      await expect(service.remove("bad-id")).rejects.toThrow(NotFoundException);
    });
  });

  // ── importFromCsv ─────────────────────────────────────────────────────────

  describe("importFromCsv", () => {
    it("should import valid rows and return counts", async () => {
      repairRecordRepo.find.mockResolvedValue([]);
      repairRecordRepo.save.mockResolvedValue(undefined);

      const rows = [
        {
          Marque: "Samsung",
          "Type de produit": "Computers",
          "Le produit a-t-il été réparé ?": "yes",
          "Réparation id": "partner-001",
          "Date de réparation": "2024-05-12",
          Pays: "BE",
        },
        {
          Marque: "Apple",
          "Type de produit": "Phones",
          "Le produit a-t-il été réparé ?": "no",
          "Réparation id": "partner-002",
          "Date de réparation": "2024-06-01",
          Pays: "FR",
        },
      ];

      const result = await service.importFromCsv(rows);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it("should skip rows that have already been imported (duplicate partnerId)", async () => {
      repairRecordRepo.find.mockResolvedValue([
        { partnerId: "dup-001" },
      ] as RepairRecord[]);
      repairRecordRepo.save.mockResolvedValue(undefined);

      const rows = [
        {
          Marque: "Samsung",
          "Type de produit": "Computers",
          "Le produit a-t-il été réparé ?": "yes",
          "Réparation id": "dup-001",
        },
        {
          Marque: "Apple",
          "Type de produit": "Phones",
          "Le produit a-t-il été réparé ?": "no",
          "Réparation id": "new-002",
        },
      ];

      const result = await service.importFromCsv(rows);

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(1);
    });

    it("should skip null rows", async () => {
      repairRecordRepo.find.mockResolvedValue([]);
      const result = await service.importFromCsv([null, null]);
      expect(result.skipped).toBe(2);
      expect(result.imported).toBe(0);
    });
  });

  // ── findAllRepairCategories ────────────────────────────────────────────────

  describe("findAllRepairCategories", () => {
    it("should return categories with default names when no locale", async () => {
      repairCategoryRepo.find.mockResolvedValue([
        {
          id: 1,
          slug: "Computers",
          name: "Computers",
          translations: [],
          deviceMappings: [],
        },
      ]);

      const result = await service.findAllRepairCategories();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Computers");
    });

    it("should return translated name when locale matches", async () => {
      repairCategoryRepo.find.mockResolvedValue([
        {
          id: 1,
          slug: "Computers",
          name: "Computers",
          translations: [{ locale: "fr", translated_name: "Ordinateurs" }],
          deviceMappings: [{ deviceCategoryId: 1 }],
        },
      ]);

      const result = await service.findAllRepairCategories("fr");

      expect(result[0].name).toBe("Ordinateurs");
      expect(result[0].deviceCategoryIds).toEqual([1]);
    });
  });

  // ── findRepairCategoryByDeviceCategoryId ──────────────────────────────────

  describe("findRepairCategoryByDeviceCategoryId", () => {
    it("should return category for a device category id", async () => {
      mappingRepo.findOne.mockResolvedValue({
        repairCategory: { id: 2, slug: "Phones", name: "Phones & tablets" },
      });

      const result = await service.findRepairCategoryByDeviceCategoryId(6);

      expect(result).toEqual({
        id: 2,
        slug: "Phones",
        name: "Phones & tablets",
      });
    });

    it("should return null when no mapping found", async () => {
      mappingRepo.findOne.mockResolvedValue(null);
      const result = await service.findRepairCategoryByDeviceCategoryId(999);
      expect(result).toBeNull();
    });
  });

  // ── statistics ────────────────────────────────────────────────────────────

  describe("getStatsByCategory", () => {
    it("should query and return category stats", async () => {
      repairRecordRepo.query.mockResolvedValue([
        { category: "Computers", count: 5 },
      ]);
      const result = await service.getStatsByCategory({});
      expect(result).toEqual([{ category: "Computers", count: 5 }]);
    });

    it("should apply country and date filters in WHERE clause", async () => {
      repairRecordRepo.query.mockResolvedValue([]);
      await service.getStatsByCategory({
        country: "BEL",
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      });
      const sql: string = repairRecordRepo.query.mock.calls[0][0];
      expect(sql).toContain("r.country = 'BEL'");
    });
  });

  describe("getStatsByBrand", () => {
    it("should return brand stats", async () => {
      repairRecordRepo.query.mockResolvedValue([
        { brand: "Samsung", count: 10 },
      ]);
      const result = await service.getStatsByBrand({});
      expect(result[0].brand).toBe("Samsung");
    });
  });

  describe("getStatsByOutcome", () => {
    it("should return outcome stats", async () => {
      repairRecordRepo.query.mockResolvedValue([
        { repairStatus: "Fixed", count: 3 },
      ]);
      const result = await service.getStatsByOutcome({});
      expect(result[0].repairStatus).toBe("Fixed");
    });
  });

  describe("getStatsFailureReasons", () => {
    it("should return failure reasons only for EndOfLife records", async () => {
      repairRecordRepo.query.mockResolvedValue([
        { repairBarrier: "TooExpensive", count: 2 },
      ]);
      const result = await service.getStatsFailureReasons({});
      expect(result[0].repairBarrier).toBe("TooExpensive");
      const sql: string = repairRecordRepo.query.mock.calls[0][0];
      expect(sql).toContain("EndOfLife");
    });
  });

  // ── getPlatformSummary ────────────────────────────────────────────────────

  describe("getPlatformSummary", () => {
    it("should return the total count of repair records", async () => {
      repairRecordRepo.count.mockResolvedValue(99);
      const result = await service.getPlatformSummary();
      expect(result).toEqual({ totalRepairs: 99 });
      expect(repairRecordRepo.count).toHaveBeenCalled();
    });

    it("should return 0 when no repair records exist", async () => {
      repairRecordRepo.count.mockResolvedValue(0);
      const result = await service.getPlatformSummary();
      expect(result).toEqual({ totalRepairs: 0 });
    });
  });
});
