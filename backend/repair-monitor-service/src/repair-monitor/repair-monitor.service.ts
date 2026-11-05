import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, Like, In } from "typeorm";
import { RepairRecord } from "./entities/repair-record.entity";
import { RepairCategory } from "./entities/repair-category.entity";
import { RepairCategoryTranslation } from "./entities/repair-category-translation.entity";
import { RepairCategoryDeviceMapping } from "./entities/repair-category-device-mapping.entity";
import { CreateRepairRecordDto } from "./dto/create-repair-record.dto";
import { UpdateRepairRecordDto } from "./dto/update-repair-record.dto";
import { QueryRepairRecordsDto } from "./dto/query-repair-records.dto";
import { RepairStatus } from "./enums/repair-status.enum";

@Injectable()
export class RepairMonitorService implements OnModuleInit {
  private readonly logger = new Logger(RepairMonitorService.name);

  constructor(
    @InjectRepository(RepairRecord)
    private readonly repairRecordRepository: Repository<RepairRecord>,
    @InjectRepository(RepairCategory)
    private readonly repairCategoryRepository: Repository<RepairCategory>,
    @InjectRepository(RepairCategoryTranslation)
    private readonly repairCategoryTranslationRepository: Repository<RepairCategoryTranslation>,
    @InjectRepository(RepairCategoryDeviceMapping)
    private readonly repairCategoryMappingRepository: Repository<RepairCategoryDeviceMapping>,
  ) {}

  async onModuleInit() {
    await this.seedRepairCategories();
  }

  // ── Repair Categories ─────────────────────────────────────────────────────

  private async seedRepairCategories(): Promise<void> {
    const count = await this.repairCategoryRepository.count();
    if (count > 0) return;

    this.logger.log("Seeding repair categories...");

    const seed: {
      slug: string;
      name: string;
      translations: { locale: string; translated_name: string }[];
      deviceMappings: { id: number; name: string }[];
    }[] = [
      {
        slug: "ElectricalItems",
        name: "Electrical items",
        translations: [
          { locale: "fr", translated_name: "Appareils électriques" },
          { locale: "nl", translated_name: "Elektrische apparaten" },
          { locale: "de", translated_name: "Elektrogeräte" },
        ],
        deviceMappings: [
          { id: 3, name: "Home Appliance" },
          { id: 7, name: "Wearable" },
          { id: 8, name: "Audio" },
          { id: 9, name: "Office Equipment" },
          { id: 10, name: "Networking" },
          { id: 11, name: "Smart Home" },
          { id: 12, name: "Imaging" },
          { id: 14, name: "Personal Care" },
          { id: 15, name: "Robot Vacuum" },
        ],
      },
      {
        slug: "Computers",
        name: "Computers",
        translations: [
          { locale: "fr", translated_name: "Ordinateurs" },
          { locale: "nl", translated_name: "Computers" },
          { locale: "de", translated_name: "Computer" },
        ],
        deviceMappings: [
          { id: 1, name: "Personal Computer" },
          { id: 2, name: "Gaming Console" },
          { id: 6, name: "Tablet" },
          { id: 13, name: "Monitor" },
        ],
      },
      {
        slug: "Phones",
        name: "Phones & tablets",
        translations: [
          { locale: "fr", translated_name: "Téléphones & tablettes" },
          { locale: "nl", translated_name: "Telefoons & tablets" },
          { locale: "de", translated_name: "Telefone & Tablets" },
        ],
        deviceMappings: [{ id: 6, name: "Tablet" }],
      },
      {
        slug: "TV",
        name: "TV & entertainment",
        translations: [
          { locale: "fr", translated_name: "TV & divertissement" },
          { locale: "nl", translated_name: "TV & entertainment" },
          { locale: "de", translated_name: "TV & Unterhaltung" },
        ],
        deviceMappings: [{ id: 13, name: "Monitor" }],
      },
      {
        slug: "WhiteGoods",
        name: "White goods",
        translations: [
          { locale: "fr", translated_name: "Électroménager" },
          { locale: "nl", translated_name: "Witgoed" },
          { locale: "de", translated_name: "Haushaltsgeräte" },
        ],
        deviceMappings: [
          { id: 3, name: "Home Appliance" },
          { id: 5, name: "Kitchen Appliance" },
        ],
      },
      {
        slug: "Tools",
        name: "Tools",
        translations: [
          { locale: "fr", translated_name: "Outils" },
          { locale: "nl", translated_name: "Gereedschap" },
          { locale: "de", translated_name: "Werkzeuge" },
        ],
        deviceMappings: [{ id: 4, name: "Power Tool" }],
      },
      {
        slug: "MusicInstruments",
        name: "Musical instruments",
        translations: [
          { locale: "fr", translated_name: "Instruments de musique" },
          { locale: "nl", translated_name: "Muziekinstrumenten" },
          { locale: "de", translated_name: "Musikinstrumente" },
        ],
        deviceMappings: [{ id: 8, name: "Audio" }],
      },
      {
        slug: "Bikes",
        name: "Bikes",
        translations: [
          { locale: "fr", translated_name: "Vélos" },
          { locale: "nl", translated_name: "Fietsen" },
          { locale: "de", translated_name: "Fahrräder" },
        ],
        deviceMappings: [],
      },
      {
        slug: "Clothing",
        name: "Clothing",
        translations: [
          { locale: "fr", translated_name: "Vêtements" },
          { locale: "nl", translated_name: "Kleding" },
          { locale: "de", translated_name: "Kleidung" },
        ],
        deviceMappings: [],
      },
      {
        slug: "Furniture",
        name: "Furniture & household items",
        translations: [
          { locale: "fr", translated_name: "Meubles & articles ménagers" },
          { locale: "nl", translated_name: "Meubels & huishoudartikelen" },
          { locale: "de", translated_name: "Möbel & Haushaltsgegenstände" },
        ],
        deviceMappings: [],
      },
      {
        slug: "Toys",
        name: "Toys",
        translations: [
          { locale: "fr", translated_name: "Jouets" },
          { locale: "nl", translated_name: "Speelgoed" },
          { locale: "de", translated_name: "Spielzeug" },
        ],
        deviceMappings: [],
      },
      {
        slug: "Other",
        name: "Other",
        translations: [
          { locale: "fr", translated_name: "Autre" },
          { locale: "nl", translated_name: "Overig" },
          { locale: "de", translated_name: "Sonstiges" },
        ],
        deviceMappings: [],
      },
    ];

    for (const item of seed) {
      const category = this.repairCategoryRepository.create({
        slug: item.slug,
        name: item.name,
      });
      const saved = await this.repairCategoryRepository.save(category);

      for (const t of item.translations) {
        const translation = this.repairCategoryTranslationRepository.create({
          category: saved,
          locale: t.locale,
          translated_name: t.translated_name,
        });
        await this.repairCategoryTranslationRepository.save(translation);
      }

      for (const m of item.deviceMappings) {
        const mapping = this.repairCategoryMappingRepository.create({
          repairCategory: saved,
          deviceCategoryId: m.id,
          deviceCategoryName: m.name,
        });
        await this.repairCategoryMappingRepository.save(mapping);
      }
    }

    this.logger.log("Repair categories seeded successfully.");
  }

  async findAllRepairCategories(locale?: string): Promise<
    {
      id: number;
      slug: string;
      name: string;
      deviceCategoryIds: number[];
    }[]
  > {
    const categories = await this.repairCategoryRepository.find({
      relations: ["translations", "deviceMappings"],
    });

    return categories.map((c) => {
      let name = c.name;
      if (locale) {
        const translation = c.translations?.find((t) => t.locale === locale);
        if (translation) name = translation.translated_name;
      }
      return {
        id: c.id,
        slug: c.slug,
        name,
        deviceCategoryIds: (c.deviceMappings ?? []).map(
          (m) => m.deviceCategoryId,
        ),
      };
    });
  }

  async findRepairCategoryByDeviceCategoryId(
    deviceCategoryId: number,
  ): Promise<{ id: number; slug: string; name: string } | null> {
    const mapping = await this.repairCategoryMappingRepository.findOne({
      where: { deviceCategoryId },
      relations: ["repairCategory"],
    });
    if (!mapping) return null;
    return {
      id: mapping.repairCategory.id,
      slug: mapping.repairCategory.slug,
      name: mapping.repairCategory.name,
    };
  }

  async create(
    dto: CreateRepairRecordDto,
    submittedByUserId?: string,
  ): Promise<RepairRecord> {
    const record = this.repairRecordRepository.create({
      ...dto,
      submittedByUserId,
    });
    const saved = await this.repairRecordRepository.save(record);
    return saved;
  }

  async findAll(query: QueryRepairRecordsDto): Promise<{
    data: RepairRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      country,
      productCategory,
      brand,
      repairStatus,
    } = query;
    const where: any = {};
    if (country) where.country = country;
    if (productCategory) where.productCategory = productCategory;
    if (brand) where.brand = Like(`%${brand}%`);
    if (repairStatus) where.repairStatus = repairStatus;
    if (dateFrom && dateTo) {
      where.eventDate = Between(dateFrom, dateTo);
    }
    const [data, total] = await this.repairRecordRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { recordDate: "DESC" },
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<RepairRecord> {
    const record = await this.repairRecordRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`RepairRecord ${id} not found`);
    return record;
  }

  async update(id: string, dto: UpdateRepairRecordDto): Promise<RepairRecord> {
    const record = await this.findOne(id);
    Object.assign(record, dto);
    return this.repairRecordRepository.save(record);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findOne(id);
    await this.repairRecordRepository.remove(record);
  }

  async importFromCsv(
    rows: any[],
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    const candidates: RepairRecord[] = [];

    for (const row of rows) {
      try {
        const mapped = this.mapRepairmonitorRow(row);
        if (!mapped) {
          skipped++;
          continue;
        }
        const record = this.repairRecordRepository.create({
          ...mapped,
        });
        candidates.push(record);
      } catch {
        skipped++;
      }
    }

    // Deduplicate against already-imported records using partnerId
    const partnerIds = candidates
      .map((r) => r.partnerId)
      .filter((id): id is string => !!id);

    const existingIds = new Set<string>();
    if (partnerIds.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < partnerIds.length; i += CHUNK) {
        const existing = await this.repairRecordRepository.find({
          where: { partnerId: In(partnerIds.slice(i, i + CHUNK)) },
          select: ["partnerId"],
        });
        existing.forEach((r) => existingIds.add(r.partnerId));
      }
    }

    const records = candidates.filter(
      (r) => !r.partnerId || !existingIds.has(r.partnerId),
    );
    skipped += candidates.length - records.length;

    if (records.length > 0) {
      const CHUNK = 200;
      for (let i = 0; i < records.length; i += CHUNK) {
        await this.repairRecordRepository.save(records.slice(i, i + CHUNK));
      }
    }
    imported = records.length;
    return { imported, skipped };
  }

  private mapRepairmonitorRow(row: any): Partial<RepairRecord> | null {
    if (!row) return null;
    const getField = (keys: string[]): string | undefined => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== "") return String(row[k]).trim();
      }
      return undefined;
    };

    const rawStatus = getField([
      "Le produit a-t-il été réparé ?",
      "Has the product been repaired?",
      "repaired",
    ]);
    let repairStatus: RepairStatus | undefined;
    if (rawStatus) {
      const s = rawStatus.toLowerCase();
      if (s === "yes" || s === "oui") repairStatus = RepairStatus.Fixed;
      else if (s === "half" || s === "partially")
        repairStatus = RepairStatus.PartiallyFixed;
      else if (s === "no" || s === "non") repairStatus = RepairStatus.EndOfLife;
      else repairStatus = RepairStatus.Unknown;
    }

    const rawFeasibility = getField([
      "Réparabilité du produit: (1 = difficile, 10 = facile)",
      "Reparability of product  (1 = difficult, 10 = easy)",
      "repairability",
    ]);
    const repairFeasibility = rawFeasibility
      ? parseFloat(rawFeasibility)
      : undefined;

    const rawYear = getField([
      "Année de fabrication (estimée)",
      "(Estimated) Year of production",
      "year_of_manufacture",
    ]);
    const yearOfManufacture = rawYear ? parseInt(rawYear, 10) : undefined;

    // Map ISO 2-letter country codes to 3-letter where known
    const countryRaw = getField(["Pays", "Country", "country"]);
    const country = countryRaw ? this.normalizeCountry(countryRaw) : undefined;

    return {
      partnerId: getField(["Réparation id", "Repair id", "id"]),
      partnerProductCategory: getField(["Catégorie", "Category", "category"]),
      productCategory: this.normalizeCategoryToSlug(
        getField(["Type de produit", "Kind of product", "product_type"]),
      ),
      brand: this.normalizeBrand(getField(["Marque", "Brand", "brand"])),
      modelType: getField([
        "Modèle, numéro de type et/ou numéro de série",
        "Model, type number and/or serial number",
        "model",
      ]),
      yearOfManufacture: isNaN(yearOfManufacture)
        ? undefined
        : yearOfManufacture,
      problem: getField([
        "Description du problème + cause probable",
        "Problem description + probable cause",
        "problem",
      ]),
      repairStatus,
      repairSolution:
        [
          getField([
            "Si réparé : qu'est-ce que vous avez fait pour le réparer ?",
            "If yes: what did you do to repair it?",
          ]),
          getField([
            "Si en partie réparé : qu'est-ce que vous avez fait/quel conseil avez-vous donné ?",
            "If half repaired: what did you do, what advice did you give?",
          ]),
        ]
          .filter(Boolean)
          .join(" | ") || undefined,
      repairBarrier: this.normalizeBarrier(
        getField([
          "Si pas réparé : pourquoi n'avez-vous pas pu le réparer (liste) ?",
          "If not repaired: why could you not repair it (list)?",
        ]),
      ),
      repairFeasibility: isNaN(repairFeasibility)
        ? undefined
        : repairFeasibility,
      repairExplanation: getField([
        "Avez-vous un conseil pour d'autres réparateurs sur la réparation de ce produit (ou similaire) ?",
        "Do you have any suggestions for other repairers of this (or similar) product?",
      ]),
      groupIdentifier: getField([
        "Repair Café nombre",
        "Repair Cafe number",
        "group_id",
      ]),
      eventDate: this.parseDate(
        getField(["Date de réparation", "Repair date", "event_date"]),
      ),
      dataProvider: getField([
        "Repair Café nom",
        "Repair Cafe name",
        "data_provider",
      ]),
      country,
    };
  }

  private normalizeBarrier(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const s = raw.toLowerCase().trim();
    if (
      s === "tooexpensive" ||
      s === "too expensive" ||
      s === "trop cher" ||
      s === "too_expensive"
    )
      return "TooExpensive";
    if (
      s === "sparepartsunavailable" ||
      s === "spare parts unavailable" ||
      s === "spare parts not available" ||
      s === "pièces indisponibles" ||
      s === "pieces indisponibles" ||
      s === "pièces détachées indisponibles" ||
      s === "spare_parts_unavailable"
    )
      return "SparePartsUnavailable";
    if (
      s === "noskillsinfo" ||
      s === "no skills/info" ||
      s === "no skills or info" ||
      s === "no skills" ||
      s === "pas de compétences" ||
      s === "pas de compétences / infos" ||
      s === "pas de compétences ou d'informations" ||
      s === "no_skills_info"
    )
      return "NoSkillsInfo";
    if (
      s === "productdesign" ||
      s === "product design" ||
      s === "conception du produit" ||
      s === "product_design"
    )
      return "ProductDesign";
    if (
      s === "nofaultfound" ||
      s === "no fault found" ||
      s === "no fault" ||
      s === "aucune panne" ||
      s === "aucune panne détectée" ||
      s === "no_fault_found"
    )
      return "NoFaultFound";
    if (
      s === "beyondeconomicrepair" ||
      s === "beyond economic repair" ||
      s === "end of life/beyond repair" ||
      s === "non rentable" ||
      s === "réparation non rentable" ||
      s === "beyond_economic_repair" ||
      s === "eol/ber"
    )
      return "BeyondEconomicRepair";
    if (s === "other" || s === "autre") return "Other";
    // Unknown value: return as-is so it's still visible in the chart
    return raw.trim();
  }

  private normalizeCategoryToSlug(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const map: Record<string, string> = {
      "electrical items": "ElectricalItems",
      "white goods": "WhiteGoods",
      "tv & entertainment": "TV",
      "furniture & household items": "Furniture",
      "phones & tablets": "Phones",
      "musical instruments": "MusicInstruments",
      clothing: "Clothing",
      bikes: "Bikes",
      computers: "Computers",
      tools: "Tools",
      toys: "Toys",
      other: "Other",
    };
    return map[raw.toLowerCase().trim()] ?? "Other";
  }

  private normalizeBrand(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const lower = raw.toLowerCase().trim();
    if (
      lower === "unknown/n.a." ||
      lower === "unknown" ||
      lower === "n.a." ||
      lower === "n/a" ||
      lower === "na"
    ) {
      return "Unknown";
    }
    return raw.trim();
  }

  /** Return a YYYY-MM-DD string only if the value looks like a valid date, otherwise undefined */
  private parseDate(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim().substring(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? undefined : trimmed;
  }

  private normalizeCountry(raw: string): string {
    const iso2to3: Record<string, string> = {
      AU: "AUS",
      BE: "BEL",
      FR: "FRA",
      DE: "DEU",
      GB: "GBR",
      NL: "NLD",
      US: "USA",
      CA: "CAN",
      ES: "ESP",
      IT: "ITA",
      PT: "PRT",
      CH: "CHE",
      AT: "AUT",
      SE: "SWE",
      NO: "NOR",
      DK: "DNK",
      FI: "FIN",
      IE: "IRL",
    };
    const upper = raw.trim().toUpperCase();
    return iso2to3[upper] || upper;
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  private buildBaseWhere(filters: {
    dateFrom?: string;
    dateTo?: string;
    country?: string;
  }): string {
    const conditions: string[] = [];
    if (filters.country)
      conditions.push(`r.country = '${filters.country.replace(/'/g, "''")}'`);
    if (filters.dateFrom)
      conditions.push(`r."eventDate" >= '${filters.dateFrom}'`);
    if (filters.dateTo) conditions.push(`r."eventDate" <= '${filters.dateTo}'`);
    return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  }

  async getStatsByCategory(
    filters: any,
  ): Promise<{ category: string; count: number }[]> {
    const where = this.buildBaseWhere(filters);
    const rows = await this.repairRecordRepository.query(`
      SELECT
        COALESCE(NULLIF(r."partnerProductCategory", ''), r."productCategory") AS category,
        COUNT(*)::int AS count
      FROM repair_records r
      ${where}
      GROUP BY COALESCE(NULLIF(r."partnerProductCategory", ''), r."productCategory")
      ORDER BY count DESC
    `);
    return rows;
  }

  async getStatsByBrand(
    filters: any,
    limit = 20,
  ): Promise<{ brand: string; count: number }[]> {
    const where = this.buildBaseWhere(filters);
    const rows = await this.repairRecordRepository.query(`
      SELECT r.brand, COUNT(*)::int AS count
      FROM repair_records r
      ${where ? where + " AND" : "WHERE"} r.brand IS NOT NULL AND r.brand != ''
      GROUP BY r.brand
      ORDER BY count DESC
      LIMIT ${limit}
    `);
    return rows;
  }

  async getStatsByOutcome(
    filters: any,
  ): Promise<{ repairStatus: string; count: number }[]> {
    const where = this.buildBaseWhere(filters);
    const rows = await this.repairRecordRepository.query(`
      SELECT r."repairStatus", COUNT(*)::int AS count
      FROM repair_records r
      ${where}
      GROUP BY r."repairStatus"
      ORDER BY count DESC
    `);
    return rows;
  }

  async getStatsFailureReasons(
    filters: any,
  ): Promise<{ repairBarrier: string; count: number }[]> {
    const where = this.buildBaseWhere(filters);
    const whereEol = where
      ? where + ` AND r."repairStatus" = '${RepairStatus.EndOfLife}'`
      : `WHERE r."repairStatus" = '${RepairStatus.EndOfLife}'`;
    const rows = await this.repairRecordRepository.query(`
      SELECT r."repairBarrier", COUNT(*)::int AS count
      FROM repair_records r
      ${whereEol} AND r."repairBarrier" IS NOT NULL
      GROUP BY r."repairBarrier"
      ORDER BY count DESC
    `);
    return rows;
  }

  async getStatsOverTime(
    filters: any,
  ): Promise<{ period: string; count: number }[]> {
    const where = this.buildBaseWhere(filters);
    const rows = await this.repairRecordRepository.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', r."eventDate"::date), 'YYYY-MM') AS period,
             COUNT(*)::int AS count
      FROM repair_records r
      ${where ? where + " AND" : "WHERE"} r."eventDate" IS NOT NULL
      GROUP BY DATE_TRUNC('month', r."eventDate"::date)
      ORDER BY period ASC
    `);
    return rows;
  }

  async getPlatformSummary(): Promise<{ totalRepairs: number }> {
    const totalRepairs = await this.repairRecordRepository.count();
    return { totalRepairs };
  }
}
