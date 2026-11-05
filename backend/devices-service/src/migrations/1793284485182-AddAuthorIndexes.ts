import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Finds what an account entered (its contributions page, the
 * administrators' page of a contributor) without reading the 1.1 M
 * devices. Partial: only rows entered by hand have an author, so the index
 * stays small; building it still reads the table once, a few seconds
 * during which writes to it wait.
 *
 * Idempotent.
 */
export class AddAuthorIndexes1793284485182 implements MigrationInterface {
  name = 'AddAuthorIndexes1793284485182';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['devices', 'device_models']) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${table}_created_by_idx" ON "${table}" ("created_by") WHERE "created_by" IS NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['devices', 'device_models']) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${table}_created_by_idx"`);
    }
  }
}
