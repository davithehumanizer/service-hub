import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from '../../entity/device.entity';
import { VariantLabelService } from '../variant-label.service';

describe('VariantLabelService', () => {
  const setup = async (rows: unknown[]) => {
    const query = jest.fn(async (sql: string, _params: unknown[]) => {
      if (sql.startsWith('UPDATE')) return [[], 1];
      if (sql.includes('device_model_categories')) {
        return [{ model_id: 3, names: ['Printer'] }];
      }
      return rows;
    });
    const manager = {
      query,
      transaction: jest.fn(async (work: (m: unknown) => unknown) =>
        work(manager),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        VariantLabelService,
        {
          provide: getRepositoryToken(Device),
          useValue: { manager },
        },
      ],
    }).compile();
    return { service: module.get(VariantLabelService), query };
  };

  it("labels each model's variants against each other, and writes what changed", async () => {
    const { service, query } = await setup([
      { model_id: 1, device_id: 10, properties: { 'Product colour': 'Black' } },
      { model_id: 1, device_id: 11, properties: { 'Product colour': 'Green' } },
      // Another model's Black does not make model 1's colour shared.
      { model_id: 2, device_id: 20, properties: { 'Product colour': 'Black' } },
    ]);

    expect(await service.labelModels([1, 2, 1])).toBe(1);

    // Each model locked first: one labelling of a model at a time.
    expect(query.mock.calls[0][0]).toContain('pg_advisory_xact_lock');
    expect(query.mock.calls[0][1]).toEqual([[1, 2]]);
    expect(query.mock.calls[1][1][0]).toEqual([1, 2]);
    const update = query.mock.calls.find(([sql]) =>
      sql.startsWith('UPDATE devices'),
    );
    expect(update?.[1]).toEqual([
      [10, 11, 20],
      ['Black', 'Green', null],
      // With the parts the label is made of, by key; none for one variant.
      ['{"colour":"Black"}', '{"colour":"Green"}', '{}'],
    ]);
    expect(update?.[0]).toContain('variant_parts IS DISTINCT FROM');
  });

  it('writes the colours each model comes in, where they changed', async () => {
    const { service, query } = await setup([
      { model_id: 1, device_id: 10, properties: { 'Product colour': 'Black' } },
      {
        model_id: 1,
        device_id: 11,
        properties: { 'Product colour': ' Green' },
      },
      { model_id: 1, device_id: 12, properties: { 'Product colour': 'Black' } },
      { model_id: 2, device_id: 20, properties: {} },
    ]);

    await service.labelModels([1, 2]);

    const colours = query.mock.calls.find(([sql]) =>
      sql.startsWith('UPDATE device_models'),
    );
    expect(JSON.parse(colours?.[1][0] as string)).toEqual([
      { id: 1, colours: ['Black', 'Green'] },
      { id: 2, colours: [] },
    ]);
    expect(colours?.[0]).toContain('IS DISTINCT FROM');
  });

  it("reads each model's categories, which say what its memory is", async () => {
    const { service, query } = await setup([
      { model_id: 3, device_id: 30, properties: { 'Internal memory': '128' } },
      { model_id: 3, device_id: 31, properties: { 'Internal memory': '256' } },
    ]);

    await service.labelModels([3]);

    const update = query.mock.calls.find(([sql]) =>
      sql.startsWith('UPDATE devices'),
    );
    expect(update?.[1]).toEqual([
      [30, 31],
      ['128 MB RAM', '256 MB RAM'],
      ['{"ram":"128 MB"}', '{"ram":"256 MB"}'],
    ]);
  });

  it('reads nothing for no model', async () => {
    const { service, query } = await setup([]);
    expect(await service.labelModels([])).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });
});
