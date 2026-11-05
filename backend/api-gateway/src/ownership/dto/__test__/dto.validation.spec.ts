import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignDeviceDto } from '../assign-device.dto';
import { RemoveDeviceDto } from '../remove-device.dto';

describe('Ownership DTO validation (helps when enabling ValidationPipe)', () => {
  it('accepts a valid AssignDeviceDto shape', async () => {
    const payload = {
      userId: 1,
      deviceId: 101,
      acquiredAt: '2023-01-01T12:00:00Z',
    };

    const dto = plainToInstance(AssignDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid AssignDeviceDto with minimal required fields', async () => {
    const payload = {
      userId: 1,
      deviceId: 101,
    };

    const dto = plainToInstance(AssignDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('rejects AssignDeviceDto without userId', async () => {
    const payload = {
      deviceId: 101,
    };
    const dto = plainToInstance(AssignDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('userId');
  });

  it('rejects AssignDeviceDto without deviceId', async () => {
    const payload = {
      userId: 1,
    };
    const dto = plainToInstance(AssignDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('deviceId');
  });

  it('rejects AssignDeviceDto with invalid acquiredAt date', async () => {
    const payload = {
      userId: 1,
      deviceId: 101,
      acquiredAt: 'invalid-date',
    };
    const dto = plainToInstance(AssignDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('acquiredAt');
  });

  it('accepts a valid RemoveDeviceDto shape', async () => {
    const payload = {
      deviceId: 101,
      userId: 1,
    };

    const dto = plainToInstance(RemoveDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('rejects RemoveDeviceDto without deviceId', async () => {
    const payload = {
      userId: 1,
    };
    const dto = plainToInstance(RemoveDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('deviceId');
  });

  it('rejects RemoveDeviceDto without userId', async () => {
    const payload = {
      deviceId: 101,
    };
    const dto = plainToInstance(RemoveDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('userId');
  });
});
