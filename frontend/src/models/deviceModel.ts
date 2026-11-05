/**
 * A device model, as the search finds it: one "Galaxy S23", whatever its
 * variants (colour, storage, seller) — those are catalogue entries, devices.
 */
export type DeviceModel = {
  id: number;
  brand: string;
  name: string;
  variant_count: number;
  has_manufacturer_variant: boolean;
  /** The variant the model is shown with. */
  representative_device_id: number | null;
  /** The model's picture, or ''. */
  thumbnail: string;
  /**
   * `name` in the language asked for, `canonicalName` to match on,
   * `ifixit_wikiid` the iFixit wiki the category maps to, `unukey` its
   * e-waste family, which the wizard's symptoms are keyed on.
   */
  categories: {
    id: number;
    name: string;
    canonicalName?: string;
    ifixit_wikiid?: string | null;
    unukey?: string | null;
  }[];
  /** Its variants' colours, as Icecat names them; "Aluminium,Black" is two-tone. */
  colours: string[];
};

export type DeviceModelPage = {
  data: DeviceModel[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  /** Models per canonical category, before the category filter. */
  categoryFacets: Record<string, number>;
  /** The variant a barcode or a reference searched for names. */
  variant?: { device_id: number };
};

export type DeviceModelSort = "relevance" | "brandAZ" | "brandZA" | "modelAZ" | "modelZA";

/** A variant of a model: one catalogue entry. */
export type DeviceModelVariant = {
  device_id: number;
  /** Who sells it: the maker, or a reseller. */
  brand: string;
  /** The entry's own name, as its source spells it. */
  model: string;
  ean: string;
  product_code: string;
  /** What tells it from the model's other variants, or null. */
  variant_label: string | null;
  /** The label's parts by key, { storage: "256 GB", colour: "Black" }. */
  variant_parts?: Record<string, string> | null;
  is_refurbished: boolean;
};

/** A part a model's variants differ in, each value counted among the
 *  variants the other parts chosen leave; 0 when they rule it out. */
export type VariantFacet = {
  key: string;
  values: { value: string; count: number }[];
};

/** What a model created by hand answers: it, or the one that existed. */
export type DeviceModelCreated = {
  /** False when the barcode, the reference or the name named an existing model. */
  created: boolean;
  model: DeviceModel;
  /** The variant the barcode or the reference made or found. */
  variant: DeviceModelVariant | null;
};

/** A model and a page of its variants, the one it is shown with first. */
export type DeviceModelDetail = DeviceModel & {
  variants: {
    data: DeviceModelVariant[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  facets: VariantFacet[];
  /** How many variants the parts tell apart: 8 of 61. */
  configurations: number;
};
