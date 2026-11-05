import { HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { DeviceModelResolver } from '../device-model-resolver.service';

describe('DeviceModelResolver', () => {
  const devices = { send: jest.fn() };
  const resolver = new DeviceModelResolver(devices as never);
  const answer = (byCmd: Record<string, unknown>) =>
    devices.send.mockImplementation(({ cmd }) =>
      byCmd[cmd] instanceof Error
        ? throwError(() => ({ message: (byCmd[cmd] as Error).message }))
        : of(byCmd[cmd]),
    );

  beforeEach(() => jest.clearAllMocks());

  it('takes the model from the variant when none is given', async () => {
    answer({ get_device_by_id: { model_id: 953560 } });
    expect(await resolver.resolve({ deviceId: 724390 })).toEqual({
      modelId: 953560,
      deviceId: 724390,
    });
  });

  it('refuses a variant of another model', async () => {
    answer({ get_device_by_id: { model_id: 953560 } });
    await expect(
      resolver.resolve({ modelId: 877165, deviceId: 724390 }),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('checks a model given with a variant that has none yet', async () => {
    answer({
      get_device_by_id: { model_id: null },
      get_device_models_by_ids: [],
    });
    await expect(
      resolver.resolve({ modelId: 99999999, deviceId: 7 }),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it('answers an unknown variant or model as not found', async () => {
    answer({
      get_device_by_id: new Error('Device with ID 9 not found'),
      get_device_models_by_ids: [],
    });
    await expect(resolver.resolve({ deviceId: 9 })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    await expect(resolver.resolve({ modelId: 9 })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('accepts a model alone, and refuses nothing at all', async () => {
    answer({ get_device_models_by_ids: [{ id: 877165 }] });
    expect(await resolver.resolve({ modelId: 877165 })).toEqual({
      modelId: 877165,
      deviceId: null,
    });
    await expect(resolver.resolve({})).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('reads no model for no id', async () => {
    expect(await resolver.models([])).toEqual([]);
    expect(devices.send).not.toHaveBeenCalled();
  });

  it('reads variants by id, and none for no id', async () => {
    expect(await resolver.variants([])).toEqual([]);
    expect(devices.send).not.toHaveBeenCalled();
    answer({ get_device_model_variants_by_ids: [{ device_id: 7 }] });
    expect(await resolver.variants([7])).toEqual([{ device_id: 7 }]);
    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'get_device_model_variants_by_ids' },
      { ids: [7] },
    );
  });
});
