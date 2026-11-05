// The kinds of place a visitor picks from on the map. A place with two
// activities ('both', 'repairer_reuse') shows under either; 'other' under none
// but "all".
export const PARTNER_CATEGORIES = ["repairer", "reuse", "recycler"] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const PARTNER_CATEGORY_ICON: Record<PartnerCategory, string> = {
  repairer: "build",
  reuse: "volunteer_activism",
  recycler: "recycling",
};

const ACTIVITIES_OF_MIXED: Record<string, PartnerCategory[]> = {
  both: ["repairer", "recycler"],
  repairer_reuse: ["repairer", "reuse"],
};

/** What a place does, from its partner type: one activity, two, or none. */
export const partnerActivities = (type?: string | null): PartnerCategory[] =>
  ACTIVITIES_OF_MIXED[type ?? ""] ??
  ((PARTNER_CATEGORIES as readonly string[]).includes(type ?? "")
    ? [type as PartnerCategory]
    : []);

/** "repairer,reuse" from a URL, keeping only the known categories. */
export const parsePartnerCategories = (value: string | null): PartnerCategory[] =>
  PARTNER_CATEGORIES.filter((category) =>
    (value ?? "").split(",").includes(category),
  );
