import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixVacuumCleanerCategory1763560000005
  implements MigrationInterface
{
  name = 'FixVacuumCleanerCategory1763560000005';

  // Icecat category 1234 ("Vacuums") was incorrectly mapped to backend category 117 ("Vacuum sealer").
  // The correct backend category for vacuum cleaners is 131 ("Vacuum cleaner").
  // This migration re-links affected ICECAT-sourced devices to the correct category.
  // Only devices whose model name contains "vacuum cleaner" (case-insensitive) are targeted,
  // to avoid accidentally reclassifying actual vacuum sealers (food/bag sealers) from Icecat
  // category 1784 ("Vacuum Sealers"), which legitimately map to category 117.

  private readonly VACUUM_SEALER_CATEGORY_ID = 117;
  private readonly VACUUM_CLEANER_CATEGORY_ID = 131;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find ICECAT devices linked to "Vacuum sealer" (117) whose model suggests a vacuum cleaner
    await queryRunner.query(`
      UPDATE device_category_device_link
      SET "deviceCategoriesId" = ${this.VACUUM_CLEANER_CATEGORY_ID}
      WHERE "deviceCategoriesId" = ${this.VACUUM_SEALER_CATEGORY_ID}
        AND "devicesDeviceId" IN (
          SELECT d.device_id
          FROM devices d
          WHERE d.source = 'ICECAT'
            AND LOWER(d.model) LIKE '%vacuum cleaner%'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE device_category_device_link
      SET "deviceCategoriesId" = ${this.VACUUM_SEALER_CATEGORY_ID}
      WHERE "deviceCategoriesId" = ${this.VACUUM_CLEANER_CATEGORY_ID}
        AND "devicesDeviceId" IN (
          SELECT d.device_id
          FROM devices d
          WHERE d.source = 'ICECAT'
            AND LOWER(d.model) LIKE '%vacuum cleaner%'
        )
    `);
  }
}
