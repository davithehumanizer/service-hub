import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from '../../entity/device.entity';
import { ModelSearchService } from '../../search/model-search.service';
import {
  ModelIndexService,
  ModelRow,
  toModelDocument,
} from '../model-index.service';

const row = (id: number): ModelRow => ({
  id,
  brand: 'Samsung',
  name: 'Galaxy S23',
  variant_count: 12,
  has_manufacturer_variant: true,
  categories: ['Smartphone'],
  thumbnail: null,
});

describe('toModelDocument', () => {
  it('titles the model with its brand, and has no picture as empty', () => {
    const at = new Date('2026-10-05T12:00:00.000Z');
    expect(toModelDocument(row(4), at)).toEqual({
      model_id: 4,
      brand: 'Samsung',
      name: 'Galaxy S23',
      title: 'Samsung Galaxy S23',
      categories: ['Smartphone'],
      variant_count: 12,
      has_manufacturer_variant: true,
      thumbnail: '',
      synced_at: '2026-10-05T12:00:00.000Z',
    });
    expect(toModelDocument({ ...row(5), brand: '' }, at).title).toBe(
      'Galaxy S23',
    );
  });
});

describe('ModelIndexService', () => {
  const setup = async (query: jest.Mock) => {
    const search = {
      indexModels: jest.fn().mockResolvedValue(0),
      removeModels: jest.fn(),
      removeUnseen: jest.fn().mockResolvedValue(0),
    };
    const module = await Test.createTestingModule({
      providers: [
        ModelIndexService,
        {
          provide: getRepositoryToken(Device),
          useValue: { manager: { query } },
        },
        { provide: ModelSearchService, useValue: search },
      ],
    }).compile();
    return { service: module.get(ModelIndexService), search };
  };

  it('rewrites the models still there and removes the deleted ones', async () => {
    const { service, search } = await setup(
      jest.fn().mockResolvedValue([row(1)]),
    );

    await service.reindex([1, 2]);

    expect(search.indexModels.mock.calls[0][0].map((d) => d.model_id)).toEqual([
      1,
    ]);
    expect(search.removeModels).toHaveBeenCalledWith([2]);
  });

  it('logs an index it could not reach instead of failing the save', async () => {
    const logged = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { service, search } = await setup(
      jest.fn().mockResolvedValue([row(1)]),
    );
    search.indexModels.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(service.reindex([1])).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('ECONNREFUSED'),
    );
    logged.mockRestore();
  });

  it('syncs every model by batch, then removes what it did not see', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([row(1), row(3)])
      .mockResolvedValueOnce([row(8)])
      .mockResolvedValueOnce([]);
    const { service, search } = await setup(query);
    search.removeUnseen.mockResolvedValue(2);

    const result = await service.syncAll();

    expect(query.mock.calls.map(([, params]) => params[1])).toEqual([0, 3, 8]);
    expect(result).toEqual({ indexed: 3, refused: 0, removed: 2 });
    // Every document of the run carries the run's start, which the removal
    // compares against.
    const since: Date = search.removeUnseen.mock.calls[0][0];
    const written = search.indexModels.mock.calls.flatMap(([docs]) => docs);
    written.forEach((d) => expect(d.synced_at).toBe(since.toISOString()));
  });

  it('removes nothing after a refusal, which left the former document', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([row(1), row(3)])
      .mockResolvedValueOnce([]);
    const { service, search } = await setup(query);
    search.indexModels.mockResolvedValue(2);

    const result = await service.syncAll();

    expect(result).toEqual({ indexed: 2, refused: 2, removed: 0 });
    expect(search.removeUnseen).not.toHaveBeenCalled();
  });
});
