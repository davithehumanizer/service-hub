import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PBI 13762 — "Ce résultat n'est pas un réparateur" report/moderation flow.
 * Creates the `repairer_reports` table (`CREATE TABLE IF NOT EXISTS` because
 * `synchronize: true` may already have created it from the entity before this
 * migration runs — see 1764200000000-AddRepairerPartnerType.ts for the same
 * pattern/rationale).
 */
export class CreateRepairerReports1764300000000 implements MigrationInterface {
  name = 'CreateRepairerReports1764300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "repairer_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "repairer_id" uuid NOT NULL,
        "reason" text,
        "status" character varying NOT NULL DEFAULT 'pending',
        "reviewedBy" character varying,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_repairer_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_repairer_reports_repairer"
          FOREIGN KEY ("repairer_id")
          REFERENCES "repairers"("repairer_id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "repairer_reports_repairer_id_idx" ON "repairer_reports" ("repairer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "repairer_reports_status_idx" ON "repairer_reports" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "repairer_reports_status_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "repairer_reports_repairer_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "repairer_reports"`);
  }
}
