import { Test } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  MODELS_INDEX,
  MODELS_MAPPING,
  ModelDocument,
  ModelSearchService,
  modelQuery,
} from '../model-search.service';

const doc = (model_id: number): ModelDocument => ({
  model_id,
  brand: 'Dell',
  name: 'Latitude 5590',
  title: 'Dell Latitude 5590',
  categories: ['Laptop'],
  variant_count: 246,
  has_manufacturer_variant: true,
  thumbnail: '',
  synced_at: '2026-10-05T12:00:00.000Z',
});

describe('ModelSearchService', () => {
  let service: ModelSearchService;
  let es: {
    indices: { exists: jest.Mock; create: jest.Mock };
    bulk: jest.Mock;
    deleteByQuery: jest.Mock;
    search: jest.Mock;
  };

  beforeEach(async () => {
    es = {
      indices: { exists: jest.fn(), create: jest.fn() },
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
      deleteByQuery: jest.fn(),
      search: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        ModelSearchService,
        { provide: ElasticsearchService, useValue: es },
      ],
    }).compile();
    service = module.get(ModelSearchService);
  });

  it('creates the index with its mapping before the first write, once', async () => {
    es.indices.exists.mockResolvedValue(false);

    await service.indexModels([doc(1)]);
    await service.indexModels([doc(2)]);

    expect(es.indices.create).toHaveBeenCalledTimes(1);
    expect(es.indices.create).toHaveBeenCalledWith({
      index: MODELS_INDEX,
      mappings: MODELS_MAPPING,
    });
  });

  it('leaves an existing index alone, and one created in between', async () => {
    es.indices.exists.mockResolvedValue(true);
    await service.ensureIndex();
    expect(es.indices.create).not.toHaveBeenCalled();

    const other = await Test.createTestingModule({
      providers: [
        ModelSearchService,
        { provide: ElasticsearchService, useValue: es },
      ],
    }).compile();
    es.indices.exists.mockResolvedValue(false);
    es.indices.create.mockRejectedValue({
      meta: { body: { error: { type: 'resource_already_exists_exception' } } },
    });
    await expect(
      other.get(ModelSearchService).ensureIndex(),
    ).resolves.toBeUndefined();
  });

  it('tries again after a failed creation', async () => {
    es.indices.exists
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
      .mockResolvedValue(true);

    await expect(service.ensureIndex()).rejects.toThrow('ECONNREFUSED');
    await expect(service.ensureIndex()).resolves.toBeUndefined();
  });

  it('writes each model under its id and counts what ES refused', async () => {
    es.indices.exists.mockResolvedValue(true);
    es.bulk.mockResolvedValue({
      errors: true,
      items: [
        { index: { _id: '1', status: 201 } },
        { index: { _id: '2', status: 400, error: { reason: 'strict' } } },
      ],
    });

    const refused = await service.indexModels([doc(1), doc(2)]);

    expect(refused).toBe(1);
    expect(es.bulk.mock.calls[0][0].operations).toEqual([
      { index: { _index: MODELS_INDEX, _id: '1' } },
      doc(1),
      { index: { _index: MODELS_INDEX, _id: '2' } },
      doc(2),
    ]);
  });

  it('removes the documents a sync did not write', async () => {
    es.deleteByQuery.mockResolvedValue({ deleted: 3 });
    const since = new Date('2026-10-05T12:00:00.000Z');

    expect(await service.removeUnseen(since)).toBe(3);
    expect(es.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: MODELS_INDEX,
        query: { range: { synced_at: { lt: '2026-10-05T12:00:00.000Z' } } },
      }),
    );
  });

  it('searches a page of models, facets counting every category', async () => {
    es.search.mockResolvedValue({
      hits: {
        total: { value: 7 },
        hits: [{ _source: { model_id: 877165 } }, { _source: { model_id: 4 } }],
      },
      aggregations: {
        by_category: {
          buckets: [{ key: 'Smart Phone / Pager', doc_count: 6 }],
        },
      },
    });

    const found = await service.searchModels({
      page: 2,
      limit: 2,
      search: 'galaxy s23',
      categories: ['Smart Phone / Pager'],
      sortBy: 'brandAZ',
    });

    expect(found).toEqual({
      ids: [877165, 4],
      total: 7,
      categoryFacets: { 'Smart Phone / Pager': 6 },
    });
    const request = es.search.mock.calls[0][0];
    expect(request).toMatchObject({
      index: MODELS_INDEX,
      from: 2,
      size: 2,
      post_filter: { terms: { 'categories.keyword': ['Smart Phone / Pager'] } },
    });
    expect(request.sort[0]).toEqual({ 'brand.keyword': 'asc' });
    // A slow index falls back to the database instead of hanging.
    expect(es.search.mock.calls[0][1]).toEqual({
      requestTimeout: 5000,
      maxRetries: 0,
    });
  });

  it('answers a page beyond what ES pages through with the total alone', async () => {
    es.search.mockResolvedValue({
      hits: { total: { value: 242409 }, hits: [] },
    });

    const found = await service.searchModels({ page: 1001, limit: 10 });

    expect(es.search.mock.calls[0][0]).toMatchObject({ from: 0, size: 0 });
    expect(found).toEqual({ ids: [], total: 242409, categoryFacets: {} });
  });
});

describe('modelQuery', () => {
  const must = (search?: string, strict = false) =>
    (modelQuery(search, strict) as { bool: { must: any[] } }).bool.must;

  it('requires every word, forgiving typos only in words without digits', () => {
    expect(must('galaxi s23')).toEqual([
      {
        multi_match: {
          query: 'galaxi',
          fields: expect.any(Array),
          fuzziness: 'AUTO',
        },
      },
      {
        multi_match: { query: 's23', fields: expect.any(Array), fuzziness: 0 },
      },
    ]);
  });

  it('leaves out what has no letter or digit, which nothing would match', () => {
    expect(
      must('8200 Elite MT + LA2205wg').map((c) => c.multi_match.query),
    ).toEqual(['8200', 'Elite', 'MT', 'LA2205wg']);
    expect(must(' - ')).toEqual([{ match_all: {} }]);
  });

  it('matches a barcode under any of its GTIN forms', () => {
    const [clause] = must('8710103814207');
    expect(clause.bool.should.map((s) => s.multi_match.query)).toContain(
      '18710103814204',
    );
  });

  it('takes a strict search as a phrase, and no search as everything', () => {
    expect(must('Galaxy S23', true)).toEqual([
      { match_phrase: { title: 'Galaxy S23' } },
    ]);
    expect(must('  ')).toEqual([{ match_all: {} }]);
  });

  it("ranks a manufacturer's model above a reseller's own", () => {
    expect((modelQuery('x') as any).bool.should).toEqual([
      {
        constant_score: {
          filter: { term: { has_manufacturer_variant: true } },
          boost: 2,
        },
      },
    ]);
  });
});
