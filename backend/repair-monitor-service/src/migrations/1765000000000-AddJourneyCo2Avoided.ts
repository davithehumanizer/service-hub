import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Freezes the CO2e a repair avoided, at the moment its outcome is declared.
 *
 * Recomputing it on every read would let someone's cumulative impact change
 * between two visits — because a reference factor was revised, or a device's
 * category corrected — and a total that moves on its own is not a record of
 * anything. Storing it also keeps the figure the user was actually shown.
 *
 * Nullable on purpose: the reference data covers neither large appliances nor
 * musical instruments, and null there means "unknown", not zero.
 */
export class AddJourneyCo2Avoided1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE repair_journeys
        ADD COLUMN IF NOT EXISTS "co2Avoided" double precision,
        ADD COLUMN IF NOT EXISTS "co2ReferenceCategory" character varying,
        ADD COLUMN IF NOT EXISTS "co2ReferenceProducts" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE repair_journeys
        DROP COLUMN IF EXISTS "co2Avoided",
        DROP COLUMN IF EXISTS "co2ReferenceCategory",
        DROP COLUMN IF EXISTS "co2ReferenceProducts"
    `);
  }
}
