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

describe('Repairers Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let createdRepairer: any;

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

  it('should create a repairer', async () => {
    const payload = {
      name: 'Repairer Test',
      email: 'repairer@example.com',
      phone: '0123456789',
      description: 'Test repairer description',
      address: '123 Repair St, Repair City, RC 12345',
      country: 'Repairland',
      postal_code: '12345',
      city: 'Repair City',
      website: 'https://repairer.example.com',
      latitude: 12.345678,
      longitude: 98.765432,
      source: 'CSV',
    };

    const response = await firstValueFrom(
      client.send({ cmd: 'create_repairer' }, payload),
    );

    createdRepairer = response;
    expect(createdRepairer).toHaveProperty('repairer_id');
    expect(createdRepairer.name).toBe(payload.name);
  });

  it('should get the repairer by id', async () => {
    const repairer = await firstValueFrom(
      client.send({ cmd: 'get_repairer' }, { id: createdRepairer.repairer_id }),
    );
    expect(repairer.repairer_id).toBe(createdRepairer.repairer_id);
    expect(repairer.email).toBe('repairer@example.com');
  });

  it('should update the repairer', async () => {
    const updated = await firstValueFrom(
      client.send(
        { cmd: 'update_repairer' },
        { name: 'Updated Repairer', repairer_id: createdRepairer.repairer_id },
      ),
      /*(
        { cmd: 'update_repairer' },
        {
         createdRepairer.repairer_id,
          ,
        },
      ),*/
    );
    expect(updated.name).toBe('Updated Repairer');
  });

  it('should delete the repairer', async () => {
    const response = await firstValueFrom(
      client.send({ cmd: 'delete_repairer' }, createdRepairer.repairer_id),
    );
    expect(response.message).toMatch(/deleted/i);
  });
});
