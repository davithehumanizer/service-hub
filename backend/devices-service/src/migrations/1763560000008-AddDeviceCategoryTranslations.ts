import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceCategoryTranslations1763560000008
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS device_category_translations (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES device_categories(id) ON DELETE CASCADE,
        locale VARCHAR(5) NOT NULL,
        translated_name VARCHAR(255) NOT NULL,
        UNIQUE (category_id, locale)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dct_category_locale
        ON device_category_translations (category_id, locale);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS device_category_translations;`,
    );
  }
}
