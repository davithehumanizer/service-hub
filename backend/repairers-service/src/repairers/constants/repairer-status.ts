/**
 * Whether a repairer is shown. What someone proposes on the site waits for an
 * administrator (docs/demo-data.md, §4.3); imports are published at once.
 */
export const REPAIRER_STATUS_WHITELIST = [
  'pending',
  'published',
  'rejected',
] as const;

export type RepairerStatus = (typeof REPAIRER_STATUS_WHITELIST)[number];

export const PUBLISHED: RepairerStatus = 'published';

/**
 * A change its author made to a published repairer: the public keeps seeing
 * the old version until an administrator applies it.
 */
export const REVISION_STATUS_WHITELIST = [
  'pending',
  'applied',
  'rejected',
] as const;

export type RevisionStatus = (typeof REVISION_STATUS_WHITELIST)[number];
