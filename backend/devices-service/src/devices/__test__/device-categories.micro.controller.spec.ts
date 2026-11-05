import { Test, TestingModule } from '@nestjs/testing';
import { DeviceCategoriesMicroController } from '../device-categories.micro.controller';
import { RpcException } from '@nestjs/microservices';

describe('DeviceCategoriesMicroController', () => {
  let controller: DeviceCategoriesMicroController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'Smartphone' }]),
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Smartphone' }),
      create: jest.fn().mockResolvedValue({ id: 1, name: 'Smartphone' }),
      update: jest.fn().mockResolvedValue({ id: 1, name: 'Tablet' }),
      remove: jest.fn().mockResolvedValue(undefined),
      findByUrn: jest.fn().mockResolvedValue({ id: 1, name: 'Smartphone' }),
      findByUnukey: jest
        .fn()
        .mockResolvedValue([{ id: 1, name: 'Smartphone' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceCategoriesMicroController],
      providers: [{ provide: 'IDeviceCategoryService', useValue: service }],
    }).compile();

    controller = module.get<DeviceCategoriesMicroController>(
      DeviceCategoriesMicroController,
    );
  });

  it('should return all categories', async () => {
    const res = await controller.getCategories();
    expect(res).toEqual([{ id: 1, name: 'Smartphone' }]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should return a category by id', async () => {
    const res = await controller.getCategory({ id: 1 });
    expect(res).toEqual({ id: 1, name: 'Smartphone' });
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('should return a category by URN', async () => {
    const res = await controller.getCategoryByUrn({
      urn: 'urn:care2repair:category:1',
    });
    expect(res).toEqual({ id: 1, name: 'Smartphone' });
    expect(service.findByUrn).toHaveBeenCalledWith(
      'urn:care2repair:category:1',
    );
  });

  it('should return categories by UNUkey', async () => {
    const res = await controller.getCategoryByUnukey({ unukey: 'TEST_KEY' });
    expect(res).toEqual([{ id: 1, name: 'Smartphone' }]);
    expect(service.findByUnukey).toHaveBeenCalledWith('TEST_KEY');
  });

  it('should create a category', async () => {
    const res = await controller.createCategory({ name: 'Smartphone' });
    expect(res).toEqual({ id: 1, name: 'Smartphone' });
    expect(service.create).toHaveBeenCalledWith('Smartphone');
  });

  it('should update a category', async () => {
    const res = await controller.updateCategory({ id: 1, name: 'Tablet' });
    expect(res).toEqual({ id: 1, name: 'Tablet' });
    expect(service.update).toHaveBeenCalledWith(1, 'Tablet');
  });

  it('should delete a category and return null', async () => {
    const res = await controller.deleteCategory({ id: 1 });
    expect(res).toBeNull();
    expect(service.remove).toHaveBeenCalledWith(1);
  });

  it('should throw RpcException when service throws', async () => {
    service.findAll.mockRejectedValue(new Error('boom'));
    await expect(controller.getCategories()).rejects.toThrow(RpcException);
  });
});
