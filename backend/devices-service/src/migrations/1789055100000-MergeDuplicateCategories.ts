import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Merges the Icecat-named categories into their UNU counterparts, and gives a
 * UNU key to the ones that have no counterpart.
 *
 * The table holds two taxonomies. `external-data/category-unu.csv` seeded 302
 * regulatory categories through `UPDATE ... WHERE name = ...`, and the Icecat
 * import created its own — "Robot Vacuum" beside "Robotic vacuum cleaner",
 * "Fridge" beside "Fridge / combi freezer". The devices all landed on the
 * Icecat side, which the CSV never matched: of 360 categories, 59 hold
 * devices, and 32 of those carry no UNU key at all — 37 131 devices.
 *
 * "Fridge" is worse than unkeyed: it carries 601, power tools, because the CSV
 * itself says so at line 252. That line is removed in the same change.
 *
 * Keys 308 and 309 (monitors) do not appear in the CSV, which is why "Monitor"
 * — 35 934 devices, the largest unkeyed category — had nowhere to go. 309 is
 * used here for flat panels, as the UNU classification defines it.
 *
 * Elasticsearch keeps its own copy of the category names, so the filters and
 * facets keep answering with the deleted names until a reindex runs:
 *
 *     docker compose exec devices-service npm run cli search:sync-devices
 *
 * `down()` puts the categories back and re-links their devices, but their
 * translations are lost: they cascade with the row. Seeding them again is
 * `SeedDeviceCategoryTranslations`.
 */
export class MergeDuplicateCategories1789055100000
  implements MigrationInterface
{
  name = 'MergeDuplicateCategories1789055100000';

  // [Icecat name, UNU name]. Matched by name: category ids are not stable
  // across environments.
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

  // Categories with no UNU counterpart to merge into: they keep their row and
  // gain the key of the family they belong to.
  private readonly keys: Record<string, string> = {
    Monitor: '309',
    'Signage Displays': '309',
    'Meeting Room Displays': '309',
    Wearable: '201',
    Networking: '301',
    'Interface Hubs': '301',
    'Video Cable Adapters': '301',
    'Power Tool': '601',
    'Personal Care': '205',
    Audio: '403',
    'Projection TVs': '404',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [source, target] of this.merges) {
      await queryRunner.query(
        `
        INSERT INTO device_category_device_link ("devicesDeviceId", "deviceCategoriesId")
        SELECT l."devicesDeviceId", (SELECT id FROM device_categories WHERE name = $2)
        FROM device_category_device_link l
        WHERE l."deviceCategoriesId" = (SELECT id FROM device_categories WHERE name = $1)
        ON CONFLICT DO NOTHING;
        `,
        [source, target],
      );

      await queryRunner.query(
        `
        DELETE FROM device_category_device_link
        WHERE "deviceCategoriesId" = (SELECT id FROM device_categories WHERE name = $1);
        `,
        [source],
      );

      await queryRunner.query(
        `DELETE FROM device_categories WHERE name = $1;`,
        [source],
      );
    }

    for (const [name, unukey] of Object.entries(this.keys)) {
      await queryRunner.query(
        `UPDATE device_categories SET unukey = $2 WHERE name = $1;`,
        [name, unukey],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only the keys come back. Once the two categories are merged, nothing
    // records which devices came from which side — a device on "Desktop
    // computer" could have been there all along or have arrived from
    // "Personal Computer" — so recreating the rows would either leave them
    // empty or drag the target's own devices along with them. Restoring the
    // split means restoring the database.
    for (const name of Object.keys(this.keys)) {
      await queryRunner.query(
        `UPDATE device_categories SET unukey = NULL WHERE name = $1;`,
        [name],
      );
    }
  }
}
