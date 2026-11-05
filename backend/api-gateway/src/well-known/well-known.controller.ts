import {
  Controller,
  Get,
  Logger,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// JWKS + discovery document are computed once at startup and cached in memory.

let jwksCache: { keys: object[] } | null = null;

function buildJwks(): { keys: object[] } {
  if (jwksCache) return jwksCache;

  const publicKeyB64 = process.env.OAUTH_PUBLIC_KEY;
  if (!publicKeyB64) {
    return { keys: [] }; // Degrade gracefully; log in constructor
  }
  const pem = Buffer.from(publicKeyB64, 'base64').toString('utf8');
  const keyObject = crypto.createPublicKey(pem);
  const jwk = keyObject.export({ format: 'jwk' }) as Record<string, string>;

  jwksCache = {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: process.env.OAUTH_RSA_KID || 'rs256-1',
        n: jwk.n,
        e: jwk.e,
      },
    ],
  };
  return jwksCache;
}

@ApiTags('OIDC Discovery')
@Controller('.well-known')
export class WellKnownController {
  private readonly logger = new Logger(WellKnownController.name);

  private get issuer(): string {
    return process.env.OIDC_ISSUER || 'http://localhost:3000';
  }

  /**
   * OpenID Connect Discovery document.
   * RFC: https://openid.net/specs/openid-connect-discovery-1_0.html
   */
  @Version(VERSION_NEUTRAL)
  @Get('openid-configuration')
  @ApiOperation({ summary: 'OIDC Discovery document' })
  getOpenIdConfiguration() {
    const issuer = this.issuer;
    // OAuth2 / OIDC endpoints are under /api/v1/ on the api-gateway.
    // The issuer may already include a path prefix (e.g. https://care2repair.eu/api),
    // so we derive the base URL from the host only.
    const url = new URL(issuer);
    const base = `${url.origin}/api/v1`;
    return {
      issuer,
      authorization_endpoint: `${base}/auth/oauth2/authorize`,
      token_endpoint: `${base}/auth/oauth2/token`,
      userinfo_endpoint: `${base}/auth/oauth2/userinfo`,
      jwks_uri: `${url.origin}/.well-known/jwks.json`,
      scopes_supported: ['openid', 'profile', 'email'],
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: [
        'authorization_code',
        'client_credentials',
        'refresh_token',
      ],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
      ],
      code_challenge_methods_supported: ['S256'],
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'iat',
        'exp',
        'jti',
        'email',
        'email_verified',
        'name',
        'given_name',
        'family_name',
        'role',
        'nonce',
      ],
    };
  }

  /**
   * JSON Web Key Set — public key for verifying RS256-signed tokens.
   * RFC: https://datatracker.ietf.org/doc/html/rfc7517
   */
  @Version(VERSION_NEUTRAL)
  @Get('jwks.json')
  @ApiOperation({ summary: 'JSON Web Key Set (JWKS)' })
  getJwks() {
    return buildJwks();
  }
}
