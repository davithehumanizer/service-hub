import { Test, TestingModule } from '@nestjs/testing';
import { OauthController } from '../oauth.controller';
import { OauthService } from '../oauth.service';

const mockOauthService = {
  generateToken: jest.fn(),
  validateToken: jest.fn(),
  validateAuthorizeRequest: jest.fn(),
  generateAuthorizationCode: jest.fn(),
  getUserInfo: jest.fn(),
  socialLogin: jest.fn(),
  getJwks: jest.fn(),
};

describe('OauthController', () => {
  let controller: OauthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OauthController],
      providers: [{ provide: OauthService, useValue: mockOauthService }],
    }).compile();
    controller = module.get<OauthController>(OauthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleOauth2Token', () => {
    it('should handle oauth2_token with client_credentials grant', () => {
      const data = {
        client_id: 'a',
        client_secret: 'b',
        grant_type: 'client_credentials',
      };
      mockOauthService.generateToken.mockReturnValue({ access_token: 'tok' });
      const result = controller.handleOauth2Token(data);
      expect(result).toEqual({ access_token: 'tok' });
      expect(mockOauthService.generateToken).toHaveBeenCalledWith(data);
    });

    it('should handle oauth2_token with authorization_code grant', () => {
      const data = {
        client_id: 'test-client',
        client_secret: 'test-secret',
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        redirect_uri: 'http://localhost:4000/callback',
      };
      const mockResponse = {
        access_token: 'access-token-xyz',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email',
      };
      mockOauthService.generateToken.mockReturnValue(mockResponse);
      const result = controller.handleOauth2Token(data);
      expect(result).toEqual(mockResponse);
      expect(mockOauthService.generateToken).toHaveBeenCalledWith(data);
    });
  });

  it('should handle validate_token', () => {
    const data = { token: 'abc' };
    mockOauthService.validateToken.mockReturnValue({ active: true });
    const result = controller.validateToken(data);
    expect(result).toEqual({ active: true });
    expect(mockOauthService.validateToken).toHaveBeenCalledWith('abc');
  });

  it('should handle oauth2_jwks', () => {
    const mockJwks = {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          kid: 'test-kid',
          n: 'abc',
          e: 'AQAB',
        },
      ],
    };
    mockOauthService.getJwks.mockReturnValue(mockJwks);
    const result = controller.getJwks();
    expect(result).toEqual(mockJwks);
    expect(mockOauthService.getJwks).toHaveBeenCalled();
  });

  describe('OAuth2 Authorization Code Flow', () => {
    describe('validateAuthorizeRequest', () => {
      it('should validate authorization request', () => {
        const data = {
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          response_type: 'code',
          scope: 'openid profile email',
        };
        const mockResponse = {
          valid: true,
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'openid profile email',
        };
        mockOauthService.validateAuthorizeRequest.mockReturnValue(mockResponse);
        const result = controller.validateAuthorizeRequest(data);
        expect(result).toEqual(mockResponse);
        expect(mockOauthService.validateAuthorizeRequest).toHaveBeenCalledWith(
          data,
        );
      });

      it('should handle validation with minimal data', () => {
        const data = {
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          response_type: 'code',
        };
        const mockResponse = {
          valid: true,
          client_id: 'test-client',
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'read write',
        };
        mockOauthService.validateAuthorizeRequest.mockReturnValue(mockResponse);
        const result = controller.validateAuthorizeRequest(data);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('generateAuthorizationCode', () => {
      it('should generate authorization code', () => {
        const data = {
          client_id: 'test-client',
          user_id: 1,
          redirect_uri: 'http://localhost:4000/callback',
          scope: 'openid profile email',
        };
        const mockResponse = { code: 'auth-code-123' };
        mockOauthService.generateAuthorizationCode.mockReturnValue(
          mockResponse,
        );
        const result = controller.generateAuthorizationCode(data);
        expect(result).toEqual(mockResponse);
        expect(mockOauthService.generateAuthorizationCode).toHaveBeenCalledWith(
          data,
        );
      });

      it('should generate code without scope', () => {
        const data = {
          client_id: 'test-client',
          user_id: 2,
          redirect_uri: 'http://localhost:4000/callback',
        };
        const mockResponse = { code: 'auth-code-456' };
        mockOauthService.generateAuthorizationCode.mockReturnValue(
          mockResponse,
        );
        const result = controller.generateAuthorizationCode(data);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getUserInfo', () => {
      it('should return user info', () => {
        const data = { user_id: 1 };
        const mockResponse = {
          sub: '1',
          email: 'test@example.com',
          name: 'John Doe',
          given_name: 'John',
          family_name: 'Doe',
        };
        mockOauthService.getUserInfo.mockReturnValue(mockResponse);
        const result = controller.getUserInfo(data);
        expect(result).toEqual(mockResponse);
        expect(mockOauthService.getUserInfo).toHaveBeenCalledWith(1);
      });

      it('should handle user without profile', () => {
        const data = { user_id: 2 };
        const mockResponse = {
          sub: '2',
          email: 'no-profile@example.com',
          name: undefined,
          given_name: undefined,
          family_name: undefined,
        };
        mockOauthService.getUserInfo.mockReturnValue(mockResponse);
        const result = controller.getUserInfo(data);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('socialLogin', () => {
      it('should handle social login', () => {
        const data = {
          user: {
            email: 'social@example.com',
            firstName: 'Social',
            lastName: 'User',
          },
        };
        const mockResponse = {
          access_token: 'social-token-xyz',
          token_type: 'Bearer',
          expires_in: 3600,
          user: { id: 1, email: 'social@example.com' },
        };
        mockOauthService.socialLogin.mockReturnValue(mockResponse);
        const result = controller.socialLogin(data);
        expect(result).toEqual(mockResponse);
        expect(mockOauthService.socialLogin).toHaveBeenCalledWith(data.user);
      });

      it('should handle social login for new user', () => {
        const data = {
          user: {
            email: 'new-social@example.com',
            firstName: 'New',
            lastName: 'Social',
          },
        };
        const mockResponse = {
          access_token: 'new-social-token',
          token_type: 'Bearer',
          expires_in: 3600,
          user: { id: 99, email: 'new-social@example.com' },
        };
        mockOauthService.socialLogin.mockReturnValue(mockResponse);
        const result = controller.socialLogin(data);
        expect(result).toEqual(mockResponse);
      });
    });
  });
});
