import { TFunction } from "i18next";

export function normalizeRepairerDeviceTypeKey(type: string): string {
  return type
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Repairers are typed in their own vocabulary — "fridge_combi_freezer",
// "large_home_electrical" — not in our device categories. Most categories
// match once slugged; these are the ones that do not.
const REPAIRER_TYPE_BY_CATEGORY: Record<string, string> = {
  washing_machine_combi_dryer: "large_home_electrical",
  dishwasher: "large_home_electrical",
  freezer: "fridge_combi_freezer",
  robotic_vacuum_cleaner: "vacuum_cleaner",
  upright_vacuum_cleaner: "vacuum_cleaner",
  handheld_vacuum_cleaner: "vacuum_cleaner",
  smart_phone_pager: "smartphone",
  mobile_phone_cell_phone: "smartphone",
  keyboard_computer: "pc_accessory",
  mouse: "pc_accessory",
};

/** The repairer device type for an untranslated category name. */
export function repairerDeviceTypeFor(category: string): string {
  const slug = normalizeRepairerDeviceTypeKey(category);
  return REPAIRER_TYPE_BY_CATEGORY[slug] ?? slug;
}

export function translateRepairerDeviceType(
  type: string,
  t: TFunction,
): string {
  const key = normalizeRepairerDeviceTypeKey(type);
  return t(`repairerDeviceTypes.${key}`, { defaultValue: type });
}
