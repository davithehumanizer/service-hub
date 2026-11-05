import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIfixitWikiIdToCategories1763560000010
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Canonical iFixit device/category wiki title (e.g. "iPhone 14 Pro Max").
    // Nullable: populated manually by an admin via PUT /device-categories/:id
    // once a category has been matched to its iFixit wiki. Used to bypass
    // free-text search ambiguity entirely once set (see external-adapters
    // ifixit-adapter.service.ts searchDevice fallback strategy).
    await queryRunner.query(`
      ALTER TABLE device_categories
      ADD COLUMN IF NOT EXISTS ifixit_wikiid VARCHAR(255) UNIQUE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE device_categories
      DROP COLUMN IF EXISTS ifixit_wikiid;
    `);
  }
}
