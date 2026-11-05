/**
 * Icecat's colour names ("Product colour"), lowercased, as CSS colours. The
 * vocabulary is closed, about 130 names measured on the catalogue; a two-tone
 * variant joins two with a comma ("Aluminium,Black").
 */
const COLOURS: Record<string, string> = {
  black: "#1a1a1a",
  white: "#ffffff",
  silver: "#c0c0c0",
  grey: "#8a8a8a",
  blue: "#1f5fbf",
  red: "#c62828",
  "stainless steel": "#b4b8bb",
  gold: "#d4af37",
  platinum: "#e5e4e2",
  pink: "#f4a6c1",
  green: "#2e7d32",
  brown: "#6d4c41",
  metallic: "#a8a9ad",
  metalic: "#a8a9ad",
  graphite: "#41424c",
  purple: "#7b3fa0",
  titanium: "#878681",
  aluminium: "#bfc4c8",
  anthracite: "#383e42",
  orange: "#ef7c1a",
  yellow: "#f5d327",
  violet: "#8f4fd0",
  beige: "#e3d3b4",
  charcoal: "#36454f",
  chrome: "#dbe2e9",
  carbon: "#2b2b2b",
  bronze: "#a97142",
  chocolate: "#5c3317",
  navy: "#1b2a4a",
  turquoise: "#30c4c9",
  "pink gold": "#e8b4a0",
  ivory: "#fffff0",
  "cream colour": "#f3ead3",
  cream: "#f3ead3",
  champagne: "#f1ddb8",
  copper: "#b87333",
  "copper colour": "#b87333",
  "metallic copper": "#b87333",
  "cherry (fruit)": "#9b111e",
  sand: "#d8c39a",
  "mint colour": "#a8e6cf",
  lavender: "#c3b1e1",
  burgundy: "#800020",
  lilac: "#c8a2c8",
  "light blue": "#9ecbf0",
  "rose gold": "#e0a899",
  bordeaux: "#5c0120",
  espresso: "#4b3621",
  "brushed steel": "#a7a9ac",
  coral: "#ff7f50",
  pearl: "#f0eadc",
  teal: "#00807f",
  lime: "#9acd32",
  "lime colour": "#9acd32",
  rose: "#e8a3b5",
  indigo: "#3f3d99",
  "light grey": "#c8c8c8",
  "light green": "#90ee90",
  cyan: "#00bcd4",
  magenta: "#c2185b",
  "light magenta": "#f080c0",
  olive: "#708238",
  "dark grey": "#4a4a4a",
  peach: "#ffcba4",
  steel: "#8e9aa6",
  "satin steel": "#b0b4b8",
  "aqua colour": "#7fdbd4",
  "wood colour": "#a0744b",
  wood: "#a0744b",
  almond: "#efdecd",
  cappuccino: "#a67b5b",
  amber: "#ffbf00",
  aubergine: "#472c4c",
  taupe: "#8b8589",
  "dark blue": "#1a3a6b",
  oat: "#dfd3bc",
  tungsten: "#6f6f6f",
  "petrol colour": "#005f6a",
  walnut: "#5d432c",
  khaki: "#bdb76b",
  granite: "#676767",
  blueberry: "#4f5d95",
  brass: "#b5a642",
  "light brown": "#a67b5b",
  fuchsia: "#d81b8c",
  "onyx colour": "#353839",
  "dark green": "#1b5e20",
  zinc: "#9a9fa3",
  mirror: "#e6e8ea",
  crimson: "#b0122d",
  tan: "#d2b48c",
  berry: "#8e2c48",
  iron: "#5e5e5e",
  nickel: "#a0a09d",
  rosewood: "#65000b",
  mauve: "#b784a7",
  maroon: "#800000",
  "slate colour": "#5a6772",
  mocha: "#7b5c4b",
  birch: "#e9dcc0",
  pebble: "#a69f94",
  pewter: "#8e9294",
  "quartz metallic": "#d9d4cf",
  natural: "#e8dcc4",
  latte: "#c5a582",
  hazelnut: "#a67b5b",
  garnet: "#733635",
  "vanilla colour": "#f3e5ab",
  "cognac colour": "#9a463d",
  caramel: "#a5682a",
  wenge: "#4b3a2f",
  "brick colour": "#9c4a32",
  "marble colour": "#e8e6e1",
  transparent: "transparent",
  translucent: "transparent",
};

// Several colours in one name.
const MIXED: Record<string, string> = {
  multicolour: "conic-gradient(#c62828, #ef7c1a, #f5d327, #2e7d32, #1f5fbf, #7b3fa0, #c62828)",
  "assorted colours": "conic-gradient(#c62828, #ef7c1a, #f5d327, #2e7d32, #1f5fbf, #7b3fa0, #c62828)",
  camouflage: "conic-gradient(#4b5320, #78866b, #3b3c36, #8f9779, #4b5320)",
};

// A name not listed: a neutral swatch, its name as the tooltip.
const UNKNOWN = "#9e9e9e";

const partsOf = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && part !== "not applicable");

/**
 * The background of a swatch for one variant's colour, or null when it
 * names none ("Not applicable"). A two-tone colour gets one band per colour.
 */
export function swatchBackground(value: string): string | null {
  const parts = partsOf(value);
  if (parts.length === 0) return null;
  if (parts.length === 1) return MIXED[parts[0]] ?? COLOURS[parts[0]] ?? UNKNOWN;
  const step = 100 / parts.length;
  const bands = parts.map((part, i) => {
    const colour = COLOURS[part] ?? UNKNOWN;
    return `${colour} ${i * step}% ${(i + 1) * step}%`;
  });
  return `linear-gradient(135deg, ${bands.join(", ")})`;
}

/** The colour as read: "Aluminium / Black". */
export const colourLabel = (value: string) => value.split(",").map((part) => part.trim()).join(" / ");
