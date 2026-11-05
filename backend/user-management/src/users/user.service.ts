import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserProfile } from '../user-profile/user-profile.entity';
import * as bcrypt from 'bcryptjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/roles/role.entity';
import { RefreshTokenService } from '../auth/refresh-token.service';

// What a user may change on their own profile. The rest of what reaches
// updateProfile was copied onto the stored profile and saved: an `id` there
// wrote the fields onto another user's profile.
const EDITABLE_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'address',
  'city',
  'country',
  'onboardingCompleted',
] as const;

/**
 * Service for managing users and their profiles.
 *
 * Provides methods for creating users, updating profiles, sending notification emails,
 * and handling password reset logic.
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsClient: ClientProxy,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Creates a new user with the given email, password, role, profile data, and confirmation token.
   * Hashes the password and saves both the user and their profile.
   * If `isSocial` is true, the user is marked as verified and no confirmation token is set.
   *
   * @param email The user's email address.
   * @param password The user's password (will be hashed).
   * @param role The user's role.
   * @param profileData Partial user profile data.
   * @param confirmationToken The confirmation token for email verification, or null if `isSocial` is true.
   * @param isSocial Optional. True if the user is created via social login, defaults to false.
   * @returns The created user entity.
   */
  async create(
    email: string,
    password: string,
    role: Role,
    profileData: Partial<UserProfile> | undefined,
    confirmationToken: string | null,
    isSocial = false,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newProfile = this.profileRepository.create(profileData ?? {});
    const savedProfile = await this.profileRepository.save(newProfile);

    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
      role,
      profile: savedProfile,
      isVerified: isSocial ? true : false,
      confirmationToken: isSocial ? null : confirmationToken,
    });
    return this.userRepository.save(newUser);
  }

  /**
   * Finds a user by their email address, including their profile.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  /**
   * Finds a user by their ID, including their profile.
   */
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
  }

  /**
   * Updates the profile of a user by user ID with the provided profile data.
   * Throws NotFoundException if the profile does not exist.
   */
  async updateProfile(
    userId: number,
    profileData: Partial<UserProfile>,
  ): Promise<UserProfile> {
    // Récupérer le profil existant en incluant la relation User
    const userProfile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'], // Ajoute cette ligne pour inclure la relation
    });

    if (!userProfile) {
      throw new NotFoundException(
        `User profile for user ID ${userId} not found`,
      );
    }

    // Mettre à jour uniquement les champs modifiables définis dans profileData
    for (const field of EDITABLE_PROFILE_FIELDS) {
      if (profileData[field] !== undefined) {
        Object.assign(userProfile, { [field]: profileData[field] });
      }
    }

    // Sauvegarder les modifications
    return this.profileRepository.save(userProfile);
  }

  /**
   * Returns all users, including their profiles.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['profile'] });
  }

  /**
   * Finds a user by their confirmation token.
   */
  async findByToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { confirmationToken: token },
    });
  }

  /**
   * Updates the given user entity in the database.
   */
  async update(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  /**
   * Sends a confirmation email to the user with a confirmation link.
   * Uses the NOTIFICATIONS_SERVICE microservice.
   */
  sendConfirmationEmail(email: string, token: string, locale = 'en') {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3010';
    const confirmUrl = `${frontendUrl}/confirm/${token}`;

    const templates: Record<string, { subject: string; cta: string }> = {
      fr: { subject: 'Confirmez votre compte', cta: 'Activez votre compte' },
      nl: { subject: 'Bevestig uw account', cta: 'Activeer uw account' },
      de: { subject: 'Konto bestätigen', cta: 'Konto aktivieren' },
      en: { subject: 'Confirm your account', cta: 'Activate your account' },
    };
    const tpl = templates[locale] ?? templates['en'];

    const response = this.notificationsClient.emit(
      { cmd: 'send_email' },
      {
        to: email,
        subject: tpl.subject,
        text: `${tpl.cta}: ${confirmUrl}`,
        html: `<p>${tpl.cta}: <a href="${confirmUrl}">${confirmUrl}</a></p>`,
      },
    );
    console.log('sendConfirmationEmail', response);
    return response;
  }

  /**
   * Sends a password reset email to the user with a reset link.
   * Uses the NOTIFICATIONS_SERVICE microservice.
   */
  sendResetPasswordEmail(email: string, token: string, locale = 'en') {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3010';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;

    const templates: Record<string, { subject: string; cta: string }> = {
      fr: {
        subject: 'Réinitialisez votre mot de passe',
        cta: 'Réinitialiser mon mot de passe',
      },
      nl: {
        subject: 'Reset uw wachtwoord',
        cta: 'Wachtwoord opnieuw instellen',
      },
      de: { subject: 'Passwort zurücksetzen', cta: 'Passwort zurücksetzen' },
      en: { subject: 'Reset your password', cta: 'Reset my password' },
    };
    const tpl = templates[locale] ?? templates['en'];

    const response = this.notificationsClient.emit(
      { cmd: 'send_email' },
      {
        to: email,
        subject: tpl.subject,
        text: `${tpl.cta}: ${resetUrl}`,
        html: `<p>${tpl.cta}: <a href="${resetUrl}">${resetUrl}</a></p>`,
      },
    );
    console.log('sendResetPasswordEmail', response);
    return response;
  }

  /**
   * Resets the user's password if the provided reset token matches.
   * Throws NotFoundException or RpcException on error.
   */
  async resetPassword(
    email: string,
    newPassword: string,
    resetToken: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.resetToken !== resetToken) {
      throw new RpcException('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // A password change ends every existing session: any refresh token issued
    // before this point may be in the wrong hands.
    await this.refreshTokenService.revokeAllForUser(user.id);
  }
}
