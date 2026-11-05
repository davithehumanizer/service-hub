import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PBI 13851 — the AWA second-hand shops (Aachen) were imported as 'recycler'
 * for want of a reuse type, so the map showed a bridal-wear shop as a
 * collection point. They become 'reuse'; the two listed in both AWA
 * directories repair and resell, so 'repairer_reuse' rather than 'both'
 * (repair and collect).
 *
 * The importer reads only the repair and second-hand directories, so an AWA
 * row's current type is enough to tell which one it came from.
 */
export class ReclassifyAwaSecondHandShops1792156469636
  implements MigrationInterface
{
  name = 'ReclassifyAwaSecondHandShops1792156469636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "repairers" SET "partner_type" = 'reuse' WHERE "repairer_import_id" LIKE 'awa-%' AND "partner_type" = 'recycler'`,
    );
    await queryRunner.query(
      `UPDATE "repairers" SET "partner_type" = 'repairer_reuse' WHERE "repairer_import_id" LIKE 'awa-%' AND "partner_type" = 'both'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "repairers" SET "partner_type" = 'recycler' WHERE "repairer_import_id" LIKE 'awa-%' AND "partner_type" = 'reuse'`,
    );
    await queryRunner.query(
      `UPDATE "repairers" SET "partner_type" = 'both' WHERE "repairer_import_id" LIKE 'awa-%' AND "partner_type" = 'repairer_reuse'`,
    );
  }
}
