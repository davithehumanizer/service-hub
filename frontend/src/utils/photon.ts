/** A place Photon suggests: where it is, how to name it, and its address. */
export interface PhotonPlace {
  latitude: number;
  longitude: number;
  label: string;
  /** Street and number in the country's order; none for a town. */
  street?: string;
  postcode?: string;
  city?: string;
  countryCode: string;
}

/** The project's countries, as Photon spells them. */
const COUNTRIES = new Set(['BE', 'CH', 'DE', 'FR', 'LU', 'NL']);
/** Photon translates place names into these; any other language gets local names. */
const PHOTON_LANGUAGES = new Set(['en', 'de', 'fr']);
/** Where the number comes before the street. */
const NUMBER_FIRST = new Set(['FR', 'LU']);

const labelOf = (p: any): string => {
  const place = [p.postcode, p.name].filter(Boolean).join(' ') || p.city || '';
  const around = [p.city !== p.name ? p.city : null, p.state].filter(Boolean).join(', ');
  return [place, around, p.countrycode].filter(Boolean).join(', ');
};

const streetOf = (p: any): string | undefined => {
  const street = p.street ?? (p.type === 'street' ? p.name : undefined);
  if (!street || !p.housenumber) return street;
  return NUMBER_FIRST.has(p.countrycode) ? `${p.housenumber} ${street}` : `${street} ${p.housenumber}`;
};

/**
 * Places matching `query` in the project's countries, from Photon (komoot,
 * OpenStreetMap data). Nominatim's usage policy forbids autocomplete, and it
 * cannot tell which "6211" is meant; Photon ranks results by distance from
 * `near`, which puts Maastricht first for someone in Aachen. The position is
 * rounded to about 10 km before it leaves the browser: enough to rank, not to
 * locate anyone.
 */
export const searchPlaces = async (
  query: string,
  options: {
    language?: string;
    near?: { latitude: number; longitude: number } | null;
    signal?: AbortSignal;
    max: number;
    /** Name each house by its street: what an address form needs, not a map search. */
    streets?: boolean;
  },
): Promise<PhotonPlace[]> => {
  const lang = options.language?.slice(0, 2);
  const params = new URLSearchParams({ q: query, limit: '15' });
  if (lang && PHOTON_LANGUAGES.has(lang)) params.set('lang', lang);
  if (options.near) {
    params.set('lat', options.near.latitude.toFixed(1));
    params.set('lon', options.near.longitude.toFixed(1));
  }
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: options.signal });
  const data = await response.json();
  const seen = new Set<string>();
  const results: PhotonPlace[] = [];
  for (const feature of data.features ?? []) {
    const p = feature.properties ?? {};
    if (!COUNTRIES.has(p.countrycode)) continue;
    const street = streetOf(p);
    const label = [options.streets ? street : null, labelOf(p)].filter(Boolean).join(', ');
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const [longitude, latitude] = feature.geometry.coordinates;
    results.push({
      latitude,
      longitude,
      label,
      street,
      postcode: p.postcode,
      city: p.city ?? (p.type === 'city' ? p.name : undefined),
      countryCode: p.countrycode,
    });
    if (results.length === options.max) break;
  }
  return results;
};
