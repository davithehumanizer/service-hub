/**
 * Data the model normalisation works from. Kept apart from the function so
 * that it can later be seeded into tables (brand_aliases, reseller_brands) and
 * edited without a deployment. Every key is lowercase.
 */
export interface NormalizationRules {
  /** Spelling → canonical brand. Callers add every known brand as itself. */
  brandAliases: Record<string, string>;
  /** Brands that list other makers' refurbished devices as their own. */
  resellerBrands: string[];
  /** Product family → its maker, for reseller names that start with it. */
  familyBrands: Record<string, string>;
  /** Brands whose short names are whole ("Honor 8X", "Honor 10"). */
  shortNameBrands: string[];
  /** Names of a whole family, not of one model ("MacBook Pro" of any size). */
  familyOnlyNames: string[];
  /**
   * Brands that give one number to several families: a name that is only a
   * number is not grouped at all, not even within its category.
   */
  isolatedNumberBrands: string[];
}

export const DEFAULT_RULES: NormalizationRules = {
  brandAliases: {
    dell: 'Dell',
    'dell inc.': 'Dell',
    'dell inc': 'Dell',
    'hewlett packard': 'HP',
    'hewlett-packard': 'HP',
    'hp inc.': 'HP',
    'hp inc': 'HP',
    'apple inc.': 'Apple',
    'apple inc': 'Apple',
  },
  // Brands of at least 20 entries whose names mostly cite another maker or a
  // refurbished mention.
  resellerBrands: [
    'refurb',
    't1a',
    'flex it',
    'upcycle it',
    'forza refurbished',
    'teqcycle',
    'bsi-refurbished',
    'circular computing',
    'a2c',
    'grade a certified refurbished',
    'i-go life',
  ],
  familyBrands: {
    elitebook: 'HP',
    probook: 'HP',
    zbook: 'HP',
    elitedesk: 'HP',
    prodesk: 'HP',
    latitude: 'Dell',
    optiplex: 'Dell',
    precision: 'Dell',
    thinkpad: 'Lenovo',
    thinkcentre: 'Lenovo',
    macbook: 'Apple',
    imac: 'Apple',
    iphone: 'Apple',
    ipad: 'Apple',
    galaxy: 'Samsung',
  },
  shortNameBrands: ['honor', 'oppo'],
  familyOnlyNames: [
    'macbook',
    'macbook pro',
    'macbook air',
    'imac',
    'mac mini',
    'ipad',
    'ipad pro',
    'ipad air',
    'ipad mini',
    'iphone se',
    // Siemens ranges, each spanning washing machines, fridges and ovens.
    'iq100',
    'iq300',
    'iq500',
    'iq700',
  ],
  // "5590" is a Latitude and an Inspiron, both laptops. A Dell number whose
  // family cannot be recovered stays on its own.
  isolatedNumberBrands: ['dell'],
};
