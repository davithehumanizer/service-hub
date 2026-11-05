/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RepairMonitorController } from '../repair-monitor.controller';
import { FluentLoggerService } from 'src/common/fluent-logger.service';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { DeviceModelResolver } from 'src/devices/device-model-resolver.service';

describe('RepairMonitorController (api-gateway)', () => {
  let controller: RepairMonitorController;

  const mockRepairMonitorProxy = { send: jest.fn() };
  const mockDevicesProxy = { send: jest.fn() };
  const mockRepairersProxy = { send: jest.fn() };
  const mockExternalAdaptersProxy = { send: jest.fn() };
  const mockOwnershipProxy = { send: jest.fn() };
  const mockResolver = { resolve: jest.fn() };
  const mockFluentLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    event: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepairMonitorController],
      providers: [
        { provide: 'REPAIR_MONITOR_SERVICE', useValue: mockRepairMonitorProxy },
        { provide: 'DEVICES_SERVICE', useValue: mockDevicesProxy },
        { provide: 'REPAIRERS_SERVICE', useValue: mockRepairersProxy },
        {
          provide: 'EXTERNAL_ADAPTERS_SERVICE',
          useValue: mockExternalAdaptersProxy,
        },
        { provide: FluentLoggerService, useValue: mockFluentLogger },
        { provide: DeviceModelResolver, useValue: mockResolver },
        { provide: 'OWNERSHIP_SERVICE', useValue: mockOwnershipProxy },
      ],
    })
      .overrideGuard(FlexibleAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RepairMonitorController>(RepairMonitorController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── Stats endpoints ────────────────────────────────────────────────────

  describe('statsByCategory', () => {
    it('should return category stats', async () => {
      const stats = [{ category: 'phone', count: 10 }];
      mockRepairMonitorProxy.send.mockReturnValue(of(stats));
      const result = await controller.statsByCategory({});
      expect(result).toEqual(stats);
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_repair_stats_by_category' },
        {},
      );
    });

    it('should throw HttpException on error', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => new Error('service down')),
      );
      await expect(controller.statsByCategory({})).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated records', async () => {
      const records = { data: [], total: 0 };
      mockRepairMonitorProxy.send.mockReturnValue(of(records));
      const result = await controller.findAll({ page: 1, limit: 10 });
      expect(result).toEqual(records);
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'find_all_repair_records' },
        { page: 1, limit: 10 },
      );
    });

    it('should throw HttpException on error', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(controller.findAll({})).rejects.toThrow(HttpException);
    });
  });

  describe('findOne', () => {
    it('should return a single record', async () => {
      const record = { id: 'abc', brand: 'Apple' };
      mockRepairMonitorProxy.send.mockReturnValue(of(record));
      const result = await controller.findOne('abc');
      expect(result).toEqual(record);
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'find_one_repair_record' },
        { id: 'abc' },
      );
    });

    it('should throw HttpException on error', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => new Error('not found')),
      );
      await expect(controller.findOne('bad-id')).rejects.toThrow(HttpException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      brand: 'Apple',
      productCategory: 'phone',
      repairStatus: 'Fixed',
      country: 'BE',
    } as any;

    it('should create a record and log the event', async () => {
      const savedRecord = { id: 'uuid-1', ...dto };
      mockRepairMonitorProxy.send.mockReturnValue(of(savedRecord));

      const req = { user: { sub: 'user-123' } };
      const result = await controller.create(dto, req);

      expect(result).toEqual(savedRecord);
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'create_repair_record' },
        { dto, userId: 'user-123' },
      );
      expect(mockFluentLogger.log).toHaveBeenCalledWith(
        'Repair record submitted',
        expect.objectContaining({
          event: 'repair_record_created',
          category: 'repair_monitor',
          recordId: 'uuid-1',
          brand: 'Apple',
          country: 'BE',
          userId: 'user-123',
        }),
      );
    });

    // What the application's own JWT strategy actually returns: `id`, and no
    // `sub`. The previous fallback was `req.user.userId`, a key no strategy
    // produces, so every logged-in user was treated as anonymous.
    it('should use userId from req.user.id when there is no sub', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of({ id: 'x', ...dto }));
      const req = { user: { id: 456, email: 'someone@example.com' } };
      await controller.create(dto, req);
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'create_repair_record' },
        { dto, userId: '456' },
      );
    });

    it('should use null userId if user not present', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of({ id: 'x', ...dto }));
      const req = {};
      await controller.create(dto, req);
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'create_repair_record' },
        { dto, userId: null },
      );
    });

    it('should throw HttpException on error and not log', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => new Error('db error')),
      );
      await expect(controller.create(dto, {})).rejects.toThrow(HttpException);
      expect(mockFluentLogger.log).not.toHaveBeenCalled();
    });
  });

  // ── importRecords ──────────────────────────────────────────────────────

  describe('importRecords', () => {
    const csvContent =
      'brand;productCategory;country\nApple;phone;BE\nSamsung;phone;FR';
    const mockFile = {
      buffer: Buffer.from(csvContent),
      originalname: 'repairs.csv',
    } as Express.Multer.File;

    it('should import CSV and log the event', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        of({ imported: 2, skipped: 0 }),
      );

      const result = await controller.importRecords(mockFile);

      expect(result).toEqual({ imported: 2, skipped: 0 });
      expect(mockFluentLogger.log).toHaveBeenCalledWith(
        'CSV import completed',
        expect.objectContaining({
          event: 'csv_import_completed',
          category: 'repair_monitor',
          imported: 2,
          skipped: 0,
          filename: 'repairs.csv',
        }),
      );
    });

    it('should throw 400 if no file provided', async () => {
      await expect(controller.importRecords(null as any)).rejects.toThrow(
        new HttpException('No file provided', HttpStatus.BAD_REQUEST),
      );
      expect(mockFluentLogger.log).not.toHaveBeenCalled();
    });

    it('should throw 400 if CSV has no data rows', async () => {
      const emptyFile = {
        buffer: Buffer.from('brand;category'),
        originalname: 'empty.csv',
      } as Express.Multer.File;
      await expect(controller.importRecords(emptyFile)).rejects.toThrow(
        new HttpException('CSV has no data rows', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw HttpException on microservice error', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => new Error('import failed')),
      );
      await expect(controller.importRecords(mockFile)).rejects.toThrow(
        HttpException,
      );
      expect(mockFluentLogger.log).not.toHaveBeenCalled();
    });
  });

  // ── statsSummary ───────────────────────────────────────────────────────

  describe('statsSummary', () => {
    it('should aggregate stats from three services', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of({ totalRepairs: 42 }));
      mockDevicesProxy.send.mockReturnValue(of({ pagination: { total: 150 } }));
      mockRepairersProxy.send.mockReturnValue(of({ meta: { total: 75 } }));

      const result = await controller.statsSummary();

      expect(result).toEqual({
        totalRepairs: 42,
        totalDevices: 150,
        totalRepairers: 75,
      });
      // Device models, not catalogue entries.
      expect(mockDevicesProxy.send.mock.calls[0][0]).toEqual({
        cmd: 'get_device_models',
      });
    });

    it('should return zeros when services return null', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of(null));
      mockDevicesProxy.send.mockReturnValue(of(null));
      mockRepairersProxy.send.mockReturnValue(of(null));

      const result = await controller.statsSummary();

      expect(result).toEqual({
        totalRepairs: 0,
        totalDevices: 0,
        totalRepairers: 0,
      });
    });

    it('should throw HttpException when a service fails', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => new Error('repair service down')),
      );
      mockDevicesProxy.send.mockReturnValue(of({ pagination: { total: 10 } }));
      mockRepairersProxy.send.mockReturnValue(of({ meta: { total: 5 } }));

      await expect(controller.statsSummary()).rejects.toThrow(HttpException);
    });
  });

  // ── Repair journeys ────────────────────────────────────────────────────

  describe('createJourney', () => {
    beforeEach(() => {
      mockRepairMonitorProxy.send.mockReturnValue(
        of({ id: 'j-1', declarationToken: 't' }),
      );
    });

    it('records a journey typed in by hand with no model', async () => {
      await controller.createJourney({ brand: 'Acme' } as any, {});

      expect(mockResolver.resolve).not.toHaveBeenCalled();
      expect(mockRepairMonitorProxy.send.mock.calls[0][1]).toEqual({
        dto: { brand: 'Acme' },
        userId: null,
      });
    });

    it('records the model the variant names', async () => {
      mockResolver.resolve.mockResolvedValue({ modelId: 953560, deviceId: 7 });

      await controller.createJourney({ deviceId: 7 } as any, {});

      expect(mockRepairMonitorProxy.send.mock.calls[0][1].dto).toEqual({
        deviceId: 7,
        modelId: 953560,
      });
    });

    it('records a journey about a variant the catalogue cannot place, without its model', async () => {
      mockResolver.resolve.mockRejectedValue(
        new HttpException('has no model yet', HttpStatus.BAD_REQUEST),
      );

      const result = await controller.createJourney(
        { deviceId: 7, brand: 'Dell' } as any,
        {},
      );

      expect(result).toEqual({ id: 'j-1', declarationToken: 't' });
      expect(mockRepairMonitorProxy.send.mock.calls[0][1].dto).toEqual({
        deviceId: 7,
        brand: 'Dell',
      });
    });

    it('still refuses a model that does not exist', async () => {
      mockResolver.resolve.mockRejectedValue(
        new HttpException('not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.createJourney({ modelId: 1 } as any, {}),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalled();
    });

    it("takes a personal device's model and variant, and updates its state", async () => {
      mockOwnershipProxy.send.mockImplementation(({ cmd }) =>
        cmd === 'get_personal_device'
          ? of({ id: 'own-1', modelId: 877165, deviceId: 399307 })
          : of({}),
      );

      await controller.createJourney(
        {
          ownershipId: 'own-1',
          visualCondition: 'fair',
          usageIntensity: 'unknown',
        } as any,
        { user: { id: 42 } },
      );

      expect(mockOwnershipProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_personal_device' },
        { id: 'own-1', userId: 42 },
      );
      expect(mockRepairMonitorProxy.send.mock.calls[0][1].dto).toMatchObject({
        modelId: 877165,
        deviceId: 399307,
        ownershipId: 'own-1',
      });
      // Unknown says nothing about the device: only the visual state moves.
      expect(mockOwnershipProxy.send).toHaveBeenCalledWith(
        { cmd: 'update_personal_device' },
        { id: 'own-1', userId: 42, changes: { visualCondition: 'fair' } },
      );
    });

    it("refuses a guest's journey about a personal device", async () => {
      await expect(
        controller.createJourney({ ownershipId: 'own-1' } as any, {}),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalled();
    });

    it("answers someone else's personal device as not found", async () => {
      mockOwnershipProxy.send.mockReturnValue(
        throwError(() => ({ message: 'Personal device own-1 not found' })),
      );
      await expect(
        controller.createJourney({ ownershipId: 'own-1' } as any, {
          user: { id: 42 },
        }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalled();
    });

    it('keeps the journey when the state cannot be updated', async () => {
      mockOwnershipProxy.send.mockImplementation(({ cmd }) =>
        cmd === 'get_personal_device'
          ? of({ id: 'own-1', modelId: 877165, deviceId: null })
          : throwError(() => new Error('down')),
      );

      const result = await controller.createJourney(
        { ownershipId: 'own-1', visualCondition: 'good' } as any,
        { user: { id: 42 } },
      );

      expect(result).toEqual({ id: 'j-1', declarationToken: 't' });
    });
  });

  describe('claimJourneys', () => {
    const dto = { tokens: ['token-a', 'token-b'] };

    // The bug this covers was invisible from the browser: adoption failed and
    // the only trace was a console line the user never sees.
    it('passes the signed-in id the JWT strategy actually provides', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of({ claimed: 2 }));

      await controller.claimJourneys(dto, { user: { id: 8 } });

      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'claim_repair_journeys' },
        { tokens: dto.tokens, userId: '8' },
      );
    });

    it('accepts an OAuth2 token, whose strategy provides sub instead', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of({ claimed: 1 }));

      await controller.claimJourneys(dto, { user: { sub: '42', id: 42 } });

      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'claim_repair_journeys' },
        { tokens: dto.tokens, userId: '42' },
      );
    });

    // FlexibleAuthGuard never rejects, so the refusal has to live here.
    it('refuses a guest rather than attaching journeys to nobody', async () => {
      await expect(
        controller.claimJourneys(dto, { user: { role: 'guest' } }),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalled();
    });
  });

  describe('linkPersonalDevice', () => {
    const journeyId = '4e1af72f-16b7-4327-b9b5-507d0c92dbab';
    const linked = {
      id: journeyId,
      ownershipId: 'own-1',
      modelId: 877165,
      deviceId: 7,
      visualCondition: 'good',
      usageIntensity: 'unknown',
    };

    it("ties the journey to the user's device, which takes its state", async () => {
      mockOwnershipProxy.send.mockImplementation(({ cmd }) =>
        cmd === 'get_personal_device'
          ? of({ id: 'own-1', modelId: 877165, deviceId: 7 })
          : of({}),
      );
      mockRepairMonitorProxy.send.mockReturnValue(of(linked));

      const result = await controller.linkPersonalDevice(
        journeyId,
        { ownershipId: 'own-1' },
        { user: { id: 42 } },
      );

      expect(mockOwnershipProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_personal_device' },
        { id: 'own-1', userId: 42 },
      );
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'link_journey_personal_device' },
        {
          journeyId,
          userId: '42',
          device: { ownershipId: 'own-1', modelId: 877165, deviceId: 7 },
        },
      );
      expect(mockOwnershipProxy.send).toHaveBeenCalledWith(
        { cmd: 'update_personal_device' },
        { id: 'own-1', userId: 42, changes: { visualCondition: 'good' } },
      );
      expect(result).toEqual({
        id: journeyId,
        ownershipId: 'own-1',
        modelId: 877165,
        deviceId: 7,
      });
    });

    it('refuses a guest', async () => {
      await expect(
        controller.linkPersonalDevice(journeyId, { ownershipId: 'own-1' }, {}),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
      expect(mockOwnershipProxy.send).not.toHaveBeenCalled();
    });

    it("answers someone else's device as not found", async () => {
      mockOwnershipProxy.send.mockReturnValue(
        throwError(() => ({ message: 'Personal device own-1 not found' })),
      );
      await expect(
        controller.linkPersonalDevice(
          journeyId,
          { ownershipId: 'own-1' },
          { user: { id: 42 } },
        ),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalled();
    });

    it('answers an ownership outage as an error, not as a missing device', async () => {
      mockOwnershipProxy.send.mockReturnValue(
        throwError(() => new Error('Connection closed')),
      );
      await expect(
        controller.linkPersonalDevice(
          journeyId,
          { ownershipId: 'own-1' },
          { user: { id: 42 } },
        ),
      ).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalled();
    });

    it("keeps the service's refusal of a device of another model", async () => {
      mockOwnershipProxy.send.mockReturnValue(
        of({ id: 'own-1', modelId: 5, deviceId: null }),
      );
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => ({
          message: 'The journey is about another model',
          status: HttpStatus.CONFLICT,
        })),
      );
      await expect(
        controller.linkPersonalDevice(
          journeyId,
          { ownershipId: 'own-1' },
          { user: { id: 42 } },
        ),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    });
  });

  describe('addPersonalDevice', () => {
    const journeyId = '4e1af72f-16b7-4327-b9b5-507d0c92dbab';
    const typedJourney = {
      id: journeyId,
      ownershipId: null,
      modelId: null,
      deviceId: null,
      brand: 'Bissell',
      modelType: 'SpotBot 3000',
      productCategory: 'Robot vacuum cleaner',
      visualCondition: 'good',
      usageIntensity: 'unknown',
      estimatedAge: 2,
    };
    const answer =
      (journey: object, linked?: () => unknown) =>
      ({ cmd }: { cmd: string }, payload: any) => {
        if (cmd === 'get_journey_device') return of(journey);
        if (cmd === 'link_journey_personal_device') {
          return linked
            ? (linked() as any)
            : of({
                id: journeyId,
                ownershipId: 'own-9',
                modelId: payload.device.modelId,
                deviceId: payload.device.deviceId,
                visualCondition: 'good',
                usageIntensity: 'unknown',
              });
        }
        return of({});
      };

    it('adds a device typed in by hand to the catalogue, then to the user', async () => {
      mockRepairMonitorProxy.send.mockImplementation(answer(typedJourney));
      mockDevicesProxy.send.mockImplementation(({ cmd }) =>
        cmd === 'get_device_categories'
          ? of([
              { id: 3, name: 'Laptop' },
              { id: 7, name: 'Robot vacuum cleaner' },
            ])
          : of({ created: true, model: { id: 5120705 } }),
      );
      mockOwnershipProxy.send.mockReturnValue(of({ id: 'own-9' }));

      const result = await controller.addPersonalDevice(journeyId, {
        user: { id: 42 },
      });

      // Named in the catalogue first, whatever comes next.
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'adopt_journey_model' },
        { journeyId, userId: '42', modelId: 5120705 },
      );
      expect(mockDevicesProxy.send).toHaveBeenCalledWith(
        { cmd: 'create_device_model' },
        {
          model: {
            brand: 'Bissell',
            name: 'SpotBot 3000',
            categories: [7],
          },
        },
      );
      const [, created] = mockOwnershipProxy.send.mock.calls[0];
      expect(created).toMatchObject({
        userId: 42,
        device: {
          modelId: 5120705,
          deviceId: null,
          visualCondition: 'good',
          usageIntensity: 'unknown',
        },
      });
      expect(created.device.acquiredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'link_journey_personal_device' },
        {
          journeyId,
          userId: '42',
          device: { ownershipId: 'own-9', modelId: 5120705, deviceId: null },
          adopt: true,
        },
      );
      expect(result).toEqual({
        id: journeyId,
        ownershipId: 'own-9',
        modelId: 5120705,
        deviceId: null,
      });
    });

    it("takes a picked device's model and variant, creating no model", async () => {
      mockRepairMonitorProxy.send.mockImplementation(
        answer({ ...typedJourney, modelId: 877165, deviceId: 1067188 }),
      );
      mockOwnershipProxy.send.mockReturnValue(of({ id: 'own-9' }));

      await controller.addPersonalDevice(
        journeyId,
        { user: { id: 42 } },
        { another: true },
      );

      expect(mockDevicesProxy.send).not.toHaveBeenCalled();
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalledWith(
        { cmd: 'adopt_journey_model' },
        expect.anything(),
      );
      expect(mockOwnershipProxy.send.mock.calls[0][1].device).toMatchObject({
        modelId: 877165,
        deviceId: 1067188,
        another: true,
      });
    });

    it('passes on the refusal of a second device of a model owned, unasked', async () => {
      mockRepairMonitorProxy.send.mockImplementation(
        answer({ ...typedJourney, modelId: 877165 }),
      );
      mockOwnershipProxy.send.mockReturnValue(
        throwError(() => ({
          message: 'You already have a device of this model',
          status: HttpStatus.CONFLICT,
        })),
      );

      await expect(
        controller.addPersonalDevice(journeyId, { user: { id: 42 } }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
      expect(mockRepairMonitorProxy.send).not.toHaveBeenCalledWith(
        { cmd: 'link_journey_personal_device' },
        expect.anything(),
      );
    });

    it("refuses a journey already in a device's history, or naming no device", async () => {
      mockRepairMonitorProxy.send.mockImplementation(
        answer({ ...typedJourney, ownershipId: 'own-1' }),
      );
      await expect(
        controller.addPersonalDevice(journeyId, { user: { id: 42 } }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });

      mockRepairMonitorProxy.send.mockImplementation(
        answer({ ...typedJourney, brand: null, modelType: null }),
      );
      await expect(
        controller.addPersonalDevice(journeyId, { user: { id: 42 } }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
      expect(mockOwnershipProxy.send).not.toHaveBeenCalled();
      expect(mockDevicesProxy.send).not.toHaveBeenCalled();
    });

    it('removes the device again when the journey cannot be tied to it', async () => {
      mockRepairMonitorProxy.send.mockImplementation(
        answer({ ...typedJourney, modelId: 877165 }, () =>
          throwError(() => new Error('Connection closed')),
        ),
      );
      mockOwnershipProxy.send.mockReturnValue(of({ id: 'own-9' }));

      await expect(
        controller.addPersonalDevice(journeyId, { user: { id: 42 } }),
      ).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
      expect(mockOwnershipProxy.send).toHaveBeenCalledWith(
        { cmd: 'delete_personal_device' },
        { id: 'own-9', userId: 42 },
      );
    });

    it("answers another user's journey as not found, and refuses a guest", async () => {
      mockRepairMonitorProxy.send.mockReturnValue(
        throwError(() => ({
          message: 'Journey not found',
          status: HttpStatus.NOT_FOUND,
        })),
      );
      await expect(
        controller.addPersonalDevice(journeyId, { user: { id: 42 } }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      await expect(
        controller.addPersonalDevice(journeyId, {}),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
    });
  });

  describe('lookupJourneys', () => {
    it('sends both the browser tokens and the signed-in id', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of([]));

      await controller.lookupJourneys({ tokens: ['t1'] }, { user: { id: 8 } });

      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'list_repair_journeys' },
        { tokens: ['t1'], userId: '8' },
      );
    });

    it('treats a guest with no token as having nothing to show', async () => {
      mockRepairMonitorProxy.send.mockReturnValue(of([]));

      await controller.lookupJourneys({}, {});

      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'list_repair_journeys' },
        { tokens: [], userId: null },
      );
    });
  });

  describe('declareOutcome', () => {
    const dto: any = { declarationToken: 'token-a', outcome: 'Fixed' };

    /** list_repair_journeys then fetch-impact-metrics, in that order. */
    const givenJourneyAndImpact = (category: string | null, impact: any) => {
      mockRepairMonitorProxy.send.mockImplementation((pattern: any) => {
        if (pattern.cmd === 'list_repair_journeys') {
          return of(category ? [{ id: 'j-1', productCategory: category }] : []);
        }
        return of({ journeyId: 'j-1', repairRecordId: 'r-1' });
      });
      mockExternalAdaptersProxy.send.mockReturnValue(of(impact));
    };

    it('freezes the impact of the journey being declared', async () => {
      const impact = { co2: 18, reference: { category: 'Vacuum', products: 7 } };
      givenJourneyAndImpact('Vacuum cleaner', impact);

      await controller.declareOutcome('j-1', dto, {});

      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'fetch-impact-metrics' },
        { deviceType: 'Vacuum cleaner' },
      );
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'declare_journey_outcome' },
        expect.objectContaining({ journeyId: 'j-1', impact }),
      );
    });

    // Anyone could otherwise inflate their own cumulative impact by adding a
    // field to the request body.
    it('ignores any impact supplied in the request body', async () => {
      const real = { co2: 18, reference: { category: 'Vacuum', products: 7 } };
      givenJourneyAndImpact('Vacuum cleaner', real);

      await controller.declareOutcome(
        'j-1',
        { ...dto, co2Avoided: 999_999, impact: { co2: 999_999 } } as any,
        {},
      );

      const call = mockRepairMonitorProxy.send.mock.calls.find(
        ([pattern]: any) => pattern.cmd === 'declare_journey_outcome',
      );
      expect(call[1].impact).toEqual(real);
    });

    // The user's answer is worth far more than the number attached to it.
    it('still declares when the impact cannot be worked out', async () => {
      mockRepairMonitorProxy.send.mockImplementation((pattern: any) => {
        if (pattern.cmd === 'list_repair_journeys') {
          return throwError(() => new Error('lookup down'));
        }
        return of({ journeyId: 'j-1', repairRecordId: 'r-1' });
      });

      const result = await controller.declareOutcome('j-1', dto, {});

      expect(result).toEqual({ journeyId: 'j-1', repairRecordId: 'r-1' });
      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'declare_journey_outcome' },
        expect.objectContaining({ impact: null }),
      );
    });

    it('declares with no figure when the category has no reference data', async () => {
      givenJourneyAndImpact('Washing machine / Combi dryer', null);

      await controller.declareOutcome('j-1', dto, {});

      expect(mockRepairMonitorProxy.send).toHaveBeenCalledWith(
        { cmd: 'declare_journey_outcome' },
        expect.objectContaining({ impact: null }),
      );
    });
  });
});
