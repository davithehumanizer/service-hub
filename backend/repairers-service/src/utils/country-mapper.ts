/**
 * ISO 3166-1 alpha-2 country code to English name mapping.
 * Covers European countries and major world countries relevant to the application.
 */
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  // Western Europe
  FR: 'France',
  BE: 'Belgium',
  NL: 'Netherlands',
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland',
  LU: 'Luxembourg',
  // Northern Europe
  GB: 'United Kingdom',
  IE: 'Ireland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IS: 'Iceland',
  // Southern Europe
  ES: 'Spain',
  PT: 'Portugal',
  IT: 'Italy',
  GR: 'Greece',
  MT: 'Malta',
  CY: 'Cyprus',
  // Central and Eastern Europe
  PL: 'Poland',
  CZ: 'Czech Republic',
  SK: 'Slovakia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  SI: 'Slovenia',
  RS: 'Serbia',
  BA: 'Bosnia and Herzegovina',
  ME: 'Montenegro',
  MK: 'North Macedonia',
  AL: 'Albania',
  // Baltic States
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  // Benelux / other
  MC: 'Monaco',
  AD: 'Andorra',
  LI: 'Liechtenstein',
  SM: 'San Marino',
  VA: 'Vatican City',
  // Non-European
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  MX: 'Mexico',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  MA: 'Morocco',
  TN: 'Tunisia',
  DZ: 'Algeria',
  SN: 'Senegal',
  CI: "Côte d'Ivoire",
  CM: 'Cameroon',
};

/**
 * Reverse mapping: English name (lowercase) to ISO code.
 * Built dynamically from COUNTRY_CODE_TO_NAME.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = Object.entries(
  COUNTRY_CODE_TO_NAME,
).reduce(
  (acc, [code, name]) => {
    acc[name.toLowerCase()] = code;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Returns the English country name for a given ISO 3166-1 alpha-2 code.
 * Returns the original value if no mapping is found.
 *
 * @param code - ISO country code (e.g. "FR")
 * @returns English country name (e.g. "France") or the input value as fallback
 */
export function getCountryName(code: string): string {
  if (!code) return code;
  return COUNTRY_CODE_TO_NAME[code.toUpperCase()] ?? code;
}

/**
 * Returns the ISO 3166-1 alpha-2 code for a given English country name.
 * Returns undefined if no mapping is found.
 *
 * @param name - English country name (e.g. "France")
 * @returns ISO code (e.g. "FR") or undefined
 */
export function getCountryCode(name: string): string | undefined {
  if (!name) return undefined;
  // First check if it's already a valid ISO code
  if (COUNTRY_CODE_TO_NAME[name.toUpperCase()]) {
    return name.toUpperCase();
  }
  return COUNTRY_NAME_TO_CODE[name.toLowerCase()];
}

/**
 * Checks whether a given string is a known ISO 3166-1 alpha-2 country code.
 *
 * @param code - The string to check
 * @returns true if the code is a known ISO country code
 */
export function isValidCountryCode(code: string): boolean {
  if (!code) return false;
  return code.toUpperCase() in COUNTRY_CODE_TO_NAME;
}

/**
 * Returns all known countries as an array of { code, name } objects.
 */
export function getAllCountries(): { code: string; name: string }[] {
  return Object.entries(COUNTRY_CODE_TO_NAME).map(([code, name]) => ({
    code,
    name,
  }));
}
