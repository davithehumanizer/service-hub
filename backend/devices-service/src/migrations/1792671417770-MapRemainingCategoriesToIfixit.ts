import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Maps to their iFixit wiki the categories the device-model refacto put the
 * models in, which SeedIfixitWikiIds did not name: it maps "Fridge" and
 * "Robot Vacuum", while the models sit in "Fridge / combi freezer" (2,878)
 * and "Robotic vacuum cleaner" (832). Without a wiki, the tutorial search
 * fell back to the category's translated name, which iFixit does not answer
 * to (PBI 13846).
 *
 * Each slug was verified against `/wikis/CATEGORY/<slug>` on 22/10/2026; the
 * comment is the guide count then. Monitor, Telephone, Footbath and Game
 * console stay NULL, as SeedIfixitWikiIds decided.
 */
export class MapRemainingCategoriesToIfixit1792671417770
  implements MigrationInterface
{
  name = 'MapRemainingCategoriesToIfixit1792671417770';

  // Keyed by name, as in SeedIfixitWikiIds.
  private readonly wikiIdByCategoryName: Record<string, string> = {
    'Fridge / combi freezer': 'Refrigerator', // 19
    'Robotic vacuum cleaner': 'Robotic_Vacuum_Cleaner', // 13
    'Upright vacuum cleaner': 'Vacuum_Cleaner', // 15
    'Handheld vacuum cleaner': 'Handheld_Vacuum', // 5
    'Carpet cleaner': 'Vacuum_Cleaner', // 15, "Vacuum and Carpet Cleaner"
    'Wash dryer (non-heat pump)': 'Washing_Machine', // 40
    'Portable radio': 'Radio', // 6
    Speaker: 'Speaker', // 13
    Beamer: 'Projector', // 5
    'Waffle iron': 'Waffle_Maker', // 1
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, wikiId] of Object.entries(this.wikiIdByCategoryName)) {
      // Only where unset: a match made by hand outranks this one.
      await queryRunner.query(
        `UPDATE device_categories
         SET ifixit_wikiid = $1
         WHERE name = $2 AND ifixit_wikiid IS NULL`,
        [wikiId, name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [name, wikiId] of Object.entries(this.wikiIdByCategoryName)) {
      await queryRunner.query(
        `UPDATE device_categories
         SET ifixit_wikiid = NULL
         WHERE name = $1 AND ifixit_wikiid = $2`,
        [name, wikiId],
      );
    }
  }
}
