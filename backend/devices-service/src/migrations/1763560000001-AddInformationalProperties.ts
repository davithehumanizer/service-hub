import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInformationalProperties1763560000001
  implements MigrationInterface
{
  name = 'AddInformationalProperties1763560000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "device_informational_properties" ("property_id" SERIAL NOT NULL, "property_name" character varying NOT NULL, "property_value" character varying NOT NULL, "device_id" integer, CONSTRAINT "PK_device_informational_properties_property_id" PRIMARY KEY ("property_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_informational_properties" ADD CONSTRAINT "FK_device_informational_properties_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_informational_properties" DROP CONSTRAINT "FK_device_informational_properties_device_id"`,
    );
    await queryRunner.query(`DROP TABLE "device_informational_properties"`);
  }
}
