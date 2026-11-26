import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { DeviceModelsController } from '../controllers/device-models.controller';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';
import { StorageService } from 'src/storage/storage.service';
import { photosUploadOptions } from 'src/common/upload.constraints';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDeviceModelDto } from '../dto/create-device-model.dto';
import {
  DeviceModelVariantInputDto,
  NewDeviceModelVariantDto,
} from '../dto/device-model-variant.dto';

describe('DeviceModelsController', () => {
  let controller: DeviceModelsController;
  const devices = { send: jest.fn() };
  const storage = { uploadFile: jest.fn(), deleteFile: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceModelsController],
      providers: [
        { provide: 'DEVICES_SERVICE', useValue: devices },
        { provide: StorageService, useValue: storage },
        mockAuthService(),
        { provide: RoleCacheService, useValue: { getGuestRole: jest.fn() } },
      ],
    }).compile();
    controller = module.get(DeviceModelsController);
  });

  // What a ClientProxy gets for an RpcException thrown in devices-service.
  const refuse = (message: string) =>
    throwError(() => ({ status: 'error', message }));
  const admin = { user: { id: 1, role: { name: 'admin' } } };
  const contributor = { user: { id: 42, role: { name: 'contributor' } } };

  it('says to the reader what they may change', async () => {
    devices.send.mockReturnValue(of({}));
    await controller.getModel(9, {}, admin);
    expect(devices.send.mock.calls[0][1].viewer).toEqual({
      created_by: 1,
      is_demo: false,
      admin: true,
    });
  });

  it("adds a variant with its author, naming the model a known code is", async () => {
    devices.send.mockReturnValue(of({ device_id: 8 }));
    const variant = { ean: '2000000000017' };
    expect(await controller.addVariant(592, variant, contributor)).toEqual({
      device_id: 8,
    });
    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'add_device_model_variant' },
      {
        modelId: 592,
        variant,
        author: { created_by: 42, is_demo: true },
      },
    );

    devices.send.mockReturnValue(
      refuse('2000000000017 is already in the catalogue, model 77'),
    );
    const refused = await controller
      .addVariant(592, variant, contributor)
      .catch((e: HttpException) => e);
    expect(refused).toBeInstanceOf(HttpException);
    expect((refused as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
    expect((refused as HttpException).getResponse()).toMatchObject({
      modelId: 77,
    });
  });

  it('changes a model as its editor, 403 for another, 409 naming the model', async () => {
    devices.send.mockReturnValue(of({ id: 592 }));
    await controller.updateModel(592, { name: 'Blender 4000' }, contributor);
    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'update_device_model' },
      {
        modelId: 592,
        changes: { name: 'Blender 4000' },
        editor: { created_by: 42, is_demo: true, admin: false },
      },
    );

    devices.send.mockReturnValue(
      refuse('Only its author or an administrator may change this model'),
    );
    await expect(
      controller.updateModel(592, { name: 'X' }, contributor),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });

    devices.send.mockReturnValue(refuse('Model 12 already has this name'));
    const refused = await controller
      .updateModel(592, { name: 'Galaxy S23' }, contributor)
      .catch((e: HttpException) => e);
    expect((refused as HttpException).getResponse()).toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      modelId: 12,
    });
  });

  it('changes a variant of a model as its editor', async () => {
    devices.send.mockReturnValue(of({ device_id: 8 }));
    const changes = {
      technicalProperties: [{ property_name: 'Width', property_value: '300' }],
    };
    await controller.updateVariant(592, 8, changes, admin);
    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'update_device_model_variant' },
      {
        modelId: 592,
        variantId: 8,
        changes,
        editor: { created_by: 1, is_demo: false, admin: true },
      },
    );
  });

  it('refuses a variant with neither barcode nor reference with 400', async () => {
    devices.send.mockReturnValue(
      refuse('A variant needs a barcode or a reference'),
    );
    await expect(
      controller.addVariant(592, {}, contributor),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('searches models in the language asked for', async () => {
    devices.send.mockReturnValue(of({ data: [] }));
    const query = { search: 'galaxy s23', page: 1, limit: 10 };

    await controller.searchModels(query, 'fr-FR,fr;q=0.9');

    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'get_device_models' },
      { query, locale: 'fr' },
    );
  });

  it('answers an unknown model with 404', async () => {
    devices.send.mockReturnValue(refuse('Device model 9 not found'));
    await expect(controller.getModel(9, {}, {})).rejects.toEqual(
      new HttpException('Device model 9 not found', HttpStatus.NOT_FOUND),
    );
  });

  it('reads the parts asked for as key and value, a value keeping its colons', async () => {
    devices.send.mockReturnValue(of({}));

    await controller.getModel(
      877165,
      {
        parts: ['storage:256 GB', 'processor:Core i7:1185G7', 'nothing'],
        variant: 1067188,
      },
      {},
    );

    expect(devices.send.mock.calls[0][1]).toMatchObject({
      id: 877165,
      parts: { storage: '256 GB', processor: 'Core i7:1185G7' },
      variant: 1067188,
    });
  });

  it('answers an unknown code with 404', async () => {
    devices.send.mockReturnValue(refuse('No device model for 0000'));
    await expect(controller.lookup({ code: '0000' })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('answers 201 for a model created, 200 for one that existed', async () => {
    const res = { status: jest.fn() };
    const model = { brand: 'Samsung', name: 'Galaxy S23' };

    devices.send.mockReturnValue(of({ created: true, model: { id: 1 } }));
    await controller.createModel(model, {}, res as never);
    expect(res.status).not.toHaveBeenCalled();

    devices.send.mockReturnValue(of({ created: false, model: { id: 877165 } }));
    await controller.createModel(model, {}, res as never);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it("sends who creates a model: a contributor's is demonstration data", async () => {
    devices.send.mockReturnValue(of({ created: true, model: { id: 1 } }));
    const req = { user: { id: 42, role: { name: 'contributor' } } };

    await controller.createModel({ brand: 'Acme', name: 'Blender 3000' }, req, {
      status: jest.fn(),
    } as never);

    expect(devices.send.mock.calls[0][1].author).toEqual({
      created_by: 42,
      is_demo: true,
    });
  });

  it("refuses a contributor's code: 400 not starting with 2, 409 known", async () => {
    devices.send.mockReturnValue(
      refuse('A demonstration barcode starts with 2'),
    );
    await expect(
      controller.createModel({ brand: 'A', name: 'B' }, {}, {} as never),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });

    devices.send.mockReturnValue(
      refuse('2000000000017 is already in the catalogue'),
    );
    await expect(
      controller.createModel({ brand: 'A', name: 'B' }, {}, {} as never),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it('sends who uploads the photos of a model', async () => {
    storage.uploadFile.mockResolvedValue({ url: 'u', key: 'k' });
    devices.send.mockReturnValue(of([]));
    const req = { user: { id: 42, role: { name: 'user' } } };

    await controller.uploadPhotos(9, [{ mimetype: 'image/png' }] as never, req);

    expect(devices.send.mock.calls[0][1].author).toEqual({
      created_by: 42,
      is_demo: false,
    });
  });

  describe('a source', () => {
    const withPermission = {
      user: { id: 1, role: { name: 'admin', permissions: [{ name: 'device.source.set' }] } },
    };
    const without = {
      user: { id: 7, role: { name: 'user', permissions: [{ name: 'device.create' }] } },
    };
    const client = { client: { id: 'acme_data' }, scope: 'device.create device.source.set' };
    const model = { brand: 'Fairphone', name: 'Fairphone 5', source: 'ACME_DATA' };

    it('is sent on by a caller allowed to name it, a user or an OAuth2 client', async () => {
      devices.send.mockReturnValue(of({ created: true, model: { id: 1 } }));
      await controller.createModel(model, withPermission, { status: jest.fn() } as never);
      expect(devices.send.mock.calls[0][1].model.source).toBe('ACME_DATA');

      devices.send.mockReturnValue(of({ device_id: 8 }));
      await controller.addVariant(592, { ean: '8718819372424', source: 'ACME_DATA' }, client);
      expect(devices.send.mock.calls[1][1].variant.source).toBe('ACME_DATA');
    });

    it('answers 403 to anyone else, before anything is created', async () => {
      await expect(
        controller.createModel(model, without, {} as never),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      await expect(
        controller.addVariant(592, { ean: '1', source: 'ACME_DATA' }, contributor),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      await expect(
        controller.addVariant(592, { source: 'ACME_DATA' }, { client: { id: 'x' }, scope: 'device.create' }),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      expect(devices.send).not.toHaveBeenCalled();
    });

    it('is a capitalised name, never one the catalogue writes itself', async () => {
      const errors = async (type: any, body: object) =>
        (await validate(plainToInstance(type, body) as object)).length;
      const base = { brand: 'A', name: 'B' };
      expect(await errors(CreateDeviceModelDto, { ...base, source: 'ACME_DATA' })).toBe(0);
      expect(await errors(CreateDeviceModelDto, { ...base, source: 'ACME_DATA_2' })).toBe(0);
      for (const source of ['acme_data', 'F', '2ACME', 'ACME-DATA', 'A'.repeat(33), 'MANUAL', 'ICECAT', 'UNKNOWN']) {
        expect(await errors(CreateDeviceModelDto, { ...base, source })).toBe(1);
      }
      expect(await errors(NewDeviceModelVariantDto, { ean: '8718819372424', source: 'ICECAT' })).toBe(1);
      // A variant's changes never carry one, stripped as the global pipe
      // strips what its DTO does not name: its source is set once.
      const changes = plainToInstance(DeviceModelVariantInputDto, { source: 'ACME_DATA' });
      await validate(changes as object, { whitelist: true });
      expect((changes as any).source).toBeUndefined();
    });
  });

  it('answers an unusable model with 400', async () => {
    devices.send.mockReturnValue(
      refuse('A device model needs a brand and a name'),
    );
    await expect(
      controller.createModel({ brand: 'Acme', name: '--' }, {}, {} as never),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('stores the photos under the model, and removes them if refused', async () => {
    storage.uploadFile.mockResolvedValue({
      url: 'u',
      key: 'device-models/9/a',
    });
    devices.send.mockReturnValue(refuse('Device model 9 not found'));
    const file = { buffer: Buffer.from(''), originalname: 'a.jpg' };

    await expect(
      controller.uploadPhotos(9, [file] as never, {}),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

    expect(storage.uploadFile.mock.calls[0][1].folder).toBe('device-models/9');
    expect(storage.deleteFile).toHaveBeenCalledWith('device-models/9/a');
  });

  it('names a stored photo after its type, never after the name sent', async () => {
    storage.uploadFile.mockResolvedValue({ url: 'u', key: 'k' });
    devices.send.mockReturnValue(of([]));
    const file = {
      buffer: Buffer.from(''),
      originalname: 'x.html',
      mimetype: 'image/png',
    };

    await controller.uploadPhotos(9, [file] as never, {});

    expect(storage.uploadFile.mock.calls[0][1].filename).toMatch(/\.png$/);
  });

  it('takes JPEG, PNG or WebP photos only, of 10 MB at most', () => {
    const accepts = (mimetype: string) =>
      new Promise((resolve) =>
        photosUploadOptions.fileFilter!(
          {} as never,
          { mimetype } as never,
          (error, accepted) => resolve(error ? false : accepted),
        ),
      );
    expect(photosUploadOptions.limits).toEqual({
      fileSize: 10 * 1024 * 1024,
      files: 10,
    });
    return Promise.all([
      expect(accepts('image/webp')).resolves.toBe(true),
      expect(accepts('text/html')).resolves.toBe(false),
    ]);
  });

  it('lets whoever may upload a photo ask to delete one', () => {
    expect(Reflect.getMetadata('permissions', controller.deletePhoto)).toEqual([
      'device.photos.upload',
    ]);
  });

  it('removes the files stored when another failed to store', async () => {
    storage.uploadFile
      .mockResolvedValueOnce({ url: 'u', key: 'device-models/9/a' })
      .mockRejectedValueOnce(new Error('disk full'));
    const file = { buffer: Buffer.from(''), mimetype: 'image/png' };

    await expect(
      controller.uploadPhotos(9, [file, file] as never, {}),
    ).rejects.toThrow('disk full');

    expect(storage.deleteFile).toHaveBeenCalledWith('device-models/9/a');
    expect(devices.send).not.toHaveBeenCalled();
  });

  it('refuses an upload without file', async () => {
    await expect(controller.uploadPhotos(9, [], {})).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
    expect(devices.send).not.toHaveBeenCalled();
  });

  it('deletes a photo of this model, then its file', async () => {
    devices.send.mockReturnValue(of({ key: 'device-models/9/a' }));

    expect(await controller.deletePhoto(9, 'p', admin)).toEqual({
      success: true,
    });

    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'delete_device_model_photo' },
      {
        modelId: 9,
        photoId: 'p',
        editor: { created_by: 1, is_demo: false, admin: true },
      },
    );
    expect(storage.deleteFile).toHaveBeenCalledWith('device-models/9/a');
  });
});
