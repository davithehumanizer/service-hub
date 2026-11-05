import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeviceCategoryServiceProvider } from '../providers/device-category-service.provider';
import { IDeviceCategoryService } from '../interfaces/device-category-service.interface';
import { DeviceCategory } from '../../entity/device-category.entity';
import { Repository } from 'typeorm';

describe('DeviceCategoryService', () => {
  let service: IDeviceCategoryService;
  let repo: Repository<DeviceCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceCategoryServiceProvider,
        {
          provide: getRepositoryToken(DeviceCategory),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<IDeviceCategoryService>('IDeviceCategoryService');
    repo = module.get<Repository<DeviceCategory>>(
      getRepositoryToken(DeviceCategory),
    );
  });

  it('should create a category', async () => {
    jest
      .spyOn(repo, 'create')
      .mockReturnValue({ name: 'Smartphone' } as DeviceCategory);
    jest
      .spyOn(repo, 'save')
      .mockResolvedValue({ id: 1, name: 'Smartphone' } as DeviceCategory);
    const result = await service.create('Smartphone');
    expect(result).toEqual({ id: 1, name: 'Smartphone' });
  });

  it('should find a category by URN', async () => {
    const category = {
      id: 1,
      name: 'Smartphone',
      urn: 'urn:care2repair:category:1',
    } as DeviceCategory;
    jest.spyOn(repo, 'findOne').mockResolvedValue(category);
    const result = await service.findByUrn('urn:care2repair:category:1');
    expect(result).toEqual(category);
  });

  it('should find a category by UNUkey', async () => {
    const category = {
      id: 1,
      name: 'Smartphone',
      unukey: 'TEST_KEY',
    } as DeviceCategory;
    jest.spyOn(repo, 'find').mockResolvedValue([category]);
    const result = await service.findByUnukey('TEST_KEY');
    expect(result).toEqual([category]);
  });

  it('should update a category', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 1, name: 'Smartphone' } as DeviceCategory);
    jest
      .spyOn(repo, 'save')
      .mockResolvedValue({ id: 1, name: 'Tablet' } as DeviceCategory);
    const result = await service.update(1, 'Tablet');
    expect(result).toEqual({ id: 1, name: 'Tablet' });
  });

  it('should update a category with an ifixit_wikiid', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 1, name: 'Smartphone' } as DeviceCategory);
    const saveSpy = jest.spyOn(repo, 'save').mockResolvedValue({
      id: 1,
      name: 'Tablet',
      ifixit_wikiid: 'iPad_Pro',
    } as DeviceCategory);
    const result = await service.update(1, 'Tablet', 'iPad_Pro');
    expect(result).toEqual({
      id: 1,
      name: 'Tablet',
      ifixit_wikiid: 'iPad_Pro',
    });
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Tablet', ifixit_wikiid: 'iPad_Pro' }),
    );
  });

  it('should remove a category', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    jest.spyOn(repo, 'delete').mockResolvedValue({} as any);
    await expect(service.remove(1)).resolves.toBeUndefined();
  });
});
