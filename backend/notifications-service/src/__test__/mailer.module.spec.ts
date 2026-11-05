import { Test, TestingModule } from '@nestjs/testing';
import { MailerConfigModule } from '../mailer/mailer.module';
import { MailerService } from '../mailer/mailer.service';
import { MailerController } from '../mailer/mailer.controller';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';

describe('MailerConfigModule', () => {
  it('should compile and provide MailerService and MailerController', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        NestMailerModule.forRoot({
          transport: {
            host: 'smtp.test',
            port: 2525,
            secure: false,
            auth: { user: 'user', pass: 'pass' },
          },
        }),
        MailerConfigModule,
      ],
    }).compile();

    const mailerService = module.get<MailerService>(MailerService);
    const mailerController = module.get<MailerController>(MailerController);
    expect(mailerService).toBeDefined();
    expect(mailerController).toBeDefined();
  });
});
