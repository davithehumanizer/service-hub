import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { SparePartsController } from '../spare-parts.controller';
import { SparePartsService } from '../spare-parts.service';

describe('SparePartsController', () => {
  let controller: SparePartsController;

  const mockService = { getById: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SparePartsController],
      providers: [{ provide: SparePartsService, useValue: mockService }],
    }).compile();

    controller = module.get<SparePartsController>(SparePartsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return the part found', async () => {
      const part = { objectID: 'abc' };
      mockService.getById.mockResolvedValue(part);

      await expect(controller.getById('abc')).resolves.toEqual(part);
    });

    it('should answer 404 only when the catalogue has no such part', async () => {
      mockService.getById.mockResolvedValue(null);

      await expect(controller.getById('abc')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should answer 503, not 404, when the catalogue cannot be reached', async () => {
      mockService.getById.mockRejectedValue({
        message: 'Spare parts catalogue unreachable',
        status: 503,
      });

      await expect(controller.getById('abc')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
