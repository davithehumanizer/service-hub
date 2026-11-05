import { normalizeRepairerDeviceTypeKey } from "./repairerDeviceTypeUtils";

/**
 * The 4 parent groups used to organize the "Device Type" filter on the
 * repairer map (PBI 13761 — hierarchical filters + counting).
 */
export const DEVICE_TYPE_GROUPS = [
  "informatique",
  "electromenager",
  "audioVideo",
  "autres",
] as const;

export type DeviceTypeGroup = (typeof DEVICE_TYPE_GROUPS)[number];

/**
 * Maps each device_type slug to one of the 4 parent groups. Any device_type
 * not explicitly listed here falls back to "autres".
 */
const DEVICE_TYPE_TO_GROUP: Record<string, DeviceTypeGroup> = {
  // INFORMATIQUE
  smartphone: "informatique",
  laptop: "informatique",
  tablet: "informatique",
  desktop_computer: "informatique",
  personal_computer: "informatique",
  monitor: "informatique",
  printer: "informatique",
  printer_copier_scanner: "informatique",
  pc_accessory: "informatique",
  power_supply: "informatique",

  // ÉLECTROMÉNAGER
  home_appliance: "electromenager",
  kitchen_appliance: "electromenager",
  small_appliance: "electromenager",
  large_home_electrical: "electromenager",
  fridge_combi_freezer: "electromenager",
  blender: "electromenager",
  iron: "electromenager",
  kettle: "electromenager",
  toaster: "electromenager",
  hair_dryer: "electromenager",
  fan: "electromenager",
  air_conditioner: "electromenager",
  vacuum_cleaner: "electromenager",
  drip_coffee_maker: "electromenager",
  small_kitchen_item: "electromenager",
  sewing_machine: "electromenager",

  // AUDIO/VIDÉO
  audio: "audioVideo",
  amplifier: "audioVideo",
  headphones: "audioVideo",
  dvd_player_recorder: "audioVideo",
  tv_or_gaming_related_accessory: "audioVideo",
  portable_radio: "audioVideo",
  projector: "audioVideo",
};

/**
 * Returns the parent group key for a given device_type value (any casing).
 * Falls back to "autres" when the type isn't explicitly mapped.
 */
export function getDeviceTypeGroup(deviceType: string): DeviceTypeGroup {
  const key = normalizeRepairerDeviceTypeKey(deviceType);
  return DEVICE_TYPE_TO_GROUP[key] ?? "autres";
}
