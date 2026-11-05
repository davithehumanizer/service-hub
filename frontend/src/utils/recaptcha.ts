// Module-level cache so we only ever inject/await the script once per page
// lifetime (SPA navigations reuse the same document, so this must be
// idempotent across multiple calls/mounts, not just the very first one).
const RECAPTCHA_SCRIPT_ID = "recaptcha-v3-script";
let recaptchaScriptPromise: Promise<void> | null = null;

function isGrecaptchaReady(): boolean {
  return (
    typeof (window as any).grecaptcha !== "undefined" &&
    typeof (window as any).grecaptcha.ready === "function"
  );
}

function loadRecaptchaScript(key: string): Promise<void> {
  // Already available: a previous sign-in or sign-up form loaded it.
  if (isGrecaptchaReady()) return Promise.resolve();

  if (recaptchaScriptPromise) return recaptchaScriptPromise;

  recaptchaScriptPromise = new Promise<void>((resolve) => {
    let script = document.getElementById(
      RECAPTCHA_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = RECAPTCHA_SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
      script.async = true;
      document.head.appendChild(script);
    }

    // The script's 'load' event may have already fired before this promise was
    // created. Relying solely on 'load'/'error' listeners attached now would
    // then hang forever, so also poll for `window.grecaptcha` becoming
    // available as a safety net.
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearInterval(pollId);
      resolve();
    };

    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", settle, { once: true });

    const start = Date.now();
    const pollId = setInterval(() => {
      if (isGrecaptchaReady() || Date.now() - start > 8000) settle();
    }, 100);
  });

  return recaptchaScriptPromise;
}

/**
 * Loads reCAPTCHA ahead of a form that will need a token. Only the sign-in and
 * sign-up forms do: index.html used to load it on every page, sending every
 * visit to Google and putting its badge over the wizard's buttons.
 */
export function preloadRecaptcha(): void {
  const key = (window as any).env?.RECAPTCHA_SITE_KEY || "";
  if (key) loadRecaptchaScript(key);
}

export async function getRecaptchaToken(
  action = "submit",
): Promise<string | null> {
  try {
    const key = (window as any).env?.RECAPTCHA_SITE_KEY || "";
    if (!key) return null;

    // Ensure the script is (or gets) loaded, regardless of whether this is
    // the initial hard page load or a later client-side (SPA) navigation.
    await loadRecaptchaScript(key);

    // Wait for the grecaptcha object AND its ready function to be available
    const start = Date.now();
    while (
      (typeof (window as any).grecaptcha === "undefined" ||
        typeof (window as any).grecaptcha.ready !== "function") &&
      Date.now() - start < 5000
    ) {
      await new Promise((r) => setTimeout(r, 100));
    }

    if (
      typeof (window as any).grecaptcha === "undefined" ||
      typeof (window as any).grecaptcha.ready !== "function"
    ) {
      return null;
    }

    // Wait for grecaptcha internal initialization to complete
    await new Promise<void>((resolve) => {
      (window as any).grecaptcha.ready(resolve);
    });

    const token = await (window as any).grecaptcha.execute(key, { action });
    return token;
  } catch {
    // Don't block auth flow on recaptcha errors; return null to let server decide
    return null;
  }
}
