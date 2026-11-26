import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { of, throwError } from 'rxjs';
import { DemoDataController } from '../demo-data.controller';
import { PurgeDemoDataDto } from '../demo-data.dto';

const CATALOGUE = {
  variants: 2,
  models: 1,
  adoptedModels: 0,
  photos: 2,
  touchedModels: 1,
  ownerships: 1,
  realOwnerships: 1,
  journeys: 0,
  realJourneys: 0,
  records: 0,
  realRecords: 0,
  subscriptions: 0,
};

describe('DemoDataController', () => {
  let users: { send: jest.Mock };
  let devices: { send: jest.Mock };
  let repairers: { send: jest.Mock };
  let storage: { deleteFile: jest.Mock };
  let controller: DemoDataController;
  let order: string[];

  beforeEach(() => {
    order = [];
    const client = (answers: Record<string, (payload: any) => unknown>) => ({
      send: jest.fn(({ cmd }, payload) => {
        order.push(`${cmd}${payload.dryRun === true ? '?' : ''}`);
        return of(answers[cmd](payload));
      }),
    });
    users = client({
      purge_contributors: () => ({ ids: [9, 12], emails: ['a@demo.test', 'b@demo.test'] }),
      revoke_contributor_sessions: () => ({ revoked: true }),
    });
    devices = client({
      purge_demo_catalogue: ({ dryRun }) => ({
        report: CATALOGUE,
        photoKeys: dryRun ? [] : ['devices/11/a.jpg', 'device-models/5/b.jpg'],
      }),
    });
    repairers = client({ purge_demo_repairers: () => ({ repairers: 3 }) });
    storage = { deleteFile: jest.fn() };
    controller = new DemoDataController(users as any, devices as any, repairers as any, storage as any);
  });

  it('previews, removing nothing', async () => {
    const report = await controller.preview();

    expect(report).toEqual({ accounts: 2, ...CATALOGUE, repairers: 3 });
    expect(order).toEqual(['purge_contributors?', 'purge_demo_catalogue?', 'purge_demo_repairers?']);
    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'purge_demo_catalogue' },
      { contributorIds: [9, 12], contributorEmails: ['a@demo.test', 'b@demo.test'], dryRun: true },
    );
    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  it('purges in order: sessions, what they entered, then the accounts it started with', async () => {
    const deleted: string[] = [];
    storage.deleteFile.mockImplementation(async (key: string) => {
      deleted.push(key);
      order.push('file');
    });
    const report = await controller.purge({ confirm: 'PURGE' });

    expect(order).toEqual([
      'purge_contributors?',
      'revoke_contributor_sessions',
      'purge_demo_catalogue',
      // At once: a second run would not name these files again.
      'file',
      'file',
      'purge_demo_repairers',
      'purge_contributors',
    ]);
    expect(users.send).toHaveBeenLastCalledWith(
      { cmd: 'purge_contributors' },
      { dryRun: false, ids: [9, 12] },
    );
    expect(storage.deleteFile).toHaveBeenCalledWith('devices/11/a.jpg');
    expect(storage.deleteFile).toHaveBeenCalledWith('device-models/5/b.jpg');
    expect(report).toEqual({ accounts: 2, ...CATALOGUE, repairers: 3, filesLeft: 0 });
  });

  it('counts a file it could not delete, and goes on', async () => {
    storage.deleteFile.mockRejectedValueOnce(new Error('AccessDenied'));
    const report = await controller.purge({ confirm: 'PURGE' });

    expect(report.filesLeft).toBe(1);
    expect(order[order.length - 1]).toBe('purge_contributors');
  });

  it('names the step it stopped at, and keeps the accounts until the rest is gone', async () => {
    repairers.send.mockReturnValue(throwError(() => new Error('lock timeout')));

    await expect(controller.purge({ confirm: 'PURGE' })).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('Purge stopped at repairers: lock timeout'),
    });
    expect(order).not.toContain('purge_contributors');
    // The catalogue went through: its files went with it.
    expect(storage.deleteFile).toHaveBeenCalledTimes(2);
  });

  it('says a failed preview removed nothing', async () => {
    repairers.send.mockReturnValue(throwError(() => new Error('lock timeout')));
    await expect(controller.preview()).rejects.toMatchObject({
      message: 'Preview failed at repairers: lock timeout. Nothing was removed.',
    });
  });

  describe("a contributor's page", () => {
    beforeEach(() => {
      users.send.mockImplementation(({ cmd }) =>
        of(
          cmd === 'get_contributors'
            ? [{ id: 9, email: 'a@demo.test', created_at: '2026-10-28', profile: { firstName: 'Ana', language: 'nl' } }]
            : null,
        ),
      );
      devices.send.mockReturnValue(of({ variants: 2 }));
      repairers.send.mockReturnValue(of({ repairers: 1 }));
    });

    it('gives the account and its share, by the same rules', async () => {
      expect(await controller.contributor(9)).toEqual({
        contributor: {
          id: 9,
          email: 'a@demo.test',
          firstName: 'Ana',
          lastName: null,
          language: 'nl',
          created_at: '2026-10-28',
        },
        catalogue: { variants: 2 },
        repairers: { repairers: 1 },
      });
      expect(devices.send).toHaveBeenCalledWith(
        { cmd: 'demo_stats_of_contributor' },
        { contributorId: 9, email: 'a@demo.test' },
      );
      expect(repairers.send).toHaveBeenCalledWith(
        { cmd: 'demo_repairer_stats_of_contributor' },
        { contributorId: 9 },
      );
    });

    it('answers 404 for an account that is not a contributor', async () => {
      await expect(controller.contributor(4)).rejects.toMatchObject({ status: 404 });
      await expect(controller.contributorEntries(4, { kind: 'models' })).rejects.toMatchObject({ status: 404 });
      expect(devices.send).not.toHaveBeenCalled();
    });

    it('lists its models or variants a page at a time', async () => {
      devices.send.mockReturnValue(of({ items: [{ id: 5 }], total: 1 }));
      expect(await controller.contributorEntries(9, { kind: 'variants', offset: 20, limit: 10 })).toEqual({
        items: [{ id: 5 }],
        total: 1,
      });
      expect(devices.send).toHaveBeenCalledWith(
        { cmd: 'entries_of_author' },
        { authorId: 9, kind: 'variants', offset: 20, limit: 10 },
      );
    });

    it('lists all its repairers, with their status', async () => {
      repairers.send.mockReturnValue(of([{ repairer_id: 'r1', status: 'pending' }]));
      expect(await controller.contributorEntries(9, { kind: 'repairers' })).toEqual({
        items: [{ repairer_id: 'r1', status: 'pending' }],
        total: 1,
      });
      expect(repairers.send).toHaveBeenCalledWith({ cmd: 'get_repairers_of_author' }, { authorId: 9 });
    });
  });

  it('wants the word typed', async () => {
    const errors = async (payload: object) =>
      (await validate(plainToInstance(PurgeDemoDataDto, payload) as object)).length;
    expect(await errors({ confirm: 'PURGE' })).toBe(0);
    expect(await errors({ confirm: 'purge' })).toBe(1);
    expect(await errors({})).toBe(1);
  });
});
