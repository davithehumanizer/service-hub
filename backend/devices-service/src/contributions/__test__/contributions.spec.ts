import { ContributionsService } from '../contributions.service';
import { ContributionsController } from '../contributions.controller';

describe('ContributionsService', () => {
  let query: jest.Mock;
  let service: ContributionsService;

  beforeEach(() => {
    query = jest.fn(async (sql: string) => (/count\(\*\)/.test(sql) ? [{ total: 3 }] : [{ id: 1 }]));
    service = new ContributionsService({ manager: { query } } as any);
  });

  it("reads one account's models, newest first, with how many there are", async () => {
    expect(await service.modelsOf(9, 20, 10)).toEqual({ items: [{ id: 1 }], total: 3 });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('FROM device_models');
    expect(sql).toContain('ORDER BY id DESC');
    expect(params).toEqual([9, 20, 10]);
    expect(query.mock.calls[1][1]).toEqual([9]);
  });

  it('reads its variants with the model each belongs to', async () => {
    expect(await service.variantsOf(9)).toEqual({ items: [{ id: 1 }], total: 3 });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('LEFT JOIN device_models m ON m.id = d.model_id');
    expect(sql).toContain('WHERE d.created_by = $1');
    expect(params).toEqual([9, 0, 20]);
  });

  it('keeps a page within bounds', async () => {
    await service.modelsOf(9, -5, 1000);
    expect(query.mock.calls[0][1]).toEqual([9, 0, 50]);
    await service.variantsOf(9, NaN, 0);
    expect(query.mock.calls[2][1]).toEqual([9, 0, 20]);
  });
});

describe('ContributionsController', () => {
  it('reads the kind asked for, and keeps a failure for the gateway', async () => {
    const contributions = {
      modelsOf: jest.fn(async () => ({ items: [], total: 0 })),
      variantsOf: jest.fn(async () => ({ items: [], total: 1 })),
    };
    const controller = new ContributionsController(contributions as any);

    await controller.entriesOfAuthor({ authorId: 9, kind: 'models', offset: 20 });
    expect(contributions.modelsOf).toHaveBeenCalledWith(9, 20, undefined);
    expect(await controller.entriesOfAuthor({ authorId: 9, kind: 'variants' })).toEqual({ items: [], total: 1 });

    contributions.modelsOf.mockRejectedValueOnce(new Error('connection reset'));
    await expect(controller.entriesOfAuthor({ authorId: 9, kind: 'models' })).rejects.toThrow('connection reset');
  });
});
