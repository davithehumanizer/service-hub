import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OauthService } from './oauth.service';

@Controller()
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  // ────────────────────────────────────────────────────────────────────────────
  // Token endpoint (authorization_code / client_credentials / refresh_token)
  // ────────────────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'oauth2_token' })
  handleOauth2Token(
    @Payload()
    data: {
      client_id: string;
      client_secret: string;
      grant_type: string;
      code?: string;
      redirect_uri?: string;
      code_verifier?: string;
      refresh_token?: string;
    },
  ) {
    return this.oauthService.generateToken(data);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Token introspection
  // ────────────────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'validate_token' })
  validateToken(@Payload() data: { token: string }) {
    return this.oauthService.validateToken(data.token);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Authorization Code Flow: request validation
  // ────────────────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'oauth2_validate_authorize' })
  validateAuthorizeRequest(
    @Payload()
    data: {
      client_id: string;
      redirect_uri: string;
      response_type: string;
      scope?: string;
      code_challenge?: string;
      code_challenge_method?: string;
    },
  ) {
    return this.oauthService.validateAuthorizeRequest(data);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Authorization Code Flow: code issuance
  // ────────────────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'oauth2_generate_code' })
  generateAuthorizationCode(
    @Payload()
    data: {
      client_id: string;
      user_id: number;
      redirect_uri: string;
      scope?: string;
      code_challenge?: string;
      code_challenge_method?: string;
      nonce?: string;
    },
  ) {
    return this.oauthService.generateAuthorizationCode(data);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UserInfo (OIDC)
  // ────────────────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'oauth2_userinfo' })
  getUserInfo(@Payload() data: { user_id: number }) {
    return this.oauthService.getUserInfo(data.user_id);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // JWKS — public key set for RS256 token verification
  // ────────────────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'oauth2_jwks' })
  getJwks() {
    return this.oauthService.getJwks();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Social login
  // ────────────────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'social_login' })
  socialLogin(@Payload() data: { user: any }) {
    return this.oauthService.socialLogin(data.user);
  }
}
