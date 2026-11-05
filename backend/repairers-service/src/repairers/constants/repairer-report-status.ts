/**
 * Canonical whitelist of accepted `status` values for `repairer_reports`.
 * PBI 13762 — "Ce résultat n'est pas un réparateur" report/moderation flow.
 */
export const REPAIRER_REPORT_STATUS_WHITELIST = [
  'pending',
  'reviewed',
  'dismissed',
] as const;

export type RepairerReportStatus =
  (typeof REPAIRER_REPORT_STATUS_WHITELIST)[number];

export const DEFAULT_REPAIRER_REPORT_STATUS: RepairerReportStatus = 'pending';
