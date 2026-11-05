import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDevicePhotosTable1742834800000 implements MigrationInterface {
  name = 'AddDevicePhotosTable1742834800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_photos" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "device_id" integer NOT NULL,
        "key" character varying NOT NULL,
        "url" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_photos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_device_photos_device"
          FOREIGN KEY ("device_id")
          REFERENCES "devices"("device_id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "device_photos_device_id_idx" ON "device_photos" ("device_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "device_photos_device_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "device_photos"`);
  }
}
