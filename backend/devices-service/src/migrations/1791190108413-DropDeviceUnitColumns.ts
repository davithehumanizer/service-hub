import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * functional_state, visual_state and age describe one physical unit, not a
 * catalogue entry: they move to the personal device (ownership-service).
 * Imports filled them with '' and 0, and no screen displayed them.
 *
 * Irreversible: down() brings the columns back empty. The deployment dump is
 * the way back to their values.
 */
export class DropDeviceUnitColumns1791190108413 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN IF EXISTS "functional_state"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN IF EXISTS "visual_state"`,
    );
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN IF EXISTS "age"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "functional_state" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "visual_state" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "age" integer NOT NULL DEFAULT 0`,
    );
  }
}
