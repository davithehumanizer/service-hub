import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The parts a variant's label is made of, by key ({ storage: "256 GB",
 * colour: "Black" }): the model page narrows the variants down by them.
 * Written with the labels; models:assign fills the rows still without.
 */
export class AddVariantParts1791450400085 implements MigrationInterface {
  name = 'AddVariantParts1791450400085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "variant_parts" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN IF EXISTS "variant_parts"`,
    );
  }
}
