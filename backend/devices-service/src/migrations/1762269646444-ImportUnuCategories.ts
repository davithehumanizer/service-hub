import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class ImportUnuCategories1762269646444 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // Read the CSV file
    const csvPath = path.join(
      process.cwd(),
      'external-data',
      'category-unu.csv',
    );
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV (semicolon separated) and extract unique product names
    const lines = csvContent.split('\n').filter((line) => line.trim());
    const categoryNames = new Set<string>();

    for (const line of lines.slice(1)) {
      // Skip header
      const [, product] = line.split(';');
      if (product && product.trim()) {
        categoryNames.add(product.trim());
      }
    }

    // Insert categories one by one, checking for duplicates
    for (const categoryName of categoryNames) {
      const existing = (await _queryRunner.query(
        'SELECT id FROM device_categories WHERE name = $1',
        [categoryName],
      )) as any[];

      if (existing.length === 0) {
        await _queryRunner.query(
          'INSERT INTO device_categories (name) VALUES ($1)',
          [categoryName],
        );
      }
    }
  }

  public async down(): Promise<void> {
    // This migration only adds categories, no need to remove them in down
    // as they might be referenced by existing devices
  }
}
