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

describe('User Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let confirmationToken: string;
  let resetToken: string;
  let createdUser: any;

  beforeAll(async () => {
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
    await roleRepo.save({ name: 'repairer' });

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
    });
  });

  afterAll(async () => {
    await app.close();
    client.close();
  });

  it('should create a user', async () => {
    const payload = {
      email: 'e2e-confirm@example.com',
      password: 'Azerty123*',
      userType: 'customer',
      profile: {
        firstName: 'E2E',
        lastName: 'Test',
      },
    };

    const response = await firstValueFrom(
      client.send({ cmd: 'register_user' }, payload),
    );

    createdUser = response.user;
    confirmationToken = createdUser.confirmationToken;

    expect(createdUser).toHaveProperty('id');
    expect(createdUser.email).toBe(payload.email);
    expect(confirmationToken).toBeDefined();
  });

  it('should confirm the account with the confirmation token', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'confirm_account' }, { token: confirmationToken }),
    );

    expect(response.message).toMatch(/successfully activated/i);
  });

  it('should request a password reset', async () => {
    const response = await firstValueFrom(
      client.send(
        { cmd: 'reset_password_request' },
        { email: createdUser.email },
      ),
    );

    expect(response.message).toMatch(/reset password email sent/i);

    // Recharge l'utilisateur pour obtenir le token
    const freshUser = await firstValueFrom(
      client.send({ cmd: 'get_user_profile' }, { email: createdUser.email }),
    );
    resetToken = freshUser.resetToken;

    expect(resetToken).toBeDefined();
  });

  it('should reset the password with valid token', async () => {
    const response = await firstValueFrom(
      client.send(
        { cmd: 'reset_password' },
        {
          email: createdUser.email,
          newPassword: 'NouveauPass1!',
          resetToken,
        },
      ),
    );

    expect(response.message).toMatch(/password reset successfully/i);
  });

  it('should get the user profile', async () => {
    const user = await firstValueFrom(
      client.send({ cmd: 'get_user_profile' }, { email: createdUser.email }),
    );

    expect(user.email).toBe(createdUser.email);
    expect(user.profile.firstName).toBe('E2E');
  });

  it('should get all users', async () => {
    const users = await firstValueFrom(client.send({ cmd: 'get_users' }, {}));
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it('should update the user profile', async () => {
    const updatedProfile = {
      firstName: 'Updated',
      lastName: 'Name',
      birthDate: new Date('1990-01-01'),
    };

    const response = await firstValueFrom(
      client.send(
        { cmd: 'update_profile' },
        { userId: createdUser.id, profile: updatedProfile },
      ),
    );
    expect(response.firstName).toBe('Updated');
    expect(response.lastName).toBe('Name');
  });
});
