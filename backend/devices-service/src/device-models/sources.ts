/**
 * What the catalogue's imports write: such an entry follows the next import,
 * and nobody changes it here.
 */
export const IMPORT_SOURCES = ['ICECAT', 'UNKNOWN'];

/**
 * Created through the API by an outside source (ACME_DATA…), neither by hand
 * (MANUAL) nor by an import: an administrator may change it.
 */
export const isOutsideSource = (source: string | null | undefined): boolean =>
  !!source && source !== 'MANUAL' && !IMPORT_SOURCES.includes(source);
