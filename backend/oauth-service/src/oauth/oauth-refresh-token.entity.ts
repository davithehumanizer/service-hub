import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Entity for storing OAuth2 refresh tokens.
 * Each token is single-use (rotation on every exchange).
 */
@Entity('oauth_refresh_tokens')
export class OauthRefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The opaque refresh token value sent to the client */
  @Column({ unique: true })
  token: string;

  @Column()
  client_id: string;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  scope: string;

  /** Original OIDC nonce — propagated to new id_token on refresh */
  @Column({ nullable: true })
  nonce: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  /** Marks the token as consumed after one use (rotation) */
  @Column({ default: false })
  used: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
