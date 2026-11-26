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
    addVariant: jest.fn(),
    updateModel: jest.fn(),
    updateVariant: jest.fn(),
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
    const author = { created_by: 42, is_demo: true };
    await controller.createModel({ model, locale: 'fr', author });
    expect(models.createModel).toHaveBeenCalledWith(model, 'fr', author);

    const photoUrls = [{ url: 'u.jpg', key: 'k' }];
    await controller.addModelPhotos({ modelId: 5, photoUrls, author });
    expect(models.addModelPhotos).toHaveBeenCalledWith(5, photoUrls, author);

    const editor = { ...author, admin: false };
    await controller.deleteModelPhoto({ modelId: 5, photoId: 'p', editor });
    expect(models.deleteModelPhoto).toHaveBeenCalledWith(5, 'p', editor);
  });

  it('passes a variant to add, and the changes of a model or a variant', async () => {
    const author = { created_by: 42, is_demo: true };
    const editor = { ...author, admin: false };
    const variant = { ean: '2000000000017' };

    await controller.addVariant({ modelId: 3, variant, author });
    expect(models.addVariant).toHaveBeenCalledWith(3, variant, author);

    await controller.updateModel({
      modelId: 3,
      changes: { name: 'X' },
      editor,
    });
    expect(models.updateModel).toHaveBeenCalledWith(3, { name: 'X' }, editor);

    await controller.updateVariant({
      modelId: 3,
      variantId: 8,
      changes: variant,
      editor,
    });
    expect(models.updateVariant).toHaveBeenCalledWith(3, 8, variant, editor);
  });

  it('sends a refused change back as an RPC error', async () => {
    models.updateModel.mockRejectedValue(
      new Error('Model 12 already has this name'),
    );
    await expect(
      controller.updateModel({
        modelId: 3,
        changes: {},
        editor: { created_by: 1, is_demo: false, admin: true },
      }),
    ).rejects.toEqual(new RpcException('Model 12 already has this name'));
    models.addVariant.mockRejectedValue(new Error(''));
    await expect(
      controller.addVariant({ modelId: 3, variant: {} }),
    ).rejects.toEqual(new RpcException('Failed to add the variant'));
    models.updateVariant.mockRejectedValue(new Error(''));
    await expect(
      controller.updateVariant({
        modelId: 3,
        variantId: 8,
        changes: {},
        editor: { created_by: 1, is_demo: false, admin: true },
      }),
    ).rejects.toEqual(new RpcException('Failed to update the variant'));
  });
});
