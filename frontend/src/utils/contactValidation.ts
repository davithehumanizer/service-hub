/**
 * Loose, practical checks for optional contact fields (onboarding forms,
 * profile editors). Empty is always valid — required-ness is checked
 * separately per form; these only catch garbage in a field once filled.
 */

/** Leading +, 6-15 digits; spaces, dashes, dots and parens are ignored. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const digitsOnly = trimmed.replace(/[\s().-]/g, '');
  return /^\+?[0-9]{6,15}$/.test(digitsOnly);
}

/** With or without protocol, needs a dot-separated domain. */
export function isValidWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]\S*)?$/i.test(trimmed);
}

/** EU-style VAT number: 2-letter country code + 2-12 alphanumeric characters. */
export function isValidVatNumber(value: string): boolean {
  const trimmed = value.trim().replace(/\s/g, '');
  if (!trimmed) return true;
  return /^[A-Za-z]{2}[0-9A-Za-z]{2,12}$/.test(trimmed);
}
