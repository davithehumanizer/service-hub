import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportTrackingToDevices1763560000000
  implements MigrationInterface
{
  name = 'AddImportTrackingToDevices1763560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "import_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "import_date" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "source_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "source_id"`);
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "import_date"`);
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "import_id"`);
  }
}
