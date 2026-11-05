/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { INestMicroservice } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

describe('Permission Microservice (e2e)', () => {
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

  it('should create a permission', async () => {
    const permissionName = 'view_dashboard';

    const response = await firstValueFrom(
      client.send({ cmd: 'create_permission' }, { name: permissionName }),
    );

    expect(response).toBeDefined();
    expect(response.name).toBe(permissionName);
    expect(response.id).toBeDefined();
  });

  it('should return all permissions', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'find_all_permissions' }, {}),
    );

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBeGreaterThan(0);
    expect(response).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'view_dashboard' }),
      ]),
    );
  });
});
