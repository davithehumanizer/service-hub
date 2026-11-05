import { RpcException } from '@nestjs/microservices';
import { DeviceModelsController } from '../device-models.controller';
import { ModelsService } from '../models.service';

describe('DeviceModelsController', () => {
  const models = {
    searchModels: jest.fn(),
    getModel: jest.fn(),
    lookup: jest.fn(),
    getModels: jest.fn(),
    getVariants: jest.fn(),
    createModel: jest.fn(),
    addModelPhotos: jest.fn(),
    deleteModelPhoto: jest.fn(),
  };
  const controller = new DeviceModelsController(
    models as unknown as ModelsService,
  );

  it('takes the category names as they are, commas included', async () => {
    const categories = ['Flat Display Panel Television (LCD, LED, Plasma)'];
    await controller.searchModels({
      query: { search: 'bravia', categories },
      locale: 'fr',
    });
    expect(models.searchModels).toHaveBeenCalledWith({
      search: 'bravia',
      categories,
      locale: 'fr',
    });
  });

  it('passes the page of variants asked for', async () => {
    await controller.getModel({ id: 953560, page: 2, limit: 50 });
    expect(models.getModel).toHaveBeenCalledWith(953560, {
      page: 2,
      limit: 50,
      locale: undefined,
    });
  });

  it('reads several models at once', async () => {
    await controller.getModels({ ids: [3, 1], locale: 'fr' });
    expect(models.getModels).toHaveBeenCalledWith([3, 1], 'fr');
  });

  it('reads several variants at once', async () => {
    await controller.getVariants({ ids: [7, 9] });
    expect(models.getVariants).toHaveBeenCalledWith([7, 9]);
  });

  it('sends a failure back as an RPC error', async () => {
    models.lookup.mockRejectedValue(new Error('No device model for 0000'));
    await expect(controller.lookup({ code: '0000' })).rejects.toEqual(
      new RpcException('No device model for 0000'),
    );
  });

  it('passes a model to create, its photos and a photo to delete', async () => {
    const model = { brand: 'Fairphone', name: 'Fairphone 5' };
    await controller.createModel({ model, locale: 'fr' });
    expect(models.createModel).toHaveBeenCalledWith(model, 'fr');

    const photoUrls = [{ url: 'u.jpg', key: 'k' }];
    await controller.addModelPhotos({ modelId: 5, photoUrls });
    expect(models.addModelPhotos).toHaveBeenCalledWith(5, photoUrls);

    await controller.deleteModelPhoto({ modelId: 5, photoId: 'p' });
    expect(models.deleteModelPhoto).toHaveBeenCalledWith(5, 'p');
  });
});
