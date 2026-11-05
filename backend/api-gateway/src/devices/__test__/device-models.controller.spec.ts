import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { DeviceModelsController } from '../controllers/device-models.controller';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';
import { StorageService } from 'src/storage/storage.service';
import { photosUploadOptions } from 'src/common/upload.constraints';

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
    await expect(controller.getModel(9, {})).rejects.toEqual(
      new HttpException('Device model 9 not found', HttpStatus.NOT_FOUND),
    );
  });

  it('reads the parts asked for as key and value, a value keeping its colons', async () => {
    devices.send.mockReturnValue(of({}));

    await controller.getModel(877165, {
      parts: ['storage:256 GB', 'processor:Core i7:1185G7', 'nothing'],
      variant: 1067188,
    });

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
    await controller.createModel(model, res as never);
    expect(res.status).not.toHaveBeenCalled();

    devices.send.mockReturnValue(of({ created: false, model: { id: 877165 } }));
    await controller.createModel(model, res as never);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('answers an unusable model with 400', async () => {
    devices.send.mockReturnValue(
      refuse('A device model needs a brand and a name'),
    );
    await expect(
      controller.createModel({ brand: 'Acme', name: '--' }, {} as never),
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
      controller.uploadPhotos(9, [file] as never),
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

    await controller.uploadPhotos(9, [file] as never);

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

  it('leaves deleting a photo to administrators', () => {
    expect(Reflect.getMetadata('permissions', controller.deletePhoto)).toEqual([
      'device.photos.admin',
    ]);
  });

  it('removes the files stored when another failed to store', async () => {
    storage.uploadFile
      .mockResolvedValueOnce({ url: 'u', key: 'device-models/9/a' })
      .mockRejectedValueOnce(new Error('disk full'));
    const file = { buffer: Buffer.from(''), mimetype: 'image/png' };

    await expect(
      controller.uploadPhotos(9, [file, file] as never),
    ).rejects.toThrow('disk full');

    expect(storage.deleteFile).toHaveBeenCalledWith('device-models/9/a');
    expect(devices.send).not.toHaveBeenCalled();
  });

  it('refuses an upload without file', async () => {
    await expect(controller.uploadPhotos(9, [])).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
    expect(devices.send).not.toHaveBeenCalled();
  });

  it('deletes a photo of this model, then its file', async () => {
    devices.send.mockReturnValue(of({ key: 'device-models/9/a' }));

    expect(await controller.deletePhoto(9, 'p')).toEqual({ success: true });

    expect(devices.send).toHaveBeenCalledWith(
      { cmd: 'delete_device_model_photo' },
      { modelId: 9, photoId: 'p' },
    );
    expect(storage.deleteFile).toHaveBeenCalledWith('device-models/9/a');
  });
});
