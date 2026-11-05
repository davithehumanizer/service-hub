import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3001 },
    },
  );

  const configService = app.get(ConfigService);
  console.log(
    `Notification Management Host: ${configService.get('NOTIFICATIONS_SERVICE_HOST')}, Port: ${configService.get<number>('NOTIFICATIONS_SERVICE_PORT')}`,
  );

  await app.listen();
  console.log('✅ User Management Microservice running on port 3001');
}
bootstrap();
