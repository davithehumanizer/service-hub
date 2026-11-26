import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairers proposed on the site wait for an administrator, and so do the
 * changes their authors make once published (docs/demo-data.md, §4.3).
 *
 * `status` defaults to 'published': every repairer already there, and every
 * import, stays on the map. `created_at` gets its default only after being
 * added, so that existing rows keep null rather than the migration's date.
 * `description` and `postal_code` were NOT NULL while the API declares them
 * optional: an incomplete form ended in a 500.
 */
export class AddRepairerProposals1793193324281 implements MigrationInterface {
  name = 'AddRepairerProposals1793193324281';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'published'`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "review_note" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "reviewed_by" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "description" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" ALTER COLUMN "postal_code" DROP NOT NULL`,
    );
    // The administrator's queue and "my repairers": a few rows each among
    // tens of thousands.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "repairers_unpublished_idx" ON "repairers" ("status") WHERE "status" <> 'published'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "repairers_created_by_idx" ON "repairers" ("created_by") WHERE "created_by" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "repairer_revisions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "repairer_id" uuid NOT NULL,
        "changes" jsonb NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "created_by" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "review_note" text,
        "reviewed_by" integer,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_repairer_revisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_repairer_revisions_repairer"
          FOREIGN KEY ("repairer_id")
          REFERENCES "repairers"("repairer_id")
          ON DELETE CASCADE
      )
    `);
    // One waiting change per repairer: a new one replaces it.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "repairer_revisions_one_pending_idx" ON "repairer_revisions" ("repairer_id") WHERE "status" = 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "repairer_revisions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "repairers_created_by_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "repairers_unpublished_idx"`);
    // description and postal_code stay nullable: rows written since may hold
    // nulls that NOT NULL would refuse.
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "review_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "status"`,
    );
  }
}
