// Licence Ouverte 2.0: the French places come from this ADEME dataset, which
// must be named and linked wherever they are shown. Each place's own
// `paternite` is stored in its `source`.
export const ADEME_DATASET = {
  name: "ADEME – Que faire de mes objets & déchets",
  url: "https://quefairedemesdechets.ademe.fr/",
  licence: "Licence Ouverte 2.0",
};

export const isAdemeSource = (source?: string | null) =>
  !!source && source.includes("ADEME");
