import { Test, TestingModule } from '@nestjs/testing';
import { SparePartsService } from '../spare-parts.service';
import { of } from 'rxjs';

describe('SparePartsService', () => {
  let service: SparePartsService;

  const mockClientProxy = {
    send: jest.fn().mockReturnValue(of({ hits: [], estimatedTotalHits: 0 })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparePartsService,
        {
          provide: 'SPARE_PARTS_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<SparePartsService>(SparePartsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should call SPARE_PARTS_SERVICE with spare-parts-search command', async () => {
      const result = await service.search({ q: 'battery' });
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'spare-parts-search' },
        { q: 'battery' },
      );
      expect(result).toEqual({ hits: [], estimatedTotalHits: 0 });
    });
  });

  describe('list', () => {
    it('should call SPARE_PARTS_SERVICE with spare-parts-list command', async () => {
      const result = await service.list({ offset: 0, limit: 20 });
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'spare-parts-list' },
        { offset: 0, limit: 20 },
      );
      expect(result).toEqual({ hits: [], estimatedTotalHits: 0 });
    });
  });

  describe('multiSearch', () => {
    it('should call SPARE_PARTS_SERVICE with spare-parts-multi-search command', async () => {
      const result = await service.multiSearch('iPhone');
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'spare-parts-multi-search' },
        { q: 'iPhone' },
      );
      expect(result).toEqual({ hits: [], estimatedTotalHits: 0 });
    });
  });
});
