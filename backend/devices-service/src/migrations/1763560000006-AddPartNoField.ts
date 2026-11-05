import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartNoField1763560000006 implements MigrationInterface {
  name = 'AddPartNoField1763560000006';

  // Adds a dedicated `product_code` column to store the manufacturer's model/type reference
  // (BrandPartCode from Icecat), and migrates existing ICECAT data from `serial_number`
  // to this new field, freeing `serial_number` for actual device serial numbers.

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new column
    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "product_code" character varying NOT NULL DEFAULT ''`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "devices_product_code_unique_idx" ON "devices" ("product_code") WHERE product_code != ''`,
    );

    // Copy BrandPartCode data (currently in serial_number) to product_code for ICECAT devices
    await queryRunner.query(`
      UPDATE devices
      SET product_code = serial_number, serial_number = ''
      WHERE source = 'ICECAT' AND serial_number != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore serial_number from product_code for ICECAT devices
    await queryRunner.query(`
      UPDATE devices
      SET serial_number = product_code, product_code = ''
      WHERE source = 'ICECAT' AND product_code != ''
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "devices_product_code_unique_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN IF EXISTS "product_code"`,
    );
  }
}
