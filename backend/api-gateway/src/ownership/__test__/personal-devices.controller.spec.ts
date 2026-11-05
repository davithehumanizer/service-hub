import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { of, throwError } from 'rxjs';
import { PersonalDevicesController } from '../personal-devices.controller';
import { DeviceModelResolver } from 'src/devices/device-model-resolver.service';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';
import {
  CreatePersonalDeviceDto,
  UpdatePersonalDeviceDto,
} from '../dto/personal-device.dto';

describe('PersonalDevicesController', () => {
  let controller: PersonalDevicesController;
  const ownership = { send: jest.fn() };
  const resolver = { resolve: jest.fn(), models: jest.fn(), variants: jest.fn() };
  const user = { user: { id: 42 } };
  const model = { id: 877165, brand: 'Samsung', name: 'Galaxy S23' };

  beforeEach(async () => {
    jest.clearAllMocks();
    resolver.models.mockResolvedValue([model]);
    resolver.variants.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonalDevicesController],
      providers: [
        { provide: 'OWNERSHIP_SERVICE', useValue: ownership },
        { provide: DeviceModelResolver, useValue: resolver },
        mockAuthService(),
        { provide: RoleCacheService, useValue: { getGuestRole: jest.fn() } },
      ],
    }).compile();
    controller = module.get(PersonalDevicesController);
  });

  it("lists the user's devices, each with its model and variant", async () => {
    const variant = { device_id: 7, variant_label: '128 GB · Black' };
    resolver.variants.mockResolvedValue([variant]);
    ownership.send.mockReturnValue(
      of([
        { id: 'a', modelId: 877165, deviceId: 7 },
        { id: 'b', modelId: 5, deviceId: null },
      ]),
    );

    const devices = await controller.list(user, 'fr');

    expect(ownership.send).toHaveBeenCalledWith(
      { cmd: 'list_personal_devices' },
      { userId: 42 },
    );
    expect(resolver.models).toHaveBeenCalledWith([877165, 5], 'fr');
    expect(resolver.variants).toHaveBeenCalledWith([7]);
    expect(devices.map((d) => d.model)).toEqual([model, null]);
    expect(devices.map((d) => d.variant)).toEqual([variant, null]);
  });

  it('adds a device under the model its variant names', async () => {
    resolver.resolve.mockResolvedValue({ modelId: 877165, deviceId: 7 });
    ownership.send.mockReturnValue(of({ id: 'a', modelId: 877165 }));

    await controller.create(user, { deviceId: 7, nickname: 'Léa' });

    expect(ownership.send).toHaveBeenCalledWith(
      { cmd: 'create_personal_device' },
      {
        userId: 42,
        device: { deviceId: 7, nickname: 'Léa', modelId: 877165 },
      },
    );
  });

  // The device as stored, then what the update sends.
  const stored = (device: object) =>
    ownership.send.mockImplementation(({ cmd }, payload) =>
      of(cmd === 'get_personal_device' ? device : { ...device, ...payload }),
    );
  const sentChanges = () =>
    ownership.send.mock.calls.find(
      ([{ cmd }]) => cmd === 'update_personal_device',
    )?.[1].changes;

  it('forgets the variant when the model changes', async () => {
    stored({ id: 'a', modelId: 877165, deviceId: 7 });
    resolver.resolve.mockResolvedValue({ modelId: 5, deviceId: null });

    await controller.update(user, 'a', { modelId: 5 });

    expect(sentChanges()).toEqual({ modelId: 5, deviceId: null });
  });

  it('keeps the variant when the model sent is the same', async () => {
    stored({ id: 'a', modelId: 877165, deviceId: 7 });

    await controller.update(user, 'a', { modelId: 877165, nickname: 'x' });

    expect(sentChanges()).toEqual({ modelId: 877165, nickname: 'x' });
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it("checks a new variant against the device's model", async () => {
    stored({ id: 'a', modelId: 877165, deviceId: 7 });
    resolver.resolve.mockResolvedValue({ modelId: 877165, deviceId: 8 });

    await controller.update(user, 'a', { deviceId: 8 });

    expect(resolver.resolve).toHaveBeenCalledWith({
      modelId: 877165,
      deviceId: 8,
    });
    expect(sentChanges()).toEqual({ modelId: 877165, deviceId: 8 });
  });

  it('answers a second device of a model owned, unasked, with 409', async () => {
    resolver.resolve.mockResolvedValue({ modelId: 877165, deviceId: null });
    ownership.send.mockReturnValue(
      throwError(() => ({
        message: 'You already have a device of this model',
        status: HttpStatus.CONFLICT,
      })),
    );
    await expect(
      controller.create(user, { modelId: 877165 }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it("answers another user's device as not found", async () => {
    ownership.send.mockReturnValue(
      throwError(() => ({ message: 'Personal device a not found' })),
    );
    await expect(controller.remove(user, 'a')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('takes an OAuth2 user by its sub, not for a guest', async () => {
    ownership.send.mockReturnValue(of([]));
    await controller.list({ user: { sub: '42' } });
    expect(ownership.send.mock.calls[0][1]).toEqual({ userId: 42 });
  });

  it('refuses a request without a user, an OAuth2 client acting alone', async () => {
    await expect(controller.list({ user: undefined })).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
    expect(ownership.send).not.toHaveBeenCalled();
  });

  it('validates the conditions and the dates', async () => {
    const errorsOf = async (cls: any, plain: object) =>
      (await validate(plainToInstance(cls, plain) as object)).map(
        (e) => e.property,
      );
    expect(
      await errorsOf(CreatePersonalDeviceDto, {
        modelId: 1,
        visualCondition: 'shiny',
        acquiredAt: 'yesterday',
      }),
    ).toEqual(['visualCondition', 'acquiredAt']);
    expect(
      await errorsOf(UpdatePersonalDeviceDto, {
        deviceId: null,
        nickname: null,
      }),
    ).toEqual([]);
    // A null is no model, no condition and no date.
    expect(
      await errorsOf(UpdatePersonalDeviceDto, {
        modelId: null,
        visualCondition: null,
        acquiredAt: null,
      }),
    ).toEqual(['modelId', 'visualCondition', 'acquiredAt']);
    expect(
      await errorsOf(CreatePersonalDeviceDto, { modelId: 1, acquiredAt: null }),
    ).toEqual(['acquiredAt']);
    // Beyond an integer column, the database would answer 500.
    expect(
      await errorsOf(CreatePersonalDeviceDto, { deviceId: 2147483648 }),
    ).toEqual(['deviceId']);
  });
});
