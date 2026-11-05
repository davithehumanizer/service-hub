import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * First migration for this service: the schema so far was whatever
 * `synchronize: true` created, and it matches the entities, so there is no
 * baseline to reconcile. synchronize is off in production now, though, so
 * anything new has to come through here.
 *
 * `repair_journeys` holds wizard journeys waiting for an outcome. It is kept
 * out of `repair_records` on purpose: visitors try the wizard with made-up
 * data, and only a deliberate declaration should reach the statistics.
 *
 * Column names are quoted camelCase to match this service's existing tables.
 */
export class AddRepairJourneys1764700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // `uuid_generate_v4()` is the default a @PrimaryGeneratedColumn('uuid')
    // entity expects, same as the tutorial subscriptions migration.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS repair_journeys (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "declarationToken" character varying NOT NULL,
        "tokenExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "userId" character varying,
        "deviceId" integer,
        "brand" character varying,
        "modelType" character varying,
        "productCategory" character varying,
        "productCategoryId" character varying,
        "problem" text,
        "issues" text[],
        "problemTag" character varying,
        "repairRoute" character varying,
        "issueSeverity" character varying,
        "issueDuration" character varying,
        "visualCondition" character varying,
        "usageIntensity" character varying,
        "estimatedAge" double precision,
        "locale" character varying,
        "country" character varying,
        "status" character varying NOT NULL DEFAULT 'Pending',
        "declaredAt" TIMESTAMP WITH TIME ZONE,
        "repairRecordId" uuid,
        "journeyDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_repair_journeys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_repair_journeys_declarationToken" UNIQUE ("declarationToken")
      );
    `);

    // Declaration looks the journey up by its token, nothing else.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_repair_journeys_declarationToken"
      ON repair_journeys ("declarationToken");
    `);

    // Existing rows are the imported open dataset; the default keeps that true
    // without touching the ~195k rows already there.
    await queryRunner.query(`
      ALTER TABLE repair_records
      ADD COLUMN IF NOT EXISTS "source" character varying NOT NULL DEFAULT 'ImportedDataset';
    `);

    for (const column of [
      'issueSeverity',
      'issueDuration',
      'visualCondition',
      'usageIntensity',
    ]) {
      await queryRunner.query(`
        ALTER TABLE repair_records
        ADD COLUMN IF NOT EXISTS "${column}" character varying;
      `);
    }

    // Symptom keys ticked in the wizard. Stays null on the imported rows, which
    // have no such selection.
    await queryRunner.query(`
      ALTER TABLE repair_records
      ADD COLUMN IF NOT EXISTS "issues" text[];
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      'issues',
      'issueSeverity',
      'issueDuration',
      'visualCondition',
      'usageIntensity',
      'source',
    ]) {
      await queryRunner.query(`
        ALTER TABLE repair_records DROP COLUMN IF EXISTS "${column}";
      `);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS repair_journeys;`);
  }
}
