import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDeviceModelDto } from '../create-device-model.dto';
import {
  GetDeviceModelsQueryDto,
  LookupDeviceModelQueryDto,
} from '../get-device-models-query.dto';

const errorsOf = async (cls: any, plain: object) =>
  (await validate(plainToInstance(cls, plain) as object)).map(
    (e) => e.property,
  );

describe('Device model DTOs', () => {
  it('takes a model with a barcode typed with spaces', async () => {
    const dto = plainToInstance(CreateDeviceModelDto, {
      brand: 'Fairphone',
      name: 'Fairphone 5',
      categories: [173],
      ean: '2000 0000 00015',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.ean).toBe('2000000000015');
  });

  it('refuses a model without a name, or with a barcode that is not one', async () => {
    expect(await errorsOf(CreateDeviceModelDto, { brand: 'Acme' })).toEqual([
      'name',
    ]);
    expect(
      await errorsOf(CreateDeviceModelDto, {
        brand: 'Acme',
        name: 'X',
        ean: 'ABC',
      }),
    ).toEqual(['ean']);
    expect(
      await errorsOf(CreateDeviceModelDto, {
        brand: 'Acme',
        name: 'X',
        categories: ['laptop'],
      }),
    ).toEqual(['categories']);
    // An id beyond what the database holds would leave the model without
    // any category.
    expect(
      await errorsOf(CreateDeviceModelDto, {
        brand: 'Acme',
        name: 'X',
        categories: [2147483648],
      }),
    ).toEqual(['categories']);
  });

  it('takes each category in a parameter of its own, commas included', async () => {
    const one = plainToInstance(GetDeviceModelsQueryDto, {
      categories: 'Flat Display Panel Television (LCD, LED, Plasma)',
    });
    expect(await validate(one)).toEqual([]);
    expect(one.categories).toEqual([
      'Flat Display Panel Television (LCD, LED, Plasma)',
    ]);
    const two = plainToInstance(GetDeviceModelsQueryDto, {
      categories: ['Laptop', 'Smart Phone / Pager'],
    });
    expect(two.categories).toEqual(['Laptop', 'Smart Phone / Pager']);
  });

  it('reads the search query from strings, and refuses an unknown sort', async () => {
    const dto = plainToInstance(GetDeviceModelsQueryDto, {
      page: '2',
      limit: '20',
      strict: 'true',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ page: 2, limit: 20, strict: true });

    expect(
      await errorsOf(GetDeviceModelsQueryDto, { sortBy: 'priceAZ' }),
    ).toEqual(['sortBy']);
    expect(await errorsOf(GetDeviceModelsQueryDto, { limit: '500' })).toEqual([
      'limit',
    ]);
  });

  it('requires a code to look up', async () => {
    expect(await errorsOf(LookupDeviceModelQueryDto, {})).toEqual(['code']);
  });
});
