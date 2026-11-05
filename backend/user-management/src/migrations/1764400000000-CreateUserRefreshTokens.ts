import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the store for interactive-session refresh tokens.
 *
 * Written to be idempotent: `synchronize: true` was still enabled when this
 * entity was introduced, so the table may already exist on environments that
 * booted the service before migrations were wired up.
 */
export class CreateUserRefreshTokens1764400000000
  implements MigrationInterface
{
  name = 'CreateUserRefreshTokens1764400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token_hash" character varying NOT NULL,
        "user_id" integer NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "revoked" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    // Lookup on every refresh is by hash; uniqueness also guards against the
    // (astronomically unlikely) collision of two identical random tokens.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_refresh_tokens_token_hash"
        ON "user_refresh_tokens" ("token_hash")
    `);

    // Used by revokeAllForUser on password reset and replay detection.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_refresh_tokens_user_id"
        ON "user_refresh_tokens" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_refresh_tokens_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_refresh_tokens_token_hash"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_refresh_tokens"`);
  }
}
