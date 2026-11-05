import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';
import { MailerHttpController } from './mailer.http.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    // Mailer configuration supports two Postfix usage modes:
    // 1) SMTP mode: connect to a Postfix SMTP listener (e.g. localhost:25 or remote host)
    //    Set MAILER_MODE=smtp and optionally SMTP_HOST/SMTP_PORT and SMTP_USER/SMTP_PASSWORD.
    // 2) Sendmail mode: use the local sendmail binary provided by Postfix on the host
    //    Set MAILER_MODE=sendmail and optionally SENDMAIL_PATH (default /usr/sbin/sendmail).
    MailerModule.forRootAsync({
      useFactory: () => {
        const mode = (process.env.MAILER_MODE || 'smtp').toLowerCase();
        const defaults = {
          from: process.env.MAIL_FROM || '"Support" <support@care2repair.eu>',
        };

        if (mode === 'sendmail') {
          return {
            transport: {
              sendmail: true,
              newline: 'unix',
              path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail',
            },
            defaults,
          };
        }

        // SMTP mode (default). You can point SMTP_HOST to localhost, host.docker.internal
        // or any reachable Postfix SMTP listener.
        const host = process.env.SMTP_HOST || 'localhost';
        const port = Number(process.env.SMTP_PORT || 25);
        // Allow configuring implicit TLS (secure) via env
        const secure = process.env.SMTP_SECURE === 'true' ? true : false;

        // TLS options: by default accept self-signed for quicker local testing
        // but make this configurable via MAILER_TLS_REJECT_UNAUTHORIZED
        const tlsRejectUnauthorized =
          process.env.MAILER_TLS_REJECT_UNAUTHORIZED === 'false' ? false : true;

        const tls: any = {
          rejectUnauthorized: tlsRejectUnauthorized,
        };

        // Option to skip TLS (no STARTTLS) if you prefer unencrypted SMTP on port 25
        const ignoreTLS = process.env.MAILER_IGNORE_TLS === 'true';

        const transport: any = { host, port, secure, tls };
        if (ignoreTLS) transport.ignoreTLS = true;
        // optional debug/logger helpers
        if (process.env.MAILER_DEBUG === 'true') {
          transport.logger = true;
          transport.debug = true;
        }
        if (process.env.SMTP_USER) {
          transport.auth = {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          };
        }

        return {
          transport,
          defaults,
        };
      },
    }),
  ],
  providers: [MailerService],
  controllers: [MailerController, MailerHttpController],
})
export class MailerConfigModule {
  constructor() {
    const mode = process.env.MAILER_MODE || 'smtp';
    console.log('MailerConfigModule initialized (mode=' + mode + ')');
    if (process.env.SMTP_USER) {
      console.log('SMTP_USER: ' + process.env.SMTP_USER + ' (password hidden)');
    }
  }
}
