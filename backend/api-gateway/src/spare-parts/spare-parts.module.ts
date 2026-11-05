import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SparePartsService } from './spare-parts.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'SPARE_PARTS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>('SPARE_PARTS_SERVICE_HOST');
          const port = configService.get<number>('SPARE_PARTS_SERVICE_PORT');

          console.log(
            `spare-parts module - SPARE_PARTS_SERVICE Host: ${host}, Port: ${port}`,
          );

          return {
            transport: Transport.TCP,
            options: { host, port },
          };
        },
      },
    ]),
  ],
  controllers: [SparePartsController],
  providers: [SparePartsService],
  exports: [ClientsModule],
})
export class SparePartsModule {}
