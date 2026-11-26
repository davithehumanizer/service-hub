export type DeviceTechnicalProperty = {
  property_id: string;
  property_name: string;
  property_value: string;
};

export type DeviceInformationalProperty = {
  property_id: string;
  property_name: string;
  property_value: string;
};

export type DevicePhoto = {
  id: string;
  url: string;
  key: string;
  createdAt: string;
  /** Uploaded by a contributor. */
  isDemo?: boolean;
};

export type Device = {
  device_id: string;
  ean: string;
  serial_number?: string;
  product_code?: string;
  manufacturer: string;
  brand: string;
  model: string;
  // categories is the normalized ManyToMany relation coming from the API
  // `name` is localised for display; `canonicalName` is the untranslated one
  // and the only safe thing to match on.
  // `ifixit_wikiid` is the iFixit wiki this category maps to, decided once
  // rather than searched as text.
  categories?: {
    id: number;
    name: string;
    canonicalName?: string;
    ifixit_wikiid?: string | null;
    // UNU key: the e-waste family the category belongs to. Groups the 360
    // categories into 40, which is what the symptom lists are keyed on.
    unukey?: string | null;
  }[];
  device_type: string;
  technicalProperties: DeviceTechnicalProperty[];
  informationalProperties?: DeviceInformationalProperty[];
  photos?: DevicePhoto[];
  source: string;
  /** The model this entry is a variant of. */
  model_id?: number | null;
  /** What tells it from its model's other variants. */
  variant_label?: string | null;
  is_refurbished?: boolean;
  /** Entered by a contributor: demonstration data. */
  is_demo?: boolean;
  /** The model's picture, for a model carried with no variant. */
  thumbnail?: string;
};

export type DeviceFilters = {
  id: string;
  category: string;
  name: string;
  label?: string;
  icon?: string;
  categories?: string[];
};
