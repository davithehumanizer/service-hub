/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Body,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Get,
  UseGuards,
  Req,
  Res,
  Version,
  Query,
  HttpCode,
  Header,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OAuth2TokenDto } from './dto/oauth2-token.dto';
import { OAuth2AuthorizeDto } from './dto/oauth2-authorize.dto';
import { LoginResponseDto } from './dto/response/login-response.dto';
import { RefreshTokenResponseDto } from './dto/response/refresh-token-response.dto';
import { OAuth2TokenResponseDto } from './dto/response/oauth2-token-response.dto';
import { UserInfoResponseDto } from './dto/response/userinfo-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) {}

  // ==========================================
  // OAuth2 Authorization Code Flow Endpoints
  // ==========================================

  /**
   * OAuth2 Authorization Endpoint
   * Step 1: Validates the request and redirects to login page with OAuth2 context
   */
  @Version('1')
  @Get('oauth2/authorize')
  @ApiOperation({
    summary:
      'OAuth2 Authorization endpoint - initiates authorization code flow',
  })
  @ApiQuery({
    name: 'client_id',
    required: true,
    description: 'OAuth2 client ID',
  })
  @ApiQuery({
    name: 'redirect_uri',
    required: true,
    description: 'Callback URL',
  })
  @ApiQuery({
    name: 'response_type',
    required: true,
    description: 'Must be "code"',
  })
  @ApiQuery({ name: 'scope', required: false, description: 'Requested scopes' })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'CSRF protection state',
  })
  @ApiResponse({ status: 302, description: 'Redirects to login page' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async oauth2Authorize(
    @Query() query: OAuth2AuthorizeDto,
    @Res() res: Response,
  ) {
    this.logger.log('oauth2Authorize called', { query });

    try {
      // Validate the authorization request
      const validation = await firstValueFrom(
        this.authService.send({ cmd: 'oauth2_validate_authorize' }, query),
      );

      if (!validation.valid) {
        throw new BadRequestException('Invalid authorization request');
      }

      // Store OAuth2 params in URL and redirect to frontend login
      // The frontend will store these in sessionStorage
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010';
      const oauthParams = new URLSearchParams({
        oauth_client_id: query.client_id,
        oauth_redirect_uri: query.redirect_uri,
        oauth_scope: query.scope || '',
        oauth_state: query.state || '',
        oauth_code_challenge: query.code_challenge || '',
        oauth_code_challenge_method: query.code_challenge_method || '',
        oauth_nonce: query.nonce || '',
      });

      const loginUrl = `${frontendUrl}/login?${oauthParams.toString()}`;
      this.logger.log('Redirecting to login page', { loginUrl });
      return res.redirect(302, loginUrl);
    } catch (error) {
      this.logger.error(
        'oauth2Authorize error: ' + (error?.message || error),
        error?.stack,
      );
      throw new BadRequestException(
        error?.message || 'Invalid authorization request',
      );
    }
  }

  /**
   * OAuth2 Authorization Callback
   * Step 2: After user logs in, generates authorization code and redirects to client
   */
  @Version('1')
  @Get('oauth2/authorize/callback')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'OAuth2 Authorization callback - generates code after authentication',
  })
  @ApiQuery({ name: 'client_id', required: true })
  @ApiQuery({ name: 'redirect_uri', required: true })
  @ApiQuery({ name: 'scope', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'code_challenge', required: false })
  @ApiQuery({ name: 'code_challenge_method', required: false })
  @ApiQuery({ name: 'nonce', required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns redirect URL with authorization code',
  })
  async oauth2AuthorizeCallback(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Query('nonce') nonce: string,
    @Req() req,
  ) {
    this.logger.log('oauth2AuthorizeCallback called', {
      clientId,
      redirectUri,
      scope,
      state,
      userId: req.user?.id,
    });

    // Re-validate before minting a code, and *outside* the try below: step 1
    // (/oauth2/authorize) checked redirect_uri against the client's allow-list,
    // but this endpoint is reachable directly. An unvalidated redirect_uri
    // would have the authorization code — or, via the error branch, an open
    // redirect — delivered to an attacker-chosen URL. Failing here must return
    // an error to the caller, never a redirect to that URL.
    const validation = await firstValueFrom(
      this.authService.send(
        { cmd: 'oauth2_validate_authorize' },
        {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: scope || undefined,
          code_challenge: codeChallenge || undefined,
          code_challenge_method: codeChallengeMethod || undefined,
        },
      ),
    ).catch((error) => {
      this.logger.warn(
        'oauth2AuthorizeCallback rejected: ' + (error?.message || error),
      );
      throw new BadRequestException(
        error?.message || 'Invalid authorization request',
      );
    });

    if (!validation?.valid) {
      throw new BadRequestException('Invalid authorization request');
    }

    try {
      const codeResult = await firstValueFrom(
        this.authService.send(
          { cmd: 'oauth2_generate_code' },
          {
            client_id: clientId,
            user_id: req.user.id,
            redirect_uri: redirectUri,
            scope,
            code_challenge: codeChallenge || undefined,
            code_challenge_method: codeChallengeMethod || undefined,
            nonce: nonce || undefined,
          },
        ),
      );

      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', codeResult.code);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }

      this.logger.log('Returning redirect URL', {
        url: callbackUrl.toString(),
      });
      return { url: callbackUrl.toString() };
    } catch (error) {
      this.logger.error(
        'oauth2AuthorizeCallback error: ' + (error?.message || error),
        error?.stack,
      );

      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set('error', 'server_error');
      errorUrl.searchParams.set(
        'error_description',
        error?.message || 'Authorization failed',
      );
      if (state) {
        errorUrl.searchParams.set('state', state);
      }
      return { url: errorUrl.toString() };
    }
  }

  /**
   * OAuth2 UserInfo Endpoint
   * Returns profile information about the authenticated user
   */
  @Version('1')
  @Get('oauth2/userinfo')
  @UseGuards(AuthGuard(['jwt', 'oauth-jwt']))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user info from access token (OIDC userinfo endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'User information',
    type: UserInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async oauth2UserInfo(@Req() req): Promise<UserInfoResponseDto> {
    this.logger.log('oauth2UserInfo called', { user: req.user });

    try {
      const userInfo = await firstValueFrom(
        this.authService.send(
          { cmd: 'oauth2_userinfo' },
          { user_id: req.user.id },
        ),
      );
      return userInfo;
    } catch (error) {
      this.logger.error(
        'oauth2UserInfo error: ' + (error?.message || error),
        error?.stack,
      );
      throw new UnauthorizedException(
        error?.message || 'Failed to get user info',
      );
    }
  }

  // ==========================================
  // Existing Social Login Endpoints
  // ==========================================

  @Version('1')
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  async googleAuth(@Req() req) {}

  /**
   * Builds the front-end redirect for a completed social login.
   *
   * Tokens go in the URL fragment, not the query string: fragments are never
   * sent to the server, so they stay out of Apache access logs, Referer
   * headers and proxy logs.
   */
  private async buildSocialRedirectUrl(socialResult: any): Promise<string> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010';
    const accessToken = String(socialResult?.access_token || '');

    let refreshToken = '';
    const userId = socialResult?.user?.id;
    if (userId) {
      try {
        const issued = await firstValueFrom(
          this.userService.send({ cmd: 'issue_refresh_token' }, { userId }),
        );
        refreshToken = String(issued?.refresh_token || '');
      } catch (error) {
        // Without a refresh token the session simply ends at access-token
        // expiry instead of failing the login outright.
        this.logger.warn(
          'social login: failed to issue refresh token: ' + error?.message,
        );
      }
    }

    const fragment = new URLSearchParams({ token: accessToken });
    if (refreshToken) {
      fragment.set('refresh_token', refreshToken);
    }
    return `${frontendUrl}/login#${fragment.toString()}`;
  }

  @Version('1')
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback and redirect' })
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await firstValueFrom(
      this.authService.send({ cmd: 'social_login' }, { user: req.user }),
    );
    return res.redirect(302, await this.buildSocialRedirectUrl(result));
  }

  @Version('1')
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth authentication' })
  async facebookAuth(@Req() req) {}

  @Version('1')
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Handle Facebook OAuth callback and redirect' })
  async facebookAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await firstValueFrom(
      this.authService.send({ cmd: 'social_login' }, { user: req.user }),
    );
    return res.redirect(302, await this.buildSocialRedirectUrl(result));
  }

  // ==========================================
  // Standard Authentication Endpoints
  // ==========================================

  @Version('1')
  // Credential endpoint: tight limit to blunt password spraying.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully logged in.',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() body: LoginDto, @Req() req): Promise<LoginResponseDto> {
    this.logger.log('login called', {
      email: body.email,
      recaptchaToken: !!body.recaptchaToken,
    });
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'login_user' }, body),
      );
      this.logger.log('login result', { userId: result?.user?.id });
      return result;
    } catch (error) {
      this.logger.error(
        'login error: ' + (error.message || error),
        error.stack,
      );
      throw new UnauthorizedException(error.message || 'Unauthorized');
    }
  }

  @Version('1')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh authentication token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully.',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async refresh(
    @Body() body: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    this.logger.log('refresh called');
    try {
      const result = await firstValueFrom(
        this.userService.send(
          { cmd: 'refresh_token' },
          { refresh_token: body.refresh_token },
        ),
      );
      this.logger.log('refresh result', { userId: result?.user?.id });
      return result;
    } catch (error) {
      this.logger.error('refresh error: ' + error?.message, error?.stack);
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Version('1')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke a refresh token and end the session' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Session ended.' })
  async logout(@Body() body: RefreshTokenDto): Promise<{ success: boolean }> {
    this.logger.log('logout called');
    try {
      return await firstValueFrom(
        this.userService.send(
          { cmd: 'logout_user' },
          { refresh_token: body.refresh_token },
        ),
      );
    } catch (error) {
      // Logging out is best-effort: a client discarding an already-invalid
      // token must still end up logged out.
      this.logger.warn('logout error: ' + error?.message);
      return { success: true };
    }
  }

  @Version('1')
  @Post('oauth2/token')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @ApiOperation({
    summary:
      'OAuth2 token endpoint (client_credentials and authorization_code)',
  })
  @ApiBody({ type: OAuth2TokenDto })
  @ApiResponse({
    status: 200,
    description: 'OAuth2 token generated.',
    type: OAuth2TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'OAuth2 Unauthorized.' })
  async oauth2Token(
    @Body() body: OAuth2TokenDto,
    @Req() req,
  ): Promise<OAuth2TokenResponseDto> {
    // If client_id/secret not provided in body, try extracting from Basic Authorization header
    try {
      const authHeader =
        req?.headers?.authorization || req?.headers?.Authorization;
      if (
        (!body.client_id || !body.client_secret) &&
        typeof authHeader === 'string' &&
        authHeader.startsWith('Basic ')
      ) {
        const b64 = authHeader.slice('Basic '.length);
        try {
          const decoded = Buffer.from(b64, 'base64').toString('utf8'); // "client_id:client_secret"
          const idx = decoded.indexOf(':');
          if (idx !== -1) {
            body.client_id = body.client_id || decoded.slice(0, idx);
            body.client_secret = body.client_secret || decoded.slice(idx + 1);
          }
        } catch (err) {
          this.logger.warn(
            'Failed to parse Basic auth header for oauth2 token',
          );
        }
      }

      this.logger.log('oauth2Token called', {
        grant_type: body.grant_type,
        client_id: body.client_id,
      });
      const result = await firstValueFrom(
        this.authService.send({ cmd: 'oauth2_token' }, body),
      );
      this.logger.log('oauth2Token result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'oauth2Token error: ' + (error?.message || error),
        error?.stack,
      );
      const message: string =
        typeof error?.message === 'string'
          ? error.message
          : String(error?.message ?? 'Unknown error');
      const { rfcError, httpStatus } = mapToRfcError(message);
      throw new HttpException(
        { error: rfcError, error_description: message },
        httpStatus,
      );
    }
  }
}

/** Maps an oauth-service error message to an RFC 6749 §5.2 error code and HTTP status. */
function mapToRfcError(message: string): {
  rfcError: string;
  httpStatus: number;
} {
  if (message === 'Invalid client credentials') {
    return { rfcError: 'invalid_client', httpStatus: 401 };
  }
  if (message.toLowerCase().includes('grant_type')) {
    return { rfcError: 'unsupported_grant_type', httpStatus: 400 };
  }
  if (message.toLowerCase().includes('scope')) {
    return { rfcError: 'invalid_scope', httpStatus: 400 };
  }
  if (message.toLowerCase().includes('user not found')) {
    return { rfcError: 'server_error', httpStatus: 500 };
  }
  if (
    message.toLowerCase().includes('authorization code') ||
    message.toLowerCase().includes('code_verifier') ||
    message.toLowerCase().includes('redirect uri') ||
    message.toLowerCase().includes('refresh token') ||
    message.toLowerCase().includes('code or redirect')
  ) {
    return { rfcError: 'invalid_grant', httpStatus: 400 };
  }
  return { rfcError: 'invalid_request', httpStatus: 400 };
}
