import i18n from "../i18n";

/**
 * Translates a backend error code to a human-readable message.
 * If the code has a dedicated translation key, uses it.
 * Otherwise falls back to the raw message.
 */
export function translateError(code: string | undefined): string {
  if (!code) return i18n.t("errors.generic");

  const key = `errors.${code}`;
  const translated = i18n.t(key);

  // i18next returns the key itself when no translation is found
  if (translated !== key) {
    return translated;
  }

  return code;
}
