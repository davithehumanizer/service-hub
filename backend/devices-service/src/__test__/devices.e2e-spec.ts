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

describe('Devices Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;

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

  it('should get all devices', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'get_devices' }, {}),
    );
    expect(Array.isArray(response)).toBe(true);
  });

  it('should get filters', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'get_filters' }, {}),
    );
    expect(response).toBeDefined();
  });

  it('should search devices', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'search_devices' }, { query: 'Test' }),
    );
    expect(Array.isArray(response)).toBe(true);
  });

  it('should get device by id (if any device exists)', async () => {
    const devices = await firstValueFrom(
      client.send({ cmd: 'get_devices' }, {}),
    );
    if (devices.length > 0) {
      const device = await firstValueFrom(
        client.send({ cmd: 'get_device_by_id' }, { id: devices[0].id }),
      );
      expect(device).toHaveProperty('id', devices[0].id);
    } else {
      // Pas d'appareil à tester
      expect(devices.length).toBe(0);
    }
  });
});
