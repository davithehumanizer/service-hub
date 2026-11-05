/** What a proposal or a change may set: never its author, status or source. */
export const EDITABLE_FIELDS = [
  'name',
  'description',
  'address',
  'postal_code',
  'city',
  'country',
  'website',
  'email',
  'phone',
  'latitude',
  'longitude',
  'partner_type',
] as const;

/** What a repairer cannot be without: a change may not empty them. */
export const REQUIRED_FIELDS = [
  'name',
  'address',
  'city',
  'country',
  'latitude',
  'longitude',
  'partner_type',
] as const;

export type RepairerChanges = Partial<
  Record<(typeof EDITABLE_FIELDS)[number], string | number | null>
> & {
  /** Replaces every device type it offers. */
  device_types?: string[];
};

/** The editable fields of a payload, whatever else it carries; a field emptied is null. */
export const pickChanges = (data: Record<string, any>): RepairerChanges => {
  const changes: RepairerChanges = {};
  for (const field of EDITABLE_FIELDS) {
    if (data?.[field] !== undefined) {
      changes[field] = data[field] === '' ? null : data[field];
    }
  }
  if (Array.isArray(data?.device_types)) {
    changes.device_types = [...new Set<string>(data.device_types)];
  }
  return changes;
};
