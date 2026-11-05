import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Follows the category merge in devices-service on the journeys and records
 * that recorded a category.
 *
 * `productCategory` holds the name and `productCategoryId` the id, both copied
 * at the time the journey was written. The merge deletes fifteen categories,
 * so without this the statistics count "Fridge" and "Fridge / combi freezer"
 * as two different things, and `productCategoryId` points at a row that no
 * longer exists.
 *
 * Guarded on the devices tables being present: the services share one database
 * today, and this must not fail the day they stop.
 */
export class RemapMergedCategories1789055200000 implements MigrationInterface {
  name = 'RemapMergedCategories1789055200000';

  private readonly merges: [string, string][] = [
    ['Robot Vacuum', 'Robotic vacuum cleaner'],
    ['Fridge', 'Fridge / combi freezer'],
    ['Washer Dryers', 'Washing machine / Combi dryer'],
    ['Tumble Dryers', 'Wash dryer (non-heat pump)'],
    ['Stick Vacuums & Electric Brooms', 'Upright vacuum cleaner'],
    ['Handheld Vacuums', 'Handheld vacuum cleaner'],
    ['Carpet Cleaning Machines', 'Carpet cleaner'],
    ['Gaming Console', 'Game console'],
    ['All-in-One PCs/Workstations', 'Desktop computer'],
    ['Personal Computer', 'Desktop computer'],
    ['Office Equipment', 'Printer'],
    ['Radios', 'Portable radio'],
    ['Mobile Device Keyboards', 'Keyboard (computer)'],
    ['Data Projectors', 'Beamer'],
    ['Hospitality TVs', 'Flat Display Panel Television (LCD, LED, Plasma)'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ present }] = (await queryRunner.query(
      `SELECT to_regclass('public.device_categories') IS NOT NULL AS present`,
    )) as { present: boolean }[];
    if (!present) {
      return;
    }

    for (const table of ['repair_journeys', 'repair_records']) {
      for (const [source, target] of this.merges) {
        // Casts spelled out: $2 lands both in a varchar column and in a
        // comparison against `name`, and Postgres refuses to deduce one type
        // for the two.
        await queryRunner.query(
          `
          UPDATE "${table}"
          SET "productCategory" = $2::varchar,
              "productCategoryId" = COALESCE(
                (SELECT id::varchar FROM device_categories WHERE name = $2::varchar),
                "productCategoryId"
              )
          WHERE "productCategory" = $1::varchar;
          `,
          [source, target],
        );
      }
    }
  }

  public async down(): Promise<void> {
    // The old names are gone from device_categories, so putting them back on a
    // journey would point it at a category that no longer exists.
  }
}
