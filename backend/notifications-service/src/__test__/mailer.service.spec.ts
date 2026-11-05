/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '../mailer/mailer.service';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

describe('MailerService', () => {
  let service: MailerService;
  let nestMailerService: NestMailerService;

  beforeEach(async () => {
    const mockNestMailerService = {
      sendMail: jest.fn((data) => {
        if (data.to === 'fail@example.com') {
          throw new Error('fail');
        }
        return Promise.resolve(true);
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        { provide: NestMailerService, useValue: mockNestMailerService },
      ],
    }).compile();

    service = module.get<MailerService>(MailerService);
    nestMailerService = module.get<NestMailerService>(NestMailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send mail and return success', async () => {
    const data = {
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    };
    const result = await service.sendMail(data);
    // MailerService adds a `from` field internally, assert that the call contains our data
    expect(nestMailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining(data),
    );
    expect(result).toEqual({
      success: true,
      message: 'Email envoyé avec succès',
    });
  });

  it('should handle error and return failure', async () => {
    const data = {
      to: 'fail@example.com',
      subject: 'Fail',
    };
    const result = await service.sendMail(data);
    expect(result.success).toBe(false);
    expect(result.message).toBe('fail');
  });
});
