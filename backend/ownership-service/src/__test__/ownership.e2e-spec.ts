/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { INestMicroservice } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppModule } from 'src/app.module';

describe('Ownership Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  const userId = 123;
  const deviceId = 456;
  const requesterId = 123; // pour simplifier, même que userId
  const isAdmin = true;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice({
      transport: Transport.TCP,
    });

    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
    });
  });

  afterAll(async () => {
    await app.close();
    client.close();
  });

  it('should assign a device to a user', async () => {
    const payload = {
      deviceId,
      userId,
      requesterId,
      isAdmin,
    };
    const response = await firstValueFrom(
      client.send({ cmd: 'assign_device_to_user' }, payload),
    );
    expect(response).toHaveProperty('id');
    expect(response.userId).toBe(userId);
    expect(response.deviceId).toBe(deviceId);
  });

  it('should get user devices', async () => {
    const payload = {
      userId,
      requesterId,
      isAdmin,
    };
    const response = await firstValueFrom(
      client.send({ cmd: 'get_user_devices' }, payload),
    );
    expect(Array.isArray(response)).toBe(true);
    expect(response.some((o: any) => o.deviceId === deviceId)).toBe(true);
  });

  it('should remove the device from the user', async () => {
    const payload = {
      deviceId,
      requesterId,
      isAdmin,
    };
    const response = await firstValueFrom(
      client.send({ cmd: 'remove_device_from_user' }, payload),
    );
    expect(response).toHaveProperty('success', true);
  });
});
