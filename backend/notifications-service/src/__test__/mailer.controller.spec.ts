/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MailerController } from '../mailer/mailer.controller';
import { MailerService } from '../mailer/mailer.service';

describe('MailerController', () => {
  let controller: MailerController;
  let mailerService: MailerService;

  beforeEach(async () => {
    const mockMailerService = {
      sendMail: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailerController],
      providers: [{ provide: MailerService, useValue: mockMailerService }],
    }).compile();

    controller = module.get<MailerController>(MailerController);
    mailerService = module.get<MailerService>(MailerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should send email and return success', async () => {
    const data = { to: 'a@b.com', subject: 'sujet', text: 'txt' };
    const result = await controller.sendEmail(data);
    expect(mailerService.sendMail).toHaveBeenCalledWith(data);
    expect(result.success).toBe(true);
  });

  it('should handle error and return failure', async () => {
    jest
      .spyOn(mailerService, 'sendMail')
      .mockRejectedValueOnce(new Error('fail'));
    const data = { to: 'fail@b.com', subject: 'fail' };
    const result = await controller.sendEmail(data);
    expect(result.success).toBe(false);
    expect(result.message).toBe('fail');
  });
});
