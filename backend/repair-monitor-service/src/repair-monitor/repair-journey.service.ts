import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID, timingSafeEqual } from 'crypto';
import { RepairJourney } from './entities/repair-journey.entity';
import { RepairRecord } from './entities/repair-record.entity';
import { CreateRepairJourneyDto } from './dto/create-repair-journey.dto';
import { DeclareOutcomeDto } from './dto/declare-outcome.dto';
import { JourneyStatus } from './enums/journey-status.enum';
import { RecordSource } from './enums/record-source.enum';

/** How long a journey stays declarable. */
export const TOKEN_LIFETIME_DAYS = 90;

/** Marks records this platform produced, as opposed to the imported dataset. */
export const PLATFORM_DATA_PROVIDER = 'care2repair';

/** At most this many journeys are listed back; nobody tracks more by hand. */
const LIST_LIMIT = 100;

/**
 * The impact figure frozen onto a journey when its outcome is declared.
 * Computed upstream, from reference data the gateway can reach.
 */
export interface FrozenImpact {
  co2: number;
  reference: { category: string; products: number };
}

/** A journey as its owner sees it. Never carries the declaration token. */
export interface JourneySummary {
  id: string;
  /** The catalogue device, when one was picked. Null for a journey described
   *  by category alone, which is most guest journeys. */
  deviceId: number | null;
  /** The device model, when one was picked or the variant names it. */
  modelId: number | null;
  /** The personal device the journey is about, for its repair history. */
  ownershipId: string | null;
  brand: string;
  modelType: string;
  productCategory: string;
  problemTag: string;
  repairRoute: string;
  issues: string[];
  journeyDate: Date;
  status: string;
  declaredAt: Date | null;
  outcome: string | null;
  solutionTag: string | null;
  repairBarrier: string | null;
  eventDate: string | null;
  /** Frozen at declaration. Null means unknown, never zero. */
  co2Avoided: number | null;
  co2ReferenceCategory: string | null;
  co2ReferenceProducts: number | null;
}

const tokensMatch = (a: string, b: string): boolean => {
  const left = Buffer.from(a ?? '');
  const right = Buffer.from(b ?? '');
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

@Injectable()
export class RepairJourneyService {
  private readonly logger = new Logger(RepairJourneyService.name);

  constructor(
    @InjectRepository(RepairJourney)
    private readonly journeyRepo: Repository<RepairJourney>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Records a completed wizard journey and mints the secret that will let its
   * outcome be declared later, with no account involved.
   *
   * The token is returned here and nowhere else: the column is `select: false`,
   * so it cannot leak through a later read.
   */
  async create(
    dto: CreateRepairJourneyDto,
    userId?: string,
  ): Promise<{ id: string; declarationToken: string; tokenExpiresAt: Date }> {
    const declarationToken = randomUUID();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_LIFETIME_DAYS);

    const journey = this.journeyRepo.create({
      ...dto,
      userId,
      declarationToken,
      tokenExpiresAt,
      status: JourneyStatus.Pending,
    });

    const saved = await this.journeyRepo.save(journey);

    return { id: saved.id, declarationToken, tokenExpiresAt };
  }

  /**
   * Turns a journey into a repair record. **This is the only path by which
   * platform data enters the statistics** — everything before it stays in
   * `repair_journeys`, where no stats query can see it.
   *
   * Both writes happen in one transaction: a record without its journey marked
   * as declared would be counted twice the next time the user answers.
   *
   * @param impact the CO2e figure to freeze onto the journey. Passed in by the
   *   gateway, which computes it from the journey's category — never taken
   *   from the request body, where anyone could inflate their own total.
   */
  async declareOutcome(
    journeyId: string,
    dto: DeclareOutcomeDto,
    userId?: string,
    impact?: FrozenImpact | null,
  ): Promise<{ journeyId: string; repairRecordId: string }> {
    const journey = await this.journeyRepo
      .createQueryBuilder('journey')
      .addSelect('journey.declarationToken')
      .where('journey.id = :journeyId', { journeyId })
      .getOne();

    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    // Two ways in, and only two: the browser that recorded the journey holds
    // the token, and the account it was adopted by owns it outright. Without
    // the second, adopting a journey would not let the user answer from the
    // phone they signed in on.
    const ownsJourney = Boolean(userId) && journey.userId === userId;
    const hasToken =
      Boolean(dto.declarationToken) &&
      tokensMatch(journey.declarationToken, dto.declarationToken);
    if (!ownsJourney && !hasToken) {
      this.logger.warn(`Unauthorised declaration for journey ${journeyId}`);
      throw new ForbiddenException('Invalid declaration token');
    }
    // Blocks replay: the token stays in the row but grants nothing once used.
    if (journey.status !== JourneyStatus.Pending) {
      throw new ConflictException('Outcome already declared');
    }
    if (journey.tokenExpiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Declaration window has expired');
    }

    return this.dataSource.transaction(async (manager) => {
      const record = manager.create(RepairRecord, {
        source: RecordSource.Platform,
        dataProvider: PLATFORM_DATA_PROVIDER,
        submittedByUserId: journey.userId,
        brand: journey.brand,
        modelType: journey.modelType,
        productCategory: journey.productCategory,
        productCategoryId: journey.productCategoryId,
        problem: journey.problem,
        issues: journey.issues,
        problemTag: journey.problemTag,
        issueSeverity: journey.issueSeverity,
        issueDuration: journey.issueDuration,
        visualCondition: journey.visualCondition,
        usageIntensity: journey.usageIntensity,
        productAge: journey.estimatedAge,
        country: journey.country,
        repairStatus: dto.outcome,
        repairBarrier: dto.repairBarrier,
        solutionTag: dto.solutionTag,
        repairSolution: dto.repairSolution,
        yearOfManufacture: dto.yearOfManufacture,
        eventDate: new Date().toISOString().slice(0, 10),
      });

      const savedRecord = await manager.save(record);

      await manager.update(RepairJourney, journey.id, {
        status: JourneyStatus.Declared,
        declaredAt: new Date(),
        repairRecordId: savedRecord.id,
        // Frozen here and never recomputed. Absent when the category has no
        // reference figure, or when the calculation could not be reached —
        // either way null means "unknown", not zero.
        co2Avoided: impact?.co2 ?? null,
        co2ReferenceCategory: impact?.reference.category ?? null,
        co2ReferenceProducts: impact?.reference.products ?? null,
      });

      return { journeyId: journey.id, repairRecordId: savedRecord.id };
    });
  }

  /**
   * Lists the journeys a caller may see: the ones whose token this browser
   * holds, plus — when signed in — the ones already attached to the account.
   *
   * Both are authorisation, so an empty request must not become "everything":
   * with neither token nor user, the answer is nothing.
   */
  async list(tokens: string[], userId?: string): Promise<JourneySummary[]> {
    const where: Record<string, unknown>[] = [];
    if (tokens?.length) where.push({ declarationToken: In(tokens) });
    if (userId) where.push({ userId });
    if (!where.length) return [];

    const journeys = await this.journeyRepo.find({
      where,
      order: { journeyDate: 'DESC' },
      take: LIST_LIMIT,
    });

    // The outcome lives on the promoted record, so declared journeys need one
    // extra read. Batched rather than per journey.
    const recordIds = journeys
      .map((journey) => journey.repairRecordId)
      .filter((id): id is string => Boolean(id));

    const records = recordIds.length
      ? await this.dataSource.getRepository(RepairRecord).find({
          where: { id: In(recordIds) },
          select: [
            'id',
            'repairStatus',
            'solutionTag',
            'repairBarrier',
            'eventDate',
          ],
        })
      : [];
    const byId = new Map(records.map((record) => [record.id, record]));

    return journeys.map((journey) => {
      const record = journey.repairRecordId
        ? byId.get(journey.repairRecordId)
        : undefined;
      return {
        id: journey.id,
        deviceId: journey.deviceId ?? null,
        modelId: journey.modelId ?? null,
        ownershipId: journey.ownershipId ?? null,
        brand: journey.brand,
        modelType: journey.modelType,
        productCategory: journey.productCategory,
        problemTag: journey.problemTag,
        repairRoute: journey.repairRoute,
        issues: journey.issues ?? [],
        journeyDate: journey.journeyDate,
        status: journey.status,
        declaredAt: journey.declaredAt ?? null,
        outcome: record?.repairStatus ?? null,
        solutionTag: record?.solutionTag ?? null,
        repairBarrier: record?.repairBarrier ?? null,
        eventDate: record?.eventDate ?? null,
        co2Avoided: journey.co2Avoided ?? null,
        co2ReferenceCategory: journey.co2ReferenceCategory ?? null,
        co2ReferenceProducts: journey.co2ReferenceProducts ?? null,
      };
    });
  }

  /**
   * Ties a journey to one of its owner's personal devices, for that device's
   * repair history. The gateway has checked the device is the user's: the
   * journey takes its model, and its variant unless the journey named one.
   * A journey with no model, typed in by hand, cannot be checked against the
   * device, unless the device was made from the journey itself (`adopt`),
   * whose model it then takes; one already in another device's history
   * stays there, the variant it took from that device being
   * indistinguishable from its own. Returns the state the journey recorded,
   * for the device's current one.
   */
  async linkPersonalDevice(
    journeyId: string,
    userId: string,
    device: { ownershipId: string; modelId: number; deviceId: number | null },
    adopt = false,
  ): Promise<{
    id: string;
    ownershipId: string;
    modelId: number;
    deviceId: number | null;
    visualCondition: string | null;
    usageIntensity: string | null;
  }> {
    if (!userId) {
      throw new ForbiddenException('A personal device belongs to an account');
    }
    const journey = await this.journeyRepo.findOne({ where: { id: journeyId } });
    // Another user's journey is missing, as it is from their list.
    if (!journey || journey.userId !== userId) {
      throw new NotFoundException('Journey not found');
    }
    if (journey.modelId == null && !adopt) {
      throw new ConflictException('The journey names no model');
    }
    if (journey.modelId != null && journey.modelId !== device.modelId) {
      throw new ConflictException('The journey is about another model');
    }
    if (journey.ownershipId && journey.ownershipId !== device.ownershipId) {
      throw new ConflictException(
        "The journey is already in another device's history",
      );
    }
    const changes = {
      ownershipId: device.ownershipId,
      modelId: device.modelId,
      deviceId: journey.deviceId ?? device.deviceId,
    };
    await this.journeyRepo.update(journey.id, changes);
    return {
      id: journey.id,
      ...changes,
      visualCondition: journey.visualCondition ?? null,
      usageIntensity: journey.usageIntensity ?? null,
    };
  }

  /**
   * What a personal device is made of, from one of the user's journeys: the
   * device it names, typed in by hand or picked, and the state it recorded.
   */
  async deviceOfJourney(
    journeyId: string,
    userId: string,
  ): Promise<{
    id: string;
    ownershipId: string | null;
    modelId: number | null;
    deviceId: number | null;
    brand: string | null;
    modelType: string | null;
    productCategory: string | null;
    visualCondition: string | null;
    usageIntensity: string | null;
    estimatedAge: number | null;
  }> {
    if (!userId) {
      throw new ForbiddenException('A personal device belongs to an account');
    }
    const journey = await this.journeyRepo.findOne({ where: { id: journeyId } });
    if (!journey || journey.userId !== userId) {
      throw new NotFoundException('Journey not found');
    }
    return {
      id: journey.id,
      ownershipId: journey.ownershipId ?? null,
      modelId: journey.modelId ?? null,
      deviceId: journey.deviceId ?? null,
      brand: journey.brand ?? null,
      modelType: journey.modelType ?? null,
      productCategory: journey.productCategory ?? null,
      visualCondition: journey.visualCondition ?? null,
      usageIntensity: journey.usageIntensity ?? null,
      estimatedAge: journey.estimatedAge ?? null,
    };
  }

  /**
   * Gives a journey whose device was typed in by hand the catalogue's model
   * of that device, found under its name or made from it by the gateway.
   * A journey that already names a model keeps it.
   */
  async adoptModel(
    journeyId: string,
    userId: string,
    modelId: number,
  ): Promise<{ id: string; modelId: number }> {
    if (!userId) {
      throw new ForbiddenException('A journey is adopted by an account');
    }
    const journey = await this.journeyRepo.findOne({ where: { id: journeyId } });
    if (!journey || journey.userId !== userId) {
      throw new NotFoundException('Journey not found');
    }
    if (journey.modelId != null && journey.modelId !== modelId) {
      throw new ConflictException('The journey is about another model');
    }
    if (journey.modelId == null) {
      await this.journeyRepo.update(journey.id, { modelId });
    }
    return { id: journey.id, modelId };
  }

  /**
   * Attaches journeys recorded anonymously to the account that just signed in,
   * so they survive a cleared browser and follow the user across devices.
   */
  async claim(
    tokens: string[],
    userId: string,
  ): Promise<{ claimed: number }> {
    if (!tokens?.length) return { claimed: 0 };
    // Without this, a null owner would pass straight through: the update would
    // set `userId` to null on rows where it is already null, report them as
    // affected, and the browser would announce an adoption that never happened.
    if (!userId) {
      throw new ForbiddenException('Cannot attach journeys without an account');
    }

    const result = await this.journeyRepo
      .createQueryBuilder()
      .update(RepairJourney)
      .set({ userId })
      .where('declarationToken IN (:...tokens)', { tokens })
      .andWhere('status = :status', { status: JourneyStatus.Pending })
      .andWhere('"userId" IS NULL')
      .execute();

    return { claimed: result.affected ?? 0 };
  }
}
