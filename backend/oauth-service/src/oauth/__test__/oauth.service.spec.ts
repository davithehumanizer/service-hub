/* eslint-disable @typescript-eslint/unbound-method */
import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { OauthService } from '../oauth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OauthClient } from '../oauth.entity';
import { OauthAuthorizationCode } from '../oauth-authorization-code.entity';
import { OauthRefreshToken } from '../oauth-refresh-token.entity';
import { RpcException } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import * as bcrypt from 'bcryptjs';

// ── Test RSA keypair (generated once at module load) ─────────────────────────
const { privateKey: _privKey, publicKey: _pubKey } = crypto.generateKeyPairSync(
  'rsa',
  { modulusLength: 2048 },
);

const TEST_PRIVATE_KEY_PEM = _privKey.export({
  type: 'pkcs8',
  format: 'pem',
}) as string;
const TEST_PUBLIC_KEY_PEM = _pubKey.export({
  type: 'spki',
  format: 'pem',
}) as string;

process.env.OAUTH_PRIVATE_KEY =
  Buffer.from(TEST_PRIVATE_KEY_PEM).toString('base64');
process.env.OAUTH_PUBLIC_KEY =
  Buffer.from(TEST_PUBLIC_KEY_PEM).toString('base64');
process.env.OAUTH_RSA_KID = 'test-kid';
process.env.OIDC_ISSUER = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret';

// ── PKCE helper for tests ─────────────────────────────────────────────────────
function createPkce() {
  const codeVerifier = 'test_code_verifier_32_chars_long_abcdefgh';
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockClient = {
  client_id: 'test-client',
  client_secret: 'test-secret',
  scopes: ['read', 'write'],
  redirect_uris: ['http://localhost:4000/callback'],
};

const mockClientRepository = {
  findOne: jest.fn(),
};

const mockAuthCodeRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockRefreshTokenRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockUserService = {
  send: jest.fn(),
};

describe('OauthService', () => {
  let service: OauthService;
  let userService: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OauthService,
        {
          provide: getRepositoryToken(OauthClient),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(OauthAuthorizationCode),
          useValue: mockAuthCodeRepository,
        },
        {
          provide: getRepositoryToken(OauthRefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: 'USER_SERVICE',
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<OauthService>(OauthService);
    // Manually trigger lifecycle hook (TestingModule.compile() skips it)
    service.onModuleInit();
    userService = module.get<ClientProxy>('USER_SERVICE');
    jest.clearAllMocks();

    // Default refresh token mock behavior
    mockRefreshTokenRepository.create.mockImplementation((dto) => ({
      token: crypto.randomUUID(),
      ...dto,
    }));
    mockRefreshTokenRepository.save.mockImplementation((rec) =>
      Promise.resolve(rec),
    );
  });

  // ── client_credentials grant ────────────────────────────────────────────────
  describe('generateToken - client_credentials grant', () => {
    it('should generate a token for valid client credentials', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);
      const result = await service.generateToken({
        client_id: 'test-client',
        client_secret: 'test-secret',
        grant_type: 'client_credentials',
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('token_type', 'Bearer');
      expect(result).toHaveProperty('expires_in', 3600);
      expect(result).toHaveProperty('scope', 'read write');
    });

    it('should throw if grant_type is unsupported', async () => {
      await expect(
        service.generateToken({
          client_id: 'test-client',
          client_secret: 'test-secret',
          grant_type: 'password',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if client credentials are invalid', async () => {
      mockClientRepository.findOne.mockResolvedValue(undefined);
      await expect(
        service.generateToken({
          client_id: 'bad',
          client_secret: 'bad',
          grant_type: 'client_credentials',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should look the client up by id only, never by secret', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);
      await service.generateToken({
        client_id: 'test-client',
        client_secret: 'test-secret',
        grant_type: 'client_credentials',
      });

      expect(mockClientRepository.findOne).toHaveBeenCalledWith({
        where: { client_id: 'test-client' },
      });
    });

    it('should accept a bcrypt-hashed client secret', async () => {
      mockClientRepository.findOne.mockResolvedValue({
        ...mockClient,
        client_secret: await bcrypt.hash('test-secret', 4),
      });

      const result = await service.generateToken({
        client_id: 'test-client',
        client_secret: 'test-secret',
        grant_type: 'client_credentials',
      });

      expect(result).toHaveProperty('access_token');
    });

    it('should reject a wrong secret against a hashed one', async () => {
      mockClientRepository.findOne.mockResolvedValue({
        ...mockClient,
        client_secret: await bcrypt.hash('test-secret', 4),
      });

      await expect(
        service.generateToken({
          client_id: 'test-client',
          client_secret: 'wrong-secret',
          grant_type: 'client_credentials',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject a wrong secret against a legacy plaintext one', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);

      await expect(
        service.generateToken({
          client_id: 'test-client',
          client_secret: 'wrong-secret',
          grant_type: 'client_credentials',
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  // ── validateToken (RS256) ───────────────────────────────────────────────────
  it('should validate a valid RS256 token', async () => {
    mockClientRepository.findOne.mockResolvedValue(mockClient);
    const tokenResponse = (await service.generateToken({
      client_id: 'test-client',
      client_secret: 'test-secret',
      grant_type: 'client_credentials',
    })) as { access_token: string };
    const result = service.validateToken(tokenResponse.access_token);
    expect(result.active).toBe(true);
    expect(result.client).toBe('test-client');
    expect(result.scope).toBe('read write');
  });

  it('should return inactive for invalid token', () => {
    const result = service.validateToken('invalid.token');
    expect(result.active).toBe(false);
  });

  // ── Authorization Code Flow ─────────────────────────────────────────────────
  describe('OAuth2 Authorization Code Flow', () => {
    const { codeVerifier, codeChallenge } = createPkce();

    describe('validateAuthorizeRequest', () => {
      it('should validate a correct authorization request with PKCE', async () => {
        mockClientRepository.findOne.mockResolvedValue({
          ...mockClient,
          scopes: ['read', 'write', 'openid', 'profile', 'email'],
        });
        const result = await service.validateAuthorizeRequest({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });
        expect(result).toEqual({
          valid: true,
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'openid profile email',
        });
      });

      it('should use default scopes when scope is not provided', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        const result = await service.validateAuthorizeRequest({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          response_type: 'code',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });
        expect(result.scope).toBe('read write');
      });

      it('should throw RpcException for invalid response_type', async () => {
        await expect(
          service.validateAuthorizeRequest({
            client_id: 'test-client',
            redirect_uri: 'http://localhost:4000/callback',
            response_type: 'token',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should succeed for a confidential client without PKCE', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        const result = await service.validateAuthorizeRequest({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          response_type: 'code',
        });
        expect(result.valid).toBe(true);
      });

      it('should throw RpcException for unsupported code_challenge_method', async () => {
        await expect(
          service.validateAuthorizeRequest({
            client_id: 'test-client',
            redirect_uri: 'http://localhost:4000/callback',
            response_type: 'code',
            code_challenge: codeChallenge,
            code_challenge_method: 'plain',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for missing client_id', async () => {
        await expect(
          service.validateAuthorizeRequest({
            client_id: '',
            redirect_uri: 'http://localhost:4000/callback',
            response_type: 'code',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for missing redirect_uri', async () => {
        await expect(
          service.validateAuthorizeRequest({
            client_id: 'test-client',
            redirect_uri: '',
            response_type: 'code',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for invalid client_id', async () => {
        mockClientRepository.findOne.mockResolvedValue(null);
        await expect(
          service.validateAuthorizeRequest({
            client_id: 'invalid-client',
            redirect_uri: 'http://localhost:4000/callback',
            response_type: 'code',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for unregistered redirect_uri', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        await expect(
          service.validateAuthorizeRequest({
            client_id: 'test-client',
            redirect_uri: 'http://evil.com/callback',
            response_type: 'code',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          }),
        ).rejects.toThrow(RpcException);
      });
    });

    describe('generateAuthorizationCode', () => {
      it('should generate an authorization code', async () => {
        const mockAuthCode = {
          code: '550e8400-e29b-41d4-a716-446655440000',
          client_id: 'test-client',
          user_id: 1,
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'openid profile',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          used: false,
        };
        mockAuthCodeRepository.create.mockReturnValue(mockAuthCode);
        mockAuthCodeRepository.save.mockResolvedValue(mockAuthCode);
        mockAuthCodeRepository.delete.mockResolvedValue({});

        const result = await service.generateAuthorizationCode({
          client_id: 'test-client',
          user_id: 1,
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'openid profile',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

        expect(result).toEqual({
          code: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(mockAuthCodeRepository.delete).toHaveBeenCalled();
        expect(mockAuthCodeRepository.create).toHaveBeenCalled();
        expect(mockAuthCodeRepository.save).toHaveBeenCalledWith(mockAuthCode);
      });

      it('should clean up expired codes before generating new one', async () => {
        const mockAuthCode = {
          code: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          client_id: 'test-client',
          user_id: 2,
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'openid',
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          used: false,
        };
        mockAuthCodeRepository.create.mockReturnValue(mockAuthCode);
        mockAuthCodeRepository.save.mockResolvedValue(mockAuthCode);
        mockAuthCodeRepository.delete.mockResolvedValue({ affected: 5 });

        await service.generateAuthorizationCode({
          client_id: 'test-client',
          user_id: 2,
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'openid',
        });

        expect(mockAuthCodeRepository.delete).toHaveBeenCalledWith(
          expect.objectContaining({ expires_at: expect.anything() }),
        );
      });
    });

    describe('exchangeCodeForToken (authorization_code grant)', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: {
          name: 'user',
          permissions: [{ name: 'device.read' }, { name: 'repairer.search' }],
        },
        profile: { firstName: 'John', lastName: 'Doe' },
      };

      const validUUID = '123e4567-e89b-12d3-a456-426614174000';

      // Auth code without PKCE (PKCE check skipped)
      const mockAuthCodeNoPkce = {
        code: validUUID,
        client_id: 'test-client',
        user_id: 1,
        redirect_uri: 'http://localhost:4000/callback',
        scope: 'openid profile email',
        code_challenge: null,
        code_challenge_method: null,
        nonce: null,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
      };

      // Auth code with PKCE
      const mockAuthCodeWithPkce = {
        ...mockAuthCodeNoPkce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      };

      it('should exchange a valid authorization code for tokens (no PKCE on code)', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeNoPkce,
        });
        mockAuthCodeRepository.save.mockResolvedValue({
          ...mockAuthCodeNoPkce,
          used: true,
        });
        mockUserService.send.mockReturnValue(of(mockUser));

        const result = await service.generateToken({
          grant_type: 'authorization_code',
          code: validUUID,
          redirect_uri: 'http://localhost:4000/callback',
          client_id: 'test-client',
          client_secret: 'test-secret',
        });

        expect(result).toHaveProperty('access_token');
        expect(result).toHaveProperty('token_type', 'Bearer');
        expect(result).toHaveProperty('expires_in', 3600);
        expect(result).toHaveProperty('scope', 'openid profile email');
        expect(result).toHaveProperty('refresh_token');
        expect(mockAuthCodeRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ used: true }),
        );
      });

      it('should include id_token when scope contains "openid"', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeNoPkce,
        });
        mockAuthCodeRepository.save.mockResolvedValue({
          ...mockAuthCodeNoPkce,
          used: true,
        });
        mockUserService.send.mockReturnValue(of(mockUser));

        const result = await service.generateToken({
          grant_type: 'authorization_code',
          code: validUUID,
          redirect_uri: 'http://localhost:4000/callback',
          client_id: 'test-client',
          client_secret: 'test-secret',
        });

        expect(result).toHaveProperty('id_token');
      });

      it('should not include id_token when scope does not contain "openid"', async () => {
        const noOpenidCode = { ...mockAuthCodeNoPkce, scope: 'read write' };
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue(noOpenidCode);
        mockAuthCodeRepository.save.mockResolvedValue({
          ...noOpenidCode,
          used: true,
        });
        mockUserService.send.mockReturnValue(of(mockUser));

        const result = await service.generateToken({
          grant_type: 'authorization_code',
          code: validUUID,
          redirect_uri: 'http://localhost:4000/callback',
          client_id: 'test-client',
          client_secret: 'test-secret',
        });

        expect(result).not.toHaveProperty('id_token');
      });

      it('should verify PKCE and exchange code when code_verifier is valid', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeWithPkce,
        });
        mockAuthCodeRepository.save.mockResolvedValue({
          ...mockAuthCodeWithPkce,
          used: true,
        });
        mockUserService.send.mockReturnValue(of(mockUser));

        const result = await service.generateToken({
          grant_type: 'authorization_code',
          code: validUUID,
          redirect_uri: 'http://localhost:4000/callback',
          client_id: 'test-client',
          client_secret: 'test-secret',
          code_verifier: codeVerifier,
        });

        expect(result).toHaveProperty('access_token');
      });

      it('should throw RpcException when code_verifier is missing and code has PKCE', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeWithPkce,
        });
        mockAuthCodeRepository.save.mockResolvedValue({
          ...mockAuthCodeWithPkce,
          used: true,
        });

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException when code_verifier is invalid', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeWithPkce,
        });
        mockAuthCodeRepository.save.mockResolvedValue({
          ...mockAuthCodeWithPkce,
          used: true,
        });

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
            code_verifier: 'wrong_verifier',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for invalid authorization code format', async () => {
        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: 'invalid-format-not-uuid',
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for invalid client credentials', async () => {
        mockClientRepository.findOne.mockResolvedValue(null);

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'invalid-client',
            client_secret: 'wrong-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for non-existent authorization code', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue(null);

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: '00000000-0000-0000-0000-000000000000',
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for already used code', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeNoPkce,
          used: true,
        });

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for expired code', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeNoPkce,
          expires_at: new Date(Date.now() - 1000),
        });

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for client mismatch', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeNoPkce,
          client_id: 'other-client',
        });

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for redirect_uri mismatch', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeNoPkce,
        });

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://evil.com/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException when user not found', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...mockAuthCodeNoPkce,
        });
        mockAuthCodeRepository.save.mockResolvedValue({
          ...mockAuthCodeNoPkce,
          used: true,
        });
        mockUserService.send.mockReturnValue(of(null));

        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            code: validUUID,
            redirect_uri: 'http://localhost:4000/callback',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for missing code or redirect_uri', async () => {
        await expect(
          service.generateToken({
            grant_type: 'authorization_code',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });
    });

    // ── refresh_token grant ───────────────────────────────────────────────────
    describe('generateToken - refresh_token grant', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        profile: null,
      };

      const mockRefreshRecord = {
        id: 'some-uuid',
        token: 'valid-refresh-token-uuid',
        client_id: 'test-client',
        user_id: 1,
        scope: 'openid profile email',
        nonce: null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        used: false,
      };

      it('should rotate refresh token and return new tokens', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        // Copy: the service marks the record as used, and mutating the shared
        // fixture would leak `used: true` into the tests that follow.
        mockRefreshTokenRepository.findOne.mockResolvedValue({
          ...mockRefreshRecord,
        });
        mockRefreshTokenRepository.save.mockImplementation((rec) =>
          Promise.resolve(rec),
        );
        mockUserService.send.mockReturnValue(of(mockUser));

        const result = await service.generateToken({
          grant_type: 'refresh_token',
          client_id: 'test-client',
          client_secret: 'test-secret',
          refresh_token: 'valid-refresh-token-uuid',
        });

        expect(result).toHaveProperty('access_token');
        expect(result).toHaveProperty('refresh_token');
        expect(result).toHaveProperty('token_type', 'Bearer');
        // Old record should be saved as used
        expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ used: true }),
        );
      });

      it('should throw RpcException for invalid refresh token', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockRefreshTokenRepository.findOne.mockResolvedValue(null);

        await expect(
          service.generateToken({
            grant_type: 'refresh_token',
            client_id: 'test-client',
            client_secret: 'test-secret',
            refresh_token: 'nonexistent-token',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException for already used refresh token', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockRefreshTokenRepository.findOne.mockResolvedValue({
          ...mockRefreshRecord,
          used: true,
        });

        await expect(
          service.generateToken({
            grant_type: 'refresh_token',
            client_id: 'test-client',
            client_secret: 'test-secret',
            refresh_token: 'valid-refresh-token-uuid',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should revoke the whole token set when a used token is replayed', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockRefreshTokenRepository.findOne.mockResolvedValue({
          ...mockRefreshRecord,
          used: true,
        });

        await expect(
          service.generateToken({
            grant_type: 'refresh_token',
            client_id: 'test-client',
            client_secret: 'test-secret',
            refresh_token: 'valid-refresh-token-uuid',
          }),
        ).rejects.toThrow(RpcException);

        // The leaked copy still in circulation must be invalidated too.
        expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
          { user_id: 1, client_id: 'test-client', used: false },
          { used: true },
        );
      });

      it('should throw RpcException for expired refresh token', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockRefreshTokenRepository.findOne.mockResolvedValue({
          ...mockRefreshRecord,
          expires_at: new Date(Date.now() - 1000),
        });

        await expect(
          service.generateToken({
            grant_type: 'refresh_token',
            client_id: 'test-client',
            client_secret: 'test-secret',
            refresh_token: 'valid-refresh-token-uuid',
          }),
        ).rejects.toThrow(RpcException);
      });

      it('should throw RpcException when missing refresh_token field', async () => {
        await expect(
          service.generateToken({
            grant_type: 'refresh_token',
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        ).rejects.toThrow(RpcException);
      });
    });

    describe('effective scope for user tokens', () => {
      const authCodeWideScope = {
        code: '123e4567-e89b-12d3-a456-426614174000',
        client_id: 'test-client',
        user_id: 1,
        redirect_uri: 'http://localhost:4000/callback',
        // The client is registered for far more than a plain user may do.
        scope: 'openid profile device.read user.get_all permission.create',
        code_challenge: null,
        code_challenge_method: null,
        nonce: null,
        expires_at: new Date(Date.now() + 600000),
        used: false,
      };

      const plainUser = {
        id: 1,
        email: 'test@example.com',
        role: { name: 'user', permissions: [{ name: 'device.read' }] },
        profile: null,
      };

      it('grants only the intersection of client scopes and user permissions', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...authCodeWideScope,
        });
        mockAuthCodeRepository.save.mockImplementation((r) =>
          Promise.resolve(r),
        );
        mockRefreshTokenRepository.create.mockImplementation((r) => r);
        mockRefreshTokenRepository.save.mockImplementation((r) =>
          Promise.resolve(r),
        );
        mockUserService.send.mockReturnValue(of(plainUser));

        const result: any = await service.generateToken({
          grant_type: 'authorization_code',
          client_id: 'test-client',
          client_secret: 'test-secret',
          code: authCodeWideScope.code,
          redirect_uri: authCodeWideScope.redirect_uri,
        });

        const granted = (result.scope as string).split(' ');
        expect(granted).toContain('device.read');
        // Protocol scopes survive regardless of role.
        expect(granted).toContain('openid');
        expect(granted).toContain('profile');
        // The client's admin scopes must not leak into a plain user's token.
        expect(granted).not.toContain('user.get_all');
        expect(granted).not.toContain('permission.create');
      });

      it('keeps a scope the user does hold via their role', async () => {
        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockAuthCodeRepository.findOne.mockResolvedValue({
          ...authCodeWideScope,
        });
        mockAuthCodeRepository.save.mockImplementation((r) =>
          Promise.resolve(r),
        );
        mockRefreshTokenRepository.create.mockImplementation((r) => r);
        mockRefreshTokenRepository.save.mockImplementation((r) =>
          Promise.resolve(r),
        );
        mockUserService.send.mockReturnValue(
          of({
            ...plainUser,
            role: {
              name: 'admin',
              permissions: [
                { name: 'device.read' },
                { name: 'user.get_all' },
                { name: 'permission.create' },
              ],
            },
          }),
        );

        const result: any = await service.generateToken({
          grant_type: 'authorization_code',
          client_id: 'test-client',
          client_secret: 'test-secret',
          code: authCodeWideScope.code,
          redirect_uri: authCodeWideScope.redirect_uri,
        });

        expect((result.scope as string).split(' ')).toContain('user.get_all');
      });
    });

    describe('getUserInfo', () => {
      it('should report email_verified from the account state', async () => {
        mockUserService.send.mockReturnValue(
          of({
            id: 1,
            email: 'verified@example.com',
            isVerified: true,
            profile: null,
          }),
        );

        const result = await service.getUserInfo(1);

        expect(result.email_verified).toBe(true);
      });

      it('should report email_verified false for an unverified account', async () => {
        mockUserService.send.mockReturnValue(
          of({
            id: 1,
            email: 'pending@example.com',
            isVerified: false,
            profile: null,
          }),
        );

        const result = await service.getUserInfo(1);

        expect(result.email_verified).toBe(false);
      });

      it('should return user info for valid user ID', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          role: 'user',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
          },
        };
        mockUserService.send.mockReturnValue(of(mockUser));

        const result = await service.getUserInfo(1);

        expect(result).toMatchObject({
          sub: '1',
          email: 'test@example.com',
          name: 'John Doe',
          given_name: 'John',
          family_name: 'Doe',
        });
        expect(mockUserService.send).toHaveBeenCalledWith(
          { cmd: 'find_user_by_id' },
          1,
        );
      });

      it('should return user info without profile data', async () => {
        const mockUser = {
          id: 2,
          email: 'no-profile@example.com',
          profile: null,
        };
        mockUserService.send.mockReturnValue(of(mockUser));

        const result = await service.getUserInfo(2);

        expect(result).toMatchObject({
          sub: '2',
          email: 'no-profile@example.com',
        });
        expect(result.given_name).toBeUndefined();
        expect(result.family_name).toBeUndefined();
      });

      it('should throw RpcException when user not found', async () => {
        mockUserService.send.mockReturnValue(of(null));

        await expect(service.getUserInfo(999)).rejects.toThrow(RpcException);
      });
    });
  });

  // ── JWKS ────────────────────────────────────────────────────────────────────
  describe('getJwks', () => {
    it('should return a JWKS object with RSA key', () => {
      const jwks = service.getJwks();
      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBeGreaterThan(0);
      const key = jwks.keys[0];
      expect(key.kty).toBe('RSA');
      expect(key.alg).toBe('RS256');
      expect(key.use).toBe('sig');
      expect(key.kid).toBe('test-kid');
      expect(key.n).toBeDefined();
      expect(key.e).toBeDefined();
    });
  });

  // ── socialLogin ─────────────────────────────────────────────────────────────
  describe('socialLogin', () => {
    it('should throw RpcException if user is null or email is missing', async () => {
      await expect(service.socialLogin(null)).rejects.toThrow(RpcException);
      await expect(service.socialLogin({ firstName: 'John' })).rejects.toThrow(
        RpcException,
      );
    });

    it('should return a token for an existing social user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      mockUserService.send.mockReturnValueOnce(of(mockUser));

      const result = await service.socialLogin({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(userService.send).toHaveBeenCalledWith(
        { cmd: 'find_user_by_email' },
        'test@example.com',
      );
      expect(result).toHaveProperty('access_token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should create a new user and return a token for a new social user', async () => {
      const newUser = {
        id: 2,
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      };
      mockUserService.send.mockReturnValueOnce(of(null));
      mockUserService.send.mockReturnValueOnce(of(newUser));

      const result = await service.socialLogin({
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(userService.send).toHaveBeenCalledWith(
        { cmd: 'find_user_by_email' },
        'new@example.com',
      );
      expect(userService.send).toHaveBeenCalledWith(
        { cmd: 'create_user' },
        expect.objectContaining({
          email: 'new@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      );
      expect(result).toHaveProperty('access_token');
      expect(result.user.email).toBe('new@example.com');
    });
  });
});
