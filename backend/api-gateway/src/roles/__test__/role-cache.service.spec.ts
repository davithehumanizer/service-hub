/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NEVER, of, throwError } from 'rxjs';
import { RoleCacheService } from '../role-cache.service';

const guest = { name: 'guest', permissions: [{ name: 'repairers.read' }] };

describe('RoleCacheService', () => {
  let send: jest.Mock;
  let service: RoleCacheService;

  beforeEach(() => {
    send = jest.fn();
    service = new RoleCacheService({ send } as any);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('loads the guest role at boot and serves it from the cache', async () => {
    send.mockReturnValue(of(guest));
    await service.onModuleInit();

    await expect(service.getGuestRole()).resolves.toBe(guest);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('loads it on the next request when user-management was down at boot', async () => {
    send.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));
    await service.onModuleInit();

    send.mockReturnValue(of(guest));
    await expect(service.getGuestRole()).resolves.toBe(guest);
    await expect(service.getGuestRole()).resolves.toBe(guest);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('answers undefined while user-management stays down', async () => {
    send.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
    await service.onModuleInit();

    await expect(service.getGuestRole()).resolves.toBeUndefined();
  });

  it('shares one attempt between guests asking at the same time', async () => {
    send.mockReturnValue(of(guest));

    const [a, b] = await Promise.all([
      service.getGuestRole(),
      service.getGuestRole(),
    ]);

    expect(a).toBe(guest);
    expect(b).toBe(guest);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('gives up on a user-management that never answers', async () => {
    jest.useFakeTimers();
    send.mockReturnValue(NEVER);

    const pending = service.getGuestRole();
    jest.advanceTimersByTime(5000);

    await expect(pending).resolves.toBeUndefined();
  });
});
