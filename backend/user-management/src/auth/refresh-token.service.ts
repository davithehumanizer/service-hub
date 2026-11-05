import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import * as crypto from 'crypto';
import { UserRefreshToken } from './user-refresh-token.entity';

/** How long a refresh token stays valid, in days. */
const DEFAULT_TTL_DAYS = 30;

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(UserRefreshToken)
    private readonly refreshTokenRepository: Repository<UserRefreshToken>,
  ) {}

  private get ttlDays(): number {
    const raw = Number(process.env.REFRESH_TOKEN_TTL_DAYS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_DAYS;
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a new refresh token for a user and returns the raw value.
   * The raw value is returned once and never stored.
   */
  async issue(userId: number): Promise<string> {
    // Every login and every rotation inserts a row; drop the user's dead ones
    // here so the table stays bounded without needing a scheduler.
    await this.pruneForUser(userId);

    const raw = crypto.randomBytes(32).toString('base64url');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.ttlDays);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        token_hash: this.hash(raw),
        user_id: userId,
        expires_at: expiresAt,
        used_at: null,
        revoked: false,
      }),
    );

    return raw;
  }

  /**
   * Validates a refresh token and rotates it: the presented token is consumed
   * and a fresh one is returned.
   *
   * Replaying an already-consumed token means the value leaked, so the whole
   * token set for that user is revoked rather than just rejecting the call.
   *
   * @returns The user id the token belongs to, and the replacement token.
   * @throws RpcException if the token is unknown, consumed, revoked or expired.
   */
  async rotate(
    rawToken: string,
  ): Promise<{ userId: number; refreshToken: string }> {
    if (!rawToken) {
      throw new RpcException('Invalid refresh token');
    }

    const record = await this.refreshTokenRepository.findOne({
      where: { token_hash: this.hash(rawToken) },
    });

    if (!record) {
      throw new RpcException('Invalid refresh token');
    }

    if (record.used_at || record.revoked) {
      this.logger.warn(
        `Refresh token replay detected for user ${record.user_id}; revoking all sessions`,
      );
      await this.revokeAllForUser(record.user_id);
      throw new RpcException('Invalid refresh token');
    }

    if (record.expires_at.getTime() <= Date.now()) {
      throw new RpcException('Refresh token expired');
    }

    record.used_at = new Date();
    await this.refreshTokenRepository.save(record);

    return {
      userId: record.user_id,
      refreshToken: await this.issue(record.user_id),
    };
  }

  /** Revokes a single token — used on logout. Silent when unknown. */
  async revoke(rawToken: string): Promise<void> {
    if (!rawToken) {
      return;
    }
    await this.refreshTokenRepository.update(
      { token_hash: this.hash(rawToken) },
      { revoked: true },
    );
  }

  /** Revokes every token of a user — password reset, replay, account lockout. */
  async revokeAllForUser(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { user_id: userId, revoked: false },
      { revoked: true },
    );
  }

  /**
   * Drops a user's expired tokens. Consumed and revoked rows are kept until
   * they expire: they are what makes replay detection possible.
   */
  private async pruneForUser(userId: number): Promise<void> {
    await this.refreshTokenRepository.delete({
      user_id: userId,
      expires_at: LessThan(new Date()),
    });
  }
}
