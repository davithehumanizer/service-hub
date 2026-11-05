import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Translates the categories created after `SeedDeviceCategoryTranslations`,
 * which the NL and DE interfaces showed in English (PBI 13847). On 2026-09-29
 * production had a single one, "Projection TVs", with no translation at all.
 *
 * Matched by name, as ids differ between environments. A category that does
 * not exist is skipped, and an existing translation is left alone.
 */
export class TranslateLateCategories1790346462169 implements MigrationInterface {
  name = 'TranslateLateCategories1790346462169';

  private readonly translations: Record<string, Record<'fr' | 'nl' | 'de', string>> = {
    'Projection TVs': {
      fr: 'Téléviseurs à rétroprojection',
      nl: 'Projectietelevisies',
      de: 'Rückprojektionsfernseher',
    },
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, byLocale] of Object.entries(this.translations)) {
      for (const [locale, translated] of Object.entries(byLocale)) {
        await queryRunner.query(
          `INSERT INTO device_category_translations (category_id, locale, translated_name)
           SELECT id, $2, $3 FROM device_categories WHERE name = $1
           ON CONFLICT (category_id, locale) DO NOTHING`,
          [name, locale, translated],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only the rows this migration wrote: a translation that already existed
    // was left untouched by up() and must survive down() too.
    for (const [name, byLocale] of Object.entries(this.translations)) {
      for (const [locale, translated] of Object.entries(byLocale)) {
        await queryRunner.query(
          `DELETE FROM device_category_translations t
           USING device_categories c
           WHERE t.category_id = c.id AND c.name = $1
             AND t.locale = $2 AND t.translated_name = $3`,
          [name, locale, translated],
        );
      }
    }
  }
}
