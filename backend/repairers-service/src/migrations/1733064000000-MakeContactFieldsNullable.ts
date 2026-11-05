import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeContactFieldsNullable1733064000000 implements MigrationInterface {
  name = 'MakeContactFieldsNullable1733064000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "website" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "email" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "phone" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "phone" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "email" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "website" SET NOT NULL`,
    );
  }
}
