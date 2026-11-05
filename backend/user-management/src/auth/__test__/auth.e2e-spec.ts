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
import { DataSource } from 'typeorm';
import { Role } from 'src/roles/role.entity';

describe('Auth Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let testUser: any;

  const credentials = {
    email: 'auth-test@example.com',
    password: 'StrongP@ssw0rd',
  };

  beforeAll(async () => {
    // Ensure recaptcha verification is disabled for e2e tests unless explicitly configured
    if (process.env.RECAPTCHA_SECRET) {
      // preserve original secret to restore later
      (global as any).__ORIG_RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
    }
    delete process.env.RECAPTCHA_SECRET;
    console.log('secret', process.env.JWT_SECRET);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice({
      transport: Transport.TCP,
    });

    await app.listen();

    const dataSource = moduleFixture.get<DataSource>(DataSource);
    const roleRepo = dataSource.getRepository(Role);

    await roleRepo.save({ name: 'user' });

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
    });

    // Créer un utilisateur pour les tests d'authentification
    const createResponse = await firstValueFrom(
      client.send(
        { cmd: 'register_user' },
        {
          email: credentials.email,
          password: credentials.password,
          role: 'user',
          profile: {
            firstName: 'Auth',
            lastName: 'Test',
            isVerified: true,
          },
        },
      ),
    );
    testUser = createResponse;
    // Confirmer le compte de l'utilisateur créé
    await firstValueFrom(
      client.send(
        { cmd: 'confirm_account' },
        { token: testUser.confirmationToken },
      ),
    );
  });

  afterAll(async () => {
    await app.close();
    client.close();
    // restore original env if present
    if ((global as any).__ORIG_RECAPTCHA_SECRET) {
      process.env.RECAPTCHA_SECRET = (global as any).__ORIG_RECAPTCHA_SECRET;
      delete (global as any).__ORIG_RECAPTCHA_SECRET;
    }
  });

  it('should login a user and return an access token', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'login_user' }, credentials),
    );

    expect(response).toHaveProperty('access_token');
    expect(response).toHaveProperty('user');
    expect(response.user.email).toBe(credentials.email);
  });

  it('should refresh token for the user', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'refresh_token' }, { email: credentials.email }),
    );

    expect(response).toHaveProperty('access_token');
    expect(response).toHaveProperty('user');
    expect(response.user.email).toBe(credentials.email);
  });

  it('should throw RpcException if password is invalid', async () => {
    try {
      await client
        .send(
          { cmd: 'login_user' },
          { email: credentials.email, password: 'wrongPassword123!' },
        )
        .toPromise();

      fail('Expected RpcException to be thrown');
    } catch (error) {
      expect(error.message).toBe('Invalid credentials');
    }
  });

  it('should fail to refresh token for unknown user', async () => {
    try {
      await firstValueFrom(
        client.send({ cmd: 'refresh_token' }, { email: 'unknown@example.com' }),
      );
      fail('Expected RpcException to be thrown');
    } catch (error) {
      expect(error.message).toBe('User not found');
    }
  });
});
