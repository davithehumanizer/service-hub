/**
 * A GTIN-14 is a packaging code: an indicator digit, the GTIN-13's first
 * twelve digits, then its own check digit. Icecat supplies whichever form the
 * manufacturer published, so the catalogue holds both — 411 devices carry only
 * a GTIN-14, and scanning the EAN-13 printed on those units found nothing.
 *
 * Returns the code plus the sibling form it may be stored under.
 */
export function isGtin(code: string): boolean {
  return /^\d{13,14}$/.test(code.trim());
}

export function gtinVariants(code: string): string[] {
  const digits = code.trim();
  if (!isGtin(digits)) {
    return [digits];
  }

  // The twelve digits shared by the unit and every carton of it.
  const base = digits.length === 14 ? digits.slice(1, 13) : digits.slice(0, 12);
  const variants = [digits, `${base}${checkDigit(base)}`];

  // Any indicator from 1 to 9 is a valid carton, and the catalogue may hold
  // whichever one the manufacturer happened to publish — the Senseo HD7856 is
  // stored under indicator 1 and also exists as 6.
  for (let indicator = 1; indicator <= 9; indicator += 1) {
    const body = `${indicator}${base}`;
    variants.push(`${body}${checkDigit(body)}`);
  }

  return variants.filter((v, i) => variants.indexOf(v) === i);
}

/** Modulo-10, weights alternating from the right. */
function checkDigit(body: string): number {
  const total = body
    .split('')
    .reverse()
    .reduce((sum, d, i) => sum + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10;
}
