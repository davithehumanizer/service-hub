import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Device models, and the link from each catalogue entry (now a variant) to its
 * model. Names are the ones TypeORM derives from the entities, so that
 * schema:log stays quiet. On the 1.12 M rows of `devices` nothing is
 * rewritten: the new columns are nullable or have a constant default. The
 * index and the foreign key check still read the whole table, under a lock
 * held until the migrations commit.
 */
export class CreateDeviceModels1791190108412 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_models" (
        "id" SERIAL NOT NULL,
        "brand" character varying NOT NULL,
        "name" character varying NOT NULL,
        "key" character varying NOT NULL,
        "variant_count" integer NOT NULL DEFAULT '0',
        "representative_device_id" integer,
        "has_manufacturer_variant" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_51f8c8f18871353268185fdde81" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "device_models_brand_idx" ON "device_models" ("brand")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "device_models_key_unique_idx" ON "device_models" ("key")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_model_categories" (
        "model_id" integer NOT NULL,
        "category_id" integer NOT NULL,
        CONSTRAINT "PK_cbad098d5ce7717ef3b4481b413" PRIMARY KEY ("model_id", "category_id"),
        CONSTRAINT "FK_0506b74f5572a2caecef6e27d4f" FOREIGN KEY ("model_id")
          REFERENCES "device_models"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_1cc5e3ecc64e9e2c81e5d4c537d" FOREIGN KEY ("category_id")
          REFERENCES "device_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0506b74f5572a2caecef6e27d4" ON "device_model_categories" ("model_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1cc5e3ecc64e9e2c81e5d4c537" ON "device_model_categories" ("category_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "model_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "variant_label" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "is_refurbished" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "devices_model_id_idx" ON "devices" ("model_id")`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_9976b0a15b9a60e48466d2307b9') THEN
          ALTER TABLE "devices" ADD CONSTRAINT "FK_9976b0a15b9a60e48466d2307b9"
            FOREIGN KEY ("model_id") REFERENCES "device_models"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "FK_9976b0a15b9a60e48466d2307b9"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_model_id_idx"`);
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN IF EXISTS "is_refurbished"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN IF EXISTS "variant_label"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN IF EXISTS "model_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "device_model_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "device_models"`);
  }
}
