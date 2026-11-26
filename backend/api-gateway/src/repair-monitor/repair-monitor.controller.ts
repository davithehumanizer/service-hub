import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  ParseUUIDPipe,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
import { CreateRepairRecordDto } from './dto/create-repair-record.dto';
import { CreateRepairJourneyDto } from './dto/create-repair-journey.dto';
import { LinkPersonalDeviceDto } from './dto/link-personal-device.dto';
import { AddJourneyPersonalDeviceDto } from './dto/add-journey-personal-device.dto';
import {
  CreatedJourneyDto,
  JourneySummaryDto,
} from './dto/journey-response.dto';
import { PlatformSummaryDto } from './dto/platform-summary.dto';
import {
  DeclareOutcomeDto,
  ClaimJourneysDto,
  LookupJourneysDto,
} from './dto/declare-outcome.dto';
import { QueryRepairRecordDto } from './dto/query-repair-record.dto';
import { StatsFilterDto } from './dto/stats-filter.dto';
import { FlexibleAuthGuard } from '../auth/flexible-auth.guard';
import { PermissionsGuard } from '../auth/permission.guard';
import { Permissions } from '../auth/permission.decorator';
import { Author, authorOf } from '../auth/author';
import { FluentLoggerService } from '../common/fluent-logger.service';
import { csvUploadOptions } from '../common/upload.constraints';
import { DeviceModelResolver } from '../devices/device-model-resolver.service';

/**
 * The signed-in user's id, or null for a guest.
 *
 * Both keys are needed and neither alone is enough: the OAuth2 strategy returns
 * `sub`, while the application's own JWT strategy returns only `id`. Reading
 * `sub` alone made every logged-in user look anonymous — journeys were recorded
 * ownerless and adoption attached nothing while reporting success.
 *
 * Returned as a string because `repair_journeys.userId` is a varchar; comparing
 * it against a number would not even reach a row.
 */
const signedInUserId = (req: any): string | null => {
  const id = req?.user?.sub ?? req?.user?.id ?? null;
  return id === null || id === undefined ? null : String(id);
};

/** What a personal device is made of, from a journey. */
type JourneyDevice = {
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
};

/** The day a device of this age was acquired, roughly; today when unknown. */
const acquiredYearsAgo = (years: number | null): string | undefined => {
  if (years == null) return undefined;
  const date = new Date();
  date.setMonth(date.getMonth() - Math.round(years * 12));
  return date.toISOString().slice(0, 10);
};

@ApiTags('Repair Monitor')
@Controller('repair-monitor')
export class RepairMonitorController {
  private readonly logger = new Logger(RepairMonitorController.name);

  constructor(
    @Inject('REPAIR_MONITOR_SERVICE')
    private readonly repairMonitorService: ClientProxy,
    @Inject('DEVICES_SERVICE')
    private readonly devicesService: ClientProxy,
    @Inject('REPAIRERS_SERVICE')
    private readonly repairersService: ClientProxy,
    // Holds the repair-impact reference data, which repair-monitor-service
    // cannot reach: it owns no client to any other service.
    @Inject('EXTERNAL_ADAPTERS_SERVICE')
    private readonly externalAdaptersService: ClientProxy,
    private readonly fluentLogger: FluentLoggerService,
    private readonly resolver: DeviceModelResolver,
    @Inject('OWNERSHIP_SERVICE')
    private readonly ownershipService: ClientProxy,
  ) {}

  // ── Public stats endpoints ─────────────────────────────────────────────

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get platform-wide summary stats (public)' })
  @ApiResponse({ status: 200, type: PlatformSummaryDto })
  async statsSummary(): Promise<PlatformSummaryDto> {
    try {
      const [repairSummary, devicesPage, repairersPage] = await Promise.all([
        firstValueFrom(
          this.repairMonitorService.send({ cmd: 'get_platform_summary' }, {}),
        ),
        // Models, as the home page says: 1.12 M entries are 242,000 models.
        firstValueFrom(
          this.devicesService.send(
            { cmd: 'get_device_models' },
            { query: { page: 1, limit: 1 } },
          ),
        ),
        firstValueFrom(
          this.repairersService.send(
            { cmd: 'get_repairers_paginated' },
            { page: 1, limit: 1 },
          ),
        ),
      ]);
      return {
        totalRepairs: repairSummary?.totalRepairs ?? 0,
        totalDevices: devicesPage?.pagination?.total ?? 0,
        totalRepairers: repairersPage?.meta?.total ?? 0,
      };
    } catch (error) {
      this.logger.error('statsSummary error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/by-category')
  @ApiOperation({ summary: 'Get repair counts grouped by product category' })
  @ApiResponse({ status: 200, description: 'Category stats' })
  async statsByCategory(@Query() filters: StatsFilterDto) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'get_repair_stats_by_category' },
          filters,
        ),
      );
    } catch (error) {
      this.logger.error('statsByCategory error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/by-brand')
  @ApiOperation({ summary: 'Get repair counts grouped by brand (top 20)' })
  async statsByBrand(@Query() filters: StatsFilterDto) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'get_repair_stats_by_brand' },
          { filters, limit: 20 },
        ),
      );
    } catch (error) {
      this.logger.error('statsByBrand error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/by-outcome')
  @ApiOperation({ summary: 'Get repair counts grouped by outcome/status' })
  async statsByOutcome(@Query() filters: StatsFilterDto) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'get_repair_stats_by_outcome' },
          filters,
        ),
      );
    } catch (error) {
      this.logger.error('statsByOutcome error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/failure-reasons')
  @ApiOperation({ summary: 'Get failure reasons for End of Life repairs' })
  async statsFailureReasons(@Query() filters: StatsFilterDto) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'get_repair_stats_failure_reasons' },
          filters,
        ),
      );
    } catch (error) {
      this.logger.error('statsFailureReasons error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/over-time')
  @ApiOperation({ summary: 'Get repair counts over time (monthly)' })
  async statsOverTime(@Query() filters: StatsFilterDto) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'get_repair_stats_over_time' },
          filters,
        ),
      );
    } catch (error) {
      this.logger.error('statsOverTime error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Public record endpoints ────────────────────────────────────────────

  @Get('records')
  @ApiOperation({ summary: 'List repair records (paginated)' })
  async findAll(@Query() query: QueryRepairRecordDto) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'find_all_repair_records' },
          query,
        ),
      );
    } catch (error) {
      this.logger.error('findAll error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get a single repair record' })
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'find_one_repair_record' },
          { id },
        ),
      );
    } catch (error) {
      this.logger.error('findOne error: ' + error.message);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── Repair journeys ────────────────────────────────────────────────────

  // Deliberately open to guests, who are most of our users: a journey is not a
  // repair record and never reaches the statistics. Only a later declaration
  // promotes one. FlexibleAuthGuard never rejects — it falls back to the guest
  // role — and is here purely to pick up the user id when there is one.
  // Throttled because it is an unauthenticated write.
  @UseGuards(FlexibleAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('journeys')
  @ApiOperation({
    summary: 'Record a completed wizard journey awaiting its outcome',
    description:
      'Returns the secret needed to declare the outcome later. Store it client-side; it is never returned again.',
  })
  @ApiBody({ type: CreateRepairJourneyDto })
  @ApiResponse({
    status: 201,
    description: 'Journey recorded',
    type: CreatedJourneyDto,
  })
  @ApiResponse({
    status: 400,
    description: 'An invalid field, or a variant of another model.',
  })
  @ApiResponse({
    status: 403,
    description: 'A personal device (`ownershipId`) without being signed in.',
  })
  @ApiResponse({
    status: 404,
    description: 'An unknown model, or a personal device not the user’s.',
  })
  async createJourney(
    @Body() dto: CreateRepairJourneyDto,
    @Req() req: any,
  ) {
    const userId = signedInUserId(req);
    // Outside the try: a refused model or personal device keeps its status.
    const device = await this.deviceOfJourney(dto, userId);
    try {
      const result = await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'create_repair_journey' },
          { dto: { ...dto, ...device }, userId },
        ),
      );
      if (device.ownershipId && userId) {
        await this.updateCurrentState(device.ownershipId, userId, dto);
      }
      this.fluentLogger.log('Repair journey recorded', {
        event: 'repair_journey_created',
        category: 'repair_monitor',
        journeyId: result?.id,
        brand: dto.brand,
        productCategory: dto.productCategory,
        repairRoute: dto.repairRoute,
        modelId: device.modelId ?? null,
        userId,
      });
      return result;
    } catch (error) {
      this.logger.error('createJourney error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * The model, variant and personal device a journey is about. One of the
   * signed-in user's own devices gives its model and variant; otherwise the
   * variant or model sent are checked against the catalogue. A variant sent
   * alone, as the wizard sends it, is recorded even when the catalogue does
   * not give its model: the journey matters more. A journey typed in by hand
   * names none.
   */
  private async deviceOfJourney(
    dto: CreateRepairJourneyDto,
    userId: string | null,
  ): Promise<{
    modelId?: number;
    deviceId?: number | null;
    ownershipId?: string;
  }> {
    if (dto.ownershipId) {
      if (!userId) {
        throw new HttpException(
          'A personal device belongs to a signed-in user',
          HttpStatus.FORBIDDEN,
        );
      }
      const owned = await this.personalDevice(dto.ownershipId, userId);
      const { modelId, deviceId } =
        dto.deviceId != null
          ? await this.resolver.resolve({
              modelId: owned.modelId,
              deviceId: dto.deviceId,
            })
          : owned;
      return { modelId, deviceId, ownershipId: owned.id };
    }
    if (dto.modelId != null) {
      return this.resolver.resolve(dto);
    }
    if (dto.deviceId != null) {
      try {
        return await this.resolver.resolve(dto);
      } catch (error) {
        this.logger.warn(
          `Journey recorded without a model for device ${dto.deviceId}: ${error?.message}`,
        );
      }
    }
    return {};
  }

  // The end of the wizard and "My repairs", for a signed-in user: the device
  // the journey was about joins their devices, the journey its history.
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.assign_device')
  @ApiBearerAuth()
  @Post('journeys/:id/personal-device')
  @ApiOperation({
    summary: "Add the journey's device to the signed-in user's devices",
    description:
      "A personal device of the journey's model and variant, with the state the journey recorded, whose repair history the journey joins. A device typed in by hand is first added to the catalogue, or found there under its name, and the journey takes its model. A second device of a model the user has is made only with `another`: otherwise the journey goes in the history of the one owned (PATCH).",
  })
  @ApiParam({ name: 'id', description: 'Journey ID' })
  @ApiBody({ type: AddJourneyPersonalDeviceDto, required: false })
  @ApiResponse({ status: 201, description: 'Device added, journey tied to it' })
  @ApiResponse({ status: 403, description: 'A guest, who owns no device' })
  @ApiResponse({ status: 404, description: 'No such journey of this user' })
  @ApiResponse({
    status: 409,
    description:
      "The journey names no device, is already in a device's history, or a device of its model is owned and `another` was not sent",
  })
  async addPersonalDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() { another }: AddJourneyPersonalDeviceDto = {},
  ) {
    const userId = signedInUserId(req);
    if (!userId) {
      throw new HttpException(
        'Sign in to add a device',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const journey = await this.send<JourneyDevice>(
      this.repairMonitorService,
      'get_journey_device',
      { journeyId: id, userId },
    );
    if (journey.ownershipId) {
      throw new HttpException(
        "The journey is already in a device's history",
        HttpStatus.CONFLICT,
      );
    }
    const typed = Boolean(journey.brand?.trim() && journey.modelType?.trim());
    if (journey.modelId == null && !typed) {
      throw new HttpException(
        'The journey names no device',
        HttpStatus.CONFLICT,
      );
    }
    let modelId = journey.modelId;
    if (modelId == null) {
      modelId = await this.modelOfTypedDevice(journey, authorOf(req));
      // Named in the catalogue now: a device of it owned already can be
      // offered instead, the journey's model telling which.
      await this.send(this.repairMonitorService, 'adopt_journey_model', {
        journeyId: id,
        userId,
        modelId,
      });
    }
    const deviceId = journey.modelId != null ? journey.deviceId : null;
    const owned = await this.send<{ id: string }>(
      this.ownershipService,
      'create_personal_device',
      {
        userId: Number(userId),
        device: {
          modelId,
          deviceId,
          visualCondition: journey.visualCondition ?? undefined,
          usageIntensity: journey.usageIntensity ?? undefined,
          acquiredAt: acquiredYearsAgo(journey.estimatedAge),
          another,
        },
      },
    );
    try {
      const { visualCondition, usageIntensity, ...tied } = await this.send<{
        id: string;
        ownershipId: string;
        modelId: number;
        deviceId: number | null;
        visualCondition: string | null;
        usageIntensity: string | null;
      }>(this.repairMonitorService, 'link_journey_personal_device', {
        journeyId: id,
        userId,
        device: { ownershipId: owned.id, modelId, deviceId },
        adopt: true,
      });
      return tied;
    } catch (error) {
      // A device with nothing in its history is not what was asked for.
      await firstValueFrom(
        this.ownershipService.send(
          { cmd: 'delete_personal_device' },
          { id: owned.id, userId: Number(userId) },
        ),
      ).catch((e) =>
        this.logger.error(
          `Personal device ${owned.id} left without its journey: ${e?.message}`,
        ),
      );
      throw error;
    }
  }

  /**
   * The catalogue's model of a device typed in by hand: the one of that
   * name, or one made, as "Add a device" makes it, in the journey's category.
   */
  private async modelOfTypedDevice(
    journey: JourneyDevice,
    author: Author,
  ): Promise<number> {
    const categories = await this.send<
      { id: number; name: string; canonicalName?: string }[]
    >(this.devicesService, 'get_device_categories', {});
    const category = categories.find(
      (c) => (c.canonicalName ?? c.name) === journey.productCategory,
    );
    const { model } = await this.send<{ model: { id: number } }>(
      this.devicesService,
      'create_device_model',
      {
        model: {
          brand: (journey.brand ?? '').trim(),
          name: (journey.modelType ?? '').trim(),
          categories: category ? [category.id] : [],
        },
        author,
      },
    );
    return model.id;
  }

  /** Sends, answering a refusal with its status, and logging anything else. */
  private async send<T>(
    client: ClientProxy,
    cmd: string,
    payload: object,
  ): Promise<T> {
    try {
      return await firstValueFrom(client.send<T>({ cmd }, payload));
    } catch (error) {
      const message: string = error?.message || `${cmd} failed`;
      const status: number =
        error?.status ??
        (/not found/i.test(message)
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR);
      if (status >= 500) this.logger.error(`${cmd} failed: ${message}`);
      throw new HttpException(message, status);
    }
  }

  /**
   * One of the user's personal devices. Someone else's is not found, as a
   * missing one; an outage is not, and is logged.
   */
  private async personalDevice(
    id: string,
    userId: string,
  ): Promise<{ id: string; modelId: number; deviceId: number | null }> {
    try {
      return await firstValueFrom(
        this.ownershipService.send(
          { cmd: 'get_personal_device' },
          { id, userId: Number(userId) },
        ),
      );
    } catch (error) {
      const message: string = error?.message || 'Personal device not found';
      if (/not found/i.test(message)) {
        throw new HttpException(message, HttpStatus.NOT_FOUND);
      }
      this.logger.error(`get_personal_device failed: ${message}`);
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * A personal device keeps its current state, the journey the state at the
   * time: what the journey says, unless unknown, updates the device. A
   * failure is logged and leaves the journey recorded.
   */
  private async updateCurrentState(
    ownershipId: string,
    userId: string,
    dto: { visualCondition?: string | null; usageIntensity?: string | null },
  ) {
    const changes = Object.fromEntries(
      Object.entries({
        visualCondition: dto.visualCondition,
        usageIntensity: dto.usageIntensity,
      }).filter(([, value]) => value && value !== 'unknown'),
    );
    if (Object.keys(changes).length === 0) return;
    try {
      await firstValueFrom(
        this.ownershipService.send(
          { cmd: 'update_personal_device' },
          { id: ownershipId, userId: Number(userId), changes },
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Could not update personal device ${ownershipId}: ${error?.message}`,
      );
    }
  }

  /**
   * The CO2e figure to freeze onto a journey being declared.
   *
   * Computed here rather than in repair-monitor-service, which owns no client
   * to the service holding the reference data, and never taken from the
   * request body, where anyone could inflate their own total.
   *
   * Returns null on any failure: a user's answer is worth far more than the
   * number attached to it, so a declaration must never fail because the impact
   * could not be worked out. Null is stored as "unknown", not zero.
   */
  private async frozenImpactFor(
    journeyId: string,
    dto: DeclareOutcomeDto,
    userId: string | null,
  ): Promise<{ impact: unknown | null; productCategory: string | null }> {
    try {
      const journeys: { id: string; productCategory?: string }[] =
        await firstValueFrom(
          this.repairMonitorService.send(
            { cmd: 'list_repair_journeys' },
            {
              tokens: dto.declarationToken ? [dto.declarationToken] : [],
              userId,
            },
          ),
        );

      const category = journeys?.find(
        (journey) => journey.id === journeyId,
      )?.productCategory;
      if (!category) return { impact: null, productCategory: null };

      const impact: unknown =
        (await firstValueFrom(
          this.externalAdaptersService.send(
            { cmd: 'fetch-impact-metrics' },
            { deviceType: category },
          ),
        )) ?? null;

      // The category comes back with the impact so the declaration can be
      // logged with it: it is only stored on the journey's creation, and a
      // dashboard needs to know what actually got repaired, not just started.
      return { impact, productCategory: category };
    } catch (error) {
      this.logger.warn(
        `Could not compute the impact for journey ${journeyId}: ${error?.message}`,
      );
      return { impact: null, productCategory: null };
    }
  }

  // Declaring an outcome is what promotes a journey into a repair record, so
  // this is the only way platform data reaches the statistics. Authorisation is
  // the token in the body, not a session: the whole point is that a guest can
  // come back days later and answer.
  // FlexibleAuthGuard never rejects: it is here only to recognise the owner of
  // an adopted journey, who can answer without the browser token.
  @UseGuards(FlexibleAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Patch('journeys/:id/outcome')
  @ApiOperation({ summary: 'Declare the outcome of a recorded journey' })
  @ApiBody({ type: DeclareOutcomeDto })
  @ApiResponse({ status: 200, description: 'Outcome recorded' })
  @ApiResponse({ status: 403, description: 'Invalid or expired token' })
  @ApiResponse({ status: 409, description: 'Outcome already declared' })
  async declareOutcome(
    @Param('id') id: string,
    @Body() dto: DeclareOutcomeDto,
    @Req() req: any,
  ) {
    try {
      const userId = signedInUserId(req);
      const { impact, productCategory } = await this.frozenImpactFor(
        id,
        dto,
        userId,
      );
      const result = await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'declare_journey_outcome' },
          { journeyId: id, dto, userId, impact },
        ),
      );
      const frozen = impact as {
        co2?: number;
        reference?: { category?: string };
      } | null;
      this.fluentLogger.log('Repair journey outcome declared', {
        event: 'repair_journey_declared',
        category: 'repair_monitor',
        journeyId: id,
        outcome: dto.outcome,
        repairBarrier: dto.repairBarrier,
        productCategory,
        co2Avoided: frozen?.co2 ?? null,
        co2ReferenceCategory: frozen?.reference?.category ?? null,
      });
      return result;
    } catch (error) {
      this.logger.error('declareOutcome error: ' + error.message);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // A read, but a POST: the tokens are the authorisation, and a secret in a
  // query string ends up in access logs, proxies and browser history.
  // Open to guests for the same reason the creation endpoint is — holding the
  // token *is* the proof, and most of our users have no account.
  @UseGuards(FlexibleAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('journeys/lookup')
  // A POST that creates nothing, so not a 201.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List the journeys a browser holds tokens for, plus adopted ones',
    description:
      'Returns nothing when the caller presents neither a token nor a session.',
  })
  @ApiBody({ type: LookupJourneysDto })
  @ApiResponse({
    status: 200,
    description: 'Journeys visible to the caller, newest first',
    type: [JourneySummaryDto],
  })
  async lookupJourneys(@Body() dto: LookupJourneysDto, @Req() req: any) {
    try {
      const userId = signedInUserId(req);
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'list_repair_journeys' },
          { tokens: dto.tokens ?? [], userId },
        ),
      );
    } catch (error) {
      this.logger.error('lookupJourneys error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Being signed in is the whole requirement, and it is checked here rather
  // than through a @Permissions() rule. Attaching journeys you already hold the
  // tokens for, to your own account, is not "submitting a repair record":
  // borrowing `repair.submit` tied adoption to a seeded permission, and that
  // permission is absent from the database, so every single call was refused —
  // silently, because the browser has nothing to do with a failed adoption.
  @UseGuards(FlexibleAuthGuard)
  @ApiBearerAuth()
  @Post('journeys/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Attach journeys recorded as a guest to the signed-in account',
  })
  @ApiBody({ type: ClaimJourneysDto })
  @ApiResponse({ status: 200, description: 'Journeys attached' })
  @ApiResponse({ status: 401, description: 'No signed-in account' })
  async claimJourneys(@Body() dto: ClaimJourneysDto, @Req() req: any) {
    const userId = signedInUserId(req);
    // FlexibleAuthGuard falls back to the guest role instead of rejecting, so
    // without this a guest would reach the service with a null owner.
    if (!userId) {
      throw new HttpException(
        'Sign in to attach your repair journeys',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'claim_repair_journeys' },
          { tokens: dto.tokens, userId },
        ),
      );
    } catch (error) {
      this.logger.error('claimJourneys error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // The end of the wizard, for a signed-in user: the journey already recorded
  // joins the history of one of their devices, added there or chosen.
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.assign_device')
  @ApiBearerAuth()
  @Patch('journeys/:id/personal-device')
  @ApiOperation({
    summary: "Tie a journey to one of the signed-in user's devices",
    description:
      "The journey joins the device's repair history and takes its model, and its variant unless it named one; the device takes the state the journey recorded.",
  })
  @ApiParam({ name: 'id', description: 'Journey ID' })
  @ApiBody({ type: LinkPersonalDeviceDto })
  @ApiResponse({ status: 200, description: 'Journey tied to the device' })
  @ApiResponse({ status: 403, description: 'A guest, who owns no device' })
  @ApiResponse({
    status: 404,
    description: 'No such journey or device of this user',
  })
  @ApiResponse({
    status: 409,
    description:
      "The device is of another model, the journey names none, or it is already in another device's history",
  })
  async linkPersonalDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkPersonalDeviceDto,
    @Req() req: any,
  ) {
    const userId = signedInUserId(req);
    if (!userId) {
      throw new HttpException(
        'Sign in to tie a journey to your device',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const owned = await this.personalDevice(dto.ownershipId, userId);
    let linked: {
      id: string;
      ownershipId: string;
      modelId: number;
      deviceId: number | null;
      visualCondition: string | null;
      usageIntensity: string | null;
    };
    try {
      linked = await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'link_journey_personal_device' },
          {
            journeyId: id,
            userId,
            device: {
              ownershipId: owned.id,
              modelId: owned.modelId,
              deviceId: owned.deviceId,
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error('linkPersonalDevice error: ' + error.message);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    await this.updateCurrentState(owned.id, userId, linked);
    const { visualCondition, usageIntensity, ...journey } = linked;
    return journey;
  }

  // ── Authenticated: submit record ───────────────────────────────────────

  // FlexibleAuthGuard alone never rejects — it falls back to the guest role —
  // so without a @Permissions() this endpoint was an unauthenticated write into
  // the open dataset. `repair.submit` is granted to user/repairer/admin, not to
  // guest.
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repair.submit')
  @ApiBearerAuth()
  @Post('records')
  @ApiOperation({ summary: 'Submit a new repair record' })
  @ApiBody({ type: CreateRepairRecordDto })
  @ApiResponse({ status: 201, description: 'Repair record created' })
  async create(@Body() dto: CreateRepairRecordDto, @Req() req: any) {
    try {
      const userId = signedInUserId(req);
      const result = await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'create_repair_record' },
          { dto, userId },
        ),
      );
      this.fluentLogger.log('Repair record submitted', {
        event: 'repair_record_created',
        category: 'repair_monitor',
        recordId: result?.id,
        brand: dto.brand,
        productCategory: dto.productCategory,
        repairStatus: dto.repairStatus,
        country: dto.country,
        userId,
      });
      return result;
    } catch (error) {
      this.logger.error('create error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Admin: update / delete / import ───────────────────────────────────────

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repair.admin')
  @ApiBearerAuth()
  @Patch('records/:id')
  @ApiOperation({ summary: 'Update a repair record (admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRepairRecordDto>,
  ) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'update_repair_record' },
          { id, dto },
        ),
      );
    } catch (error) {
      this.logger.error('update error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repair.admin')
  @ApiBearerAuth()
  @Delete('records/:id')
  @ApiOperation({ summary: 'Delete a repair record (admin)' })
  async remove(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send({ cmd: 'delete_repair_record' }, { id }),
      );
    } catch (error) {
      this.logger.error('remove error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repair.admin')
  @ApiBearerAuth()
  @Post('records/import')
  @UseInterceptors(FileInterceptor('file', csvUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import repair records from CSV file (admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async importRecords(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file)
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);

      const text = file.buffer.toString('utf-8');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2)
        throw new HttpException('CSV has no data rows', HttpStatus.BAD_REQUEST);

      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0]
        .split(sep)
        .map((h) => h.trim().replace(/^"|"$/g, ''));

      const parseLine = (line: string): string[] => {
        const res: string[] = [];
        let cur = '';
        let inQ = false;
        for (const ch of line) {
          if (ch === '"') {
            inQ = !inQ;
          } else if (ch === sep && !inQ) {
            res.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        res.push(cur.trim());
        return res;
      };

      const allRows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ?? '';
        });
        allRows.push(row);
      }

      const BATCH = 500;
      let imported = 0;
      let skipped = 0;
      for (let i = 0; i < allRows.length; i += BATCH) {
        const batch = allRows.slice(i, i + BATCH);
        const res = await firstValueFrom(
          this.repairMonitorService.send(
            { cmd: 'import_repair_records' },
            { rows: batch },
          ),
        );
        imported += res.imported ?? 0;
        skipped += res.skipped ?? 0;
      }
      this.fluentLogger.log('CSV import completed', {
        event: 'csv_import_completed',
        category: 'repair_monitor',
        imported,
        skipped,
        total: allRows.length,
        filename: file.originalname,
        importRate:
          allRows.length > 0
            ? Math.round((imported / allRows.length) * 1000) / 10
            : 0,
      });
      return { imported, skipped };
    } catch (error) {
      this.logger.error('importRecords error: ' + error.message);
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
