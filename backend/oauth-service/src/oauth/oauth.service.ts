/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OauthClient } from './oauth.entity';
import { OauthAuthorizationCode } from './oauth-authorization-code.entity';
import { OauthRefreshToken } from './oauth-refresh-token.entity';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcryptjs';

// ─── RSA key helpers ────────────────────────────────────────────────────────

function loadPemFromEnv(envVar: string, label: string): string {
  const raw = process.env[envVar];
  if (!raw) {
    throw new Error(`${label} environment variable (${envVar}) is not defined`);
  }
  return Buffer.from(raw, 'base64').toString('utf8');
}

/**
 * Convert an RSA public key PEM to a JWK representation using built-in Node.js
 * crypto — no extra dependency required.
 */
function publicPemToJwk(
  pem: string,
  kid: string,
): Record<string, string | string[]> {
  const keyObject = crypto.createPublicKey(pem);
  const jwk = keyObject.export({ format: 'jwk' }) as Record<string, string>;
  return {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid,
    n: jwk.n,
    e: jwk.e,
  };
}

// ─── PKCE verification ───────────────────────────────────────────────────────

function verifyPkceS256(
  codeVerifier: string,
  storedChallenge: string,
): boolean {
  const digest = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return digest === storedChallenge;
}

// ─── Effective scope for user tokens ─────────────────────────────────────────

/**
 * OIDC scopes that describe the shape of the request rather than an API
 * permission. They are never subject to the user's role.
 */
const PROTOCOL_SCOPES = new Set([
  'openid',
  'profile',
  'email',
  'offline_access',
]);

/**
 * Narrows the scope granted to a user token down to what that user may actually
 * do.
 *
 * A client's registered scopes are a ceiling, not a grant: previously the token
 * carried the client's full scope set regardless of who signed in, so a user
 * with the `user` role who authenticated through a broadly-scoped client
 * received a token bearing that client's admin permissions.
 *
 * @param requestedScope Scope stored on the authorization code / refresh token.
 * @param user The authenticated user, whose role carries their permissions.
 */
function effectiveUserScope(requestedScope: string, user: any): string {
  const requested = (requestedScope || '').split(' ').filter(Boolean);

  const userPermissions: string[] = Array.isArray(user?.role?.permissions)
    ? user.role.permissions.map((p: { name: string }) => p.name)
    : [];

  return requested
    .filter((s) => PROTOCOL_SCOPES.has(s) || userPermissions.includes(s))
    .join(' ');
}

// ─── Client secret comparison ────────────────────────────────────────────────

/** Anything produced by bcrypt starts with $2a$, $2b$ or $2y$. */
function looksHashed(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored);
}

/**
 * Compares a presented client secret against the stored one.
 *
 * Accepts both bcrypt hashes and legacy plaintext so the code works before and
 * after `HashOauthClientSecrets` runs — deploying the service and running the
 * migration do not have to be ordered.
 *
 * The plaintext branch uses `timingSafeEqual` so the legacy path does not leak
 * the secret through response timing.
 */
async function verifyClientSecret(
  presented: string,
  stored: string,
): Promise<boolean> {
  if (!presented || !stored) {
    return false;
  }

  if (looksHashed(stored)) {
    return bcrypt.compare(presented, stored);
  }

  const a = Buffer.from(presented);
  const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class OauthService implements OnModuleInit {
  private readonly logger = new Logger(OauthService.name);

  private privateKey: string;
  private publicKey: string;
  private kid: string;
  private issuer: string;
  private jwksCache: { keys: Record<string, string | string[]>[] };

  constructor(
    @InjectRepository(OauthClient)
    private readonly clientRepository: Repository<OauthClient>,
    @InjectRepository(OauthAuthorizationCode)
    private readonly authCodeRepository: Repository<OauthAuthorizationCode>,
    @InjectRepository(OauthRefreshToken)
    private readonly refreshTokenRepository: Repository<OauthRefreshToken>,
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  onModuleInit(): void {
    this.privateKey = loadPemFromEnv('OAUTH_PRIVATE_KEY', 'RSA private key');
    this.publicKey = loadPemFromEnv('OAUTH_PUBLIC_KEY', 'RSA public key');
    this.kid = process.env.OAUTH_RSA_KID || 'rs256-1';
    this.issuer = process.env.OIDC_ISSUER || 'http://localhost:3000';
    this.jwksCache = { keys: [publicPemToJwk(this.publicKey, this.kid)] };
    this.logger.log(
      `OauthService ready. issuer=${this.issuer} kid=${this.kid}`,
    );
  }

  // ─── Low-level signing ────────────────────────────────────────────────────

  private signOAuth2Token(
    payload: Record<string, unknown>,
    expiresIn: string | number = '1h',
  ): string {
    const options: jwt.SignOptions = {
      algorithm: 'RS256',
      keyid: this.kid,
    };
    // Do not set expiresIn when exp is already explicitly present in the payload
    // (jsonwebtoken rejects the combination)
    if (!('exp' in payload)) {
      options.expiresIn = expiresIn as jwt.SignOptions['expiresIn'];
    }
    return jwt.sign(payload, this.privateKey, options);
  }

  private verifyOAuth2Token(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;
  }

  // ─── Client authentication ────────────────────────────────────────────────

  /**
   * Looks up a client and verifies its secret.
   *
   * Replaces the previous `findOne({ where: { client_id, client_secret } })`,
   * which required the secret to be stored in clear text and compared by the
   * database.
   *
   * @returns The client, or null when the id is unknown or the secret is wrong.
   */
  private async authenticateClient(
    clientId: string,
    clientSecret: string,
  ): Promise<OauthClient | null> {
    const client = await this.clientRepository.findOne({
      where: { client_id: clientId },
    });
    if (!client) {
      return null;
    }
    const ok = await verifyClientSecret(clientSecret, client.client_secret);
    return ok ? client : null;
  }

  // ─── JWKS ─────────────────────────────────────────────────────────────────

  getJwks(): { keys: Record<string, string | string[]>[] } {
    return this.jwksCache;
  }

  // ==========================================
  // Authorization Code Flow Methods
  // ==========================================

  /**
   * Validates an OAuth2 authorization request.
   * Checks client_id, redirect_uri, response_type, and PKCE.
   */
  async validateAuthorizeRequest(data: {
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  }) {
    if (data.response_type !== 'code') {
      throw new RpcException('Unsupported response_type. Must be "code"');
    }

    if (!data.client_id) {
      throw new RpcException('Missing client_id');
    }

    if (!data.redirect_uri) {
      throw new RpcException('Missing redirect_uri');
    }

    // PKCE validation — required only if code_challenge is provided.
    // Confidential clients (those presenting a client_secret at the token endpoint)
    // are not required to use PKCE; the client_secret already secures the flow.
    // Public clients that send code_challenge must use S256.
    if (data.code_challenge && data.code_challenge_method !== 'S256') {
      throw new RpcException(
        'Unsupported code_challenge_method. Only S256 is supported.',
      );
    }

    const client = await this.clientRepository.findOne({
      where: { client_id: data.client_id },
    });

    if (!client) {
      throw new RpcException('Invalid client_id');
    }

    if (
      !client.redirect_uris ||
      !client.redirect_uris.includes(data.redirect_uri)
    ) {
      throw new RpcException('Invalid redirect_uri');
    }

    // Validate that every requested scope is allowed for this client
    const effectiveScope = data.scope || client.scopes.join(' ');
    if (data.scope) {
      const requestedScopes = data.scope.split(' ').filter(Boolean);
      const invalidScopes = requestedScopes.filter(
        (s) => !client.scopes.includes(s),
      );
      if (invalidScopes.length > 0) {
        throw new RpcException(
          `Requested scope(s) not allowed for this client: ${invalidScopes.join(', ')}`,
        );
      }
    }

    return {
      valid: true,
      client_id: client.client_id,
      redirect_uri: data.redirect_uri,
      scope: effectiveScope,
    };
  }

  /**
   * Creates an authorization code record with PKCE and nonce.
   */
  async generateAuthorizationCode(data: {
    client_id: string;
    user_id: number;
    redirect_uri: string;
    scope?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    nonce?: string;
  }) {
    // Clean up expired codes
    await this.authCodeRepository.delete({ expires_at: LessThan(new Date()) });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const authCode = this.authCodeRepository.create({
      client_id: data.client_id,
      user_id: data.user_id,
      redirect_uri: data.redirect_uri,
      scope: data.scope,
      code_challenge: data.code_challenge,
      code_challenge_method: data.code_challenge_method,
      nonce: data.nonce,
      expires_at: expiresAt,
      used: false,
    });

    const saved = await this.authCodeRepository.save(authCode);
    return { code: saved.code };
  }

  /**
   * Exchanges an authorization code for access_token + id_token (if scope
   * contains "openid") + refresh_token.
   */
  async exchangeCodeForToken(data: {
    code: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    code_verifier?: string;
  }) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.code)) {
      throw new RpcException('Invalid authorization code format');
    }

    const client = await this.authenticateClient(
      data.client_id,
      data.client_secret,
    );
    if (!client) {
      throw new RpcException('Invalid client credentials');
    }

    const authCode = await this.authCodeRepository.findOne({
      where: { code: data.code },
    });
    if (!authCode) {
      throw new RpcException('Invalid authorization code');
    }
    if (authCode.used) {
      throw new RpcException('Authorization code already used');
    }
    if (authCode.expires_at < new Date()) {
      throw new RpcException('Authorization code expired');
    }
    if (authCode.client_id !== data.client_id) {
      throw new RpcException(
        'Authorization code was not issued to this client',
      );
    }
    if (authCode.redirect_uri !== data.redirect_uri) {
      throw new RpcException('Redirect URI mismatch');
    }

    // ── PKCE verification ──────────────────────────────────────────────────
    if (authCode.code_challenge) {
      if (!data.code_verifier) {
        throw new RpcException(
          'Missing code_verifier. PKCE verification required.',
        );
      }
      if (!verifyPkceS256(data.code_verifier, authCode.code_challenge)) {
        throw new RpcException(
          'Invalid code_verifier. PKCE verification failed.',
        );
      }
    }

    // Mark code as used
    authCode.used = true;
    await this.authCodeRepository.save(authCode);

    const user = await firstValueFrom(
      this.userService.send({ cmd: 'find_user_by_id' }, authCode.user_id),
    );
    if (!user) {
      throw new RpcException('User not found');
    }

    const now = Math.floor(Date.now() / 1000);
    const scopes = (authCode.scope || '').split(' ').filter(Boolean);
    // The client's scopes are a ceiling; the user's role decides what is
    // actually granted.
    const grantedScope = effectiveUserScope(authCode.scope, user);

    // ── Access token ───────────────────────────────────────────────────────
    const accessPayload: Record<string, unknown> = {
      jti: crypto.randomUUID(),
      iss: this.issuer,
      sub: String(user.id),
      aud: data.client_id,
      iat: now,
      email: user.email,
      role: user.role,
      scope: grantedScope,
    };
    const access_token = this.signOAuth2Token(accessPayload, '1h');

    // ── id_token (only when scope includes "openid") ───────────────────────
    let id_token: string | undefined;
    if (scopes.includes('openid')) {
      const idPayload: Record<string, unknown> = {
        jti: crypto.randomUUID(),
        iss: this.issuer,
        sub: String(user.id),
        aud: data.client_id,
        iat: now,
        exp: now + 3600,
        email: user.email,
        // Reflects the account's actual verification state; it was previously
        // hardcoded to false, so relying parties could never trust the address.
        email_verified: Boolean(user.isVerified),
        role: user.role,
      };
      if (user.profile?.firstName || user.profile?.lastName) {
        idPayload.name =
          `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
        idPayload.given_name = user.profile?.firstName;
        idPayload.family_name = user.profile?.lastName;
      }
      if (authCode.nonce) {
        idPayload.nonce = authCode.nonce;
      }
      id_token = this.signOAuth2Token(idPayload, '1h');
    }

    // ── Refresh token ──────────────────────────────────────────────────────
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    const refreshRecord = this.refreshTokenRepository.create({
      token: crypto.randomUUID(),
      client_id: data.client_id,
      user_id: user.id,
      scope: authCode.scope,
      nonce: authCode.nonce,
      expires_at: refreshExpiry,
      used: false,
    });
    await this.refreshTokenRepository.save(refreshRecord);

    const response: Record<string, unknown> = {
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: grantedScope,
      refresh_token: refreshRecord.token,
    };
    if (id_token) {
      response.id_token = id_token;
    }
    return response;
  }

  /**
   * Exchanges a refresh_token for a new access_token (+ id_token) and rotates
   * the refresh token (single-use).
   */
  async exchangeRefreshToken(data: {
    refresh_token: string;
    client_id: string;
    client_secret: string;
  }) {
    const client = await this.authenticateClient(
      data.client_id,
      data.client_secret,
    );
    if (!client) {
      throw new RpcException('Invalid client credentials');
    }

    const record = await this.refreshTokenRepository.findOne({
      where: { token: data.refresh_token },
    });
    if (!record) {
      throw new RpcException('Invalid refresh token');
    }
    if (record.used) {
      // Replaying a consumed token means the value leaked. Rejecting this one
      // call is not enough — the copy still in circulation must die too, so the
      // whole set issued to this user for this client is invalidated.
      this.logger.warn(
        `Refresh token replay detected for user ${record.user_id} / client ${record.client_id}; revoking that token set`,
      );
      await this.refreshTokenRepository.update(
        { user_id: record.user_id, client_id: record.client_id, used: false },
        { used: true },
      );
      throw new RpcException('Refresh token already used');
    }
    if (record.expires_at < new Date()) {
      throw new RpcException('Refresh token expired');
    }
    if (record.client_id !== data.client_id) {
      throw new RpcException('Refresh token was not issued to this client');
    }

    // Rotate: mark old token as used
    record.used = true;
    await this.refreshTokenRepository.save(record);

    const user = await firstValueFrom(
      this.userService.send({ cmd: 'find_user_by_id' }, record.user_id),
    );
    if (!user) {
      throw new RpcException('User not found');
    }

    const now = Math.floor(Date.now() / 1000);
    const scopes = (record.scope || '').split(' ').filter(Boolean);
    // Re-evaluated on every refresh, so a role change takes effect at the next
    // token exchange rather than persisting for the life of the refresh token.
    const grantedScope = effectiveUserScope(record.scope, user);

    const accessPayload: Record<string, unknown> = {
      jti: crypto.randomUUID(),
      iss: this.issuer,
      sub: String(user.id),
      aud: data.client_id,
      iat: now,
      email: user.email,
      role: user.role,
      scope: grantedScope,
    };
    const access_token = this.signOAuth2Token(accessPayload, '1h');

    let id_token: string | undefined;
    if (scopes.includes('openid')) {
      const idPayload: Record<string, unknown> = {
        jti: crypto.randomUUID(),
        iss: this.issuer,
        sub: String(user.id),
        aud: data.client_id,
        iat: now,
        exp: now + 3600,
        email: user.email,
        // Reflects the account's actual verification state; it was previously
        // hardcoded to false, so relying parties could never trust the address.
        email_verified: Boolean(user.isVerified),
        role: user.role,
      };
      if (user.profile?.firstName || user.profile?.lastName) {
        idPayload.name =
          `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
        idPayload.given_name = user.profile?.firstName;
        idPayload.family_name = user.profile?.lastName;
      }
      if (record.nonce) {
        idPayload.nonce = record.nonce;
      }
      id_token = this.signOAuth2Token(idPayload, '1h');
    }

    // New refresh token
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    const newRefresh = this.refreshTokenRepository.create({
      token: crypto.randomUUID(),
      client_id: data.client_id,
      user_id: user.id,
      scope: record.scope,
      nonce: record.nonce,
      expires_at: refreshExpiry,
      used: false,
    });
    await this.refreshTokenRepository.save(newRefresh);

    const response: Record<string, unknown> = {
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: grantedScope,
      refresh_token: newRefresh.token,
    };
    if (id_token) {
      response.id_token = id_token;
    }
    return response;
  }

  /**
   * Returns standard OIDC userinfo claims for the given user ID.
   */
  async getUserInfo(userId: number) {
    const user = await firstValueFrom(
      this.userService.send({ cmd: 'find_user_by_id' }, userId),
    );
    if (!user) {
      throw new RpcException('User not found');
    }

    return {
      sub: String(user.id),
      email: user.email,
      email_verified: Boolean(user.isVerified),
      name: user.profile
        ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
        : undefined,
      given_name: user.profile?.firstName,
      family_name: user.profile?.lastName,
      role: user.role,
    };
  }

  // ==========================================
  // Token endpoint router
  // ==========================================

  async generateToken(data: {
    client_id: string;
    client_secret: string;
    grant_type: string;
    code?: string;
    redirect_uri?: string;
    code_verifier?: string;
    refresh_token?: string;
  }) {
    if (data.grant_type === 'authorization_code') {
      if (!data.code || !data.redirect_uri) {
        throw new RpcException(
          'Missing code or redirect_uri for authorization_code grant',
        );
      }
      return this.exchangeCodeForToken({
        code: data.code,
        client_id: data.client_id,
        client_secret: data.client_secret,
        redirect_uri: data.redirect_uri,
        code_verifier: data.code_verifier,
      });
    }

    if (data.grant_type === 'refresh_token') {
      if (!data.refresh_token) {
        throw new RpcException('Missing refresh_token for refresh_token grant');
      }
      return this.exchangeRefreshToken({
        refresh_token: data.refresh_token,
        client_id: data.client_id,
        client_secret: data.client_secret,
      });
    }

    if (data.grant_type === 'client_credentials') {
      if (!data.client_id || !data.client_secret) {
        throw new RpcException('Missing client credentials');
      }
      const client = await this.authenticateClient(
        data.client_id,
        data.client_secret,
      );
      if (!client) {
        throw new RpcException('Invalid client credentials');
      }

      const now = Math.floor(Date.now() / 1000);
      const scope = client.scopes.join(' ');
      const payload: Record<string, unknown> = {
        jti: crypto.randomUUID(),
        iss: this.issuer,
        sub: client.client_id,
        aud: client.client_id,
        iat: now,
        scope,
      };
      const access_token = this.signOAuth2Token(payload, '1h');
      return {
        access_token,
        token_type: 'Bearer',
        expires_in: 3600,
        scope,
        permissions: client.scopes,
      };
    }

    throw new RpcException('Unsupported grant_type');
  }

  // ==========================================
  // Token validation (introspection-style)
  // ==========================================

  validateToken(token: string) {
    try {
      const decoded = this.verifyOAuth2Token(token);
      return {
        active: true,
        client: decoded.sub,
        scope: decoded.scope as string | undefined,
        iss: decoded.iss,
        aud: decoded.aud,
        exp: decoded.exp,
      };
    } catch {
      return { active: false };
    }
  }

  // ==========================================
  // Social login (session tokens remain HS256)
  // ==========================================

  async socialLogin(user: any) {
    if (!user || !user.email) {
      throw new RpcException('No user email from social provider');
    }

    let existingUser = await firstValueFrom(
      this.userService.send({ cmd: 'find_user_by_email' }, user.email),
    );

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-8),
        10,
      );
      existingUser = await firstValueFrom(
        this.userService.send(
          { cmd: 'create_user' },
          {
            email: user.email,
            password: hashedPassword,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        ),
      );
    }

    // Social-login tokens are user-session tokens (HS256, handled by jwt.strategy).
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    const payload = { email: existingUser.email, sub: existingUser.id };
    const access_token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      user: { id: existingUser.id, email: existingUser.email },
    };
  }
}
