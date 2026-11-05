/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MailerService } from './mailer.service';

@Controller()
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @MessagePattern({ cmd: 'send_email' })
  async sendEmail(data: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
      });
      return { success: true, message: 'Email envoyé avec succès' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
