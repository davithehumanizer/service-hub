import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add full OIDC / OAuth 2.1 support:
 * - Adds PKCE columns (code_challenge, code_challenge_method) to oauth_authorization_codes
 * - Adds nonce column to oauth_authorization_codes
 * - Creates oauth_refresh_tokens table
 */
export class AddOidcSupport1741046400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── oauth_authorization_codes: PKCE + nonce ─────────────────────────────
    await queryRunner.query(`
      ALTER TABLE oauth_authorization_codes
        ADD COLUMN IF NOT EXISTS code_challenge        VARCHAR,
        ADD COLUMN IF NOT EXISTS code_challenge_method VARCHAR,
        ADD COLUMN IF NOT EXISTS nonce                 VARCHAR
    `);

    // ─── oauth_refresh_tokens ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token      UUID UNIQUE      NOT NULL DEFAULT gen_random_uuid(),
        client_id  VARCHAR          NOT NULL,
        user_id    INTEGER          NOT NULL,
        scope      VARCHAR,
        nonce      VARCHAR,
        expires_at TIMESTAMP        NOT NULL,
        used       BOOLEAN          DEFAULT FALSE,
        created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
        ON oauth_refresh_tokens(token)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
        ON oauth_refresh_tokens(expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_refresh_tokens_expires_at`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_refresh_tokens_token`);
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_refresh_tokens`);

    await queryRunner.query(`
      ALTER TABLE oauth_authorization_codes
        DROP COLUMN IF EXISTS nonce,
        DROP COLUMN IF EXISTS code_challenge_method,
        DROP COLUMN IF EXISTS code_challenge
    `);
  }
}
