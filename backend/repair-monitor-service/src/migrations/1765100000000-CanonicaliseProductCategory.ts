import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Puts back the untranslated category name on rows that recorded a label.
 *
 * The wizard stored `device.categories[0].name`, which the API localises, so
 * a French visitor's repair went in as "Aspirateur robot" and a Dutch one as
 * "Robotstofzuiger". Three things read that column in English — the impact
 * lookup, the statistics, and the imported ORDS dataset it sits beside — so
 * those rows matched nothing and their CO2e came out empty.
 *
 * Only rows whose value is *exactly* a known translation are touched, and
 * only when that translation belongs to a single category, so an ambiguous
 * label is left alone rather than guessed at. Imported records are excluded
 * outright: they are already in English and are not ours to rewrite.
 *
 * `co2Avoided` stays null on journeys already declared. Recomputing it would
 * need reference data this service cannot reach, and those users were shown
 * no figure at the time.
 */
export class CanonicaliseProductCategory1765100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ present }]: { present: boolean }[] = await queryRunner.query(`
      SELECT to_regclass('public.device_category_translations') IS NOT NULL AS present
    `);
    if (!present) {
      // devices-service owns that table. Nothing to map against without it.
      return;
    }

    // Unambiguous translations only: a label used by two categories cannot be
    // resolved, and picking one would be a guess.
    await queryRunner.query(`
      CREATE TEMP TABLE canonical_by_label AS
        SELECT t.translated_name AS label, min(c.name) AS canonical
        FROM device_category_translations t
        JOIN device_categories c ON c.id = t.category_id
        GROUP BY t.translated_name
        HAVING count(DISTINCT c.name) = 1
    `);

    await queryRunner.query(`
      UPDATE repair_journeys j
      SET "productCategory" = m.canonical
      FROM canonical_by_label m
      WHERE j."productCategory" = m.label
    `);

    await queryRunner.query(`
      UPDATE repair_records r
      SET "productCategory" = m.canonical
      FROM canonical_by_label m
      WHERE r."productCategory" = m.label
        AND r.source = 'Platform'
    `);

    // A label two categories share cannot be resolved from the label alone —
    // "Aspirateur robot" is both "Robot Vacuum" and "Robotic vacuum cleaner",
    // near-duplicates that should not both exist. Where the journey names a
    // device, that device's own category settles it without guessing.
    await queryRunner.query(`
      UPDATE repair_journeys j
      SET "productCategory" = resolved.name
      FROM (
        SELECT link."devicesDeviceId" AS device_id, min(c.name) AS name
        FROM device_category_device_link link
        JOIN device_categories c ON c.id = link."deviceCategoriesId"
        GROUP BY link."devicesDeviceId"
        HAVING count(*) = 1
      ) AS resolved
      WHERE j."deviceId" = resolved.device_id
        AND j."productCategory" IS NOT NULL
        AND j."productCategory" NOT IN (SELECT name FROM device_categories)
    `);

    await queryRunner.query(`DROP TABLE canonical_by_label`);
  }

  public async down(): Promise<void> {
    // Deliberately irreversible: the previous values were labels in whichever
    // language the visitor happened to be reading, and restoring them would
    // mean recording display text as data all over again.
  }
}
