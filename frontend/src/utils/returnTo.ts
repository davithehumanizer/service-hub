/** Query parameter carrying where to come back to once signed in. */
export const RETURN_TO_PARAM = "returnTo";

/**
 * Reads the return destination from a query string, rejecting anything that is
 * not one of our own in-app paths.
 *
 * A redirect target taken from the URL is an open-redirect waiting to happen:
 * `//evil.example` and `https://evil.example` are both valid `history.push`
 * arguments. Only paths under `/app/` are accepted.
 */
export const readReturnTo = (search: string): string | null => {
  const value = new URLSearchParams(search).get(RETURN_TO_PARAM);
  if (!value) return null;
  if (!value.startsWith("/app/")) return null;
  // `/app//evil.example` and `/app/\evil.example` are protocol-relative once
  // the browser normalises the backslash.
  if (value.includes("//") || value.includes("\\")) return null;
  return value;
};

/** Rebuilds the query string that carries a return destination onwards. */
export const returnToSearch = (returnTo: string | null): string =>
  returnTo ? `?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}` : "";
