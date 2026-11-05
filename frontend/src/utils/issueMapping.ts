import { IssueSeverity, ProductCondition } from "../stores/repairWorkflowSlice";

// ─── Issue Categories ────────────────────────────────────────────────────────

export interface IssueCategory {
  key: string;
  label: string;
  icon: string; // Material Symbols name
  color: string; // Tailwind text color class
  issues: IssueDefinition[];
}

export interface IssueDefinition {
  key: string;
  label: string;
  icon: string;
  severity: "MAJOR" | "MINOR";
  placeholder?: string;
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  {
    key: "power",
    label: "Power",
    icon: "power_settings_new",
    color: "text-red-500",
    issues: [
      {
        key: "no_power",
        label: "Doesn't power on",
        icon: "power_off",
        severity: "MAJOR",
        placeholder:
          "e.g. My device no longer turns on. It happened suddenly after the battery ran out. The charging light does not come on either.",
      },
      {
        key: "stops_during_use",
        label: "Stops during use",
        icon: "pause_circle",
        severity: "MAJOR",
      },
      {
        key: "not_charging",
        label: "Doesn't charge",
        icon: "battery_error",
        severity: "MAJOR",
      },
      {
        key: "not_heating",
        label: "Doesn't heat",
        icon: "mode_heat",
        severity: "MAJOR",
      },
    ],
  },
  {
    // What the appliance is *for*: the families above describe a device that
    // cannot start, this one a device that starts and then fails at its job.
    key: "function",
    label: "Function",
    icon: "settings_suggest",
    color: "text-teal-500",
    issues: [
      {
        key: "no_drain",
        label: "Doesn't drain",
        icon: "water_drop",
        severity: "MAJOR",
      },
      {
        key: "drum_not_turning",
        label: "Drum doesn't turn",
        icon: "rotate_right",
        severity: "MAJOR",
      },
      {
        key: "no_spin",
        label: "Doesn't spin dry",
        icon: "cyclone",
        severity: "MINOR",
      },
      {
        key: "water_not_pumping",
        label: "Water doesn't come through",
        icon: "water_pump",
        severity: "MAJOR",
      },
      {
        key: "slow_flow",
        label: "Slow or weak flow",
        icon: "water_medium",
        severity: "MINOR",
      },
      {
        key: "not_cooling",
        label: "Not cooling",
        icon: "ac_unit",
        severity: "MAJOR",
      },
      {
        key: "freezing_excessively",
        label: "Freezes food or over-ices",
        icon: "severe_cold",
        severity: "MINOR",
      },
      {
        key: "runs_constantly",
        label: "Runs without stopping",
        icon: "all_inclusive",
        severity: "MINOR",
      },
      {
        key: "no_suction",
        label: "No suction at all",
        icon: "air",
        severity: "MAJOR",
      },
      {
        key: "weak_suction",
        label: "Weak suction",
        icon: "airwave",
        severity: "MINOR",
      },
      {
        key: "brush_not_turning",
        label: "Brush doesn't turn",
        icon: "cleaning_services",
        severity: "MINOR",
      },
      {
        key: "navigation_erratic",
        label: "Drives in circles or bumps into things",
        icon: "explore_off",
        severity: "MINOR",
      },
      {
        key: "docking_failure",
        label: "Doesn't return to its dock",
        icon: "dock",
        severity: "MINOR",
      },
      {
        key: "not_feeding_paper",
        label: "Doesn't pick up paper",
        icon: "content_paste_off",
        severity: "MAJOR",
      },
      {
        key: "paper_jam",
        label: "Paper jams",
        icon: "print_disabled",
        severity: "MINOR",
      },
      {
        key: "print_quality",
        label: "Poor print quality",
        icon: "imagesearch_roller",
        severity: "MINOR",
      },
      {
        key: "ink_toner_not_recognised",
        label: "Cartridge not recognised",
        icon: "colorize",
        severity: "MINOR",
      },
      {
        key: "no_display",
        label: "No picture, black screen",
        icon: "tv_off",
        severity: "MAJOR",
      },
      {
        key: "not_cleaning_properly",
        label: "Doesn't clean properly",
        icon: "wash",
        severity: "MINOR",
      },
      {
        key: "uneven_heating",
        label: "Heats unevenly",
        icon: "gradient",
        severity: "MINOR",
      },
      {
        key: "zone_not_working",
        label: "One zone or plate doesn't work",
        icon: "grid_off",
        severity: "MINOR",
      },
      {
        key: "remote_not_working",
        label: "Remote control doesn't work",
        icon: "settings_remote",
        severity: "MINOR",
      },
    ],
  },
  {
    key: "physical",
    label: "Physical Damage",
    icon: "screen_lock_portrait",
    color: "text-orange-500",
    issues: [
      {
        key: "screen_broken",
        label: "Screen broken",
        icon: "broken_image",
        severity: "MAJOR",
        placeholder:
          "e.g. The screen cracked after a drop. There are visible lines across the display and the touch is unresponsive in some areas.",
      },
      {
        key: "charging_port",
        label: "Charging port issue",
        icon: "usb",
        severity: "MAJOR",
        placeholder:
          "e.g. The charging cable no longer connects properly. I tried several cables and none of them charge the device reliably.",
      },
      {
        key: "button_malfunction",
        label: "Button malfunction",
        icon: "radio_button_checked",
        severity: "MAJOR",
        placeholder:
          "e.g. The power button is stuck and does not click anymore. It started after the device was dropped.",
      },
      {
        key: "leaking",
        // A sentence, not a noun phrase: the issue classifier reads "Leaking
        // water" as nothing at all (NONE_OTHER 1.00) and this as a symptom.
        label: "Water is leaking",
        icon: "water_damage",
        severity: "MAJOR",
      },
      {
        key: "door_locked",
        label: "Door stays locked",
        icon: "lock",
        severity: "MAJOR",
      },
      {
        key: "water_damage",
        label: "Water damage",
        icon: "humidity_high",
        severity: "MAJOR",
      },
      {
        key: "physical_damage",
        label: "Visible physical damage",
        icon: "broken_image",
        severity: "MINOR",
      },
      {
        key: "door_seal_damaged",
        label: "Door doesn't close properly",
        icon: "sensor_door",
        severity: "MINOR",
      },
      {
        key: "frost_buildup",
        label: "Frost building up inside",
        icon: "ac_unit",
        severity: "MINOR",
      },
      {
        key: "keyboard_faulty",
        label: "Keyboard or trackpad faulty",
        icon: "keyboard",
        severity: "MINOR",
      },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    icon: "speed",
    color: "text-yellow-500",
    issues: [
      {
        key: "low_battery",
        label: "Low battery",
        icon: "battery_alert",
        severity: "MINOR",
        placeholder:
          "e.g. The battery drains very quickly, going from 100% to 0% in about 2 hours with normal use.",
      },
      {
        key: "overheating",
        label: "Overheating",
        icon: "thermostat",
        severity: "MINOR",
        placeholder:
          "e.g. The device gets very hot during normal use or charging. It sometimes shuts down automatically due to heat.",
      },
      {
        key: "slow_performance",
        label: "Slow performance",
        icon: "hourglass_empty",
        severity: "MINOR",
        placeholder:
          "e.g. The device has become very slow over the past few months. Apps take a long time to open and the system lags frequently.",
      },
      {
        key: "unusual_noise",
        label: "Unusual noise",
        icon: "graphic_eq",
        severity: "MINOR",
      },
      {
        key: "excessive_vibration",
        label: "Shakes or moves when running",
        icon: "vibration",
        severity: "MINOR",
      },
      {
        key: "descaling_needed",
        label: "Scale build-up",
        icon: "water_ec",
        severity: "MINOR",
      },
      {
        key: "flickering_display",
        label: "Picture flickers or has lines",
        icon: "flare",
        severity: "MINOR",
      },
    ],
  },
  {
    key: "connectivity",
    label: "Connectivity",
    icon: "wifi",
    color: "text-blue-500",
    issues: [
      {
        key: "connectivity_problems",
        label: "Connectivity problems",
        icon: "wifi_off",
        severity: "MINOR",
        placeholder:
          "e.g. The Wi-Fi keeps disconnecting and Bluetooth pairing fails. Other devices on the same network work fine.",
      },
      {
        key: "software_glitches",
        label: "Software glitches",
        icon: "bug_report",
        severity: "MINOR",
        placeholder:
          "e.g. Some apps crash randomly. The issue started after the last system update about 2 weeks ago.",
      },
      {
        key: "not_recognised",
        label: "Not recognised by the computer",
        icon: "usb_off",
        severity: "MAJOR",
      },
    ],
  },
  {
    key: "audio_video",
    label: "Audio / Video",
    icon: "speaker",
    color: "text-purple-500",
    issues: [
      {
        key: "speaker_microphone",
        label: "Speaker / Microphone issue",
        icon: "mic_off",
        severity: "MINOR",
        placeholder:
          "e.g. The speaker produces crackling sounds during calls or music playback. The microphone also seems muffled.",
      },
      {
        key: "camera_malfunction",
        label: "Camera malfunction",
        icon: "no_photography",
        severity: "MINOR",
        placeholder:
          "e.g. The rear camera shows a black screen or blurry image. The front camera still works. The issue appeared after a recent update.",
      },
      {
        key: "no_sound",
        label: "No sound",
        icon: "volume_off",
        severity: "MINOR",
      },
    ],
  },
  {
    key: "other",
    label: "Other",
    icon: "more_horiz",
    color: "text-gray-500",
    issues: [
      {
        key: "error_code",
        label: "Shows an error code",
        icon: "error_outline",
        severity: "MINOR",
      },
      {
        key: "other",
        label: "Other",
        icon: "help_outline",
        severity: "MINOR",
        placeholder:
          "e.g. Please describe your issue in as much detail as possible: what happens, when it started, and any events that may have caused it.",
      },
    ],
  },
];

// Flat map for quick lookup by key
export const ISSUE_MAP: Record<string, IssueDefinition> =
  ISSUE_CATEGORIES.flatMap((c) => c.issues).reduce(
    (acc, issue) => {
      acc[issue.key] = issue;
      return acc;
    },
    {} as Record<string, IssueDefinition>,
  );

/** Returns the label for a given issue key, or the key itself as fallback. */
export function getIssueLabel(key: string): string {
  return ISSUE_MAP[key]?.label ?? key;
}

/** Returns the placeholder suggestion for a given issue key. */
export function getIssuePlaceholder(key: string): string {
  return (
    ISSUE_MAP[key]?.placeholder ??
    "e.g. Describe what is happening, when it started, and any events that may have caused it..."
  );
}

// ─── Symptoms offered per kind of device ─────────────────────────────────────

/**
 * Which symptoms to offer, by UNU key — the e-waste classification the device
 * categories already carry. It groups the 360 categories into 40 families, so
 * one list serves every vacuum cleaner rather than one per category.
 *
 * A key listed here must exist in ISSUE_CATEGORIES above. Nothing is ever
 * removed from that catalogue: journeys are archived by key, and a key it no
 * longer knows would resurface as raw text in Summary and on the repair map.
 */
const SYMPTOM_SETS: Record<string, string[]> = {
  // Washing machines and washer-dryers
  "104": [
    "no_power",
    "no_drain",
    "drum_not_turning",
    "no_spin",
    "door_locked",
    "leaking",
    "excessive_vibration",
    "error_code",
  ],
  // Fridges, freezers, ice makers
  "108": [
    "not_cooling",
    "freezing_excessively",
    "runs_constantly",
    "frost_buildup",
    "door_seal_damaged",
    "leaking",
    "unusual_noise",
    "no_power",
  ],
  // Vacuum cleaners other than robots
  "204": [
    "no_suction",
    "weak_suction",
    "brush_not_turning",
    "not_charging",
    "low_battery",
    "unusual_noise",
    "physical_damage",
    "no_power",
  ],
  // Phones
  "306": [
    "screen_broken",
    "charging_port",
    "no_power",
    "water_damage",
    "low_battery",
    "speaker_microphone",
    "camera_malfunction",
    "connectivity_problems",
    "software_glitches",
  ],
  // Laptops, tablets, e-readers
  "303": [
    "no_power",
    "screen_broken",
    "charging_port",
    "overheating",
    "slow_performance",
    "keyboard_faulty",
    "low_battery",
    "unusual_noise",
    "software_glitches",
  ],
  // Coffee machines, kettles, espresso
  "203": [
    "no_power",
    "not_heating",
    "water_not_pumping",
    "leaking",
    "slow_flow",
    "descaling_needed",
    "unusual_noise",
    "error_code",
  ],
  // Irons and the rest of small electrical appliances
  "201": [
    "no_power",
    "not_heating",
    "stops_during_use",
    "leaking",
    "descaling_needed",
    "overheating",
    "physical_damage",
    "unusual_noise",
  ],
  // Printers and multifunction devices
  "304": [
    "no_power",
    "not_feeding_paper",
    "paper_jam",
    "print_quality",
    "ink_toner_not_recognised",
    "connectivity_problems",
    "error_code",
    "unusual_noise",
  ],
  // Desktop computers
  "302": [
    "no_power",
    "no_display",
    "overheating",
    "slow_performance",
    "unusual_noise",
    "connectivity_problems",
    "software_glitches",
    "physical_damage",
  ],
  // Keyboards, mice, drives, power supplies, cables
  "301": [
    "not_recognised",
    "no_power",
    "connectivity_problems",
    "button_malfunction",
    "not_charging",
    "physical_damage",
    "unusual_noise",
  ],
  // Televisions
  "408": [
    "no_power",
    "no_display",
    "no_sound",
    "screen_broken",
    "flickering_display",
    "remote_not_working",
    "connectivity_problems",
    "software_glitches",
  ],
  // Landline telephones
  "305": [
    "no_power",
    "no_sound",
    "connectivity_problems",
    "button_malfunction",
    "not_charging",
    "low_battery",
    "physical_damage",
  ],
  // Dishwashers
  "102": [
    "no_power",
    "no_drain",
    "not_heating",
    "not_cleaning_properly",
    "leaking",
    "door_locked",
    "error_code",
    "unusual_noise",
  ],
  // Ovens, hobs, ranges, boilers
  "103": [
    "no_power",
    "not_heating",
    "uneven_heating",
    "zone_not_working",
    "door_seal_damaged",
    "error_code",
    "physical_damage",
  ],
  // Blenders, fryers, toasters, bread makers
  "202": [
    "no_power",
    "stops_during_use",
    "not_heating",
    "leaking",
    "overheating",
    "unusual_noise",
    "button_malfunction",
    "physical_damage",
  ],
  // Power tools, sewing machines and the rest of key 601, 52 categories with
  // nothing in common beyond running on electricity: barely past the fallback.
  "601": [
    "no_power",
    "stops_during_use",
    "overheating",
    "not_charging",
    "low_battery",
    "unusual_noise",
    "physical_damage",
    "error_code",
  ],
};

// Freezers share their family with fridges.
SYMPTOM_SETS["109"] = SYMPTOM_SETS["108"];

/**
 * Categories the UNU key cannot serve, matched on canonicalName — `name` is
 * translated into the caller's locale.
 *
 * Robots sit with the vacuum cleaners, but "drives in circles" and "doesn't
 * return to its dock" mean nothing on a cylinder model. The other two are
 * there because the category's own UNU key does not describe it: the
 * categories devices are actually filed under, "Robot Vacuum" and "Fridge",
 * carry no key and key 601 — power tools — respectively.
 */
const SYMPTOM_SETS_BY_CATEGORY: Record<string, string[]> = {
  "Robot Vacuum": [
    "no_suction",
    "weak_suction",
    "brush_not_turning",
    "navigation_erratic",
    "docking_failure",
    "not_charging",
    "low_battery",
    "unusual_noise",
  ],
  Fridge: SYMPTOM_SETS["108"],
  // 35 934 devices, the largest category with no UNU key of its own.
  Monitor: [
    "no_power",
    "no_display",
    "screen_broken",
    "flickering_display",
    "connectivity_problems",
    "physical_damage",
  ],
};
SYMPTOM_SETS_BY_CATEGORY["Robotic vacuum cleaner"] =
  SYMPTOM_SETS_BY_CATEGORY["Robot Vacuum"];

/**
 * Symptoms for a device whose kind we do not know: those that describe any
 * appliance. Also what a hand-typed device gets, since it carries no category.
 */
const FALLBACK_SYMPTOMS = [
  "no_power",
  "stops_during_use",
  "leaking",
  "unusual_noise",
  "overheating",
  "physical_damage",
  "error_code",
];

/** The keys offered for this device, "Other" always last. */
export function getSymptomKeysForDevice(
  device?: { categories?: { canonicalName?: string; unukey?: string | null }[] },
): string[] {
  const categories = device?.categories ?? [];

  const byCategory = categories
    .map((c) => (c.canonicalName ? SYMPTOM_SETS_BY_CATEGORY[c.canonicalName] : undefined))
    .find(Boolean);
  const byFamily = categories
    .map((c) => (c.unukey ? SYMPTOM_SETS[c.unukey] : undefined))
    .find(Boolean);

  return [...(byCategory ?? byFamily ?? FALLBACK_SYMPTOMS), "other"];
}

/**
 * The same categories the step already renders, holding only the symptoms this
 * device can actually have. A category with none left is dropped.
 */
export function getIssueCategoriesForDevice(
  device?: { categories?: { canonicalName?: string; unukey?: string | null }[] },
): IssueCategory[] {
  const keys = new Set(getSymptomKeysForDevice(device));

  return ISSUE_CATEGORIES.map((category) => ({
    ...category,
    issues: category.issues.filter((issue) => keys.has(issue.key)),
  })).filter((category) => category.issues.length > 0);
}

// ─── Repair Score ────────────────────────────────────────────────────────────

/**
 * Computes a repair recommendation based on issue severity, product condition,
 * and usage data. Never recycling, nor repairing it yourself for someone who
 * would rather not. Null when only "Other" was picked: nothing was identified.
 */
export function computeRepairScore(params: {
  issues: string[];
  issueSeverity?: IssueSeverity;
  productCondition?: ProductCondition;
  handy?: boolean;
}): "getHelp" | "doItYourself" | null {
  const { issues, issueSeverity, productCondition, handy } = params;
  if (issues.every((k) => k === "other")) return null;
  let score = 0;

  // Issue severity weight (0–4)
  const majorCount = issues.filter(
    (k) => ISSUE_MAP[k]?.severity === "MAJOR",
  ).length;
  score += majorCount * 2;
  if (issueSeverity === "broken") score += 2;
  else if (issueSeverity === "partial") score += 1;

  // Product age weight (0–4)
  if (productCondition?.estimatedAge !== undefined) {
    if (productCondition.estimatedAge >= 10) score += 4;
    else if (productCondition.estimatedAge >= 7) score += 3;
    else if (productCondition.estimatedAge >= 5) score += 2;
    else if (productCondition.estimatedAge >= 3) score += 1;
  }

  // Visual condition weight (0–3)
  const vcMap: Record<string, number> = {
    poor: 3,
    fair: 2,
    good: 1,
    as_new: 0,
    unknown: 0,
  };
  score += vcMap[productCondition?.visualCondition ?? "unknown"] ?? 0;

  // Usage intensity weight (0–2)
  const uiMap: Record<string, number> = {
    heavy: 2,
    moderate: 1,
    light: 0,
    hardly_used: 0,
    unknown: 0,
  };
  score += uiMap[productCondition?.usageIntensity ?? "unknown"] ?? 0;

  // Thresholds: total max ≈ 15
  if (score >= 5 || handy === false) return "getHelp";
  return "doItYourself";
}

// ─── Duration options ────────────────────────────────────────────────────────

export const ISSUE_DURATION_OPTIONS = [
  { value: "just_happened", label: "Just happened" },
  { value: "less_than_week", label: "Less than a week" },
  { value: "one_week_to_month", label: "1 week – 1 month" },
  { value: "one_to_six_months", label: "1 – 6 months" },
  { value: "more_than_six_months", label: "More than 6 months" },
] as const;
