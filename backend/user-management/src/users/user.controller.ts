/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { UserProfile } from 'src/user-profile/user-profile.entity';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import * as crypto from 'crypto';
import { RoleService } from 'src/roles/role.service';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';
import { toSafeUser, toSafeUsers } from './user.serializer';
import { RepairerDecision, languageOf } from './repairer-decision-email';

/**
 * Controller for user-related operations.
 *
 * Handles user registration, account confirmation, password reset requests,
 * password resets, profile retrieval, user listing, and profile updates.
 * Uses microservice message patterns for communication.
 */
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  /**
   * Finds a user by their email address.
   *
   * @MessagePattern { cmd: 'find_user_by_email' }
   * @param email The email address of the user to find.
   * @returns The user entity if found, otherwise null.
   */
  @MessagePattern({ cmd: 'find_user_by_email' })
  async findUserByEmail(email: string) {
    return toSafeUser(await this.userService.findByEmail(email));
  }

  /**
   * Finds a user by their ID.
   *
   * @MessagePattern { cmd: 'find_user_by_id' }
   * @param id The ID of the user to find.
   * @returns The user entity if found, otherwise null.
   */
  @MessagePattern({ cmd: 'find_user_by_id' })
  async findUserById(id: number) {
    return toSafeUser(await this.userService.findById(id));
  }

  /**
   * Creates a new user, typically for social logins.
   * Assigns a default 'user' role and handles email confirmation based on `isSocial` flag.
   *
   * @MessagePattern { cmd: 'create_user' }
   * @param body Object containing user details: email, password, firstName, lastName, and optional isSocial flag.
   * @returns An object with the created user and a success message.
   * @throws RpcException if the default user role is not found or user creation fails.
   */
  @MessagePattern({ cmd: 'create_user' })
  async createUser(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      isSocial?: boolean;
    },
  ) {
    try {
      const defaultRole = await this.roleService.findByName('user');
      if (!defaultRole) {
        throw new RpcException('Default user role not found');
      }

      const confirmationToken = body.isSocial
        ? null
        : crypto.randomBytes(32).toString('hex');

      const user = await this.userService.create(
        body.email,
        body.password,
        defaultRole,
        { firstName: body.firstName, lastName: body.lastName },
        confirmationToken,
        body.isSocial,
      );

      if (!body.isSocial && confirmationToken) {
        this.userService.sendConfirmationEmail(body.email, confirmationToken);
      }

      return { user: toSafeUser(user), message: 'User created successfully' };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to create user');
    }
  }

  /**
   * Creates an account for a company entering demonstration data, which
   * chooses its password from the link emailed.
   *
   * @MessagePattern { cmd: 'create_contributor' }
   * @throws RpcException `USER_ALREADY_EXISTS` when the address has an account.
   */
  @MessagePattern({ cmd: 'create_contributor' })
  async createContributor(body: {
    email: string;
    firstName?: string;
    lastName?: string;
    locale?: string;
  }) {
    try {
      if (await this.userService.findByEmail(body.email)) {
        throw new RpcException('USER_ALREADY_EXISTS');
      }
      const role = await this.roleService.findByName('contributor');
      if (!role) throw new RpcException('Contributor role not found');
      const { user, invitationSent } =
        await this.userService.createContributor(
          body.email,
          role,
          { firstName: body.firstName, lastName: body.lastName },
          body.locale,
        );
      return { ...toSafeUser(user), invitationSent };
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to create contributor account',
      );
    }
  }

  /**
   * The contributor accounts, newest first.
   *
   * @MessagePattern { cmd: 'get_contributors' }
   */
  @MessagePattern({ cmd: 'get_contributors' })
  async getContributors() {
    try {
      return toSafeUsers(await this.userService.findByRole('contributor'));
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get contributors');
    }
  }

  /**
   * Previews (`dryRun`) or deletes the contributor accounts: the purge's
   * first call gives the ids its other steps need, its last removes them.
   *
   * @MessagePattern { cmd: 'purge_contributors' }
   */
  @MessagePattern({ cmd: 'purge_contributors' })
  async purgeContributors(data: { dryRun: boolean; ids?: number[] }) {
    try {
      return await this.userService.purgeContributors(
        data?.dryRun !== false,
        data?.ids,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to purge contributors');
    }
  }

  /** @MessagePattern { cmd: 'revoke_contributor_sessions' } */
  @MessagePattern({ cmd: 'revoke_contributor_sessions' })
  async revokeContributorSessions(data: { ids: number[] }) {
    try {
      await this.userService.revokeContributorSessions(data?.ids ?? []);
      return { revoked: true };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to revoke sessions');
    }
  }

  /**
   * Who these accounts are, for an administrator's screen.
   *
   * @MessagePattern { cmd: 'get_user_summaries' }
   */
  @MessagePattern({ cmd: 'get_user_summaries' })
  async getUserSummaries(data: { ids: number[] }) {
    try {
      return await this.userService.summariesOf(data?.ids ?? []);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get users');
    }
  }

  /**
   * Emails a repairer's author the decision on it.
   *
   * @MessagePattern { cmd: 'notify_repairer_decision' }
   */
  @MessagePattern({ cmd: 'notify_repairer_decision' })
  async notifyRepairerDecision(data: {
    userId: number;
    decision: RepairerDecision;
    repairerId: string;
    repairerName: string;
    note?: string | null;
  }) {
    try {
      await this.userService.notifyRepairerDecision(data);
      return { sent: true };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to notify the author');
    }
  }

  /**
   * Registers a new user.
   * Validates input, checks password strength, ensures email uniqueness,
   * assigns a role, creates the user, and sends a confirmation email.
   *
   * @MessagePattern { cmd: 'register_user' }
   * @param body - Object containing email, password, role, and profile data.
   * @throws RpcException on validation or creation errors.
   */
  @MessagePattern({ cmd: 'register_user' })
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      userType?: 'customer' | 'repairer';
      /** @deprecated use userType instead */
      role?: string;
      profile: Partial<UserProfile>;
      locale?: string;
    },
  ) {
    // Verify recaptcha token if configured
    try {
      const token = (body as any).recaptchaToken as string | undefined;
      const secretPresent = !!process.env.RECAPTCHA_SECRET;
      if (secretPresent) {
        const verify = await this.recaptchaService.verify(token || '');
        const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || '0.5');
        if (
          !verify ||
          !verify.success ||
          (typeof verify.score === 'number' && verify.score < minScore)
        ) {
          throw new RpcException('recaptcha verification failed');
        }
      }
    } catch (err) {
      throw new RpcException(err.message || 'recaptcha verification failed');
    }
    try {
      if (!body.password) {
        throw new RpcException('Password is required');
      }
      if (!body.email) {
        throw new RpcException('Email is required');
      }

      if (!this.isStrongPassword(body.password)) {
        throw new RpcException('PASSWORD_TOO_WEAK');
      }
      const existingUser = await this.userService.findByEmail(body.email);
      if (existingUser) {
        throw new RpcException('USER_ALREADY_EXISTS');
      }
      /*if (body.role && body.role !== 'user' && body.role !== 'admin') {
        throw new RpcException('Invalid role');
      }*/
      if (body.password.length < 8) {
        throw new RpcException('PASSWORD_TOO_SHORT');
      }
      if (!/[A-Z]/.test(body.password)) {
        throw new RpcException('PASSWORD_NO_UPPERCASE');
      }
      if (!/[a-z]/.test(body.password)) {
        throw new RpcException('PASSWORD_NO_LOWERCASE');
      }
      if (!/[0-9]/.test(body.password)) {
        throw new RpcException('PASSWORD_NO_NUMBER');
      }
      if (!/[^A-Za-z0-9]/.test(body.password)) {
        throw new RpcException('PASSWORD_NO_SPECIAL');
      }
      /*if (body.profile && Object.keys(body.profile).length === 0) {
        throw new RpcException('Profile data is required');
      }*/

      const confirmationToken = crypto.randomBytes(32).toString('hex');

      // Resolve role from userType (preferred) or legacy role field
      const roleName = body.userType === 'repairer' ? 'repairer' : 'user';

      let role = await this.roleService.findByName(roleName);
      if (!role) {
        role = await this.roleService.findByName('user');
        if (!role) {
          throw new RpcException('Role not found');
        }
      }

      const user = await this.userService.create(
        body.email,
        body.password,
        role,
        // The browser's language, for the emails this account is sent.
        { ...(body.profile ?? {}), language: languageOf(body.locale) },
        confirmationToken,
      );

      const mailSent = this.userService.sendConfirmationEmail(
        body.email,
        confirmationToken,
        body.locale ?? 'en',
      );
      console.log('Mail sent: ', mailSent);
      return {
        user: toSafeUser(user),
        message: 'ACCOUNT_CREATED_VERIFY_EMAIL',
      };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to register user');
    }
  }

  /**
   * Confirms a user's account using a confirmation token.
   * Marks the user as verified and removes the confirmation token.
   *
   * @MessagePattern { cmd: 'confirm_account' }
   * @param body - Object containing the confirmation token.
   * @throws RpcException if the token is invalid or expired.
   */
  @MessagePattern({ cmd: 'confirm_account' })
  async confirmAccount(@Body() body: { token: string }) {
    try {
      const user = await this.userService.findByToken(body.token);
      if (!user) throw new RpcException('INVALID_OR_EXPIRED_TOKEN');

      user.isVerified = true;
      user.confirmationToken = undefined; // ⚡ Supprime le token après activation
      await this.userService.update(user);

      return {
        message:
          'Your account has been successfully activated. You can now log in.',
      };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to confirm account');
    }
  }

  /**
   * Initiates a password reset request.
   * Generates a reset token, updates the user, and sends a reset email.
   *
   * @MessagePattern { cmd: 'reset_password_request' }
   * @param body - Object containing the user's email.
   * @throws RpcException if the user is not found.
   */
  @MessagePattern({ cmd: 'reset_password_request' })
  async resetPasswordRequest(@Body() body: { email: string; locale?: string }) {
    try {
      console.log('reset_password_request');
      const user = await this.userService.findByEmail(body.email);
      if (!user) {
        throw new RpcException('User not found');
      }
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetToken = resetToken;
      await this.userService.update(user);
      const emailSent = await this.userService.sendResetPasswordEmail(
        body.email,
        resetToken,
        body.locale ?? 'en',
      );
      return {
        message: emailSent
          ? 'Reset password email sent'
          : 'Reset password email could not be sent',
        emailSent,
      };
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to send reset password email',
      );
    }
  }

  /**
   * Resets a user's password using a reset token.
   * Validates password strength and updates the user's password.
   *
   * @MessagePattern { cmd: 'reset_password' }
   * @param body - Object containing email, newPassword, and resetToken.
   * @throws RpcException on validation or reset errors.
   */
  @MessagePattern({ cmd: 'reset_password' })
  async resetPassword(
    @Body() body: { email: string; newPassword: string; resetToken: string },
  ) {
    try {
      if (!this.isStrongPassword(body.newPassword)) {
        throw new RpcException('PASSWORD_TOO_WEAK');
      }
      await this.userService.resetPassword(
        body.email,
        body.newPassword,
        body.resetToken,
      );
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to reset password');
    }
  }

  /**
   * Retrieves a user's profile by email.
   *
   * @MessagePattern { cmd: 'get_user_profile' }
   * @param body - Object containing the user's email.
   * @throws RpcException if retrieval fails.
   */
  @MessagePattern({ cmd: 'get_user_profile' })
  async getProfile(@Body() body: { email: string }) {
    try {
      return toSafeUser(await this.userService.findByEmail(body.email));
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get user profile');
    }
  }

  /**
   * Retrieves all users and their profiles.
   *
   * @MessagePattern { cmd: 'get_users' }
   * @throws RpcException if retrieval fails.
   */
  @MessagePattern({ cmd: 'get_users' })
  async getAllUsers() {
    try {
      return toSafeUsers(await this.userService.findAll());
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get users');
    }
  }

  /**
   * Updates a user's profile.
   *
   * @MessagePattern { cmd: 'update_profile' }
   * @param body - Object containing the userId and new profile data.
   * @throws RpcException if update fails.
   */
  @MessagePattern({ cmd: 'update_profile' })
  async updateProfile(@Body() body: { profile: UserProfile; userId: number }) {
    try {
      return await this.userService.updateProfile(body.userId, body.profile);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to update profile');
    }
  }

  /**
   * Checks if a password is strong.
   * Must be at least 8 characters and contain uppercase, lowercase, number, and special character.
   *
   * @param password - The password string to validate.
   * @returns true if strong, false otherwise.
   */
  private isStrongPassword(password: string): boolean {
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return strongPasswordRegex.test(password);
  }
}
