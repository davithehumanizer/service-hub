import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Entity for storing OAuth2 authorization codes.
 * These codes are short-lived and exchanged for access tokens.
 */
@Entity('oauth_authorization_codes')
export class OauthAuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  code: string;

  @Column()
  client_id: string;

  @Column()
  user_id: number;

  @Column()
  redirect_uri: string;

  @Column({ nullable: true })
  scope: string;

  /** PKCE: base64url(sha256(code_verifier)) */
  @Column({ nullable: true })
  code_challenge: string;

  /** PKCE: always "S256" when present */
  @Column({ nullable: true })
  code_challenge_method: string;

  /** OIDC nonce — passed through into the id_token */
  @Column({ nullable: true })
  nonce: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ default: false })
  used: boolean;
}
