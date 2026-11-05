/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
    console.log(
      'JwtStrategy: JWT_SECRET used:',
      process.env.JWT_SECRET ? '*****' : 'undefined',
    ); // Log JWT_SECRET (masked)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: any) {
    console.log('JwtStrategy: validate method called with payload:', payload);

    // Check if this is an OAuth2 client credentials token (has 'sub' and 'scope')
    if (payload.sub && payload.scope && !payload.email) {
      console.log('JwtStrategy: Detected OAuth2 client credentials token');
      // Return a structure that the FlexibleAuthGuard can recognize
      // We'll set client and scope on the request in the guard
      return {
        clientId: payload.sub,
        scope: payload.scope,
        isOAuth2: true,
      };
    }

    // Otherwise, it's a regular user JWT
    console.log('JwtStrategy: Detected user JWT token');

    return {
      id: payload.id ?? payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
