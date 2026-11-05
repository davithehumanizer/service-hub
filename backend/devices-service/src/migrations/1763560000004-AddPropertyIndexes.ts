import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyIndexes1763560000004 implements MigrationInterface {
  name = 'AddPropertyIndexes1763560000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index for technical properties
    await queryRunner.query(
      `CREATE INDEX "IDX_device_technical_properties_device_id" ON "device_technical_properties" ("deviceDeviceId")`,
    );

    // Add index for informational properties
    await queryRunner.query(
      `CREATE INDEX "IDX_device_informational_properties_device_id" ON "device_informational_properties" ("device_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_device_informational_properties_device_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_device_technical_properties_device_id"`,
    );
  }
}
