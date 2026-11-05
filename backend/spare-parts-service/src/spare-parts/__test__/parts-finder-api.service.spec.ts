/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PartsFinderApiService } from '../parts-finder-api.service';

const API_URL = 'https://api.spareparts.care2repair.eu';
const PART_ID = '019d1fdf-24d2-75dc-aeba-d4eb25a61879';

const config = (overrides: Record<string, string> = {}) => ({
  get: jest.fn((key: string, defaultValue?: string) => {
    const values: Record<string, string> = {
      PARTSFINDER_API_URL: API_URL,
      PARTSFINDER_CLIENT_ID: 'client',
      PARTSFINDER_CLIENT_SECRET: 'secret',
      ...overrides,
    };
    return values[key] ?? defaultValue;
  }),
});

describe('PartsFinderApiService', () => {
  let httpService: HttpService;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  const build = async (
    overrides: Record<string, string> = {},
  ): Promise<PartsFinderApiService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsFinderApiService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        { provide: ConfigService, useValue: config(overrides) },
      ],
    }).compile();

    httpService = module.get<HttpService>(HttpService);

    return module.get<PartsFinderApiService>(PartsFinderApiService);
  };

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  const tokenReply = (expiresIn = 3600) =>
    of({ data: { access_token: 'a-token', expires_in: expiresIn } } as any);

  it('returns null and warns when no client credentials are configured', async () => {
    const service = await build({
      PARTSFINDER_CLIENT_ID: '',
      PARTSFINDER_CLIENT_SECRET: '',
    });

    expect(service.configured).toBe(false);
    await expect(service.getSparePart(PART_ID)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    expect(httpService.get).not.toHaveBeenCalled();
  });

  it('fetches a token, then the part, and returns it in the shared shape', async () => {
    const service = await build();
    const part = {
      '@id': `/spare_parts/${PART_ID}`,
      id: PART_ID,
      mediaObjects: [{ url: 'https://data.example/media/1', mimeType: 'image/jpeg' }],
    };

    jest.spyOn(httpService, 'post').mockReturnValue(tokenReply());
    jest.spyOn(httpService, 'get').mockReturnValue(of({ data: part } as any));

    const result = await service.getSparePart(PART_ID);

    // objectID is the point of the mapping: the API never sends it, and every
    // consumer downstream keys off it.
    expect(result).toMatchObject({
      objectID: PART_ID,
      mediaObjects: [
        { url: 'https://data.example/media/1', mimeType: 'image/jpeg' },
      ],
    });
    expect(httpService.post).toHaveBeenCalledWith(
      `${API_URL}/oauth2/token`,
      expect.stringContaining('grant_type=client_credentials'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(httpService.get).toHaveBeenCalledWith(
      `${API_URL}/spare_parts/${PART_ID}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer a-token' }),
      }),
    );
  });

  it('reuses a valid token across calls', async () => {
    const service = await build();
    jest.spyOn(httpService, 'post').mockReturnValue(tokenReply());
    jest.spyOn(httpService, 'get').mockReturnValue(of({ data: {} } as any));

    await service.getSparePart(PART_ID);
    await service.getSparePart(PART_ID);

    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a token that is about to expire', async () => {
    const service = await build();
    // Inside the 60s of slack the service keeps, so it must ask again.
    jest.spyOn(httpService, 'post').mockReturnValue(tokenReply(30));
    jest.spyOn(httpService, 'get').mockReturnValue(of({ data: {} } as any));

    await service.getSparePart(PART_ID);
    await service.getSparePart(PART_ID);

    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it('returns null and logs when the API fails', async () => {
    const service = await build();
    jest.spyOn(httpService, 'post').mockReturnValue(tokenReply());
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(throwError(() => new Error('boom')));

    await expect(service.getSparePart(PART_ID)).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('drops the cached token after a 401 so the next call mints a new one', async () => {
    const service = await build();
    jest.spyOn(httpService, 'post').mockReturnValue(tokenReply());
    jest.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => ({
        message: 'Unauthorized',
        response: { status: 401, data: { detail: 'expired' } },
      })),
    );

    await service.getSparePart(PART_ID);
    await service.getSparePart(PART_ID);

    expect(httpService.post).toHaveBeenCalledTimes(2);
  });
});
