import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class BackfillUnuKeys1763560000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop unique index
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_device_categories_unukey;`,
    );

    // Read the CSV file
    const csvPath = path.join(
      process.cwd(),
      'external-data',
      'category-unu.csv',
    );

    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter((line) => line.trim());

      // Process CSV lines
      for (const line of lines.slice(1)) {
        // Skip header
        const [unuKey, product] = line.split(';');
        if (unuKey && product && unuKey.trim() && product.trim()) {
          const key = unuKey.trim();
          const productName = product.trim();

          // Update category with this name
          await queryRunner.query(
            `UPDATE device_categories SET unukey = $1 WHERE name = $2`,
            [key, productName],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-create unique index (WARN: this might fail if duplicates exist now)
    // We strictly should not try to re-add unique index if we know duplicates exist.
    // So we just leave it. Or optionally we could try to clear 'unukey' column.

    // Ideally we should create a non-unique index if we want performance.

    // For now, let's just leave it or creating a non-unique index.
    await queryRunner.query(`
      CREATE INDEX idx_device_categories_unukey ON device_categories(unukey);
    `);
  }
}
