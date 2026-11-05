import React, { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { preloadRecaptcha } from "../utils/recaptcha";

/**
 * Placed under a form that sends a reCAPTCHA token: loads the script, and
 * shows the mention Google requires in place of its badge, which is hidden.
 */
export default function RecaptchaNotice() {
  const { i18n } = useTranslation();
  useEffect(() => {
    preloadRecaptcha();
  }, []);

  const hl = i18n.language.slice(0, 2);
  const link = (href: string) => (
    <a href={`${href}?hl=${hl}`} target="_blank" rel="noopener noreferrer" className="underline" />
  );

  return (
    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
      <Trans
        i18nKey="common.recaptchaNotice"
        components={{
          privacy: link("https://policies.google.com/privacy"),
          terms: link("https://policies.google.com/terms"),
        }}
      />
    </p>
  );
}
