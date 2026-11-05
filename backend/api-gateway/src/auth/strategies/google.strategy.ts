/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientID || !clientSecret) {
      throw new Error('Google clientID and clientSecret must be provided');
    }
    super({
      clientID,
      clientSecret,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    //log
    console.log('Google profile:', profile);
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    const { name, emails, photos } = profile;
    const user = {
      email: emails && emails.length > 0 ? emails[0].value : null,
      firstName: name?.givenName || null,
      lastName: name?.familyName || null,
      picture: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
    };
    done(null, user);
  }
}
