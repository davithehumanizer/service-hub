import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The colours a model's variants come in, as Icecat names them: the search
 * result shows them as swatches when they tell the variants apart. Written
 * with the variant labels, which read the same property.
 */
export class AddModelColours1791364798354 implements MigrationInterface {
  name = 'AddModelColours1791364798354';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_models" ADD COLUMN IF NOT EXISTS "colours" character varying array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_models" DROP COLUMN IF EXISTS "colours"`,
    );
  }
}
