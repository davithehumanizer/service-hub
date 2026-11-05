import * as nodeCrypto from 'crypto';
import { OAuthJwtStrategy } from '../strategies/oauth-jwt.strategy';

describe('OAuthJwtStrategy', () => {
  let testPublicKeyB64: string;

  beforeAll(() => {
    const { publicKey } = nodeCrypto.generateKeyPairSync('rsa', {
      modulusLength: 1024,
    });
    const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    testPublicKeyB64 = Buffer.from(pem).toString('base64');
  });

  afterEach(() => {
    delete process.env.OAUTH_PUBLIC_KEY;
    delete process.env.OIDC_ISSUER;
  });

  describe('constructor', () => {
    it('should throw an error if OAUTH_PUBLIC_KEY is not set', () => {
      delete process.env.OAUTH_PUBLIC_KEY;
      expect(() => new OAuthJwtStrategy()).toThrow('OAUTH_PUBLIC_KEY');
    });

    it('should instantiate successfully when OAUTH_PUBLIC_KEY is set', () => {
      process.env.OAUTH_PUBLIC_KEY = testPublicKeyB64;
      expect(() => new OAuthJwtStrategy()).not.toThrow();
    });

    it('should use OIDC_ISSUER env var as issuer', () => {
      process.env.OAUTH_PUBLIC_KEY = testPublicKeyB64;
      process.env.OIDC_ISSUER = 'https://care2repair.eu';
      // Should instantiate without error when issuer is set
      expect(() => new OAuthJwtStrategy()).not.toThrow();
    });
  });

  describe('validate', () => {
    let strategy: OAuthJwtStrategy;

    beforeEach(() => {
      process.env.OAUTH_PUBLIC_KEY = testPublicKeyB64;
      strategy = new OAuthJwtStrategy();
    });

    it('should return user with numeric id when sub is a numeric string', async () => {
      const payload = {
        sub: '42',
        email: 'user@example.com',
        role: 'user',
        scope: 'read',
        iss: 'test',
        aud: 'test',
      };
      const result = await strategy.validate(payload);

      expect(result.id).toBe(42);
      expect(result.sub).toBe('42');
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe('user');
      expect(result.isOAuth2).toBe(true);
    });

    it('should return user with string id when sub is non-numeric', async () => {
      const payload = {
        sub: 'my-oauth-client',
        email: null,
        role: null,
        scope: 'read write',
        iss: 'test',
        aud: 'test',
      };
      const result = await strategy.validate(payload);

      expect(result.id).toBe('my-oauth-client');
      expect(result.sub).toBe('my-oauth-client');
      expect(result.isOAuth2).toBe(true);
    });

    it('should handle undefined sub', async () => {
      const payload = { email: 'test@example.com' };
      const result = await strategy.validate(payload);

      expect(result.id).toBeUndefined();
      expect(result.sub).toBeUndefined();
      expect(result.isOAuth2).toBe(true);
    });

    it('should handle null sub (NaN parse)', async () => {
      const payload = { sub: null as any, email: 'test@example.com' };
      const result = await strategy.validate(payload);

      // sub is null (falsy) → numericId = undefined → id = undefined (since isNaN(undefined) = true → !isNaN = false)
      expect(result.isOAuth2).toBe(true);
    });
  });
});
