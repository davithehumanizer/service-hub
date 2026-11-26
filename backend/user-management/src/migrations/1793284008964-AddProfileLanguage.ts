import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The language an account's emails are written in: chosen by the
 * administrator for a contributor, taken from the browser at sign-up.
 * Empty for the accounts already there, which get English.
 *
 * Idempotent.
 */
export class AddProfileLanguage1793284008964 implements MigrationInterface {
  name = 'AddProfileLanguage1793284008964';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "language" character varying(2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "language"`,
    );
  }
}
