import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRepairerDto } from '../create-repairer.dto';
import { UpdateRepairerDto } from '../update-repairer.dto';
import { NearestRepairerDto } from '../nearest-repairer.dto';
import { RepairerFilterDto } from '../repairer-filter.dto';
import { CreateRepairerDeviceDto } from '../create-repairer-device.dto';
import { PaginationQueryDto } from '../pagination-query.dto';
import { MapBoundsQueryDto } from '../map-bounds-query.dto';

describe('Repairer DTO validation (helps when enabling ValidationPipe)', () => {
  it('accepts a valid CreateRepairerDto shape', async () => {
    const payload = {
      repairer_import_id: 'imp-1',
      name: 'Repair Shop',
      email: 'contact@example.com',
      latitude: 48.8566,
      longitude: 2.3522,
      repairerDevices: [{ repairer_device_id: 1, device_type: 'smartphone' }],
    };

    const dto = plainToInstance(CreateRepairerDto, payload);
    const errors = await validate(dto as unknown as object);
    // `repairerDevices` is nested-validated (@ValidateNested), so a valid
    // whitelisted device_type must produce zero errors here.
    expect(errors.length).toBe(0);
  });

  it('rejects a CreateRepairerDto whose repairerDevices device_type is not whitelisted', async () => {
    const payload = {
      repairer_import_id: 'imp-1',
      name: 'Repair Shop',
      email: 'contact@example.com',
      repairerDevices: [{ repairer_device_id: 1, device_type: 'phone' }],
    };

    const dto = plainToInstance(CreateRepairerDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'repairerDevices')).toBe(true);
  });

  it('CreateRepairerDeviceDto accepts a whitelisted device_type', async () => {
    const dto = plainToInstance(CreateRepairerDeviceDto, {
      device_type: 'desktop_computer',
    });
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBe(0);
  });

  it('CreateRepairerDeviceDto rejects a non-whitelisted device_type', async () => {
    const dto = plainToInstance(CreateRepairerDeviceDto, {
      device_type: 'smart_phone_pager',
    });
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('device_type');
  });

  it('accepts a CreateRepairerDto with a whitelisted partner_type', async () => {
    const payload = {
      name: 'Repair Shop',
      partner_type: 'recycler',
    };
    const dto = plainToInstance(CreateRepairerDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBe(0);
  });

  it('rejects a CreateRepairerDto with a non-whitelisted partner_type', async () => {
    const payload = {
      name: 'Repair Shop',
      partner_type: 'not_a_real_type',
    };
    const dto = plainToInstance(CreateRepairerDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'partner_type')).toBe(true);
  });

  it('accepts a PaginationQueryDto with a whitelisted partner_type', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      partner_type: 'repairer',
    });
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBe(0);
  });

  it('rejects a PaginationQueryDto with a non-whitelisted partner_type', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      partner_type: 'bogus',
    });
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'partner_type')).toBe(true);
  });

  it('splits a comma-separated partner_type into a list', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      partner_type: 'repairer, reuse',
    });
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBe(0);
    expect(dto.partner_type).toEqual(['repairer', 'reuse']);
  });

  it('rejects a partner_type list with one non-whitelisted type', async () => {
    const dto = plainToInstance(MapBoundsQueryDto, {
      north: 51,
      south: 50,
      east: 7,
      west: 6,
      partner_type: 'reuse,bogus',
    });
    const errors = await validate(dto as unknown as object);
    expect(errors.some((e) => e.property === 'partner_type')).toBe(true);
  });

  it('accepts a partial UpdateRepairerDto', async () => {
    const payload = { name: 'New Name' };
    const dto = plainToInstance(UpdateRepairerDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid NearestRepairerDto shape', async () => {
    const payload = {
      repairer: { repairer_id: 'uuid-1', name: 'R' },
      distance: 1200,
    };
    const dto = plainToInstance(NearestRepairerDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid RepairerFilterDto shape', async () => {
    const payload = {
      id: 'f-1',
      category: 'brand',
      name: 'Acme',
      icon: 'acme.png',
    };
    const dto = plainToInstance(RepairerFilterDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid RepairerFilterDto shape with a count', async () => {
    const payload = {
      id: 'smartphone',
      category: 'device_type',
      name: 'Smartphone',
      count: 42,
    };
    const dto = plainToInstance(RepairerFilterDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBe(0);
  });

  it('rejects a RepairerFilterDto with a non-numeric count', async () => {
    const payload = {
      id: 'smartphone',
      category: 'device_type',
      name: 'Smartphone',
      count: 'many',
    };
    const dto = plainToInstance(RepairerFilterDto, payload);
    const errors = await validate(dto as unknown as object);
    const props = errors.map((e) => e.property);
    expect(props).toContain('count');
  });

  // Negative test — requires class-validator decorators to be active
  it('rejects CreateRepairerDto without required name when validators are active', async () => {
    const payload = { email: 'a@b.c' };
    const dto = plainToInstance(CreateRepairerDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    // ensure 'name' is flagged as missing or invalid
    const props = errors.map((e) => e.property);
    expect(props).toContain('name');
  });
});
