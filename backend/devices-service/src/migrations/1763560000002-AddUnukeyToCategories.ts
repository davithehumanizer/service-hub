import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnukeyToCategories1763560000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unukey column to device_categories table
    await queryRunner.query(`
      ALTER TABLE device_categories
      ADD COLUMN unukey VARCHAR(255);
    `);

    // // Create unique index on unukey column
    // await queryRunner.query(`
    //   CREATE UNIQUE INDEX idx_device_categories_unukey ON device_categories(unukey);
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    // await queryRunner.query(
    //   `DROP INDEX IF EXISTS idx_device_categories_unukey;`,
    // );

    // Drop unukey column
    await queryRunner.query(
      `ALTER TABLE device_categories DROP COLUMN unukey;`,
    );
  }
}
