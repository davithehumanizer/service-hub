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

describe('Notifications Microservice (e2e)', () => {
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

  it('should send an email', async () => {
    const payload = {
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'Ceci est un test',
    };

    const response = await firstValueFrom(
      client.send({ cmd: 'send_email' }, payload),
    );

    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('message');
  });
});
