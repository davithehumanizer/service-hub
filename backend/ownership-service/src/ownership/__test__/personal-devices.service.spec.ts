import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Ownership } from '../ownership.entity';
import { PersonalDevicesService } from '../personal-devices.service';
import { PersonalDevicesController } from '../personal-devices.controller';

describe('PersonalDevicesService', () => {
  const repo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(async () => 0),
    create: jest.fn((d) => d),
    save: jest.fn(async (d) => d),
    remove: jest.fn(),
  };
  let service: PersonalDevicesService;
  let controller: PersonalDevicesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.count.mockResolvedValue(0);
    const module = await Test.createTestingModule({
      controllers: [PersonalDevicesController],
      providers: [
        PersonalDevicesService,
        { provide: getRepositoryToken(Ownership), useValue: repo },
      ],
    }).compile();
    service = module.get(PersonalDevicesService);
    controller = module.get(PersonalDevicesController);
  });

  it("lists a user's devices, the latest acquired first", async () => {
    await service.list(42);
    expect(repo.find).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: { acquiredAt: 'DESC', id: 'ASC' },
    });
  });

  it('reads nothing without an owner, which TypeORM would leave out', () => {
    expect(() => service.list(null as never)).toThrow('belongs to a user');
    expect(() => service.list(Number('abc'))).toThrow('belongs to a user');
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('adds a device of a model the user does not have', async () => {
    const added = await service.create(42, { modelId: 877165 });

    expect(repo.count).toHaveBeenCalledWith({
      where: { userId: 42, modelId: 877165 },
    });
    expect(added).toMatchObject({
      userId: 42,
      modelId: 877165,
      deviceId: null,
      nickname: null,
    });
    expect(added.acquiredAt).toBeInstanceOf(Date);
  });

  it('adds a second one of a model only when asked for', async () => {
    repo.count.mockResolvedValue(1);

    await expect(
      service.create(42, { modelId: 877165 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();

    await service.create(42, { modelId: 877165, another: true });
    expect(repo.save).toHaveBeenCalledTimes(1);
    // Asked for, not stored.
    expect(repo.create.mock.calls[0][0]).not.toHaveProperty('another');
  });

  it("does not find another user's device", async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.get('d', 7)).rejects.toThrow(
      'Personal device d not found',
    );
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'd', userId: 7 },
    });
  });

  it('changes only what is given, and can forget the variant', async () => {
    repo.findOne.mockResolvedValue({
      id: 'd',
      userId: 42,
      modelId: 1,
      deviceId: 10,
      nickname: 'Old',
      visualCondition: 'good',
    });

    const updated = await service.update('d', 42, {
      deviceId: null,
      visualCondition: 'fair',
      nickname: undefined,
    });

    expect(updated).toMatchObject({
      modelId: 1,
      deviceId: null,
      nickname: 'Old',
      visualCondition: 'fair',
    });
  });

  it('removes a device of its owner only', async () => {
    repo.findOne.mockResolvedValue({ id: 'd', userId: 42 });
    expect(await service.remove('d', 42)).toEqual({ success: true });
    expect(repo.remove).toHaveBeenCalled();
  });

  it('passes a refusal on as an RPC error, and a date as a date', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(controller.get({ id: 'd', userId: 7 })).rejects.toEqual(
      new RpcException({ message: 'Personal device d not found', status: 404 }),
    );

    await controller.create({
      userId: 42,
      device: { modelId: 1, acquiredAt: '2023-06-01' as never },
    });
    expect(repo.create.mock.calls[0][0].acquiredAt).toEqual(
      new Date('2023-06-01'),
    );
  });
});
