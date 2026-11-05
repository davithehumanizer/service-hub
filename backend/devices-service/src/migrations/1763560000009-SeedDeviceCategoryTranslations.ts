import * as path from 'path';
import * as fs from 'fs';
import { MigrationInterface, QueryRunner } from 'typeorm';

interface TranslationEntry {
  id: number;
  fr: string;
  nl: string;
  de: string;
}

export class SeedDeviceCategoryTranslations1763560000009
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Resolve path relative to the source/compiled file location
    const candidates = [
      path.join(__dirname, '../../external-data/category-translations.json'),
      path.join(__dirname, '../../../external-data/category-translations.json'),
    ];
    const jsonPath = candidates.find((p) => fs.existsSync(p));
    if (!jsonPath) {
      throw new Error(
        'category-translations.json not found. Searched:\n' +
          candidates.join('\n'),
      );
    }

    const translations: TranslationEntry[] = JSON.parse(
      fs.readFileSync(jsonPath, 'utf-8'),
    );

    // Fetch existing category IDs to avoid FK violations from orphaned JSON entries
    const rows: { id: number }[] = await queryRunner.query(
      `SELECT id FROM device_categories`,
    );
    const existingIds = new Set(rows.map((r) => r.id));
    const validTranslations = translations.filter((t) => existingIds.has(t.id));

    for (const locale of ['fr', 'nl', 'de'] as const) {
      const params: unknown[] = [];
      const placeholders = validTranslations
        .map((t, i) => {
          const base = i * 3;
          params.push(t.id, locale, t[locale]);
          return `($${base + 1}, $${base + 2}, $${base + 3})`;
        })
        .join(', ');

      await queryRunner.query(
        `INSERT INTO device_category_translations (category_id, locale, translated_name)
         VALUES ${placeholders}
         ON CONFLICT (category_id, locale) DO UPDATE
           SET translated_name = EXCLUDED.translated_name`,
        params,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM device_category_translations WHERE locale IN ('fr', 'nl', 'de')`,
    );
  }
}
