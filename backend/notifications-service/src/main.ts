import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Start HTTP server for admin/test endpoints (port 3005)
  const httpApp = await NestFactory.create(AppModule);
  await httpApp.listen(3005);
  console.log('✅ Notification HTTP server running on port 3005');

  // Start TCP microservice for other services (port 3004)
  const microApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3004 },
    },
  );
  await microApp.listen();
  console.log('✅ Notification Microservice running on port 3004');
}

bootstrap();
