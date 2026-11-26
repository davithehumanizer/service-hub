import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Who created a repairer, and whether it is demonstration data entered by
 * a contributor (docs/demo-data.md). Repairers already there are imports
 * and keep the defaults.
 */
export class AddRepairerAuthorAndDemoFlag1793026312376
  implements MigrationInterface
{
  name = 'AddRepairerAuthorAndDemoFlag1793026312376';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "created_by" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "is_demo" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "is_demo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "created_by"`,
    );
  }
}
