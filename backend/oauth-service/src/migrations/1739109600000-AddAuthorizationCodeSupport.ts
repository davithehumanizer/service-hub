import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add OAuth2 Authorization Code Flow support.
 * - Adds redirect_uris column to oauth_clients table
 * - Creates oauth_authorization_codes table for temporary codes
 */
export class AddAuthorizationCodeSupport1739109600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add redirect_uris column to oauth_clients
    await queryRunner.query(`
      ALTER TABLE oauth_clients
      ADD COLUMN IF NOT EXISTS redirect_uris TEXT[] DEFAULT NULL
    `);

    // Create oauth_authorization_codes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
        code UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL,
        user_id INTEGER NOT NULL,
        redirect_uri VARCHAR NOT NULL,
        scope VARCHAR,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add index for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_codes_client_id
      ON oauth_authorization_codes(client_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires_at
      ON oauth_authorization_codes(expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_oauth_codes_expires_at
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_oauth_codes_client_id
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS oauth_authorization_codes
    `);

    await queryRunner.query(`
      ALTER TABLE oauth_clients
      DROP COLUMN IF EXISTS redirect_uris
    `);
  }
}
