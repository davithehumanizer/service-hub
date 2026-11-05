import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves the devices filed under "Vacuum sealer" to "Vacuum cleaner".
 *
 * The Icecat mapping was built by name similarity, and "Vacuums" scored 0.89
 * against "Vacuum sealer" — so household vacuum cleaners were imported into the
 * food-sealer category. `importers/icecat/mappings/category_mapping.json` has
 * since been corrected by hand (Icecat 1234 -> 131, `"manual": true`), but the
 * devices already imported were never re-filed, which is why both categories
 * are populated.
 *
 * Audited before writing this: of the 4457 devices in "Vacuum sealer", none
 * carried a sealing-related property, 4381 carried vacuum-cleaner ones (dust,
 * suction, bagless, filter), the brands were Bosch, Samsung, Electrolux,
 * Philips, Hoover, Rowenta, Bissell, Polti, and none was also in "Vacuum
 * cleaner" — so nothing here is a genuine sealer and the move collides with
 * nothing.
 *
 * The category itself is kept: it is a real category that may one day hold
 * real sealers.
 *
 * Elasticsearch holds its own copy of the category names (`category_names` in
 * device-search.service.ts) and a migration cannot touch it, so the category
 * filter keeps answering "Vacuum sealer" until a reindex runs:
 *
 *     docker compose exec devices-service npm run cli search:sync-devices
 */
export class MoveVacuumCleanersOutOfVacuumSealer1763560000012
  implements MigrationInterface
{
  name = 'MoveVacuumCleanersOutOfVacuumSealer1763560000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Matched by name: category ids are not stable across environments.
    await queryRunner.query(`
      INSERT INTO device_category_device_link ("devicesDeviceId", "deviceCategoriesId")
      SELECT l."devicesDeviceId",
             (SELECT id FROM device_categories WHERE name = 'Vacuum cleaner')
      FROM device_category_device_link l
      WHERE l."deviceCategoriesId" =
            (SELECT id FROM device_categories WHERE name = 'Vacuum sealer')
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      DELETE FROM device_category_device_link
      WHERE "deviceCategoriesId" =
            (SELECT id FROM device_categories WHERE name = 'Vacuum sealer');
    `);
  }

  public async down(): Promise<void> {
    // Deliberately empty. Once merged, nothing distinguishes a device that was
    // wrongly in "Vacuum sealer" from one correctly imported into "Vacuum
    // cleaner", so moving them back would misfile the 3564 that were always
    // right. Restore from a backup if this has to be undone.
  }
}
