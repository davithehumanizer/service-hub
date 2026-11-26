/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  Controller,
  Post,
  Body,
  Inject,
  Get,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  Put,
  Param,
  Logger,
  Version,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/auth/permission.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordWithTokenDto } from './dto/reset-password-with-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateContributorDto } from './dto/create-contributor.dto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { ConfirmAccountResponseDto } from './dto/response/confirm-account-response.dto';
import { ResetPasswordResponseDto } from './dto/response/reset-password-response.dto';
import { UpdateProfileResponseDto } from './dto/response/update-profile-response.dto';
import { UsersListResponseDto } from './dto/response/users-list-response.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  @Version('1')
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  // Account creation is unauthenticated and sends an email: keep it slow.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async register(
    @Body() body: RegisterUserDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<UserResponseDto> {
    this.logger.log('register called', {
      email: body.email,
      recaptchaToken: !!body.recaptchaToken,
    });
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'register_user' }, { ...body, locale }),
      );
      this.logger.log('register result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'register error: ' + (error.message || error),
        error.stack,
      );
      throw new HttpException(
        error.message || 'Failed to register user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Version('1')
  @Get('confirm/:token')
  @ApiOperation({ summary: 'Confirm user account with token' })
  @ApiParam({
    name: 'token',
    type: 'string',
    description: 'Confirmation token',
  })
  @ApiResponse({
    status: 200,
    description: 'Account confirmed successfully.',
    type: ConfirmAccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async confirmAccount(
    @Param('token') token: string,
  ): Promise<ConfirmAccountResponseDto> {
    this.logger.log('confirmAccount called', { token });
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'confirm_account' }, { token }),
      );
      this.logger.log('confirmAccount result', { result });
      return result;
    } catch (error) {
      this.logger.error('confirmAccount error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to confirm account',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Version('1')
  @Post('reset-password/:token')
  @ApiOperation({ summary: 'Reset user password with token' })
  @ApiParam({
    name: 'token',
    type: 'string',
    description: 'Reset password token',
  })
  @ApiBody({ type: ResetPasswordWithTokenDto })
  @ApiResponse({ status: 201, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async resetPasswordPost(
    @Param('token') token: string,
    @Body() body: ResetPasswordWithTokenDto,
  ) {
    this.logger.log('resetPasswordPost called', { email: body.email });
    try {
      const result = await firstValueFrom(
        this.userService.send(
          { cmd: 'reset_password' },
          { ...body, resetToken: token },
        ),
      );
      this.logger.log('resetPasswordPost result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'resetPasswordPost error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Failed to reset password',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Version('1')
  @Post('reset-password-request')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ResetPasswordRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Password reset email sent.',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async resetPasswordRequestPost(
    @Body() body: ResetPasswordRequestDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ResetPasswordResponseDto> {
    this.logger.log('resetPasswordRequestPost called', { email: body.email });
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const result = await firstValueFrom(
        this.userService.send(
          { cmd: 'reset_password_request' },
          { ...body, locale },
        ),
      );
      this.logger.log('resetPasswordRequestPost result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'resetPasswordRequestPost error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Failed to send reset password email',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Version('1')
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    this.logger.log('resetPassword called', { email: body.email });
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'reset_password' }, body),
      );
      this.logger.log('resetPassword result', { result });
      return result;
    } catch (error) {
      this.logger.error('resetPassword error: ' + error?.message, error?.stack);
      throw new HttpException(
        error?.message || 'Failed to reset password',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('user.me')
  @Version('1')
  @Get(['profile', 'me'])
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user profile.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getProfile(
    @Request() req: { user: { email: string } },
  ): Promise<UserResponseDto> {
    this.logger.log('getProfile called');
    try {
      const result = await firstValueFrom(
        this.userService.send(
          { cmd: 'get_user_profile' },
          { email: req.user.email },
        ),
      );
      this.logger.log('getProfile result', { result });
      return result;
    } catch (error) {
      this.logger.error('getProfile error: ' + error?.message, error?.stack);
      throw new HttpException(
        error?.message || 'Failed to get user profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('user.get_all')
  @Version('1')
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns all users.',
    type: UsersListResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getAllUsers(): Promise<UsersListResponseDto> {
    this.logger.log('getAllUsers called');
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'get_users' }, {}),
      );
      this.logger.log('getAllUsers result', { result });
      return result;
    } catch (error) {
      this.logger.error('getAllUsers error: ' + error?.message, error?.stack);
      throw new HttpException(
        error?.message || 'Failed to get users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('contributor.admin')
  @Version('1')
  @Post('contributors')
  @ApiOperation({
    summary: 'Create a contributor account',
    description:
      'For a company paid to enter demonstration data: whatever it creates is marked as such. The account is verified, and its holder chooses a password from the link emailed.',
  })
  @ApiBody({ type: CreateContributorDto })
  @ApiResponse({
    status: 201,
    description: 'Account created, invitation sent.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not an administrator.' })
  @ApiResponse({
    status: 409,
    description: 'The address already has an account.',
  })
  async createContributor(@Body() body: CreateContributorDto) {
    this.logger.log('createContributor called', { email: body.email });
    try {
      return await firstValueFrom(
        this.userService.send({ cmd: 'create_contributor' }, body),
      );
    } catch (error) {
      this.logger.error(
        'createContributor error: ' + error?.message,
        error?.stack,
      );
      throw new HttpException(
        error?.message || 'Failed to create contributor account',
        error?.message === 'USER_ALREADY_EXISTS'
          ? HttpStatus.CONFLICT
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('contributor.admin')
  @Version('1')
  @Get('contributors')
  @ApiOperation({ summary: 'List the contributor accounts, newest first' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  @ApiResponse({ status: 403, description: 'Not an administrator.' })
  async getContributors() {
    this.logger.log('getContributors called');
    try {
      return await firstValueFrom(
        this.userService.send({ cmd: 'get_contributors' }, {}),
      );
    } catch (error) {
      this.logger.error(
        'getContributors error: ' + error?.message,
        error?.stack,
      );
      throw new HttpException(
        error?.message || 'Failed to get contributors',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('user.update')
  @Version('1')
  @Put('')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully.',
    type: UpdateProfileResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async updateProfile(
    @Request() req: { user: { id: number } },
    @Body() body: UpdateProfileDto,
  ): Promise<UpdateProfileResponseDto> {
    // Profile fields are personal data — log the subject, not the payload.
    this.logger.log('updateProfile called', { userId: req.user.id });
    try {
      const result = await firstValueFrom(
        this.userService.send(
          { cmd: 'update_profile' },
          { userId: req.user.id, profile: body.profile },
        ),
      );
      this.logger.log('updateProfile result', { result });
      return result;
    } catch (error) {
      this.logger.error('updateProfile error: ' + error?.message, error?.stack);
      throw new HttpException(
        error?.message || 'Failed to update profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.profile.manage')
  @Version('1')
  @Get('me/repairer-profile')
  @ApiOperation({ summary: 'Get repairer profile for authenticated user' })
  @ApiResponse({ status: 200, description: 'Repairer profile returned.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  async getRepairerProfile(@Request() req: { user: { id: number } }) {
    this.logger.log('getRepairerProfile called', { userId: req.user.id });
    try {
      const result = await firstValueFrom(
        this.userService.send(
          { cmd: 'get_repairer_profile' },
          { userId: req.user.id },
        ),
      );
      if (!result) {
        throw new HttpException(
          'Repairer profile not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'getRepairerProfile error: ' + error?.message,
        error?.stack,
      );
      throw new HttpException(
        error?.message || 'Failed to get repairer profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.profile.manage')
  @Version('1')
  @Post('me/repairer-profile')
  @ApiOperation({ summary: 'Create repairer profile for authenticated user' })
  @ApiResponse({ status: 201, description: 'Repairer profile created.' })
  async createRepairerProfile(
    @Request() req: { user: { id: number } },
    @Body() body: Record<string, any>,
  ) {
    this.logger.log('createRepairerProfile called', { userId: req.user.id });
    try {
      return await firstValueFrom(
        this.userService.send(
          { cmd: 'create_repairer_profile' },
          { userId: req.user.id, profile: body },
        ),
      );
    } catch (error) {
      this.logger.error(
        'createRepairerProfile error: ' + error?.message,
        error?.stack,
      );
      throw new HttpException(
        error?.message || 'Failed to create repairer profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.profile.manage')
  @Version('1')
  @Put('me/repairer-profile')
  @ApiOperation({ summary: 'Update repairer profile for authenticated user' })
  @ApiResponse({ status: 200, description: 'Repairer profile updated.' })
  async updateRepairerProfile(
    @Request() req: { user: { id: number } },
    @Body() body: Record<string, any>,
  ) {
    this.logger.log('updateRepairerProfile called', { userId: req.user.id });
    try {
      return await firstValueFrom(
        this.userService.send(
          { cmd: 'update_repairer_profile' },
          { userId: req.user.id, profile: body },
        ),
      );
    } catch (error) {
      this.logger.error(
        'updateRepairerProfile error: ' + error?.message,
        error?.stack,
      );
      throw new HttpException(
        error?.message || 'Failed to update repairer profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
