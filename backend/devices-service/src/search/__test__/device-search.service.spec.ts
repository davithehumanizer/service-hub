import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { DeviceSearchService } from '../device-search.service';

describe('DeviceSearchService', () => {
  let service: DeviceSearchService;
  let elasticsearchService: ElasticsearchService;

  const mockElasticsearchService = {
    index: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    bulk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceSearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
      ],
    }).compile();

    service = module.get<DeviceSearchService>(DeviceSearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('indexDevice', () => {
    it('should index a device with all enriched fields', async () => {
      const device = {
        device_id: 1,
        brand: 'Samsung',
        model: 'S21',
        device_type: 'Smartphone',
        description: 'Test description',
        ean: '123456789',
        serial_number: 'SN123',
        product_code: 'PC123',
        categories: [{ name: 'Mobile' }, { name: 'Tech' }],
        informationalProperties: [
          { property_name: 'Image_ThumbPic', property_value: 'thumb.jpg' },
        ],
      };

      await service.indexDevice(device);

      expect(elasticsearchService.index).toHaveBeenCalledWith({
        index: 'devices',
        id: '1',
        document: {
          title: 'Samsung S21',
          brand: 'Samsung',
          model: 'S21',
          category: 'Smartphone',
          description: 'Test description',
          ean: '123456789',
          serial_number: 'SN123',
          product_code: 'PC123',
          category_names: ['Mobile', 'Tech'],
          thumbnail: 'thumb.jpg',
          device_id: 1,
        },
      });
    });
  });

  describe('searchDevicesPaginated', () => {
    it('should call elasticsearch search with correct params', async () => {
      mockElasticsearchService.search.mockResolvedValue({
        hits: {
          total: { value: 100 },
          hits: [
            { _source: { device_id: 1, title: 'Device 1' } },
            { _source: { device_id: 2, title: 'Device 2' } },
          ],
        },
      });

      const result = await service.searchDevicesPaginated({
        page: 2,
        limit: 10,
        search: 'test',
      });

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'devices',
          from: 10,
          size: 10,
          track_total_hits: true,
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: 'test',
                    fields: [
                      'title^3',
                      'brand^2',
                      'model^2',
                      'category',
                      'ean',
                      'serial_number',
                      'product_code',
                      'category_names',
                    ],
                    fuzziness: 'AUTO',
                  },
                },
              ],
              should: [
                {
                  multi_match: {
                    query: 'test',
                    fields: [
                      'title^3',
                      'brand^2',
                      'model^2',
                      'category',
                      'ean',
                      'serial_number',
                      'product_code',
                      'category_names',
                    ],
                    boost: 2,
                  },
                },
              ],
            },
          },
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          total: 100,
          data: [
            { device_id: 1, title: 'Device 1' },
            { device_id: 2, title: 'Device 2' },
          ],
        }),
      );
    });

    it('should return empty results if no hits', async () => {
      mockElasticsearchService.search.mockResolvedValue({
        hits: {
          total: 0,
          hits: [],
        },
      });

      const result = await service.searchDevicesPaginated({
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should use match_phrase on title field when strict=true', async () => {
      mockElasticsearchService.search.mockResolvedValue({
        hits: {
          total: { value: 2 },
          hits: [
            { _source: { device_id: 1, title: 'HP 290 G3' } },
            { _source: { device_id: 2, title: 'HP 290 G3 MT' } },
          ],
        },
      });

      await service.searchDevicesPaginated({
        page: 1,
        limit: 10,
        search: 'HP 290 G3',
        strict: true,
      });

      expect(mockElasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ match_phrase: { title: 'HP 290 G3' } }],
              should: [],
            },
          },
        }),
      );
    });

    it('should generate multiple multi_match clauses for multi-word query', async () => {
      mockElasticsearchService.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [{ _source: { device_id: 1, title: 'Samsung SM-A525F' } }],
        },
      });

      await service.searchDevicesPaginated({
        page: 1,
        limit: 10,
        search: 'Samsung SM',
      });

      const callArg = mockElasticsearchService.search.mock.calls[0][0];
      const mustClauses = callArg.query.bool.must;
      // "Samsung SM" splits into 2 keywords → 2 multi_match must clauses
      expect(mustClauses).toHaveLength(2);
      expect(mustClauses[0].multi_match.query).toBe('Samsung');
      expect(mustClauses[1].multi_match.query).toBe('SM');
    });
  });

  describe('bulkIndexDevices', () => {
    it('should bulk index multiple devices', async () => {
      const devices = [
        {
          device_id: 1,
          brand: 'Samsung',
          model: 'S21',
          device_type: 'Smartphone',
        },
        {
          device_id: 2,
          brand: 'Apple',
          model: 'iPhone 13',
          device_type: 'Smartphone',
        },
      ];

      mockElasticsearchService.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: {} }, { index: {} }],
      });

      const result = await service.bulkIndexDevices(devices);

      expect(elasticsearchService.bulk).toHaveBeenCalledWith({
        operations: expect.any(Array),
        refresh: false,
      });
      expect(result).toEqual({ indexed: 2, errors: 0 });
    });

    it('should handle partial errors in bulk indexing', async () => {
      const devices = [
        {
          device_id: 1,
          brand: 'Samsung',
          model: 'S21',
          device_type: 'Smartphone',
        },
        {
          device_id: 2,
          brand: 'Apple',
          model: 'iPhone 13',
          device_type: 'Smartphone',
        },
      ];

      mockElasticsearchService.bulk.mockResolvedValue({
        errors: true,
        items: [
          { index: { _id: '1' } },
          { index: { _id: '2', error: { reason: 'Test error' } } },
        ],
      });

      const result = await service.bulkIndexDevices(devices);

      expect(result).toEqual({ indexed: 1, errors: 1 });
    });

    it('should return 0 if no devices provided', async () => {
      const result = await service.bulkIndexDevices([]);
      expect(result).toEqual({ indexed: 0, errors: 0 });
      expect(elasticsearchService.bulk).not.toHaveBeenCalled();
    });
  });

  describe('removeDevice', () => {
    it('should delete a device from the index', async () => {
      await service.removeDevice('1');
      expect(elasticsearchService.delete).toHaveBeenCalledWith({
        index: 'devices',
        id: '1',
      });
    });
  });
});
