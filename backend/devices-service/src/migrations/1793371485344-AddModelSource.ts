import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The outside source that created a model through the API, as its variants
 * already carry theirs. Empty for every model already there. A small table:
 * the column is added without rewriting it.
 *
 * Idempotent.
 */
export class AddModelSource1793371485344 implements MigrationInterface {
  name = 'AddModelSource1793371485344';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_models" ADD COLUMN IF NOT EXISTS "source" character varying(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_models" DROP COLUMN IF EXISTS "source"`,
    );
  }
}
