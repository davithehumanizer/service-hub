/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceCategoryController } from '../controllers/device-category.controller';
import { IDeviceCategoryService } from '../interfaces/device-category-service.interface';

describe('DeviceCategoryController', () => {
  let controller: DeviceCategoryController;
  let service: IDeviceCategoryService;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'Smartphone' }]),
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Smartphone' }),
      create: jest.fn().mockResolvedValue({ id: 1, name: 'Smartphone' }),
      update: jest.fn().mockResolvedValue({ id: 1, name: 'Tablet' }),
      remove: jest.fn().mockResolvedValue(undefined),
      findByUrn: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Smartphone',
        urn: 'urn:care2repair:category:1',
      }),
      findByUnukey: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Smartphone', unukey: 'TEST_KEY' }),
      findByName: jest.fn().mockResolvedValue({ id: 1, name: 'Smartphone' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceCategoryController],
      providers: [{ provide: 'IDeviceCategoryService', useValue: service }],
    }).compile();
    controller = module.get<DeviceCategoryController>(DeviceCategoryController);
  });

  it('should return all categories', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([{ id: 1, name: 'Smartphone' }]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should return one category', async () => {
    const result = await controller.findOne(1);
    expect(result).toEqual({ id: 1, name: 'Smartphone' });
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('should return one category by URN', async () => {
    const result = await controller.findByUrn('urn:care2repair:category:1');
    expect(result).toEqual({
      id: 1,
      name: 'Smartphone',
      urn: 'urn:care2repair:category:1',
    });
    expect(service.findByUrn).toHaveBeenCalledWith(
      'urn:care2repair:category:1',
    );
  });

  it('should create a category', async () => {
    const result = await controller.create('Smartphone');
    expect(result).toEqual({ id: 1, name: 'Smartphone' });
    expect(service.create).toHaveBeenCalledWith('Smartphone');
  });

  it('should update a category', async () => {
    const result = await controller.update(1, 'Tablet');
    expect(result).toEqual({ id: 1, name: 'Tablet' });
    expect(service.update).toHaveBeenCalledWith(1, 'Tablet', undefined);
  });

  it('should update a category with an ifixit_wikiid', async () => {
    const result = await controller.update(1, 'Tablet', 'iPad_Pro');
    expect(result).toEqual({ id: 1, name: 'Tablet' });
    expect(service.update).toHaveBeenCalledWith(1, 'Tablet', 'iPad_Pro');
  });

  it('should remove a category', async () => {
    const result = await controller.remove(1);
    expect(result).toEqual({ deleted: true });
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});
