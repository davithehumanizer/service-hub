/**
 * ISO 3166-1 alpha-2 country code to English name mapping.
 * Mirrors the backend country-mapper for consistent display.
 */
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  // Western Europe
  FR: "France",
  BE: "Belgium",
  NL: "Netherlands",
  DE: "Germany",
  AT: "Austria",
  CH: "Switzerland",
  LU: "Luxembourg",
  // Northern Europe
  GB: "United Kingdom",
  IE: "Ireland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IS: "Iceland",
  // Southern Europe
  ES: "Spain",
  PT: "Portugal",
  IT: "Italy",
  GR: "Greece",
  MT: "Malta",
  CY: "Cyprus",
  // Central and Eastern Europe
  PL: "Poland",
  CZ: "Czech Republic",
  SK: "Slovakia",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  SI: "Slovenia",
  RS: "Serbia",
  BA: "Bosnia and Herzegovina",
  ME: "Montenegro",
  MK: "North Macedonia",
  AL: "Albania",
  // Baltic States
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  // Other
  MC: "Monaco",
  AD: "Andorra",
  LI: "Liechtenstein",
  SM: "San Marino",
  VA: "Vatican City",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  CN: "China",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
  NG: "Nigeria",
  EG: "Egypt",
  MA: "Morocco",
  TN: "Tunisia",
  DZ: "Algeria",
  SN: "Senegal",
  CI: "Côte d'Ivoire",
  CM: "Cameroon",
};

/**
 * Returns the English country name for a given ISO 3166-1 alpha-2 code.
 * Returns the original value if no mapping is found (graceful fallback).
 *
 * @param code - ISO country code (e.g. "FR") or already a full name
 * @returns English country name (e.g. "France")
 */
export function getCountryName(code: string): string {
  if (!code) return code;
  return COUNTRY_CODE_TO_NAME[code.toUpperCase()] ?? code;
}
