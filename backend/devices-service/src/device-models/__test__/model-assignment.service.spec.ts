import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from '../../entity/device.entity';
import { DEFAULT_RULES } from '../normalization-rules';
import {
  ModelAssignmentService,
  placementInputs,
} from '../model-assignment.service';
import { ModelIndexService } from '../model-index.service';
import { VariantLabelService } from '../variant-label.service';

// The SQL itself is checked against a database; here, what is asked of it.
const setup = async (answer: (sql: string) => unknown) => {
  const manager = {
    query: jest.fn(async (sql: string) => answer(sql)),
    transaction: jest.fn(async (work: (m: unknown) => unknown) =>
      work(manager),
    ),
  };
  const modelIndex = { reindex: jest.fn() };
  const labels = { labelModels: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      ModelAssignmentService,
      { provide: getRepositoryToken(Device), useValue: { manager } },
      { provide: ModelIndexService, useValue: modelIndex },
      { provide: VariantLabelService, useValue: labels },
    ],
  }).compile();
  return {
    service: module.get(ModelAssignmentService),
    manager,
    modelIndex,
    labels,
  };
};

const calls = (manager: { query: jest.Mock }, fragment: string) =>
  manager.query.mock.calls.filter(([sql]) => sql.includes(fragment));

describe('ModelAssignmentService', () => {
  it('reads the brands again after a failed first read', async () => {
    let fail = true;
    const { service } = await setup((sql) => {
      if (!sql.includes('SELECT trim(brand)')) return [];
      if (fail) {
        fail = false;
        throw new Error('database starting up');
      }
      return [{ brand: 'Fairphone' }];
    });

    await expect(service.rules()).rejects.toThrow('database starting up');
    const rules = await service.rules();
    expect(rules.brandAliases.fairphone).toBe('Fairphone');
  });

  it('moves the device, its dependents, and refreshes both models', async () => {
    let modelOf = 0;
    const { service, manager, modelIndex, labels } = await setup((sql) => {
      if (sql.includes('SELECT trim(brand)')) return [{ brand: 'Samsung' }];
      if (sql.includes('SELECT d.device_id, d.brand')) {
        return [
          {
            device_id: 7,
            brand: 'Samsung',
            model: 'Galaxy S23',
            product_code: '',
            category: null,
          },
        ];
      }
      // Model 1 before the assignment, model 2 after.
      if (sql.includes('SELECT model_id FROM devices')) {
        return [{ model_id: ++modelOf }];
      }
      if (sql.includes('INSERT INTO device_models')) {
        return [{ id: 2, key: 'samsung|galaxy s23' }];
      }
      return [[], 0];
    });

    await service.assignDevice(7);

    const copies = calls(manager, 'SET "modelId" = d.model_id');
    expect(copies).toHaveLength(3);
    copies.forEach(([, params]) => expect(params).toEqual([[7]]));
    const counts = calls(manager, 'SET variant_count');
    expect(counts).toHaveLength(1);
    expect(counts[0][1]).toEqual([[1, 2]]);
    expect(modelIndex.reindex).toHaveBeenCalledWith([1, 2]);
    // Emptied, a model goes, unless it has photos of its own.
    expect(calls(manager, 'DELETE FROM device_models')[0][0]).toContain(
      'device_model_photos',
    );
    // Kept, an emptied model shows neither a variant nor colours.
    const emptied = calls(manager, 'SET representative_device_id = NULL');
    expect(emptied[0][0]).toContain("colours = '{}'");
    expect(emptied[0][1]).toEqual([[1, 2]]);
    // Its labels depend on the other variants: both models are relabelled.
    expect(labels.labelModels).toHaveBeenCalledWith([1, 2]);
  });

  it('returns the models a batch linked its entries to', async () => {
    const { service } = await setup((sql) => {
      if (sql.includes('INSERT INTO device_models')) {
        return [{ id: 2, key: 'samsung|galaxy s23' }];
      }
      return [[], 0];
    });
    const entries = [7, 8].map((device_id) => ({
      device_id,
      brand: 'Samsung',
      model: 'Galaxy S23',
      product_code: '',
      category: null,
    }));
    const rules = DEFAULT_RULES;

    const linked = await service.assign(
      entries,
      await service.normalize(entries, rules),
    );

    expect(linked).toEqual([2]);
  });

  it('leaves an entry under a model made by hand where it is', async () => {
    const { service, manager } = await setup((sql) => {
      if (sql.includes('m.is_manual')) return [{ device_id: 7, model_id: 60 }];
      if (sql.includes('INSERT INTO device_models')) {
        return [{ id: 2, key: 'samsung|galaxy s23' }];
      }
      return [[], 0];
    });
    const entries = [7, 8].map((device_id) => ({
      device_id,
      brand: 'Samsung',
      model: 'Galaxy S23',
      product_code: '',
      category: null,
    }));

    const linked = await service.assign(
      entries,
      await service.normalize(entries, DEFAULT_RULES),
    );

    // A variant entered by hand, or by an outside source, stays where it
    // was put, too: only an import's entry moves by its name.
    const [kept] = calls(manager, 'm.is_manual');
    expect(kept[0]).toContain('d.source <> ALL($2::text[])');
    expect(kept[1][1]).toEqual(['ICECAT', 'UNKNOWN']);
    const [link] = calls(manager, 'UPDATE devices d SET model_id');
    expect(link[1][0]).toEqual([8]);
    // Its model is still one the batch touched: its labels are recomputed.
    expect(linked).toEqual([2, 60]);
  });

  it('moves a device to the model given, and refreshes both', async () => {
    const { service, manager, modelIndex } = await setup((sql) => {
      if (sql.includes('SELECT trim(brand)')) return [];
      if (sql.includes('SELECT model_id FROM devices')) {
        return [{ model_id: 61 }];
      }
      return [[], 0];
    });

    await service.moveDevice(8, 60);

    expect(calls(manager, 'UPDATE devices SET model_id')[0][1]).toEqual([
      8, 60,
    ]);
    expect(calls(manager, 'SET variant_count')[0][1]).toEqual([[61, 60]]);
    expect(modelIndex.reindex).toHaveBeenCalledWith([61, 60]);
  });

  it("refreshes within a caller's transaction when given one", async () => {
    const { service, manager } = await setup(() => []);
    const purge = { query: jest.fn(async () => []) };

    await service.refreshModels(DEFAULT_RULES, [60], purge as never);

    expect(manager.transaction).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
    expect(calls(purge, 'SET variant_count')[0][1]).toEqual([[60]]);
  });

  it('logs a failed assignment instead of failing the save', async () => {
    const logged = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { service } = await setup(() => {
      throw new Error('connection lost');
    });
    await expect(service.assignDevice(7)).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('connection lost'),
    );
    logged.mockRestore();
  });
});

describe('placementInputs', () => {
  const device = {
    brand: 'Dell',
    model: 'Latitude 5590',
    product_code: 'N012L559015EMEA',
    categories: [{ id: 3 }, { id: 1 }],
    informationalProperties: [
      { property_name: 'URL', property_value: 'https://icecat.biz/p/dell' },
      { property_name: 'Warranty', property_value: '3 years' },
    ],
  };

  it('ignores what the model does not depend on, and the order', () => {
    expect(
      placementInputs({
        ...device,
        categories: [{ id: 1 }, { id: 3 }],
        informationalProperties: [device.informationalProperties[0]],
      }),
    ).toBe(placementInputs(device));
  });

  it('changes with a technical property a label is made of, only', () => {
    const withColour = (colour: string, weight = '170') =>
      placementInputs({
        ...device,
        technicalProperties: [
          { property_name: 'Product colour', property_value: colour },
          { property_name: 'Weight', property_value: weight },
        ],
      });
    expect(withColour('Black')).not.toBe(withColour('Green'));
    expect(withColour('Black', '170')).toBe(withColour('Black', '168'));
  });

  it('changes with the name, a category, the recovery source or a picture', () => {
    const before = placementInputs(device);
    expect(placementInputs({ ...device, model: '5590' })).not.toBe(before);
    expect(placementInputs({ ...device, categories: [{ id: 3 }] })).not.toBe(
      before,
    );
    expect(
      placementInputs({
        ...device,
        informationalProperties: [
          ...device.informationalProperties,
          { property_name: 'Image_HighPic', property_value: 'x.jpg' },
        ],
      }),
    ).not.toBe(before);
  });
});
