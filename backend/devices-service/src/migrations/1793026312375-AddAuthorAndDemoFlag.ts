import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Who created a model, a variant or a photo, and whether it is
 * demonstration data entered by a contributor (docs/demo-data.md). Rows
 * already there are imports or real users' and keep the defaults. A
 * constant default adds the column without rewriting the 1.1 M devices.
 */
export class AddAuthorAndDemoFlag1793026312375 implements MigrationInterface {
  name = 'AddAuthorAndDemoFlag1793026312375';

  private readonly tables = [
    'device_models',
    'devices',
    'device_photos',
    'device_model_photos',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "created_by" integer`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "is_demo" boolean NOT NULL DEFAULT false`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "is_demo"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "created_by"`,
      );
    }
  }
}
