import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalizes repairer country values to ISO 3166-1 alpha-2 codes.
 * Converts full country names (e.g. "France") to their ISO codes (e.g. "FR").
 * Values that are already valid ISO codes or unknown are left unchanged.
 */
export class NormalizeRepairerCountryCodes1740000000000
  implements MigrationInterface
{
  name = 'NormalizeRepairerCountryCodes1740000000000';

  /**
   * Maps known country name variants (lowercase) to ISO codes.
   * Covers names that may appear in the database from seed migrations or imports.
   */
  private readonly nameToCode: Record<string, string> = {
    france: 'FR',
    'republic of france': 'FR',
    belgium: 'BE',
    belgique: 'BE',
    belgië: 'BE',
    netherlands: 'NL',
    'the netherlands': 'NL',
    'pays-bas': 'NL',
    nederland: 'NL',
    germany: 'DE',
    allemagne: 'DE',
    deutschland: 'DE',
    austria: 'AT',
    autriche: 'AT',
    österreich: 'AT',
    switzerland: 'CH',
    suisse: 'CH',
    schweiz: 'CH',
    luxembourg: 'LU',
    'united kingdom': 'GB',
    'great britain': 'GB',
    england: 'GB',
    'royaume-uni': 'GB',
    ireland: 'IE',
    'republic of ireland': 'IE',
    irlande: 'IE',
    sweden: 'SE',
    suède: 'SE',
    sverige: 'SE',
    norway: 'NO',
    norvège: 'NO',
    norge: 'NO',
    denmark: 'DK',
    danemark: 'DK',
    danmark: 'DK',
    finland: 'FI',
    finlande: 'FI',
    suomi: 'FI',
    spain: 'ES',
    espagne: 'ES',
    españa: 'ES',
    portugal: 'PT',
    italy: 'IT',
    italie: 'IT',
    italia: 'IT',
    greece: 'GR',
    grèce: 'GR',
    ellada: 'GR',
    poland: 'PL',
    pologne: 'PL',
    polska: 'PL',
    'czech republic': 'CZ',
    czechia: 'CZ',
    'république tchèque': 'CZ',
    hungary: 'HU',
    hongrie: 'HU',
    magyarország: 'HU',
    romania: 'RO',
    roumanie: 'RO',
    românia: 'RO',
    'united states': 'US',
    usa: 'US',
    'united states of america': 'US',
    'états-unis': 'US',
    canada: 'CA',
    morocco: 'MA',
    maroc: 'MA',
    algeria: 'DZ',
    algérie: 'DZ',
    tunisia: 'TN',
    tunisie: 'TN',
    senegal: 'SN',
    sénégal: 'SN',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Retrieve all distinct country values from the database
    const rows = (await queryRunner.query(
      `SELECT DISTINCT "country" FROM "repairers" WHERE "country" IS NOT NULL`,
    )) as { country: string }[];

    for (const row of rows) {
      const raw = row.country;
      const isoCode = this.nameToCode[raw.toLowerCase()];

      if (isoCode) {
        await queryRunner.query(
          `UPDATE "repairers" SET "country" = $1 WHERE "country" = $2`,
          [isoCode, raw],
        );
        const countResult = (await queryRunner.query(
          `SELECT COUNT(*) FROM "repairers" WHERE "country" = $1`,
          [isoCode],
        )) as { count: string }[];
        console.log(
          `[NormalizeRepairerCountryCodes] "${raw}" → "${isoCode}" (${countResult[0].count} rows)`,
        );
      }
      // Already a valid ISO 2-letter code or unknown: leave unchanged
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: ISO codes back to English names (best-effort)
    const codeToName: Record<string, string> = {
      FR: 'France',
      BE: 'Belgium',
      NL: 'Netherlands',
      DE: 'Germany',
      GE: 'Germany',
      AT: 'Austria',
      CH: 'Switzerland',
      LU: 'Luxembourg',
      GB: 'United Kingdom',
      IE: 'Ireland',
      SE: 'Sweden',
      NO: 'Norway',
      DK: 'Denmark',
      FI: 'Finland',
      ES: 'Spain',
      PT: 'Portugal',
      IT: 'Italy',
      GR: 'Greece',
      PL: 'Poland',
      CZ: 'Czech Republic',
      HU: 'Hungary',
      RO: 'Romania',
      US: 'United States',
      CA: 'Canada',
      MA: 'Morocco',
      DZ: 'Algeria',
      TN: 'Tunisia',
      SN: 'Senegal',
    };

    for (const [code, name] of Object.entries(codeToName)) {
      await queryRunner.query(
        `UPDATE "repairers" SET "country" = $1 WHERE "country" = $2`,
        [name, code],
      );
    }
  }
}
