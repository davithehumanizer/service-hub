import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../search.controller';
import { SearchService } from '../search.service';
import { GlobalSearchResultDto } from '../dto/global-search-result.dto';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: SearchService;

  const mockSearchService = {
    globalSearch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('globalSearch', () => {
    it('should return results from search service', async () => {
      const mockResults: GlobalSearchResultDto[] = [
        {
          id: '1',
          type: 'device-model',
          title: 'Apple iPhone 13',
          subtitle: 'Smart Phone / Pager',
          thumbnail: 'iphone.jpg',
          link: '/app/model/1',
          score: 10,
        },
        {
          id: '2',
          type: 'repairer',
          title: 'Quick Fix',
          subtitle: 'Paris',
          thumbnail: 'logo.png',
          link: '/app/repairer/2',
          score: 8,
        },
      ];
      mockSearchService.globalSearch.mockResolvedValue(mockResults);

      const result = await controller.globalSearch('iphone');

      expect(mockSearchService.globalSearch).toHaveBeenCalledWith('iphone');
      expect(result).toEqual(mockResults);
    });

    it('should return empty array when no results found', async () => {
      mockSearchService.globalSearch.mockResolvedValue([]);
      const result = await controller.globalSearch('nonexistent');
      expect(result).toEqual([]);
    });

    it('should pass undefined query to service', async () => {
      mockSearchService.globalSearch.mockResolvedValue([]);
      await controller.globalSearch(undefined as any);
      expect(mockSearchService.globalSearch).toHaveBeenCalledWith(undefined);
    });
  });
});
