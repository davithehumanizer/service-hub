import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { RepairerSearchService } from '../repairer-search.service';

describe('RepairerSearchService', () => {
  let service: RepairerSearchService;
  let elasticsearchService: ElasticsearchService;

  const mockElasticsearchService = {
    index: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairerSearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
      ],
    }).compile();

    service = module.get<RepairerSearchService>(RepairerSearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('indexRepairer', () => {
    it('should index a repairer with correct fields', async () => {
      const repairer = {
        repairer_id: 1,
        name: 'John Doe Repairs',
        description: 'Quality repairs',
        city: 'Brussels',
        country: 'BE',
        logo_url: 'logo.png',
        rating: 4.5,
      };

      await service.indexRepairer(repairer);

      expect(elasticsearchService.index).toHaveBeenCalledWith({
        index: 'repairers',
        id: '1',
        document: {
          name: 'John Doe Repairs',
          description: 'Quality repairs',
          city: 'Brussels',
          country: 'BE',
          countryName: 'Belgium',
          category: 'Repairer',
          logo_url: 'logo.png',
          rating: 4.5,
          repairer_id: 1,
        },
      });
    });
  });

  describe('removeRepairer', () => {
    it('should delete a repairer from the index', async () => {
      await service.removeRepairer('1');
      expect(elasticsearchService.delete).toHaveBeenCalledWith({
        index: 'repairers',
        id: '1',
      });
    });
  });
  describe('searchRepairersPaginated', () => {
    it('should search repairers with correct query', async () => {
      const hits = [{ _id: '1', _source: { name: 'Test' } }];
      (elasticsearchService.search as jest.Mock).mockResolvedValue({
        hits: {
          hits,
          total: { value: 1 },
        },
      });

      const result = await service.searchRepairersPaginated('query', 0, 10);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: 'repairers',
        from: 0,
        size: 10,
        track_total_hits: true,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: 'query',
                  fields: ['name^3', 'description', 'city^2', 'countryName'],
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
      });
      expect(result).toEqual({ hits, total: 1 });
    });

    it('should search all repairers if query is empty', async () => {
      (elasticsearchService.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      });

      await service.searchRepairersPaginated('', 0, 10);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: 'repairers',
        from: 0,
        size: 10,
        track_total_hits: true,
        query: {
          bool: {
            must: [{ match_all: {} }],
          },
        },
      });
    });
  });
});
