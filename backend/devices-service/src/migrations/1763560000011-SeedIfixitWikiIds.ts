import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fills `device_categories.ifixit_wikiid` with the iFixit wiki each of our
 * categories corresponds to.
 *
 * Our category names are UNU regulatory labels — "Washing machine / Combi
 * dryer", "Smart Phone / Pager" — and iFixit does not answer to them: sent as
 * free text they return nothing, so every appliance fell through to a guess.
 * Each slug below was verified against `/wikis/CATEGORY/<slug>` on the live
 * API; the comment is the guide count observed at seeding time.
 *
 * Categories with no honest equivalent are left NULL on purpose (Monitor,
 * Telephone, Vacuum sealer, All-in-One PCs, Footbath, Gaming Console): iFixit
 * has only per-product wikis there, and a wrong mapping is worse than none.
 */
export class SeedIfixitWikiIds1763560000011 implements MigrationInterface {
  name = 'SeedIfixitWikiIds1763560000011';

  // Keyed by name, which carries its own unique constraint: category ids are
  // not stable across environments.
  private readonly wikiIdByCategoryName: Record<string, string> = {
    Laptop: 'PC_Laptop', // 12
    'Desktop computer': 'PC_Desktop', // 8
    'Personal Computer': 'PC', // 3
    'All-in-One PCs/Workstations': 'PC_Desktop', // 8
    'Keyboard (computer)': 'Keyboard', // 60
    Mouse: 'Mouse', // 21
    Tablet: 'Android_Tablet', // 2
    'Smart Phone / Pager': 'Android_Phone', // 16
    Wearable: 'Smartwatch', // 2
    'Wrist watch': 'Watch', // 20
    Radios: 'Radio', // 3
    'Flat Display Panel Television (LCD, LED, Plasma)': 'Television', // 7
    Printer: 'Printer', // 5
    'Office Equipment': 'Printer', // 5
    'Washing machine / Combi dryer': 'Washing_Machine', // 37
    'Washer Dryers': 'Washing_Machine', // 37
    'Tumble Dryers': 'Dryer', // 19
    Dishwasher: 'Dishwasher', // 14
    Fridge: 'Refrigerator', // 18
    Freezer: 'Refrigerator', // 18
    Oven: 'Stove', // 25
    Grill: 'Barbecue_Grill', // 8
    Toaster: 'Toaster', // 21
    Blender: 'Blender', // 15
    Fryer: 'Air_Fryer', // 5
    'Bread maker': 'Bread_Maker', // 3
    'Drip coffee maker': 'Coffee_Maker', // 9
    Iron: 'Clothes_Iron', // 10
    'Vacuum cleaner': 'Vacuum_Cleaner', // 14
    'Robot Vacuum': 'Robotic_Vacuum_Cleaner', // 6
    'Stick Vacuums & Electric Brooms': 'Stick_Vacuum', // 3
    'Handheld Vacuums': 'Handheld_Vacuum', // 5
    'Home Appliance': 'Appliance', // 8
    'Power Tool': 'Tool', // 3
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Several of our categories share one iFixit wiki — Fridge and Freezer are
    // both Refrigerator there — so the mapping is many-to-one and the unique
    // constraint added with the column cannot hold.
    await queryRunner.query(`
      ALTER TABLE device_categories
      DROP CONSTRAINT IF EXISTS device_categories_ifixit_wikiid_key;
    `);

    for (const [name, wikiId] of Object.entries(this.wikiIdByCategoryName)) {
      // Only where unset: an admin may already have matched a category by hand
      // through PUT /device-categories/:id, and that decision outranks a seed.
      await queryRunner.query(
        `UPDATE device_categories
         SET ifixit_wikiid = $1
         WHERE name = $2 AND ifixit_wikiid IS NULL`,
        [wikiId, name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE device_categories SET ifixit_wikiid = NULL WHERE name = ANY($1)`,
      [Object.keys(this.wikiIdByCategoryName)],
    );
  }
}
