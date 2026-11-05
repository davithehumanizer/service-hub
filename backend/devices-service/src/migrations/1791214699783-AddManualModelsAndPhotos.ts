import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Models created by hand: flagged, so that the assignment neither deletes
 * one left without variant nor replaces the categories it was given, and
 * with pictures of their own for when no variant has one. A model's
 * thumbnail also looks up its representative's uploaded photos, by device:
 * device_photos gets the index it never had. Names are the ones TypeORM
 * derives, so that schema:log stays quiet.
 */
export class AddManualModelsAndPhotos1791214699783
  implements MigrationInterface
{
  name = 'AddManualModelsAndPhotos1791214699783';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `uuid_generate_v4()` is the default the photo entity expects.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `ALTER TABLE "device_models" ADD COLUMN IF NOT EXISTS "is_manual" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_model_photos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "model_id" integer NOT NULL,
        "key" character varying NOT NULL,
        "url" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c0e64d39386297da7b16d2f6cac" PRIMARY KEY ("id"),
        CONSTRAINT "FK_f2f021c67fbaf9e4e8e155e1907" FOREIGN KEY ("model_id")
          REFERENCES "device_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f2f021c67fbaf9e4e8e155e190" ON "device_model_photos" ("model_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_51b402e012ab9bec41fd8646e9" ON "device_photos" ("device_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_51b402e012ab9bec41fd8646e9"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "device_model_photos"`);
    await queryRunner.query(
      `ALTER TABLE "device_models" DROP COLUMN IF EXISTS "is_manual"`,
    );
  }
}
