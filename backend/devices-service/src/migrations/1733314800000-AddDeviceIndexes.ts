import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceIndexes1733314800000 implements MigrationInterface {
  name = 'AddDeviceIndexes1733314800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add indexes on frequently queried columns
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_manufacturer_idx" ON "devices" ("manufacturer")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_brand_idx" ON "devices" ("brand")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_model_idx" ON "devices" ("model")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_device_type_idx" ON "devices" ("device_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_source_idx" ON "devices" ("source")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_source_id_idx" ON "devices" ("source_id")`,
    );

    // Add composite index for common search patterns
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_brand_model_idx" ON "devices" ("brand", "model")`,
    );

    // Add index for pagination queries (created_at if exists, or device_id)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_id_idx" ON "devices" ("device_id" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_manufacturer_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_brand_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_model_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_device_type_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_source_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_source_id_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_brand_model_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_id_idx"`);
  }
}
