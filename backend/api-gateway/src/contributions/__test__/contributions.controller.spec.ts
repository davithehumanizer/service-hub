import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { of, throwError } from 'rxjs';
import { ContributionsController } from '../contributions.controller';
import { ContributionsQueryDto, ContributorEntriesQueryDto } from '../contributions.dto';

describe('ContributionsController', () => {
  let devices: { send: jest.Mock };
  let controller: ContributionsController;

  beforeEach(() => {
    devices = { send: jest.fn(() => of({ items: [], total: 0 })) };
    controller = new ContributionsController(devices as any);
  });

  it("reads the signed-in user's entries, never someone else's", async () => {
    await controller.mine({ kind: 'models', offset: 20 }, { user: { id: 9, role: 'user' } });
    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'entries_of_author' },
      { authorId: 9, kind: 'models', offset: 20, limit: undefined },
    );
    // From an OAuth2 token, the user is `sub`.
    await controller.mine({ kind: 'variants' }, { user: { sub: '12' } });
    expect(devices.send).toHaveBeenLastCalledWith(
      { cmd: 'entries_of_author' },
      expect.objectContaining({ authorId: 12, kind: 'variants' }),
    );
  });

  it('answers 401 without a user', async () => {
    await expect(controller.mine({ kind: 'models' }, {})).rejects.toMatchObject({ status: 401 });
    expect(devices.send).not.toHaveBeenCalled();
  });

  it('answers 500 when the catalogue cannot be read', async () => {
    devices.send.mockReturnValue(throwError(() => new Error('connection reset')));
    await expect(controller.mine({ kind: 'models' }, { user: { id: 9 } })).rejects.toMatchObject({
      status: 500,
      message: 'connection reset',
    });
  });

  it('takes a known kind and a page within bounds', async () => {
    const errors = async (type: any, query: object) =>
      (await validate(plainToInstance(type, query) as object)).length;
    expect(await errors(ContributionsQueryDto, { kind: 'models', offset: '0', limit: '50' })).toBe(0);
    expect(await errors(ContributionsQueryDto, { kind: 'repairers' })).toBe(1);
    expect(await errors(ContributionsQueryDto, { kind: 'models', limit: '51' })).toBe(1);
    expect(await errors(ContributionsQueryDto, { kind: 'models', offset: '-1' })).toBe(1);
    expect(await errors(ContributorEntriesQueryDto, { kind: 'repairers' })).toBe(0);
  });
});
