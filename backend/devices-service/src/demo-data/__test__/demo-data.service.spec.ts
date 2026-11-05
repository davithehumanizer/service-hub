import { DemoDataService } from '../demo-data.service';
import { DemoDataController } from '../demo-data.controller';

/** The rows each read of the purge finds, by what its SQL asks. */
const ROWS: [RegExp, unknown[]][] = [
  [/SELECT device_id AS id FROM devices\s+WHERE is_demo/, [{ id: 11 }, { id: 12 }]],
  [/m\.is_demo AND \(\$1::int IS NULL OR m\.created_by = \$1\)\s+AND NOT EXISTS/, [{ id: 5 }]],
  [/m\.is_demo AND \(\$1::int IS NULL OR m\.created_by = \$1\)\s+AND EXISTS/, [{ id: 6 }]],
  [/SELECT DISTINCT x\.id/, [{ id: 7 }, { id: 6 }]],
  [/^\s*SELECT id::text AS id, "userId" FROM ownerships/, [{ id: 'o1', userId: 9 }, { id: 'o2', userId: 3 }]],
  [/FROM repair_journeys/, [{ id: 'j1', userId: '9', record: 'r1' }, { id: 'j2', userId: null, record: null }]],
  [/^\s*SELECT id::text AS id, "submittedByUserId"/, [{ id: 'r1', submittedBy: '8' }, { id: 'r2', submittedBy: '9' }]],
  [/^\s*SELECT id::text AS id FROM tutorial_subscriptions/, [{ id: 's1' }]],
  [/SELECT id::text AS id, key, false AS model FROM device_photos/, [
    { id: 'p1', key: 'devices/11/a.jpg', model: false },
    { id: 'p2', key: 'device-models/5/b.jpg', model: true },
  ]],
];

describe('DemoDataService', () => {
  let service: DemoDataService;
  let query: jest.Mock;
  let manager: any;
  let assignment: any;
  let labels: any;
  let modelIndex: any;
  let deviceSearch: any;

  const writes = () =>
    query.mock.calls
      .map(([sql]) => String(sql).trim())
      .filter((sql) => /^(DELETE|UPDATE)/.test(sql))
      .map((sql) => sql.split(/\s+/).slice(0, 3).join(' '));

  beforeEach(() => {
    query = jest.fn(async (sql: string) => ROWS.find(([re]) => re.test(sql))?.[1] ?? []);
    manager = { query };
    const devices = { manager: { transaction: jest.fn((work) => work(manager)), query } };
    assignment = { rules: jest.fn(async () => ({ resellerBrands: [] })), refreshModels: jest.fn() };
    labels = { labelModels: jest.fn() };
    modelIndex = { reindex: jest.fn() };
    deviceSearch = { removeDevice: jest.fn() };
    service = new DemoDataService(devices as any, assignment, labels, modelIndex, deviceSearch);
  });

  it('counts what would go without removing anything', async () => {
    const { report, photoKeys } = await service.purge([9], ['Contrib@Demo.test'], true);

    expect(report).toEqual({
      variants: 2,
      models: 1,
      adoptedModels: 1,
      photos: 2,
      touchedModels: 2,
      ownerships: 2,
      // o2 belongs to user 3, not a contributor.
      realOwnerships: 1,
      journeys: 2,
      // j2 has no user: a guest's.
      realJourneys: 1,
      records: 2,
      // r1 was submitted by user 8.
      realRecords: 1,
      subscriptions: 1,
    });
    expect(photoKeys).toEqual([]);
    expect(writes()).toEqual([]);
    expect(assignment.refreshModels).not.toHaveBeenCalled();
    expect(modelIndex.reindex).not.toHaveBeenCalled();
  });

  it('finds what names demo data through the contributors and what goes', async () => {
    await service.purge([9], ['Contrib@Demo.test'], true);
    const params = (re: RegExp) => query.mock.calls.find(([sql]) => re.test(sql))![1];

    expect(params(/FROM ownerships/)).toEqual([[9], [11, 12], [5]]);
    // Journeys keep user ids as text, and also go with an ownership that goes.
    expect(params(/FROM repair_journeys/)).toEqual([['9'], [11, 12], [5], ['o1', 'o2']]);
    expect(params(/FROM repair_records/)).toEqual([['9'], ['r1']]);
    // A contributor's own subscriptions are known by their email.
    expect(params(/FROM tutorial_subscriptions/)).toEqual([[5], [11, 12], ['contrib@demo.test']]);
    // An adopted model is touched, never doomed.
    // The whole purge: no author.
    expect(params(/SELECT DISTINCT x\.id/)).toEqual([[5], [6], null]);
    expect(params(/SELECT device_id AS id FROM devices/)).toEqual([null]);
  });

  it('removes, what names a row before the row, in one transaction', async () => {
    const { photoKeys } = await service.purge([9], ['Contrib@Demo.test'], false);

    expect(writes()).toEqual([
      'DELETE FROM repair_records',
      'DELETE FROM repair_journeys',
      'DELETE FROM tutorial_subscriptions',
      'DELETE FROM ownerships',
      // No category is taken from a model: its variants only ever had its own.
      'DELETE FROM device_photos',
      'DELETE FROM device_model_photos',
      'DELETE FROM devices',
      'DELETE FROM device_models',
      'UPDATE device_models SET',
    ]);
    const params = (re: RegExp) => query.mock.calls.find(([sql]) => re.test(sql))![1];
    expect(params(/DELETE FROM repair_records/)).toEqual([['r1', 'r2']]);
    expect(params(/DELETE FROM devices/)).toEqual([[11, 12]]);
    // The photos whose keys were read, no more.
    expect(params(/DELETE FROM device_photos/)).toEqual([['p1']]);
    expect(params(/DELETE FROM device_model_photos/)).toEqual([['p2']]);
    expect(params(/DELETE FROM device_models m/)).toEqual([[5]]);
    // Unless a real variant joined it meanwhile.
    expect(query.mock.calls.find(([sql]) => /DELETE FROM device_models m/.test(sql))![0]).toContain('NOT d.is_demo');
    expect(params(/UPDATE device_models SET is_demo = false/)).toEqual([[6]]);
    // The real models are recomputed within the same transaction.
    expect(assignment.refreshModels).toHaveBeenCalledWith({ resellerBrands: [] }, [7, 6], manager);
    expect(photoKeys).toEqual(['devices/11/a.jpg', 'device-models/5/b.jpg']);
  });

  it('brings the indexes along once the rows are gone', async () => {
    await service.purge([9], ['Contrib@Demo.test'], false);

    expect(labels.labelModels).toHaveBeenCalledWith([7, 6]);
    // Reindexing a model no longer there removes its document.
    expect(modelIndex.reindex).toHaveBeenCalledWith([7, 6, 5]);
    expect(deviceSearch.removeDevice).toHaveBeenCalledWith('11');
    expect(deviceSearch.removeDevice).toHaveBeenCalledWith('12');
  });

  it('gives the keys back even when the indexes cannot follow', async () => {
    labels.labelModels.mockRejectedValue(new Error('lock timeout'));
    const { photoKeys } = await service.purge([9], ['Contrib@Demo.test'], false);
    // The rows are gone: a second run could not name these files again.
    expect(photoKeys).toEqual(['devices/11/a.jpg', 'device-models/5/b.jpg']);
  });

  it('leaves the indexes alone when the transaction fails', async () => {
    query.mockImplementation(async (sql: string) => {
      if (/^\s*DELETE FROM devices/.test(sql)) throw new Error('deadlock detected');
      return ROWS.find(([re]) => re.test(sql))?.[1] ?? [];
    });
    await expect(service.purge([9], ['Contrib@Demo.test'], false)).rejects.toThrow('deadlock detected');
    expect(modelIndex.reindex).not.toHaveBeenCalled();
    expect(deviceSearch.removeDevice).not.toHaveBeenCalled();
  });

  it("counts one contributor's share by the same rules, removing nothing", async () => {
    const report = await service.statsOf(9, 'Contrib@Demo.test');
    const params = (re: RegExp) => query.mock.calls.find(([sql]) => re.test(sql))![1];

    expect(report.variants).toBe(2);
    // Only what that account entered, and what names it.
    expect(params(/SELECT device_id AS id FROM devices/)).toEqual([9]);
    expect(params(/m\.is_demo AND \(\$1::int IS NULL OR m\.created_by = \$1\)\s+AND NOT EXISTS/)).toEqual([9]);
    expect(params(/SELECT DISTINCT x\.id/)).toEqual([[5], [6], 9]);
    expect(params(/FROM ownerships/)).toEqual([[9], [11, 12], [5]]);
    expect(params(/FROM tutorial_subscriptions/)).toEqual([[5], [11, 12], ['contrib@demo.test']]);
    expect(writes()).toEqual([]);
  });

  describe('DemoDataController', () => {
    it("gives one contributor's share", async () => {
      const statsOf = jest.spyOn(service, 'statsOf').mockResolvedValue({ variants: 2 } as any);
      const controller = new DemoDataController(service);
      expect(await controller.demoStatsOfContributor({ contributorId: 9, email: 'a@b.c' })).toEqual({ variants: 2 });
      expect(statsOf).toHaveBeenCalledWith(9, 'a@b.c');
      statsOf.mockRejectedValueOnce(new Error('connection reset'));
      await expect(controller.demoStatsOfContributor({ contributorId: 9, email: 'a@b.c' })).rejects.toThrow(
        'connection reset',
      );
    });

    it('previews unless told plainly not to', async () => {
      const purge = jest.spyOn(service, 'purge').mockResolvedValue({ report: {} as any, photoKeys: [] });
      const controller = new DemoDataController(service);

      await controller.purgeDemoCatalogue({ contributorIds: [9] } as any);
      expect(purge).toHaveBeenLastCalledWith([9], [], true);
      await controller.purgeDemoCatalogue({ contributorIds: [9], contributorEmails: ['a@b.c'], dryRun: false });
      expect(purge).toHaveBeenLastCalledWith([9], ['a@b.c'], false);
    });

    it('keeps a failure\'s message for the gateway', async () => {
      jest.spyOn(service, 'purge').mockRejectedValue(new Error('deadlock detected'));
      const controller = new DemoDataController(service);
      await expect(controller.purgeDemoCatalogue({ contributorIds: [], dryRun: false })).rejects.toThrow(
        'deadlock detected',
      );
    });
  });
});
