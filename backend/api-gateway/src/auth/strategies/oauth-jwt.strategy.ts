import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Passport strategy for validating RS256-signed OAuth2 access tokens.
 * Used on endpoints that accept OAuth2 bearer tokens (e.g. /userinfo).
 *
 * Named 'oauth-jwt' to distinguish it from the HS256 user-session
 * 'jwt' strategy.
 */
@Injectable()
export class OAuthJwtStrategy extends PassportStrategy(Strategy, 'oauth-jwt') {
  constructor() {
    const publicKeyB64 = process.env.OAUTH_PUBLIC_KEY;
    if (!publicKeyB64) {
      throw new Error(
        'OAUTH_PUBLIC_KEY environment variable is not defined. ' +
          'Run scripts/generate-rsa-keys.ps1 to generate a key pair.',
      );
    }
    const publicKeyPem = Buffer.from(publicKeyB64, 'base64').toString('utf8');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKeyPem,
      algorithms: ['RS256'],
      issuer: process.env.OIDC_ISSUER,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: any) {
    // sub is always a string in OAuth2 RS256 tokens (e.g. "42" for users, "client-id" for M2M).
    // Parse back to number when it looks like a user ID so req.user.id works properly.
    const numericId = payload.sub
      ? parseInt(payload.sub as string, 10)
      : undefined;
    return {
      id: !isNaN(numericId as number) ? numericId : payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      scope: payload.scope,
      iss: payload.iss,
      aud: payload.aud,
      isOAuth2: true,
    };
  }
}
