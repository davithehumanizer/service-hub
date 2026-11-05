/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as fastCsv from 'fast-csv';

/**
 * PBI 13760 — adds `partner_type` to `repairers` so the map can distinguish
 * actual repairers from recycling/collection points.
 *
 * `repairers` is populated from several independent importers
 * (`importers/repairers_belgium`, `importers/repairers_france`,
 * `importers/repairers_denhaag`), each with a different (or no) signal for
 * the repair-vs-recycle distinction, so a single-source backfill is not
 * enough. Backfill strategy (per confirmed plan + importer source review):
 *
 * 1. Every existing repairer defaults to 'repairer'.
 * 2. Belgium: repairers matched against the Belgium source export
 *    (`src/data/repairers.csv`, joined on repairer_import_id <-> csv `id`,
 *    same file `importers/repairers_belgium/locations_repairconnects.csv`
 *    imports from) are reclassified using the real `organisation_type_code`
 *    value.
 * 3. France (`importers/repairers_france`) and any other source (Den Haag,
 *    manual entries, ...) have no reliable per-record repair-vs-recycle
 *    signal available here, so they are intentionally left at the
 *    'repairer' default — except for the zero-device fallback below.
 * 4. Fallback: for repairers with no matching Belgium source record and zero
 *    associated `repairer_devices` rows, reclassify as 'recycler' (a
 *    repairer that repairs nothing is very likely a collection point).
 */
export class AddRepairerPartnerType1764200000000 implements MigrationInterface {
  name = 'AddRepairerPartnerType1764200000000';

  // Maps the CSV's real `organisation_type_code` values to the new whitelist.
  // Anything not listed here (e.g. 'professional_repairer', 'repair_cafe',
  // 'fablab') is left at the 'repairer' default.
  private readonly organisationTypeToPartnerType: Record<string, string> = {
    recycling_center: 'recycler',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: `synchronize: true` may have already added this column
    // (e.g. when the service started against the entity before this
    // migration ran), so guard against the column already existing.
    await queryRunner.query(
      `ALTER TABLE "repairers" ADD COLUMN IF NOT EXISTS "partner_type" character varying NOT NULL DEFAULT 'repairer'`,
    );

    const csvRows = await this.loadCsvRows(queryRunner);

    const recyclerImportIds = csvRows
      .filter(
        (row) =>
          this.organisationTypeToPartnerType[row.organisation_type_code] ===
          'recycler',
      )
      .map((row) => row.id)
      .filter((id): id is string => !!id);

    if (recyclerImportIds.length > 0) {
      await queryRunner.query(
        `UPDATE "repairers" SET "partner_type" = 'recycler' WHERE "repairer_import_id" = ANY($1)`,
        [recyclerImportIds],
      );
    }

    // Fallback: repairers with no matching Belgium source record AND zero
    // devices are very likely recyclers/collection points rather than active
    // repairers. France and any other non-Belgium source stay 'repairer'
    // otherwise, per user decision (no reliable signal to reclassify them).
    const allImportIds = csvRows
      .map((row) => row.id)
      .filter((id): id is string => !!id);

    await queryRunner.query(
      `
      UPDATE "repairers"
      SET "partner_type" = 'recycler'
      WHERE "partner_type" = 'repairer'
        AND ("repairer_import_id" IS NULL OR NOT ("repairer_import_id" = ANY($1)))
        AND "repairer_id" NOT IN (SELECT DISTINCT "repairer_id" FROM "repairer_devices")
      `,
      [allImportIds],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "repairers" DROP COLUMN IF EXISTS "partner_type"`,
    );
  }

  private async loadCsvRows(
    queryRunner: QueryRunner,
  ): Promise<Array<{ id: string; organisation_type_code: string }>> {
    const csvPath = path.join(__dirname, '../data/repairers.csv');

    if (!fs.existsSync(csvPath)) {
      queryRunner.connection.logger.log(
        'warn',
        `Belgium source CSV not found at ${csvPath} — skipping partner_type backfill from source data.`,
      );
      return [];
    }

    return new Promise((resolve, reject) => {
      const rows: Array<{ id: string; organisation_type_code: string }> = [];
      fs.createReadStream(csvPath)
        .pipe(fastCsv.parse({ headers: true, delimiter: ',' }))
        .on('error', reject)
        .on('data', (row) => {
          rows.push({
            id: row.id,
            organisation_type_code: row.organisation_type_code,
          });
        })
        .on('end', () => resolve(rows));
    });
  }
}
