/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SparePartsAdapterController } from '../spare-parts.controller';
import { SparePartsAdapterService } from '../spare-parts.service';

describe('SparePartsAdapterController', () => {
  let controller: SparePartsAdapterController;
  let service: SparePartsAdapterService;

  const mockService = {
    search: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    multiSearch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SparePartsAdapterController],
      providers: [
        { provide: SparePartsAdapterService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SparePartsAdapterController>(SparePartsAdapterController);
    service = module.get<SparePartsAdapterService>(SparePartsAdapterService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // search  →  cmd: spare-parts-search
  // ---------------------------------------------------------------------------
  describe('search', () => {
    it('should forward the payload to SparePartsAdapterService.search', async () => {
      const payload = { q: 'IronWolf', brand: 'Seagate', offset: 0, limit: 10 };
      const mockResult = { hits: [], estimatedTotalHits: 0 };
      mockService.search.mockResolvedValue(mockResult);

      const result = await controller.search(payload);

      expect(service.search).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResult);
    });

    it('should work with an empty payload', async () => {
      mockService.search.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      await controller.search({});

      expect(service.search).toHaveBeenCalledWith({});
    });
  });

  // ---------------------------------------------------------------------------
  // getById  →  cmd: spare-parts-get-by-id
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('should forward the id to SparePartsAdapterService.getById', async () => {
      const payload = { id: '019d1fdf-24d2-75dc-aeba-d4eb25a61879' };
      const mockHit = { objectID: payload.id, model: { name: 'IronWolf 10 To' } };
      mockService.getById.mockResolvedValue(mockHit);

      const result = await controller.getById(payload);

      expect(service.getById).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockHit);
    });

    it('should return null when the service returns null', async () => {
      mockService.getById.mockResolvedValue(null);

      const result = await controller.getById({ id: 'unknown-id' });

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // list  →  cmd: spare-parts-list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('should forward offset and limit to SparePartsAdapterService.list', async () => {
      const payload = { offset: 20, limit: 10 };
      const mockResult = { hits: [], estimatedTotalHits: 0 };
      mockService.list.mockResolvedValue(mockResult);

      const result = await controller.list(payload);

      expect(service.list).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResult);
    });

    it('should work with an empty payload', async () => {
      mockService.list.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      await controller.list({});

      expect(service.list).toHaveBeenCalledWith({});
    });
  });

  // ---------------------------------------------------------------------------
  // multiSearch  →  cmd: spare-parts-multi-search
  // ---------------------------------------------------------------------------
  describe('multiSearch', () => {
    it('should forward the query to SparePartsAdapterService.multiSearch', async () => {
      const payload = { q: 'seagate hdd' };
      const mockResult = { results: [] };
      mockService.multiSearch.mockResolvedValue(mockResult);

      const result = await controller.multiSearch(payload);

      expect(service.multiSearch).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResult);
    });
  });
});
