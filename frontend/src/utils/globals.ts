const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// Public origin of the PartsFinder catalogue, which serves spare part pages
// under its `data.` subdomain. The parts shown here come from its Meilisearch
// indexes, so a hit's objectID is the id that catalogue expects.
//
// CRA freezes REACT_APP_* into the bundle at build time: changing this needs a
// frontend rebuild, not a container restart.
const SPAREPARTS_URL =
  process.env.REACT_APP_SPAREPARTS_URL || "https://data.spareparts.care2repair.eu";

// The catalogue only publishes en and fr; anything else would 404 on the
// locale segment rather than fall back.
const catalogueLocale = (language: string): string =>
  language.startsWith("fr") ? "fr" : "en";

/** Page for one spare part in the PartsFinder catalogue. */
const sparePartCatalogueUrl = (objectID: string, language: string): string =>
  `${SPAREPARTS_URL}/${catalogueLocale(language)}/search/details/spare_part/${encodeURIComponent(objectID)}`;

/**
 * The catalogue's own search, opened on spare parts.
 *
 * Its home page holds all three searches — repairers, devices, spare parts —
 * and defaults to repairers, so `category` is what makes the link land where
 * the name promises. Carrying the term over means the visitor does not retype
 * what they just searched here.
 */
const sparePartsCatalogueSearchUrl = (language: string, query?: string): string => {
  const params = new URLSearchParams({ category: "spare_part" });
  if (query) params.set("query", query);

  return `${SPAREPARTS_URL}/${catalogueLocale(language)}/?${params}`;
};

export {
  API_URL,
  SPAREPARTS_URL,
  sparePartCatalogueUrl,
  sparePartsCatalogueSearchUrl,
};
