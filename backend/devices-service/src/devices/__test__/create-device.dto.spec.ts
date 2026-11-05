import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDeviceDto } from '../dto/create-device.dto';

describe('CreateDeviceDto validation', () => {
  it('valid dto should pass validation', async () => {
    const payload = {
      ean: '123',
      serial_number: 'SN',
      product_code: 'PC',
      manufacturer: 'M',
      brand: 'B',
      model: 'Model',
      device_type: 'Phone',
      categories: [1],
      technicalProperties: [
        { property_name: 'color', property_value: 'black' },
      ],
    };

    const dto = plainToInstance(CreateDeviceDto, payload);
    const errors = await validate(dto as any);
    expect(errors.length).toBe(0);
  });

  it('invalid dto should produce validation errors', async () => {
    const payload = {
      // missing required string fields like ean, brand, model
      ean: 123, // wrong type
      serial_number: null,
      manufacturer: 'M',
      brand: null,
      model: null,
      device_type: 5,
      technicalProperties: [{ property_name: 1, property_value: 2 }],
    };
    const dto = plainToInstance(CreateDeviceDto, payload);
    const errors = await validate(dto as any);
    expect(errors.length).toBeGreaterThan(0);
  });
});
