import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Refresh token for an interactive user session.
 *
 * Mirrors the design already used for OAuth2 clients in `oauth-service`
 * (`OauthRefreshToken`) but without client credentials, since the SPA is a
 * public client and cannot hold a secret.
 *
 * Only the SHA-256 hash of the token is stored: the raw value is a bearer
 * credential, so a database read must not be enough to impersonate a session.
 */
@Entity('user_refresh_tokens')
export class UserRefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** SHA-256 hex digest of the opaque token handed to the client. */
  @Index({ unique: true })
  @Column()
  token_hash: string;

  @Index()
  @Column()
  user_id: number;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  /** Set when the token is exchanged — a second use signals theft. */
  @Column({ type: 'timestamp', nullable: true })
  used_at: Date | null;

  /** Set on logout, on password reset, or when replay is detected. */
  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  created_at: Date;
}
