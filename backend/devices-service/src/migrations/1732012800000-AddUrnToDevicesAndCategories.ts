import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUrnToDevicesAndCategories1732012800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add URN column to devices table
    await queryRunner.query(`
      ALTER TABLE devices
      ADD COLUMN urn VARCHAR(255) UNIQUE;
    `);

    // Add URN column to device_categories table
    await queryRunner.query(`
      ALTER TABLE device_categories
      ADD COLUMN urn VARCHAR(255) UNIQUE;
    `);

    // Backfill URN for existing devices
    await queryRunner.query(`
      UPDATE devices
      SET urn = CONCAT('urn:care2repair:device:', device_id)
      WHERE urn IS NULL;
    `);

    // Backfill URN for existing device categories
    await queryRunner.query(`
      UPDATE device_categories
      SET urn = CONCAT('urn:care2repair:category:', id)
      WHERE urn IS NULL;
    `);

    // Create unique indexes on URN columns for better query performance
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_devices_urn ON devices(urn);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_device_categories_urn ON device_categories(urn);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devices_urn;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_device_categories_urn;`);

    // Drop URN columns
    await queryRunner.query(`ALTER TABLE devices DROP COLUMN urn;`);
    await queryRunner.query(`ALTER TABLE device_categories DROP COLUMN urn;`);
  }
}
