/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { RecaptchaService } from '../recaptcha/recaptcha.service';

/**
 * Controller for handling authentication-related microservice messages.
 *
 * Provides endpoints for user login and token refresh operations.
 */
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  /**
   * Handles user login requests.
   * Validates user credentials and returns a JWT access token if successful.
   * @param data Object containing the user's email and password.
   * @returns An object containing the access token and user.
   * @throws RpcException if login fails.
   */
  @MessagePattern({ cmd: 'login_user' })
  async login(data: {
    email: string;
    password: string;
    recaptchaToken?: string;
  }) {
    try {
      const secretPresent = !!process.env.RECAPTCHA_SECRET;
      if (secretPresent) {
        const verify = await this.recaptchaService.verify(
          data.recaptchaToken || '',
        );
        const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || '0.5');
        if (
          !verify ||
          !verify.success ||
          (typeof verify.score === 'number' && verify.score < minScore)
        ) {
          throw new RpcException('recaptcha verification failed');
        }
      }

      const user = await this.authService.validateUser(
        data.email,
        data.password,
      );
      return this.authService.login(user);
    } catch (error) {
      throw new RpcException(error.message || 'Login failed');
    }
  }

  /**
   * Exchanges a refresh token for a new access token, rotating the refresh
   * token. Possession of the token is the sole proof of identity.
   *
   * @param data Object containing the opaque refresh token.
   * @returns The new access token, the rotated refresh token and the user.
   * @throws RpcException if the token is invalid, consumed, revoked or expired.
   */
  @MessagePattern({ cmd: 'refresh_token' })
  async refresh(data: { refresh_token: string }) {
    try {
      return await this.authService.refreshSession(data?.refresh_token);
    } catch (error) {
      throw new RpcException(error.message || 'Refresh token failed');
    }
  }

  /**
   * Issues a refresh token for a user whose identity was established outside
   * the password flow — currently the social login callbacks, which
   * authenticate against Google/Facebook and then need a session.
   *
   * @param data Object containing the user id.
   */
  @MessagePattern({ cmd: 'issue_refresh_token' })
  async issueRefreshToken(data: { userId: number }) {
    try {
      return {
        refresh_token: await this.authService.issueRefreshToken(data?.userId),
      };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to issue refresh token');
    }
  }

  /**
   * Ends a session by revoking the presented refresh token.
   *
   * @param data Object containing the opaque refresh token.
   */
  @MessagePattern({ cmd: 'logout_user' })
  async logout(data: { refresh_token: string }) {
    try {
      return await this.authService.logout(data?.refresh_token);
    } catch (error) {
      throw new RpcException(error.message || 'Logout failed');
    }
  }
}
