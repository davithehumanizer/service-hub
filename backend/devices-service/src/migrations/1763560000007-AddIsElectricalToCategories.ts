import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsElectricalToCategories1763560000007
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE device_categories
      ADD COLUMN IF NOT EXISTS is_electrical BOOLEAN NOT NULL DEFAULT false;
    `);

    // Seed: all categories that have a UNU key are electrical/electronic devices
    await queryRunner.query(`
      UPDATE device_categories
      SET is_electrical = true
      WHERE unukey IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE device_categories
      DROP COLUMN IF EXISTS is_electrical;
    `);
  }
}
