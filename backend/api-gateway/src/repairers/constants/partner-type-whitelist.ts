/**
 * Canonical whitelist of accepted `partner_type` values for `repairers`.
 *
 * Distinguishes repair-oriented partners from recycling/collection points so
 * the map can filter between them (PBI 13760).
 *
 * - `repairer`: professional repairers, repair cafés, fablabs — actively fix devices.
 * - `recycler`: recycling/collection centers — do not repair, only collect/dispose.
 * - `other`: partner type does not fit the above (e.g. unknown/unclassified).
 * - `both`: partners that both repair and act as a collection point (e.g. some
 *   French `reparer`+`trier` entries) — kept distinct from 'repairer' so a
 *   strict "repairer only" filter can still exclude pure recyclers while a
 *   broader `partner_type IN ('repairer', 'both')` query includes them.
 * - `reuse`: second-hand shops and other places a device can be given or sold
 *   to, to be used again (PBI 13851).
 * - `repairer_reuse`: partners that both repair and resell, e.g. a phone shop
 *   listed in both AWA directories.
 *
 * Kept in sync manually with the repairers-service copy at
 * `backend/repairers-service/src/repairers/constants/partner-type-whitelist.ts`
 * since the two services do not share a common library.
 */
export const PARTNER_TYPE_WHITELIST = [
  'repairer',
  'recycler',
  'other',
  'both',
  'reuse',
  'repairer_reuse',
] as const;

export type PartnerType = (typeof PARTNER_TYPE_WHITELIST)[number];

/** A query's "repairer,reuse" as a list, for a filter on several types. */
export const splitPartnerTypes = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((type) => type.trim())
        .filter(Boolean)
    : value;
