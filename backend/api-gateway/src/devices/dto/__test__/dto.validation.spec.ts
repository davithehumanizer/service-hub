import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDeviceDto } from '../create-device.dto';
import { DeviceFilterDto } from '../device-filter.dto';
import { CreateDeviceCategoryDto } from '../create-device-category.dto';

describe('Device DTO validation (helps when enabling ValidationPipe)', () => {
  it('accepts a valid CreateDeviceDto shape', async () => {
    const payload = {
      ean: 'ean123',
      serial_number: 'sn123',
      product_code: 'pc123',
      manufacturer: 'manu',
      brand: 'brand',
      model: 'model',
      categories: [1, 2],
      device_type: 'type',
      technicalProperties: [{ property_name: 'p', property_value: 'v' }],
      informationalProperties: [{ property_name: 'i', property_value: 'v' }],
    };

    const dto = plainToInstance(CreateDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid DeviceFilterDto shape', async () => {
    const payload = {
      id: 'f-1',
      category: 'brand',
      name: 'Acme',
      icon: 'acme.png',
    };
    const dto = plainToInstance(DeviceFilterDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('rejects CreateDeviceDto missing required fields when validators are active', async () => {
    const payload = { serial_number: 'sn-only' };
    const dto = plainToInstance(CreateDeviceDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    // 'ean' and other required fields should be flagged
    expect(props).toContain('ean');
    expect(props).toContain('manufacturer');
  });

  it('accepts a valid CreateDeviceCategoryDto shape', async () => {
    const payload = { name: 'Kitchen' };
    const dto = plainToInstance(CreateDeviceCategoryDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(0);
  });

  it('rejects CreateDeviceCategoryDto with missing name', async () => {
    const payload = {};
    const dto = plainToInstance(CreateDeviceCategoryDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('name');
  });
});
