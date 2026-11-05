import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
} from '@nestjs/common';
import { MailerService } from './mailer.service';

@Controller('api')
export class MailerHttpController {
  constructor(private readonly mailerService: MailerService) {}

  @Get('test-mail')
  async testMailGet() {
    // convenience GET endpoint with a fixed recipient for quick tests
    return this.mailerService.sendMail({
      to: this.testRecipient(),
      subject: 'Test email from service-hub',
      text: 'This is a test email sent from notifications-service.',
    });
  }

  @Post('test-mail')
  async testMail(@Body('to') to: string) {
    return this.mailerService.sendMail({
      to: this.testRecipient(to),
      subject: 'Test email from service-hub',
      text: 'This is a test email sent from notifications-service.',
    });
  }

  private testRecipient(to?: string): string {
    const recipient = to || process.env.TEST_MAIL_TO;
    if (!recipient) {
      throw new BadRequestException('Pass "to", or set TEST_MAIL_TO.');
    }
    return recipient;
  }
}
