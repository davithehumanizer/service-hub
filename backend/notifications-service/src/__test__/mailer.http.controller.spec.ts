/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MailerConfigModule } from '../mailer/mailer.module';
import { MailerHttpController } from '../mailer/mailer.http.controller';
import { MailerService } from '../mailer/mailer.service';

describe('MailerHttpController', () => {
  let controller: MailerHttpController;
  let mailerService: MailerService;

  beforeEach(async () => {
    const mockMailerService = {
      sendMail: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailerHttpController],
      providers: [{ provide: MailerService, useValue: mockMailerService }],
    }).compile();

    controller = module.get<MailerHttpController>(MailerHttpController);
    mailerService = module.get<MailerService>(MailerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  afterEach(() => {
    delete process.env.TEST_MAIL_TO;
  });

  it('testMailGet should send to TEST_MAIL_TO and return success', async () => {
    process.env.TEST_MAIL_TO = 'tester@example.com';
    const result = await controller.testMailGet();
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'tester@example.com' }),
    );
    expect(result.success).toBe(true);
  });

  it('testMail should use provided to or fallback and return success', async () => {
    const result = await controller.testMail('a@b.com');
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com' }),
    );
    expect(result.success).toBe(true);

    process.env.TEST_MAIL_TO = 'tester@example.com';
    const result2 = await controller.testMail(undefined as any);
    expect(mailerService.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: 'tester@example.com' }),
    );
    expect(result2.success).toBe(true);
  });

  it('refuses to send without a recipient', async () => {
    await expect(controller.testMailGet()).rejects.toThrow(BadRequestException);
    await expect(controller.testMail(undefined as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });
});
