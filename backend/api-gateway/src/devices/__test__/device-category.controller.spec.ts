/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceCategoryController } from '../controllers/device-category.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { throwError } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';

describe('DeviceCategoryController', () => {
  let controller: DeviceCategoryController;
  const mockClient = { send: jest.fn() } as unknown as ClientProxy;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [DeviceCategoryController],
      providers: [{ provide: 'DEVICES_SERVICE', useValue: mockClient }],
    });

    // Guards used by the controller require other providers in the app; override them
    // so we can test the controller in isolation.
    const module: TestingModule = await moduleBuilder
      .overrideGuard(FlexibleAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DeviceCategoryController>(DeviceCategoryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call get all categories', async () => {
    (mockClient.send as jest.Mock).mockReturnValue(of(['c']));
    const res = await controller.findAll();
    expect(res).toEqual(['c']);
  });

  it('should call get one category', async () => {
    (mockClient.send as jest.Mock).mockReturnValue(of({ id: 1, name: 'c' }));
    const res = await controller.findOne(1 as any);
    expect(res).toEqual({ id: 1, name: 'c' });
    expect(mockClient.send).toHaveBeenCalledWith(
      { cmd: 'get_device_category' },
      { id: 1 },
    );
  });

  it('should call get one category by URN', async () => {
    (mockClient.send as jest.Mock).mockReturnValue(
      of({ id: 1, name: 'c', urn: 'urn:care2repair:category:1' }),
    );
    const res = await controller.findByUrn('urn:care2repair:category:1');
    expect(res).toEqual({
      id: 1,
      name: 'c',
      urn: 'urn:care2repair:category:1',
    });
    expect(mockClient.send).toHaveBeenCalledWith(
      { cmd: 'get_device_category_by_urn' },
      { urn: 'urn:care2repair:category:1' },
    );
  });

  it('should call get categories by UNUkey', async () => {
    (mockClient.send as jest.Mock).mockReturnValue(
      of([{ id: 1, name: 'c', unukey: 'TEST_KEY' }]),
    );
    const res = await controller.findByUnukey('TEST_KEY');
    expect(res).toEqual([{ id: 1, name: 'c', unukey: 'TEST_KEY' }]);
    expect(mockClient.send).toHaveBeenCalledWith(
      { cmd: 'get_device_category_by_unukey' },
      { unukey: 'TEST_KEY' },
    );
  });

  it('should call create category', async () => {
    (mockClient.send as jest.Mock).mockReturnValue(of({ id: 2, name: 'new' }));
    const res = await controller.create({ name: 'new' } as any);
    expect(res).toEqual({ id: 2, name: 'new' });
    expect(mockClient.send).toHaveBeenCalledWith(
      { cmd: 'create_device_category' },
      { name: 'new' },
    );
  });

  it('should call update and remove category', async () => {
    (mockClient.send as jest.Mock).mockImplementation((pattern, payload) => {
      if (pattern.cmd === 'update_device_category')
        return of({ id: payload.id, name: payload.name });
      if (pattern.cmd === 'delete_device_category') return of(null);
      return of(null);
    });

    const updated = await controller.update(3 as any, { name: 'upd' } as any);
    expect(updated).toEqual({ id: 3, name: 'upd' });

    const removed = await controller.remove(3 as any);
    expect(removed).toEqual({ deleted: true });
    expect(mockClient.send).toHaveBeenCalledWith(
      { cmd: 'delete_device_category' },
      { id: 3 },
    );
  });

  describe('error paths', () => {
    it('findAll should throw HttpException on error', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(controller.findAll()).rejects.toThrow(HttpException);
    });

    it('findOne should throw HttpException on error', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(controller.findOne(10 as any)).rejects.toThrow(
        HttpException,
      );
    });

    it('findByUrn should throw HttpException on error', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(
        controller.findByUrn('urn:care2repair:category:1'),
      ).rejects.toThrow(HttpException);
    });

    it('findByUnukey should throw HttpException on error', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(controller.findByUnukey('TEST_KEY')).rejects.toThrow(
        HttpException,
      );
    });

    it('create should throw HttpException on error', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(controller.create({ name: 'x' } as any)).rejects.toThrow(
        HttpException,
      );
    });

    it('update should throw HttpException on error', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(
        controller.update(11 as any, { name: 'y' } as any),
      ).rejects.toThrow(HttpException);
    });

    it('remove should throw HttpException on error', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      await expect(controller.remove(12 as any)).rejects.toThrow(HttpException);
    });
  });

  describe('error paths – no message (covers || fallback branch)', () => {
    it('findAll falls back to default message when error has no message', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(throwError(() => ({})));
      await expect(controller.findAll()).rejects.toThrow(
        'Failed to get categories',
      );
    });

    it('findOne falls back to default message when error has no message', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(throwError(() => ({})));
      await expect(controller.findOne(1 as any)).rejects.toThrow(
        'Failed to get category',
      );
    });

    it('findByUrn falls back to default message when error has no message', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(throwError(() => ({})));
      await expect(controller.findByUrn('x')).rejects.toThrow(
        'Failed to get category by URN',
      );
    });

    it('findByUnukey falls back to default message when error has no message', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(throwError(() => ({})));
      await expect(controller.findByUnukey('x')).rejects.toThrow(
        'Failed to get category by UNUkey',
      );
    });

    it('create falls back to default message when error has no message', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(throwError(() => ({})));
      await expect(controller.create({ name: 'x' } as any)).rejects.toThrow(
        'Failed to create category',
      );
    });

    it('update falls back to default message when error has no message', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(throwError(() => ({})));
      await expect(
        controller.update(1 as any, { name: 'x' } as any),
      ).rejects.toThrow('Failed to update category');
    });

    it('remove falls back to default message when error has no message', async () => {
      (mockClient.send as jest.Mock).mockReturnValue(throwError(() => ({})));
      await expect(controller.remove(1 as any)).rejects.toThrow(
        'Failed to delete category',
      );
    });
  });
});
