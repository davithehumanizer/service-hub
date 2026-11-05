/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { INestMicroservice } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../..//../src/app.module';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Permission } from 'src/permissions/permission.entity';
import { DataSource } from 'typeorm';

describe('Role Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let createdRole: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice({
      transport: Transport.TCP,
    });

    await app.listen();

    const dataSource = moduleFixture.get<DataSource>(DataSource);
    const permissionRepo = dataSource.getRepository(Permission);

    await permissionRepo.save({ name: 'edit_articles' });
    await permissionRepo.save({ name: 'delete_comments' });
    await permissionRepo.save({ name: 'manage_users' });

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
    });
  });

  afterAll(async () => {
    await app.close();
    client.close();
  });

  it('should create a role with existing permissions', async () => {
    const payload = {
      name: 'editor',
      permissions: ['edit_articles', 'delete_comments'],
    };

    const response = await firstValueFrom(
      client.send({ cmd: 'create_role' }, payload),
    );

    createdRole = response;
    expect(response.name).toBe(payload.name);
    expect(response.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'edit_articles' }),
        expect.objectContaining({ name: 'delete_comments' }),
      ]),
    );
  });

  it('should get role by name', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'get_role_by_name' }, { name: 'editor' }),
    );

    expect(response).toBeDefined();
    expect(response.name).toBe('editor');
    expect(response.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'edit_articles' }),
      ]),
    );
  });

  it('should get all roles', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'find_all_roles' }, {}),
    );

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBeGreaterThan(0);
    expect(response).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'editor' })]),
    );
  });

  it('should add a permission to an existing role', async () => {
    const response = await firstValueFrom(
      client.send(
        { cmd: 'add_permission' },
        { roleId: createdRole.id, permission: 'manage_users' },
      ),
    );

    expect(response.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'manage_users' }),
      ]),
    );
  });
});
