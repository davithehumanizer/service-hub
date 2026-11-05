/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { SparePartsAdapterService } from '../spare-parts.service';
import { PartsFinderApiService } from '../parts-finder-api.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { Logger } from '@nestjs/common';

const BASE_URL = 'https://search.spc-e6.cris-tech.io';
const SPAREPART_INDEX = 'app_prod_data_subdomain_sparepart';

describe('SparePartsAdapterService', () => {
  let service: SparePartsAdapterService;
  let httpService: HttpService;
  let partsFinderApi: PartsFinderApiService;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparePartsAdapterService,
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
        {
          // Detail reads go to the API first; returning null here keeps these
          // tests on the Meilisearch fallback they were written for.
          provide: PartsFinderApiService,
          useValue: { getSparePart: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'MEILISEARCH_URL') return BASE_URL;
              if (key === 'MEILISEARCH_SEARCH_TOKEN') return 'test-token';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SparePartsAdapterService>(SparePartsAdapterService);
    httpService = module.get<HttpService>(HttpService);
    partsFinderApi = module.get<PartsFinderApiService>(PartsFinderApiService);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // search()
  // ---------------------------------------------------------------------------
  describe('search', () => {
    const mockSearchResult = {
      hits: [{ objectID: 'abc', model: { name: 'IronWolf' } }],
      estimatedTotalHits: 1,
      offset: 0,
      limit: 20,
    };

    it('should call the Meilisearch search endpoint with merged query terms', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: mockSearchResult } as any));

      const result = await service.search({
        q: 'IronWolf',
        brand: 'Seagate',
        offset: 0,
        limit: 20,
      });

      expect(httpService.post).toHaveBeenCalledWith(
        `${BASE_URL}/indexes/${SPAREPART_INDEX}/search`,
        expect.objectContaining({ q: 'IronWolf Seagate', offset: 0, limit: 20 }),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should merge brand and category into the query string', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: mockSearchResult } as any));

      await service.search({ q: 'disk', brand: 'Seagate', category: 'HDD' });

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ q: 'disk Seagate HDD' }),
        expect.any(Object),
      );
    });

    it('should use an empty string when no query terms are provided', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: mockSearchResult } as any));

      await service.search({});

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ q: '' }),
        expect.any(Object),
      );
    });

    it('should return a safe fallback and log error on HTTP failure', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.search({ q: 'test' });

      expect(result).toEqual({
        hits: [],
        estimatedTotalHits: 0,
        offset: 0,
        limit: 20,
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getById()
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    const mockId = '019d1fdf-24d2-75dc-aeba-d4eb25a61879';
    const mockHit = { objectID: mockId, model: { name: 'IronWolf 10 To' } };

    it('should search by ID and return the matching hit', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { hits: [mockHit] } } as any));

      const result = await service.getById({ id: mockId });

      expect(httpService.post).toHaveBeenCalledWith(
        `${BASE_URL}/indexes/${SPAREPART_INDEX}/search`,
        { q: mockId, limit: 5 },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
      expect(result).toEqual(mockHit);
    });

    it('should return null rather than a different part when no objectID matches', async () => {
      // Meilisearch tokenises the UUID and can answer with near-misses. Handing
      // one back would render a detail page for a part nobody asked for.
      const otherHit = { objectID: 'other-id', model: { name: 'Other Part' } };
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { hits: [otherHit] } } as any));

      const result = await service.getById({ id: mockId });

      expect(result).toBeNull();
    });

    it('should prefer the API and not touch the search index', async () => {
      const fromApi = { '@id': `/spare_parts/${mockId}`, mediaObjects: [] };
      jest
        .spyOn(partsFinderApi, 'getSparePart')
        .mockResolvedValue(fromApi as any);
      const post = jest.spyOn(httpService, 'post');

      const result = await service.getById({ id: mockId });

      expect(result).toEqual(fromApi);
      expect(post).not.toHaveBeenCalled();
    });

    it('should return null when the hits array is empty', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { hits: [] } } as any));

      const result = await service.getById({ id: mockId });

      expect(result).toBeNull();
    });

    it('should fail, not answer "not found", when the index cannot be reached', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('403 Forbidden')));

      await expect(service.getById({ id: mockId })).rejects.toBeInstanceOf(
        RpcException,
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // list()
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('should delegate to search() with an empty query', async () => {
      const searchSpy = jest
        .spyOn(service, 'search')
        .mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      await service.list({ offset: 10, limit: 5 });

      expect(searchSpy).toHaveBeenCalledWith({ q: '', offset: 10, limit: 5 });
    });

    it('should use default offset and limit when not provided', async () => {
      const searchSpy = jest
        .spyOn(service, 'search')
        .mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      await service.list({});

      expect(searchSpy).toHaveBeenCalledWith({
        q: '',
        offset: undefined,
        limit: undefined,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // searchByDevice()
  // ---------------------------------------------------------------------------
  describe('searchByDevice', () => {
    const deviceDoc = (
      objectID: string,
      brandName: string,
      modelName: string,
    ) => ({
      objectID,
      model: { name: modelName, brand: { name: brandName } },
    });

    it('should filter parts on the device once brand and model both match', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(
          of({
            data: { hits: [deviceDoc('dev-1', 'Bosch', 'BGL8PET2')] },
          } as any),
        )
        .mockReturnValueOnce(
          of({ data: { hits: [{ objectID: 'sp-1' }] } } as any),
        );

      const result = await service.searchByDevice({
        brand: 'Bosch',
        model: 'BGL8PET2',
      });

      expect(result.hits).toHaveLength(1);
      expect(httpService.post).toHaveBeenLastCalledWith(
        `${BASE_URL}/indexes/${SPAREPART_INDEX}/search`,
        expect.objectContaining({ filter: 'device.id = "dev-1"' }),
        expect.anything(),
      );
    });

    it('should skip a hit of the same brand but a different appliance', async () => {
      // The defect this guards: Meilisearch ranks by relevance and never
      // refuses, so "Samsung Galaxy S23" came back with a Samsung television
      // whose power board was then offered as a part for the phone.
      jest.spyOn(httpService, 'post').mockReturnValueOnce(
        of({
          data: { hits: [deviceDoc('dev-tv', 'Samsung', 'UE50TU7025')] },
        } as any),
      );

      const result = await service.searchByDevice({
        brand: 'Samsung',
        model: 'Galaxy S23',
      });

      expect(result).toEqual({
        hits: [],
        estimatedTotalHits: 0,
        offset: 0,
        limit: 20,
      });
      // No second call: nothing is fetched for a device we could not identify,
      // and in particular not the brand's other parts.
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should take the matching hit even when it is not ranked first', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(
          of({
            data: {
              hits: [
                deviceDoc('dev-tv', 'Samsung', 'UE50TU7025'),
                deviceDoc('dev-phone', 'Samsung', 'Galaxy S23'),
              ],
            },
          } as any),
        )
        .mockReturnValueOnce(of({ data: { hits: [] } } as any));

      await service.searchByDevice({ brand: 'Samsung', model: 'Galaxy S23' });

      expect(httpService.post).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ filter: 'device.id = "dev-phone"' }),
        expect.anything(),
      );
    });

    it('should ignore case and punctuation when comparing', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(
          of({
            data: { hits: [deviceDoc('dev-1', 'Sharp', 'ES-NFB914AWNA-FR')] },
          } as any),
        )
        .mockReturnValueOnce(of({ data: { hits: [] } } as any));

      await service.searchByDevice({
        brand: 'sharp',
        model: 'es nfb914awna fr',
      });

      expect(httpService.post).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ filter: 'device.id = "dev-1"' }),
        expect.anything(),
      );
    });

    it('should return nothing when the device index answers with no hit', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(of({ data: { hits: [] } } as any));

      const result = await service.searchByDevice({
        brand: 'Miele',
        model: 'G5000',
      });

      expect(result.estimatedTotalHits).toBe(0);
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should return a safe fallback and log error on HTTP failure', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('boom')));

      const result = await service.searchByDevice({
        brand: 'Bosch',
        model: 'BGL8PET2',
      });

      expect(result).toEqual({
        hits: [],
        estimatedTotalHits: 0,
        offset: 0,
        limit: 20,
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // multiSearch()
  // ---------------------------------------------------------------------------
  describe('multiSearch', () => {
    const mockMultiResult = {
      results: [
        { indexUid: SPAREPART_INDEX, hits: [] },
        { indexUid: 'app_prod_data_subdomain_device', hits: [] },
        { indexUid: 'app_prod_data_subdomain_repairer', hits: [] },
      ],
    };

    it('should query all 3 indexes with the provided query', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: mockMultiResult } as any));

      const result = await service.multiSearch({ q: 'seagate' });

      expect(httpService.post).toHaveBeenCalledWith(
        `${BASE_URL}/multi-search`,
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({ indexUid: 'app_prod_data_subdomain_sparepart', q: 'seagate' }),
            expect.objectContaining({ indexUid: 'app_prod_data_subdomain_device', q: 'seagate' }),
            expect.objectContaining({ indexUid: 'app_prod_data_subdomain_repairer', q: 'seagate' }),
          ]),
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockMultiResult);
    });

    it('should return empty results and log error on HTTP failure', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Timeout')));

      const result = await service.multiSearch({ q: 'seagate' });

      expect(result).toEqual({ results: [] });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Authorization header
  // ---------------------------------------------------------------------------
  describe('Authorization header', () => {
    it('should include the Bearer token in every search request', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { hits: [] } } as any));

      await service.search({ q: 'test' });

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });
});
