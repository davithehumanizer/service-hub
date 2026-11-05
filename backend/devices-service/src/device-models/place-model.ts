import { NormalizedModel, toKey } from './normalize-model';

/**
 * - manufacturer: a manufacturer's entry, under its own key;
 * - attached: a reseller's entry on a model a manufacturer lists;
 * - maker-model: a reseller's entry on a model only resellers list, under the
 *   real maker (Apple exists in the catalogue only this way);
 * - reseller-own: a reseller's entry whose name had to be cut and matches no
 *   model, kept under the reseller rather than guessed;
 * - isolated: a name too incomplete to group on, a model of its own.
 */
export type Placement =
  | 'manufacturer'
  | 'attached'
  | 'maker-model'
  | 'reseller-own'
  | 'isolated';

export interface PlacedModel {
  placement: Placement;
  /** The model's key; null for an isolated entry. */
  key: string | null;
  /** The brand the model is filed under. */
  brand: string;
}

/** What is already known of the models, from memory or from the database. */
export interface KnownModels {
  /** A model a manufacturer lists has this key. */
  fromManufacturer(key: string): boolean;
  /** A model has this key, one that only resellers list included. */
  exists(key: string): boolean;
}

/**
 * The keys a reseller entry may land on, most exact first: its own, without
 * "5G", "4G" or "LTE", then with the processor read in its configuration
 * ("ThinkPad T14 Gen 1" + an i5 → "ThinkPad T14 Gen 1 (Intel)").
 */
export function resellerCandidates(n: NormalizedModel): string[] {
  if (!n.key) return [];
  const withoutNetwork = n.key.replace(/ (?:5g|4g|lte)$/, '');
  const candidates = [n.key, withoutNetwork];
  if (n.cpuVendor) {
    candidates.push(
      `${n.key} ${n.cpuVendor}`,
      `${withoutNetwork} ${n.cpuVendor}`,
    );
  }
  return [...new Set(candidates)];
}

/**
 * Where a normalised entry goes. A reseller's entry joins a manufacturer's
 * model first, then a model of the real maker; a name that had to be cut is
 * trusted only if it lands on one of them.
 */
export function placeModel(
  n: NormalizedModel,
  rawBrand: string,
  known: KnownModels,
): PlacedModel {
  if (!n.key) return { placement: 'isolated', key: null, brand: n.brand };
  if (!n.fromReseller) {
    return { placement: 'manufacturer', key: n.key, brand: n.brand };
  }
  const resellerOwn: PlacedModel = {
    placement: 'reseller-own',
    key: `${rawBrand.toLowerCase()}|${toKey(n.name)}`,
    brand: rawBrand,
  };
  // No maker was found: its key is the reseller's, and only another entry of
  // the same reseller can share it.
  if (n.makerUnknown) return resellerOwn;
  const candidates = resellerCandidates(n);
  const manufacturer = candidates.find((c) => known.fromManufacturer(c));
  if (manufacturer) {
    return { placement: 'attached', key: manufacturer, brand: n.brand };
  }
  const maker = candidates.find((c) => known.exists(c));
  if (maker || !n.cutAtConfiguration) {
    return { placement: 'maker-model', key: maker ?? n.key, brand: n.brand };
  }
  return resellerOwn;
}
