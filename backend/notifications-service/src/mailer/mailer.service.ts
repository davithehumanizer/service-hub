/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  constructor(private readonly mailerService: NestMailerService) {}

  async sendMail(data: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    console.log('Sending email...', data);
    try {
      await this.mailerService.sendMail({
        from: process.env.MAIL_FROM || 'Contact Service-hub <contact@care2repair.eu>',
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
      });
    } catch (e) {
      console.log('Error sending email:', e);
      return { success: false, message: e.message };
    }
    console.log('Email sent!', data);
    return { success: true, message: 'Email envoyé avec succès' };
  }
}
