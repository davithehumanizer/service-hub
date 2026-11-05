import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { of, throwError } from 'rxjs';
import { SearchService } from '../search.service';

describe('SearchService', () => {
  let service: SearchService;

  const mockElasticsearchService = { search: jest.fn() };
  const devices = { send: jest.fn() };
  const spareParts = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ElasticsearchService, useValue: mockElasticsearchService },
        { provide: 'DEVICES_SERVICE', useValue: devices },
        { provide: 'SPARE_PARTS_SERVICE', useValue: spareParts },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('globalSearch', () => {
    it('gathers device models, repairers and spare parts', async () => {
      devices.send.mockReturnValue(
        of({
          data: [
            {
              id: 877165,
              brand: 'Samsung',
              name: 'Galaxy S23',
              thumbnail: '',
              categories: [{ id: 173, name: 'Smart Phone / Pager' }],
            },
          ],
        }),
      );
      mockElasticsearchService.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _index: 'repairers',
              _id: '2',
              _score: 8,
              _source: { name: 'Repair Shop', city: 'Paris' },
            },
          ],
        },
      });
      spareParts.send.mockReturnValue(
        of({ hits: [{ objectID: 'part-1', model: { name: 'OLED Screen' } }] }),
      );

      const results = await service.globalSearch('galaxy s23');

      expect(results.map((r) => r.type)).toEqual([
        'device-model',
        'repairer',
        'spare-part',
      ]);
      expect(results[0]).toEqual({
        id: '877165',
        type: 'device-model',
        title: 'Samsung Galaxy S23',
        subtitle: 'Smart Phone / Pager',
        thumbnail: undefined,
        link: '/app/model/877165',
      });
      expect(devices.send).toHaveBeenCalledWith(
        { cmd: 'get_device_models' },
        { query: { search: 'galaxy s23', limit: 5 } },
      );
      // Catalogue entries are no longer searched: only repairers in ES.
      expect(mockElasticsearchService.search.mock.calls[0][0].index).toBe(
        'repairers',
      );
      expect(results[1].link).toBe('/app/repairer/2');
    });

    it('opens a barcode searched for on its variant', async () => {
      devices.send.mockReturnValue(
        of({
          data: [{ id: 877165, brand: 'Samsung', name: 'Galaxy S23' }],
          variant: { device_id: 1120375 },
        }),
      );
      mockElasticsearchService.search.mockResolvedValue({ hits: { hits: [] } });
      spareParts.send.mockReturnValue(of({ hits: [] }));

      const [model] = await service.globalSearch('8721123002833');

      expect(model.link).toBe('/app/model/877165?variant=1120375');
    });

    it('leaves out a source that fails', async () => {
      devices.send.mockReturnValue(throwError(() => new Error('down')));
      mockElasticsearchService.search.mockRejectedValue(
        new Error('Search failed'),
      );
      spareParts.send.mockReturnValue(
        of({ hits: [{ objectID: 'part-1', model: { name: 'OLED Screen' } }] }),
      );

      const results = await service.globalSearch('test');

      expect(results.map((r) => r.type)).toEqual(['spare-part']);
    });

    it('answers nothing to an empty query', async () => {
      expect(await service.globalSearch('')).toEqual([]);
      expect(devices.send).not.toHaveBeenCalled();
    });
  });
});
