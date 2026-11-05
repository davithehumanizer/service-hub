import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A journey names the device model, deviceId becoming its variant, and the
 * owner's personal device when it is about one. Both stay null on a journey
 * typed in by hand, and until the model assignment fills the existing ones.
 *
 * The index name follows this table's, not TypeORM's derived one: the entity
 * names it, so schema:log stays quiet.
 */
export class AddJourneyModelAndOwnership1791206396455
  implements MigrationInterface
{
  name = 'AddJourneyModelAndOwnership1791206396455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE repair_journeys
        ADD COLUMN IF NOT EXISTS "modelId" integer,
        ADD COLUMN IF NOT EXISTS "ownershipId" uuid;
    `);
    // A personal device's repair history.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_repair_journeys_ownershipId"
      ON repair_journeys ("ownershipId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_repair_journeys_ownershipId";`,
    );
    await queryRunner.query(`
      ALTER TABLE repair_journeys
        DROP COLUMN IF EXISTS "ownershipId",
        DROP COLUMN IF EXISTS "modelId";
    `);
  }
}
