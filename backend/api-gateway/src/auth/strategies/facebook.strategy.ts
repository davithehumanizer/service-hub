/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    const clientID = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    if (!clientID || !clientSecret) {
      throw new Error('Facebook clientID and clientSecret must be provided');
    }
    super({
      clientID,
      clientSecret,
      callbackURL:
        process.env.FACEBOOK_CALLBACK_URL ||
        'http://localhost:3000/api/auth/facebook/callback',
      scope: 'email',
      profileFields: ['emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { name, emails } = profile;
    const user = {
      email: emails && emails.length > 0 ? emails[0].value : null,
      firstName: name?.givenName || null,
      lastName: name?.familyName || null,
      accessToken,
    };
    done(null, user);
  }
}
