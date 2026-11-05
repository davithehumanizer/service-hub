/**
 * A made-up barcode for demonstration data: an EAN-13 starting with 2, the
 * GS1 range kept for internal use, with a valid check digit so that it reads
 * like a real one. Taken already by the catalogue, the server says so.
 */
export const demoEan = (random: () => number = Math.random): string => {
  let body = "2";
  for (let i = 0; i < 11; i++) body += Math.floor(random() * 10);
  // Weights 1 and 3 from the left; the check digit rounds up to ten.
  const sum = [...body].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return body + ((10 - (sum % 10)) % 10);
};
