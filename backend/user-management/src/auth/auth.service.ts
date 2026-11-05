/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { RpcException } from '@nestjs/microservices';
import { toSafeUser } from '../users/user.serializer';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Service for authentication and user credential management.
 *
 * Provides methods for validating users, issuing JWT tokens,
 * refreshing tokens, finding users by email, and resetting passwords.
 */
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  /** Builds the signed access token for a user. */
  private signAccessToken(user: User): string {
    return this.jwtService.sign({
      email: user.email,
      role: user.role,
      id: user.id,
    });
  }

  /**
   * Validates a user's credentials.
   * @param email The user's email address.
   * @param pass The user's plaintext password.
   * @returns The user entity if credentials are valid and user is verified.
   * @throws RpcException if credentials are invalid or user is not verified.
   */
  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      if (!user.isVerified) {
        throw new RpcException('Your account is not verified');
      }
      //const { password, ...result } = user;
      return user;
    }
    throw new RpcException('Invalid credentials');
  }

  /**
   * Issues an access token and a refresh token for the authenticated user.
   * @param user The authenticated user entity.
   * @returns The access token, the refresh token and the safe user shape.
   */
  async login(user: User) {
    return {
      access_token: this.signAccessToken(user),
      refresh_token: await this.refreshTokenService.issue(user.id),
      user: toSafeUser(user),
    };
  }

  /**
   * Exchanges a refresh token for a fresh access token, rotating the refresh
   * token in the process.
   *
   * Possession of the token is the only thing that grants a new session — the
   * previous implementation accepted a bare email address, which let anyone
   * mint a token for any account.
   *
   * @param refreshToken The opaque refresh token presented by the client.
   * @throws RpcException if the token is invalid, consumed, revoked or expired.
   */
  async refreshSession(refreshToken: string) {
    const { userId, refreshToken: nextToken } =
      await this.refreshTokenService.rotate(refreshToken);

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new RpcException('User not found');
    }

    return {
      access_token: this.signAccessToken(user),
      refresh_token: nextToken,
      user: toSafeUser(user),
    };
  }

  /**
   * Issues a standalone refresh token for an already-authenticated user.
   * Used by the social login callbacks, where credentials were verified by the
   * identity provider rather than by {@link validateUser}.
   */
  async issueRefreshToken(userId: number): Promise<string> {
    if (!userId) {
      throw new RpcException('User id is required');
    }
    return this.refreshTokenService.issue(userId);
  }

  /** Ends a session by revoking its refresh token. */
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    await this.refreshTokenService.revoke(refreshToken);
    return { success: true };
  }

  /**
   * Finds a user by their email address.
   * @param email The user's email address.
   * @returns The user entity if found.
   * @throws RpcException if user is not found.
   */
  async findUserByEmail(email: string): Promise<User> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new RpcException('User not found');
    }
    return user;
  }

  /**
   * Resets a user's password.
   * @param email The user's email address.
   * @param newPassword The new password to set.
   * @throws RpcException if user is not found.
   */
  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new RpcException('User not found');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userService.update(user);
  }
}
