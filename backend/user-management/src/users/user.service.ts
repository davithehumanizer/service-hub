import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserProfile } from '../user-profile/user-profile.entity';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Role } from 'src/roles/role.entity';
import { RefreshTokenService } from '../auth/refresh-token.service';
import {
  RepairerDecision,
  languageOf,
  repairerDecisionEmail,
} from './repairer-decision-email';

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
   * Opens an account for a company entering demonstration data. Its address
   * is proven by the link emailed, where the password is chosen: until then
   * the account has one nobody knows. Onboarding is a citizen's, not theirs.
   */
  async createContributor(
    email: string,
    role: Role,
    profileData: Partial<Pick<UserProfile, 'firstName' | 'lastName'>>,
    locale = 'en',
  ): Promise<{ user: User; invitationSent: boolean }> {
    const profile = await this.profileRepository.save(
      this.profileRepository.create({
        ...profileData,
        onboardingCompleted: true,
        language: languageOf(locale) ?? 'en',
      }),
    );
    const resetToken = crypto.randomBytes(32).toString('hex');
    const user = await this.userRepository.save(
      this.userRepository.create({
        email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        role,
        profile,
        isVerified: true,
        confirmationToken: null,
        resetToken,
      }),
    );
    const invitationSent = await this.sendContributorInvitation(
      email,
      resetToken,
      locale,
    );
    return { user, invitationSent };
  }

  /** Who these accounts are, as an administrator's screen names them. */
  async summariesOf(ids: number[]): Promise<
    {
      id: number;
      email: string;
      role: string | null;
      firstName: string | null;
      lastName: string | null;
    }[]
  > {
    if (ids.length === 0) return [];
    const users = await this.userRepository.find({
      where: { id: In(ids) },
      relations: ['role', 'profile'],
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role?.name ?? null,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
    }));
  }

  /**
   * Tells a repairer's author what an administrator decided, in the
   * language of their account. An account gone since has nobody to tell.
   */
  async notifyRepairerDecision(data: {
    userId: number;
    decision: RepairerDecision;
    repairerId: string;
    repairerName: string;
    note?: string | null;
  }): Promise<void> {
    const user = await this.findById(data.userId);
    if (!user) return;
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3010';
    const seen = data.decision === 'published' || data.decision === 'applied';
    const mail = repairerDecisionEmail(data.decision, user.profile?.language, {
      name: data.repairerName,
      note: data.note,
      url: seen
        ? `${frontendUrl}/app/repairer/${data.repairerId}`
        : `${frontendUrl}/app/my-repairers`,
    });
    this.notificationsClient.emit(
      { cmd: 'send_email' },
      { to: user.email, ...mail },
    );
  }

  /** The accounts of a role, newest first, with their profiles. */
  async findByRole(name: string): Promise<User[]> {
    return this.userRepository.find({
      where: { role: { name } },
      relations: ['profile'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * The contributor accounts, previewed (`dryRun`) or deleted, last of the
   * purge of demonstration data (docs/demo-data.md, §4.4): what they
   * entered is gone by then. Their profiles do not follow by cascade, the
   * key being on the users side; their OAuth tokens, kept by oauth-service
   * in the same database, would outlive them.
   */
  async purgeContributors(
    dryRun: boolean,
    only?: number[],
  ): Promise<{ ids: number[]; emails: string[] }> {
    // Only those the purge started with: an account opened meanwhile has
    // had nothing of its own removed.
    const accounts = (await this.findByRole('contributor')).filter(
      (u) => !only || only.includes(u.id),
    );
    const ids = accounts.map((u) => u.id);
    const emails = accounts.map((u) => u.email);
    if (dryRun || ids.length === 0) return { ids, emails };
    await this.userRepository.manager.transaction(async (m) => {
      const profiles = (
        await m.query(
          `SELECT profile_id FROM users WHERE id = ANY($1::int[]) AND profile_id IS NOT NULL`,
          [ids],
        )
      ).map((r: { profile_id: number }) => r.profile_id);
      await m.query(`DELETE FROM user_refresh_tokens WHERE user_id = ANY($1::int[])`, [ids]);
      for (const table of ['oauth_authorization_codes', 'oauth_refresh_tokens']) {
        const [{ present }] = await m.query(
          `SELECT to_regclass($1) IS NOT NULL AS present`,
          [table],
        );
        if (present) {
          await m.query(`DELETE FROM ${table} WHERE user_id = ANY($1::int[])`, [ids]);
        }
      }
      await m.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);
      await m.query(`DELETE FROM user_profiles WHERE id = ANY($1::int[])`, [profiles]);
    });
    return { ids, emails };
  }

  /**
   * The first step of a purge: contributors can no longer renew a session
   * while what they entered is removed. An access token runs out within the
   * hour.
   */
  async revokeContributorSessions(ids: number[]): Promise<void> {
    const contributors = (await this.findByRole('contributor'))
      .map((u) => u.id)
      .filter((id) => ids.includes(id));
    if (contributors.length === 0) return;
    await this.userRepository.manager.query(
      `DELETE FROM user_refresh_tokens WHERE user_id = ANY($1::int[])`,
      [contributors],
    );
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
   * Sends a password reset email to the user with a reset link, and says
   * whether it left: the page must not announce a link that never went.
   */
  async sendResetPasswordEmail(
    email: string,
    token: string,
    locale = 'en',
  ): Promise<boolean> {
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

    return this.sendAwaited({
      to: email,
      subject: tpl.subject,
      text: `${tpl.cta}: ${resetUrl}`,
      html: `<p>${tpl.cta}: <a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  /**
   * The link a new contributor chooses their password from, and whether it
   * left: the administrator is told.
   */
  async sendContributorInvitation(
    email: string,
    token: string,
    locale = 'en',
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3010';
    const url = `${frontendUrl}/reset-password/${token}`;

    const templates: Record<string, { subject: string; cta: string }> = {
      fr: {
        subject: 'Votre compte contributeur Service Hub',
        cta: 'Choisissez votre mot de passe pour l’activer',
      },
      nl: {
        subject: 'Uw bijdragersaccount voor Service Hub',
        cta: 'Kies uw wachtwoord om het te activeren',
      },
      de: {
        subject: 'Ihr Mitwirkenden-Konto für Service Hub',
        cta: 'Wählen Sie Ihr Passwort, um es zu aktivieren',
      },
      en: {
        subject: 'Your Service Hub contributor account',
        cta: 'Choose your password to activate it',
      },
    };
    const tpl = templates[locale] ?? templates['en'];

    return this.sendAwaited({
      to: email,
      subject: tpl.subject,
      text: `${tpl.cta}: ${url}`,
      html: `<p>${tpl.cta}: <a href="${url}">${url}</a></p>`,
    });
  }

  /** Sends an email and says whether it left. */
  private async sendAwaited(mail: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.notificationsClient.send({ cmd: 'send_email' }, mail),
      );
      return result?.success === true;
    } catch {
      return false;
    }
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
    // Used once: a link left in a mailbox, or a contributor's invitation,
    // would otherwise set the password again at any time.
    user.resetToken = null;
    await this.userRepository.save(user);

    // A password change ends every existing session: any refresh token issued
    // before this point may be in the wrong hands.
    await this.refreshTokenService.revokeAllForUser(user.id);
  }
}
