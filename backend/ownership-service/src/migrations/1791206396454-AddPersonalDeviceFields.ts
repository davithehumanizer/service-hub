import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * First migration for this service: `ownerships` was created by
 * `synchronize: true`, so it is declared here as production has it, for a
 * database that never had synchronize.
 *
 * An ownership becomes a personal device: of a model, of a variant only when
 * known, with a nickname and its current state. Two identical ones are
 * allowed, so the unique (userId, deviceId) goes; it also indexed the lookup
 * by owner, hence the index on userId.
 *
 * Names are TypeORM's derived ones, as synchronize gave them.
 */
export class AddPersonalDeviceFields1791206396454
  implements MigrationInterface
{
  name = 'AddPersonalDeviceFields1791206396454';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ownerships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" integer NOT NULL,
        "deviceId" integer NOT NULL,
        "acquiredAt" TIMESTAMP NOT NULL,
        CONSTRAINT "PK_1f2de81e619aec9a82399a39729" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fccf92a33597f48038987aa82da" UNIQUE ("userId", "deviceId")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "ownerships"
        ADD COLUMN IF NOT EXISTS "modelId" integer,
        ADD COLUMN IF NOT EXISTS "nickname" character varying,
        ADD COLUMN IF NOT EXISTS "visualCondition" character varying NOT NULL DEFAULT 'unknown',
        ADD COLUMN IF NOT EXISTS "usageIntensity" character varying NOT NULL DEFAULT 'unknown',
        ALTER COLUMN "deviceId" DROP NOT NULL,
        DROP CONSTRAINT IF EXISTS "UQ_fccf92a33597f48038987aa82da"
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c3f7e3cb96e327de9b5b262c2d" ON "ownerships" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Fails once an owner has two identical devices, or one without a
    // variant: those rows have no place in the former table.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_c3f7e3cb96e327de9b5b262c2d"`,
    );
    await queryRunner.query(`
      ALTER TABLE "ownerships"
        ADD CONSTRAINT "UQ_fccf92a33597f48038987aa82da" UNIQUE ("userId", "deviceId"),
        ALTER COLUMN "deviceId" SET NOT NULL,
        DROP COLUMN IF EXISTS "usageIntensity",
        DROP COLUMN IF EXISTS "visualCondition",
        DROP COLUMN IF EXISTS "nickname",
        DROP COLUMN IF EXISTS "modelId"
    `);
  }
}
