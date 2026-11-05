/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface SiteVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secret: string;

  constructor() {
    this.secret = process.env.RECAPTCHA_SECRET || '';
    if (!this.secret) {
      this.logger.warn(
        'RECAPTCHA_SECRET is not set. Recaptcha verification disabled.',
      );
    }
  }

  async verify(
    token: string,
    remoteip?: string,
  ): Promise<SiteVerifyResponse | null> {
    if (!this.secret) return null;
    if (!token) return { success: false } as SiteVerifyResponse;

    try {
      const params = new URLSearchParams();
      params.append('secret', this.secret);
      params.append('response', token);
      if (remoteip) params.append('remoteip', remoteip);

      const res = await axios.post<SiteVerifyResponse>(
        'https://www.google.com/recaptcha/api/siteverify',
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        },
      );

      this.logger.log('recaptcha siteverify: ' + JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      this.logger.error('recaptcha verification error', err?.message || err);
      return null;
    }
  }
}
