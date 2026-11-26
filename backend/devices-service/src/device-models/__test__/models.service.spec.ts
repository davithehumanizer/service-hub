import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from '../../entity/device.entity';
import { ModelSearchService } from '../../search/model-search.service';
import { ModelAssignmentService } from '../model-assignment.service';
import { ModelIndexService } from '../model-index.service';
import { ModelsService } from '../models.service';
import { VariantLabelService } from '../variant-label.service';
import { DEFAULT_RULES } from '../normalization-rules';

const summary = (id: number) => ({
  id,
  brand: 'Samsung',
  name: `Galaxy ${id}`,
  variant_count: 2,
  has_manufacturer_variant: true,
  representative_device_id: id * 10,
  categories: [{ id: 173, name: 'Smart Phone / Pager' }],
  thumbnail: null,
});

// The SQL itself is checked against a database; here, what is asked of it.
const setup = async (answer: (sql: string, params: unknown[]) => unknown) => {
  const query = jest.fn(async (sql: string, params: unknown[]) =>
    answer(sql, params),
  );
  const search = { searchModels: jest.fn() };
  const assignment = {
    assignDevice: jest.fn(),
    moveDevice: jest.fn(),
    rules: jest.fn().mockResolvedValue(DEFAULT_RULES),
  };
  const modelIndex = { reindex: jest.fn() };
  const catalogue = { createDevice: jest.fn(), updateDevice: jest.fn() };
  const labels = { labelModels: jest.fn() };
  const photos = {
    create: jest.fn((p) => p),
    save: jest.fn(async (p) => p),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const manager: Record<string, unknown> = {
    query,
    getRepository: () => photos,
  };
  manager.transaction = jest.fn(async (work: (m: unknown) => unknown) =>
    work(manager),
  );
  const module = await Test.createTestingModule({
    providers: [
      ModelsService,
      { provide: getRepositoryToken(Device), useValue: { manager } },
      { provide: ModelSearchService, useValue: search },
      { provide: ModelAssignmentService, useValue: assignment },
      { provide: ModelIndexService, useValue: modelIndex },
      { provide: 'IDevicesService', useValue: catalogue },
      { provide: VariantLabelService, useValue: labels },
    ],
  }).compile();
  return {
    service: module.get(ModelsService),
    query,
    search,
    assignment,
    modelIndex,
    catalogue,
    photos,
    labels,
  };
};

const modelsQuery = (sql: string) =>
  sql.includes('FROM device_models m WHERE m.id = ANY');

const contributor = { created_by: 42, is_demo: true, admin: false };
const admin = { created_by: 1, is_demo: false, admin: true };

describe('ModelsService', () => {
  it('pages the models the index found, read from the database in its order', async () => {
    const { service, search } = await setup((sql, params) =>
      modelsQuery(sql) ? (params[1] as number[]).map(summary) : [],
    );
    search.searchModels.mockResolvedValue({
      ids: [3, 1],
      total: 12,
      categoryFacets: { 'Smart Phone / Pager': 12 },
    });

    const result = await service.searchModels({ search: 'galaxy', limit: 2 });

    expect(result.data.map((m) => m.id)).toEqual([3, 1]);
    expect(result.data[0].thumbnail).toBe('');
    expect(result.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 12,
      totalPages: 6,
    });
    expect(result.categoryFacets).toEqual({ 'Smart Phone / Pager': 12 });
  });

  it('searches the database when the index is unreachable', async () => {
    const warned = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { service, search, query } = await setup((sql, params) => {
      if (sql.includes('count(*)::int AS total')) return [{ total: 1 }];
      if (sql.includes('SELECT m.id FROM device_models m')) return [{ id: 5 }];
      if (sql.includes('GROUP BY c.name')) return [{ name: 'Laptop', n: 1 }];
      return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
    });
    search.searchModels.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await service.searchModels({
      search: 'latitude 5590',
      categories: ['Laptop'],
    });

    expect(result.data.map((m) => m.id)).toEqual([5]);
    expect(result.categoryFacets).toEqual({ Laptop: 1 });
    // Every word is required; the facets ignore the category filter.
    const count = query.mock.calls.find(([sql]) => sql.includes('AS total'));
    expect(count?.[1]).toEqual(['%latitude%', '%5590%', ['Laptop']]);
    const facets = query.mock.calls.find(([sql]) => sql.includes('GROUP BY'));
    expect(facets?.[1]).toEqual(['%latitude%', '%5590%']);
    warned.mockRestore();
  });

  it('matches what is typed as typed when searching the database', async () => {
    const { service, search, query } = await setup((sql) =>
      sql.includes('count(*)::int AS total') ? [{ total: 0 }] : [],
    );
    search.searchModels.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const warned = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const countOf = async (o: object) => {
      query.mockClear();
      await service.searchModels(o);
      return query.mock.calls.find(([sql]) => sql.includes('AS total'));
    };

    // No wildcard, and nothing to search for in a comma.
    expect((await countOf({ search: '100%' }))?.[1]).toEqual(['%100\\%%']);
    expect((await countOf({ search: ' , ' }))?.[0]).toContain('WHERE TRUE');
    // "Brand,Model", as the photo identification sends it.
    expect(
      (await countOf({ search: 'Samsung,Galaxy S23', strict: true }))?.[1],
    ).toEqual(['%Samsung Galaxy S23%']);
    warned.mockRestore();
  });

  it('answers a barcode typed as the search with its model and variant', async () => {
    const { service, search } = await setup((sql, params) => {
      if (sql.includes('d.ean = ANY')) {
        return [{ device_id: 464887, model_id: 876006, ean: '0197528549958' }];
      }
      return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
    });

    const result = await service.searchModels({ search: ' 0197528549958 ' });

    expect(result.data.map((m) => m.id)).toEqual([876006]);
    expect(result.variant).toEqual({ device_id: 464887, ean: '0197528549958' });
    expect(result.pagination.total).toBe(1);
    expect(result.categoryFacets).toEqual({ 'Smart Phone / Pager': 1 });
    expect(search.searchModels).not.toHaveBeenCalled();
  });

  it('searches a word with digits as a name before a reference', async () => {
    // "p520" is a Lenovo by name, and the reference of a Samsung.
    const { service, search, query } = await setup((sql, params) => {
      if (sql.includes('product_code = $1')) return [{ device_id: 53029 }];
      return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
    });
    search.searchModels.mockResolvedValue({
      ids: [877165],
      total: 1,
      categoryFacets: {},
    });

    const result = await service.searchModels({ search: 'p520' });

    expect(result.data.map((m) => m.id)).toEqual([877165]);
    expect(result.variant).toBeUndefined();
    expect(query.mock.calls.some(([sql]) => sql.includes('product_code'))).toBe(
      false,
    );
  });

  it('tries a word with digits as a reference when no name has it', async () => {
    const { service, search, query } = await setup((sql, params) => {
      if (sql.includes('product_code = $1') && params[0] === 'NW4NGUK') {
        return [{ device_id: 89354, model_id: 4420 }];
      }
      return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
    });
    search.searchModels.mockResolvedValue({
      ids: [],
      total: 0,
      categoryFacets: {},
    });

    const result = await service.searchModels({ search: 'nw4nguk' });

    expect(result.data.map((m) => m.id)).toEqual([4420]);
    expect(result.variant).toEqual({ device_id: 89354 });
    // As typed, then in capitals.
    const tried = query.mock.calls
      .filter(([sql]) => sql.includes('product_code = $1'))
      .map(([, params]) => params[0]);
    expect(tried).toEqual(['nw4nguk', 'NW4NGUK']);
  });

  it('never takes words without digits, or several words, for a code', async () => {
    const { service, search, query } = await setup(() => []);
    search.searchModels.mockResolvedValue({
      ids: [],
      total: 0,
      categoryFacets: {},
    });

    await service.searchModels({ search: 'galaxy' });
    await service.searchModels({ search: 'galaxy s23' });

    expect(query.mock.calls.some(([sql]) => sql.includes('product_code'))).toBe(
      false,
    );
  });

  it('reads several models in the order asked, once each', async () => {
    const { service, query } = await setup((sql, params) =>
      modelsQuery(sql) ? (params[1] as number[]).map(summary) : [],
    );

    const models = await service.getModels([3, 1, 3]);

    expect(models.map((m) => m.id)).toEqual([3, 1]);
    expect(query.mock.calls[0][1][1]).toEqual([3, 1]);
  });

  it('reads several variants at once, once each, and nothing for none', async () => {
    const { service, query } = await setup(() => [{ device_id: 7 }]);

    expect(await service.getVariants([])).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    await service.getVariants([7, 9, 7]);
    expect(query.mock.calls[0][0]).toContain('d.device_id = ANY($1::int[])');
    expect(query.mock.calls[0][1]).toEqual([[7, 9]]);
  });

  it('pages the variants, the one it is shown with first', async () => {
    const { service, query } = await setup((sql, params) => {
      if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
      if (sql.includes('FROM devices d')) return [{ device_id: 30 }];
      return [];
    });

    const model = await service.getModel(3, { page: 2, limit: 10 });

    expect(model.variants.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
    const [sql, params] = query.mock.calls.find(([s]) => s.includes('OFFSET'))!;
    expect(sql).not.toContain('ILIKE');
    // A guest: no variant editable, by hand or from an outside source.
    expect(params).toEqual([
      3,
      false,
      null,
      false,
      ['ICECAT', 'UNKNOWN'],
      30,
      expect.any(Array),
      10,
      10,
    ]);
    expect(sql).toContain("CASE WHEN d.source = 'MANUAL'");
  });

  it('finds variants by the words of their label, reference, seller or barcode', async () => {
    const { service, query } = await setup((sql, params) => {
      if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
      if (sql.includes('count(*)')) return [{ n: 7 }];
      return [];
    });

    const model = await service.getModel(3, { search: ' 16 GB  Black ' });

    expect(model.variants.pagination.total).toBe(7);
    const [count, params] = query.mock.calls.find(([s]) =>
      s.includes('count(*)'),
    )!;
    // Every word, each anywhere.
    expect(count.match(/variant_label ILIKE/g)).toHaveLength(3);
    expect(params).toEqual([3, '%16%', '16', '%GB%', 'GB', '%Black%', 'Black']);
    // The page shown is filtered as it is counted.
    const [page, pageParams] = query.mock.calls.find(([s]) =>
      s.includes('OFFSET'),
    )!;
    expect(page.match(/variant_label ILIKE/g)).toHaveLength(3);
    expect(pageParams.slice(0, 7)).toEqual(params);
  });

  it('narrows the variants down by their parts, counting each value among what the others leave', async () => {
    const { service, query } = await setup((sql, params) => {
      if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
      if (sql.includes('count(*)::int AS n FROM devices')) return [{ n: 9 }];
      if (sql.includes('jsonb_each_text')) {
        return [
          { key: 'colour', value: 'Green', n: 9 },
          { key: 'colour', value: 'Black', n: 9 },
          { key: 'storage', value: '256 GB', n: 9 },
          { key: 'storage', value: '128 GB', n: 6 },
          { key: 'storage', value: '1 TB', n: 0 },
          // One value is no choice: left out.
          { key: 'display', value: '6.1"', n: 15 },
        ].map((row) => ({ ...row, configurations: 8 }));
      }
      return [];
    });

    const model = await service.getModel(3, {
      parts: { storage: '256 GB', colour: 'Green' },
    });

    const [page, pageParams] = query.mock.calls.find(([s]) =>
      s.includes('OFFSET'),
    )!;
    expect(page).toContain('d.variant_parts->>$2 = $3');
    expect(pageParams.slice(0, 5)).toEqual([
      3,
      'storage',
      '256 GB',
      'colour',
      'Green',
    ]);
    expect(model.variants.pagination.total).toBe(9);
    expect(model.configurations).toBe(8);
    // In the label's order, sizes as sizes: 128 GB before 1 TB.
    expect(model.facets).toEqual([
      {
        key: 'storage',
        values: [
          { value: '128 GB', count: 6 },
          { value: '256 GB', count: 9 },
          { value: '1 TB', count: 0 },
        ],
      },
      {
        key: 'colour',
        values: [
          { value: 'Black', count: 9 },
          { value: 'Green', count: 9 },
        ],
      },
    ]);
    // Each value counted under the other parts chosen, not its own.
    const [facets] = query.mock.calls.find(([s]) =>
      s.includes('jsonb_each_text'),
    )!;
    expect(facets).toContain('f.key = $2 OR d.variant_parts->>$3 = $4');
  });

  it('reads one variant, for its parts', async () => {
    const { query, service } = await setup((sql, params) => {
      if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
      if (sql.includes('count(*)::int AS n FROM devices')) return [{ n: 1 }];
      return [];
    });
    await service.getModel(3, { variant: 30 });
    const [page, pageParams] = query.mock.calls.find(([s]) =>
      s.includes('OFFSET'),
    )!;
    expect(page).toContain('d.device_id = $2');
    expect(pageParams[1]).toBe(30);
  });

  it('answers an unknown model as not found', async () => {
    const { service } = await setup(() => []);
    await expect(service.getModel(999)).rejects.toThrow(
      'Device model 999 not found',
    );
  });

  it('finds a variant under another GTIN form of its barcode', async () => {
    const { service, query } = await setup((sql, params) => {
      if (sql.includes('d.ean = ANY')) {
        return [{ device_id: 690185, model_id: 938749, ean: '18710103814204' }];
      }
      return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
    });

    const found = await service.lookup('8710103814207');

    expect(found.model.id).toBe(938749);
    expect(found.variant).toEqual({ device_id: 690185, ean: '18710103814204' });
    const eans = query.mock.calls.find(([sql]) =>
      sql.includes('d.ean'),
    )?.[1][0];
    expect(eans).toContain('18710103814204');
  });

  it('finds a reference typed in lower case', async () => {
    const { service, query } = await setup((sql, params) => {
      if (sql.includes('d.product_code = $1')) {
        return params[0] === 'LAP-DELL5590-DE-A001'
          ? [{ device_id: 409140, model_id: 953560 }]
          : [];
      }
      return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
    });

    const found = await service.lookup('lap-dell5590-de-a001');

    expect(found.model.id).toBe(953560);
    const tried = query.mock.calls
      .filter(([sql]) => sql.includes('product_code = $1'))
      .map(([, params]) => params[0]);
    expect(tried).toEqual(['lap-dell5590-de-a001', 'LAP-DELL5590-DE-A001']);
  });

  it('assigns an entry found without a model', async () => {
    let assigned = false;
    const { service, assignment } = await setup((sql, params) => {
      if (sql.includes('d.ean = ANY'))
        return [{ device_id: 7, model_id: null }];
      if (sql.includes('SELECT model_id FROM devices')) {
        return [{ model_id: assigned ? 42 : null }];
      }
      return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
    });
    assignment.assignDevice.mockImplementation(async () => {
      assigned = true;
    });

    const found = await service.lookup('0197528549958');

    expect(assignment.assignDevice).toHaveBeenCalledWith(7);
    expect(found.model.id).toBe(42);
  });

  it('answers an unknown code as not found', async () => {
    const { service } = await setup(() => []);
    await expect(service.lookup('0000000000000')).rejects.toThrow(
      'No device model for 0000000000000',
    );
  });

  describe('createModel', () => {
    const calls = (query: jest.Mock, fragment: string) =>
      query.mock.calls.filter(([sql]) => sql.includes(fragment));

    it('answers a known barcode with its model, creating nothing', async () => {
      const { service, query, catalogue } = await setup((sql, params) => {
        if (sql.includes('d.ean = ANY')) return [{ device_id: 7, model_id: 3 }];
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });

      const result = await service.createModel({
        brand: 'Whatever',
        name: 'Anything',
        ean: '0197528549958',
      });

      expect(result.created).toBe(false);
      expect(result.model.id).toBe(3);
      expect(calls(query, 'INSERT INTO device_models')).toHaveLength(0);
      expect(catalogue.createDevice).not.toHaveBeenCalled();
    });

    it('creates a manual model with its categories, and indexes it', async () => {
      const { service, query, modelIndex } = await setup((sql, params) => {
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 50, inserted: true }];
        }
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });

      const result = await service.createModel({
        brand: 'Fairphone',
        name: 'Fairphone 5',
        categories: [173],
      });

      expect(result.created).toBe(true);
      const [insert] = calls(query, 'INSERT INTO device_models');
      expect(insert[0]).toContain('is_manual');
      expect(insert[1]).toEqual([
        'Fairphone',
        'Fairphone 5',
        'fairphone|fairphone 5',
        null,
        false,
        // By hand: no outside source.
        null,
      ]);
      expect(calls(query, 'INSERT INTO device_model_categories')[0][1]).toEqual(
        [50, [173]],
      );
      expect(modelIndex.reindex).toHaveBeenCalledWith([50]);
    });

    it('keys a short name within its first category, as the catalogue does', async () => {
      const { service, query } = await setup((sql, params) => {
        if (sql.includes('FROM device_categories WHERE id = ANY')) {
          return [{ name: 'Laptop' }];
        }
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 4440, inserted: false }];
        }
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });

      const result = await service.createModel({
        brand: 'Lenovo',
        name: 'T440',
        categories: [5],
      });

      expect(calls(query, 'INSERT INTO device_models')[0][1][2]).toBe(
        'lenovo|t440|laptop',
      );
      expect(result.model.id).toBe(4440);
    });

    it('names the existing model for a name the catalogue has', async () => {
      const { service, query } = await setup((sql, params) => {
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 877165, inserted: false }];
        }
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });

      const result = await service.createModel({
        brand: 'samsung',
        name: 'Galaxy S23',
      });

      expect(result.created).toBe(false);
      expect(result.model.id).toBe(877165);
      expect(calls(query, 'INSERT INTO device_model_categories')).toHaveLength(
        0,
      );
    });

    it('keeps the variant under the model created, wherever its name puts it', async () => {
      const { service, catalogue, assignment } = await setup((sql, params) => {
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 60, inserted: true }];
        }
        if (sql.includes('WHERE d.device_id = $1')) {
          return [{ device_id: 8, product_code: 'REF-15' }];
        }
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });
      // "Lenovo 15" is too incomplete for the assignment, which isolates it.
      catalogue.createDevice.mockResolvedValue({ device_id: 8, model_id: 61 });

      const result = await service.createModel({
        brand: 'Lenovo',
        name: '15',
        product_code: 'REF-15',
      });

      expect(catalogue.createDevice).toHaveBeenCalledWith(
        expect.objectContaining({ product_code: 'REF-15', source: 'MANUAL' }),
      );
      expect(assignment.moveDevice).toHaveBeenCalledWith(8, 60);
      expect(result.variant).toEqual({ device_id: 8, product_code: 'REF-15' });
    });

    it("gives a contributor's variant of an existing model that model's categories", async () => {
      const { service, catalogue } = await setup((sql, params) => {
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 590, inserted: false }];
        }
        if (sql.includes('SELECT category_id FROM device_model_categories')) {
          return [{ category_id: 12 }];
        }
        if (sql.includes('WHERE d.device_id = $1')) {
          return [{ device_id: 9, ean: '2000000000015' }];
        }
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });
      catalogue.createDevice.mockResolvedValue({ device_id: 9, model_id: 590 });

      await service.createModel(
        { brand: 'Apple', name: 'iPhone 15', ean: '2000000000015', categories: [5] },
        'fr',
        { created_by: 28, is_demo: true },
      );

      // Not the categories the contributor chose: those the purge could not
      // tell from the real model's own.
      expect(catalogue.createDevice).toHaveBeenCalledWith(
        expect.objectContaining({ categories: [12], is_demo: true }),
      );
    });

    it('answers a barcode sent twice at once with what the other made', async () => {
      let created = false;
      const { service, query, catalogue } = await setup((sql, params) => {
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 70, inserted: true }];
        }
        // The other request's variant, once it exists.
        if (sql.includes('d.ean = ANY') && created) {
          return [{ device_id: 9, model_id: 71 }];
        }
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });
      catalogue.createDevice.mockImplementation(async () => {
        created = true;
        throw new Error(
          'duplicate key value violates "devices_ean_unique_idx"',
        );
      });

      const result = await service.createModel({
        brand: 'Fairphone',
        name: 'Fairphone 5',
        ean: '2000000000051',
      });

      expect(result).toMatchObject({ created: false, model: { id: 71 } });
      // The model made for it, left without variant, is gone.
      const [removed] = calls(query, 'DELETE FROM device_models');
      expect(removed[1]).toEqual([70]);
    });

    it('removes the model it made when the variant cannot be made', async () => {
      const { service, query, catalogue } = await setup((sql, params) => {
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 70, inserted: true }];
        }
        return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
      });
      catalogue.createDevice.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.createModel({
          brand: 'Acme',
          name: 'Toaster 3000',
          ean: '2000000000068',
        }),
      ).rejects.toThrow('connection lost');
      expect(calls(query, 'DELETE FROM device_models')[0][1]).toEqual([70]);
    });

    describe('by a contributor', () => {
      const contributor = { created_by: 42, is_demo: true };

      it('records them on the model and on its variant', async () => {
        const { service, query, catalogue } = await setup((sql, params) => {
          if (sql.includes('INSERT INTO device_models')) {
            return [{ id: 80, inserted: true }];
          }
          return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
        });
        catalogue.createDevice.mockResolvedValue({
          device_id: 8,
          model_id: 80,
        });

        await service.createModel(
          { brand: 'Acme', name: 'Blender 3000', ean: '2000000000075' },
          undefined,
          contributor,
        );

        expect(calls(query, 'INSERT INTO device_models')[0][1]).toEqual([
          'Acme',
          'Blender 3000',
          'acme|blender 3000',
          42,
          true,
          null,
        ]);
        expect(catalogue.createDevice).toHaveBeenCalledWith(
          expect.objectContaining({ created_by: 42, is_demo: true }),
        );
      });

      it('refuses a barcode not starting with 2', async () => {
        const { service, query } = await setup(() => []);
        await expect(
          service.createModel(
            { brand: 'Acme', name: 'Blender', ean: '4006381333931' },
            undefined,
            contributor,
          ),
        ).rejects.toThrow('A demonstration barcode starts with 2');
        expect(query).not.toHaveBeenCalled();
      });

      it('refuses a code the catalogue knows, creating nothing', async () => {
        const { service, query, catalogue } = await setup((sql, params) => {
          if (sql.includes('d.product_code = $1')) {
            return [{ device_id: 7, model_id: 3 }];
          }
          return modelsQuery(sql) ? (params[1] as number[]).map(summary) : [];
        });

        await expect(
          service.createModel(
            { brand: 'Acme', name: 'Blender', product_code: 'SM-S911B' },
            undefined,
            contributor,
          ),
        ).rejects.toThrow('SM-S911B is already in the catalogue');
        expect(calls(query, 'INSERT INTO device_models')).toHaveLength(0);
        expect(catalogue.createDevice).not.toHaveBeenCalled();
      });
    });

    it('refuses a model without a brand or a name', async () => {
      const { service } = await setup(() => []);
      await expect(
        service.createModel({ brand: ' ', name: 'Thing' }),
      ).rejects.toThrow('A device model needs a brand and a name');
      await expect(
        service.createModel({ brand: 'Acme', name: '--' }),
      ).rejects.toThrow('A device model needs a brand and a name');
    });
  });

  describe('model photos', () => {
    it('adds photos to an existing model and reindexes it', async () => {
      const { service, photos, modelIndex } = await setup((sql, params) =>
        modelsQuery(sql) ? (params[1] as number[]).map(summary) : [],
      );

      await service.addModelPhotos(5, [{ url: 'u.jpg', key: 'k' }]);

      expect(photos.save).toHaveBeenCalledWith([
        { modelId: 5, url: 'u.jpg', key: 'k', createdBy: null, isDemo: false },
      ]);
      expect(modelIndex.reindex).toHaveBeenCalledWith([5]);
    });

    it("marks a contributor's photos as demonstration data", async () => {
      const { service, photos } = await setup((sql, params) =>
        modelsQuery(sql) ? (params[1] as number[]).map(summary) : [],
      );

      await service.addModelPhotos(5, [{ url: 'u.jpg', key: 'k' }], {
        created_by: 42,
        is_demo: true,
      });

      expect(photos.save).toHaveBeenCalledWith([
        { modelId: 5, url: 'u.jpg', key: 'k', createdBy: 42, isDemo: true },
      ]);
    });

    it('refuses photos for an unknown model', async () => {
      const { service, photos } = await setup(() => []);
      await expect(
        service.addModelPhotos(9, [{ url: 'u', key: 'k' }]),
      ).rejects.toThrow('Device model 9 not found');
      expect(photos.save).not.toHaveBeenCalled();
    });

    it('removes a photo and hands its key back', async () => {
      const { service, photos, modelIndex } = await setup(() => []);
      photos.findOne.mockResolvedValue({
        id: 'p',
        modelId: 5,
        key: 'k',
        createdBy: null,
      });

      expect(await service.deleteModelPhoto(5, 'p', admin)).toEqual({
        key: 'k',
      });
      expect(photos.findOne).toHaveBeenCalledWith({
        where: { id: 'p', modelId: 5 },
        select: { id: true, modelId: true, key: true, createdBy: true },
      });
      expect(modelIndex.reindex).toHaveBeenCalledWith([5]);

      photos.findOne.mockResolvedValue(null);
      await expect(service.deleteModelPhoto(5, 'q', admin)).rejects.toThrow(
        'Photo q not found',
      );
    });

    it("leaves a photo to whoever uploaded it, refusing another's", async () => {
      const { service, photos } = await setup(() => []);
      photos.findOne.mockResolvedValue({
        id: 'p',
        modelId: 5,
        key: 'k',
        createdBy: 42,
      });

      expect(await service.deleteModelPhoto(5, 'p', contributor)).toEqual({
        key: 'k',
      });
      await expect(
        service.deleteModelPhoto(5, 'p', { ...contributor, created_by: 7 }),
      ).rejects.toThrow('Only its author or an administrator');
    });
  });

  describe("a model's page", () => {
    it('says to its author they may change it, and which photos they may delete', async () => {
      const { service, query } = await setup((sql, params) => {
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (sql.includes('SELECT created_by, is_manual, source FROM device_models')) {
          return [{ created_by: 42, is_manual: true, source: null }];
        }
        if (sql.includes('AS deletable')) {
          return [{ id: 'p', url: 'u', is_demo: true, deletable: true }];
        }
        return [];
      });

      const model = await service.getModel(3, { viewer: contributor });

      expect(model.editable).toBe(true);
      expect(model.photos).toEqual([
        { id: 'p', url: 'u', is_demo: true, deletable: true },
      ]);
      const [, photoParams] = query.mock.calls.find(([s]) =>
        s.includes('AS deletable'),
      )!;
      expect(photoParams).toEqual([3, false, 42]);
      expect(
        (
          await service.getModel(3, {
            viewer: { ...contributor, created_by: 7 },
          })
        ).editable,
      ).toBe(false);
    });
  });

  describe('addVariant', () => {
    const variantQuery = (sql: string) => sql.includes('d.device_id = ANY');

    it("enters it under the model, with the model's names, categories and its properties", async () => {
      const { service, catalogue, assignment } = await setup((sql, params) => {
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (variantQuery(sql)) return [{ device_id: 8, is_demo: true }];
        return [];
      });
      catalogue.createDevice.mockResolvedValue({ device_id: 8, model_id: 99 });

      const variant = await service.addVariant(
        3,
        {
          ean: '2000 0000 00017',
          technicalProperties: [
            {
              property_name: ' Internal storage capacity ',
              property_value: '256',
            },
            { property_name: 'Product colour', property_value: 'Black' },
            { property_name: 'Product colour', property_value: 'Green' },
            { property_name: 'Weight', property_value: '  ' },
          ],
        },
        contributor,
      );

      expect(catalogue.createDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          ean: '2000000000017',
          brand: 'Samsung',
          model: 'Galaxy 3',
          categories: [173],
          source: 'MANUAL',
          created_by: 42,
          is_demo: true,
          // Trimmed, the last of a name kept, none empty.
          technicalProperties: [
            {
              property_name: 'Internal storage capacity',
              property_value: '256',
            },
            { property_name: 'Product colour', property_value: 'Green' },
          ],
        }),
      );
      // Its name put it on another model: it belongs here.
      expect(assignment.moveDevice).toHaveBeenCalledWith(8, 3);
      expect(variant).toEqual({ device_id: 8, is_demo: true });
    });

    it('needs a barcode or a reference, refusing one the catalogue has', async () => {
      const { service, catalogue } = await setup((sql, params) => {
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (sql.includes('d.product_code = $1')) {
          return [{ device_id: 7, model_id: 77 }];
        }
        return [];
      });

      await expect(service.addVariant(3, {}, contributor)).rejects.toThrow(
        'A variant needs a barcode or a reference',
      );
      await expect(
        service.addVariant(3, { ean: '4006381333931' }, contributor),
      ).rejects.toThrow('A demonstration barcode starts with 2');
      await expect(
        service.addVariant(3, { product_code: 'SM-S911B' }, admin),
      ).rejects.toThrow('SM-S911B is already in the catalogue, model 77');
      expect(catalogue.createDevice).not.toHaveBeenCalled();
    });

    it('answers an unknown model as not found', async () => {
      const { service } = await setup(() => []);
      await expect(
        service.addVariant(9, { ean: '2000000000017' }, contributor),
      ).rejects.toThrow('Device model 9 not found');
    });
  });

  describe('updateModel', () => {
    const owned = (
      createdBy: number | null,
      other: { id: number }[] = [],
      manual = true,
      source: string | null = null,
    ) =>
      setup((sql, params) => {
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (sql.includes('SELECT brand, name, key, created_by')) {
          return [
            {
              brand: 'Acme',
              name: 'Blender 3000',
              key: 'acme|blender 3000',
              created_by: createdBy,
              is_manual: manual,
              source,
            },
          ];
        }
        if (sql.includes('WHERE key = $1 AND id <> $2')) return other;
        return [];
      });

    it('renames a model of its author, and replaces its categories', async () => {
      const { service, query, labels, modelIndex } = await owned(42);

      await service.updateModel(
        3,
        { name: 'Blender 4000', categories: [5, 6] },
        contributor,
      );

      const [, renamed] = query.mock.calls.find(([s]) =>
        s.includes('UPDATE device_models SET brand'),
      )!;
      expect(renamed).toEqual([3, 'Acme', 'Blender 4000', 'acme|blender 4000']);
      const [, linked] = query.mock.calls.find(([s]) =>
        s.includes('INSERT INTO device_model_categories'),
      )!;
      expect(linked).toEqual([3, [5, 6]]);
      // Its variants entered by hand follow, or they would bring the old
      // categories back.
      const [relinked, relinkedParams] = query.mock.calls.find(([s]) =>
        s.includes('INSERT INTO device_category_device_link'),
      )!;
      expect(relinked).toContain('d.source <> ALL($3::text[])');
      expect(relinkedParams).toEqual([3, [5, 6], ['ICECAT', 'UNKNOWN']]);
      expect(labels.labelModels).toHaveBeenCalledWith([3]);
      expect(modelIndex.reindex).toHaveBeenCalledWith([3]);
    });

    it("refuses another's model, but not to an administrator", async () => {
      const { service } = await owned(7);
      await expect(
        service.updateModel(3, { name: 'X 1' }, contributor),
      ).rejects.toThrow('Only its author or an administrator');
      await expect(
        service.updateModel(3, { name: 'Blender 3000' }, admin),
      ).resolves.toMatchObject({ id: 3 });
    });

    it("leaves the catalogue's own models to its imports", async () => {
      const { service } = await owned(null, [], false);
      await expect(
        service.updateModel(3, { name: 'X 1' }, admin),
      ).rejects.toThrow('Only a model created by hand can be changed');
    });

    it('refuses a name another model has, naming it', async () => {
      const { service, query } = await owned(42, [{ id: 12 }]);
      await expect(
        service.updateModel(3, { name: 'Galaxy S23' }, contributor),
      ).rejects.toThrow('Model 12 already has this name');
      expect(
        query.mock.calls.some(([s]) => s.includes('UPDATE device_models')),
      ).toBe(false);
    });
  });

  describe('from an outside source', () => {
    const partner = { created_by: 77, is_demo: false };

    it('records the source on the model and on its first variant', async () => {
      const { service, query, catalogue } = await setup((sql, params) => {
        if (sql.includes('INSERT INTO device_models')) {
          return [{ id: 50, inserted: true }];
        }
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (sql.includes('d.device_id = $1')) return [{ device_id: 8 }];
        return [];
      });
      catalogue.createDevice.mockResolvedValue({ device_id: 8, model_id: 50 });

      await service.createModel(
        { brand: 'Fairphone', name: 'Fairphone 5', ean: '8718819372424', source: 'ACME_DATA' },
        undefined,
        partner,
      );

      const [, inserted] = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO device_models'))!;
      expect(inserted.at(-1)).toBe('ACME_DATA');
      expect(catalogue.createDevice).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'ACME_DATA', created_by: 77, is_demo: false }),
      );
    });

    it('records it on a variant added to a model', async () => {
      const { service, catalogue } = await setup((sql, params) => {
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (sql.includes('d.device_id = ANY')) return [{ device_id: 8 }];
        return [];
      });
      catalogue.createDevice.mockResolvedValue({ device_id: 8, model_id: 3 });

      await service.addVariant(3, { ean: '8718819372424', source: 'ACME_DATA' }, partner);

      expect(catalogue.createDevice).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'ACME_DATA' }),
      );
    });

    it("leaves its model to an administrator, not to its author", async () => {
      const { service } = await setup((sql, params) => {
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (sql.includes('SELECT created_by, is_manual, source FROM device_models')) {
          return [{ created_by: 77, is_manual: true, source: 'ACME_DATA' }];
        }
        return [];
      });
      expect((await service.getModel(3, { viewer: { ...partner, admin: false } })).editable).toBe(false);
      expect((await service.getModel(3, { viewer: admin })).editable).toBe(true);
    });

    it('lets an administrator change its model, and nobody else', async () => {
      const { service } = await setup((sql, params) => {
        if (modelsQuery(sql)) return (params[1] as number[]).map(summary);
        if (sql.includes('SELECT brand, name, key, created_by')) {
          return [
            {
              brand: 'Fairphone',
              name: 'Fairphone 5',
              key: 'fairphone|fairphone 5',
              created_by: 77,
              is_manual: true,
              source: 'ACME_DATA',
            },
          ];
        }
        return [];
      });
      await expect(
        service.updateModel(3, { categories: [5] }, { ...partner, admin: false }),
      ).rejects.toThrow('Only an administrator may change a model from an outside source');
      await expect(service.updateModel(3, { categories: [5] }, admin)).resolves.toBeDefined();
    });
  });

  describe('updateVariant', () => {
    const variant = (
      createdBy: number | null,
      modelId = 3,
      source = 'MANUAL',
    ) =>
      setup((sql) => {
        if (sql.includes('SELECT model_id, ean, product_code, created_by')) {
          return [
            {
              model_id: modelId,
              ean: '2000000000017',
              product_code: '',
              created_by: createdBy,
              source,
            },
          ];
        }
        if (sql.includes('d.device_id = ANY')) return [{ device_id: 8 }];
        return [];
      });

    it('replaces its properties as its author, keeping its codes, and relabels the model', async () => {
      const { service, catalogue, labels } = await variant(42);

      await service.updateVariant(
        3,
        8,
        {
          technicalProperties: [
            { property_name: 'Product colour', property_value: 'Green' },
          ],
        },
        contributor,
      );

      expect(catalogue.updateDevice).toHaveBeenCalledWith(8, {
        ean: '2000000000017',
        product_code: '',
        technicalProperties: [
          { property_name: 'Product colour', property_value: 'Green' },
        ],
      });
      expect(labels.labelModels).toHaveBeenCalledWith([3]);
    });

    it("refuses another's variant, and one of another model", async () => {
      await expect(
        (await variant(7)).service.updateVariant(3, 8, {}, contributor),
      ).rejects.toThrow('Only its author or an administrator');
      await expect(
        (await variant(42, 4)).service.updateVariant(3, 8, {}, contributor),
      ).rejects.toThrow('Variant 8 not found');
    });

    it("leaves an outside source's variant to an administrator", async () => {
      await expect(
        (await variant(42, 3, 'ACME_DATA')).service.updateVariant(3, 8, {}, contributor),
      ).rejects.toThrow('Only an administrator may change a variant from an outside source');
      const { service, catalogue } = await variant(null, 3, 'ACME_DATA');
      await service.updateVariant(3, 8, { product_code: 'FX-1' }, admin);
      expect(catalogue.updateDevice).toHaveBeenCalledWith(
        8,
        expect.objectContaining({ product_code: 'FX-1' }),
      );
    });

    it("leaves an import's entry to the imports", async () => {
      await expect(
        (await variant(null, 3, 'UNKNOWN')).service.updateVariant(3, 8, {}, admin),
      ).rejects.toThrow('Only a variant entered by hand can be changed');
      await expect(
        (await variant(null, 3, 'ICECAT')).service.updateVariant(
          3,
          8,
          {},
          admin,
        ),
      ).rejects.toThrow('Only a variant entered by hand can be changed');
    });

    it('checks a new barcode as for a new variant', async () => {
      const { service, catalogue } = await variant(42);
      await expect(
        service.updateVariant(3, 8, { ean: '4006381333931' }, contributor),
      ).rejects.toThrow('A demonstration barcode starts with 2');
      await expect(
        service.updateVariant(3, 8, { ean: '', product_code: '' }, contributor),
      ).rejects.toThrow('A variant needs a barcode or a reference');
      expect(catalogue.updateDevice).not.toHaveBeenCalled();
    });
  });
});
