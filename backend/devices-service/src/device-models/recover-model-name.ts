/**
 * A fuller model name for a catalogue entry whose own name lost its family
 * ("5590", "15", "Z5"), read from the manufacturer URL or the description
 * Icecat gave it. Null when they do not name the model with confidence: the
 * recovered name must contain the entry's own name, so that a generic page
 * never names another product.
 */
export function recoverModelName(
  brand: string,
  model: string,
  url = '',
  description = '',
): string | null {
  const recover = RECOVERERS[brand.trim().toLowerCase()];
  const name = recover ? recover(model.trim(), url, description) : null;
  // "Yoga" read back as "Yoga" recovers nothing.
  return name && name.toLowerCase() !== model.trim().toLowerCase()
    ? name
    : null;
}

type Recoverer = (
  model: string,
  url: string,
  description: string,
) => string | null;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Z5" is a whole word of "Xperia Z5", not of "Xperia Z5x". */
const containsWord = (name: string, word: string) =>
  word === '' ||
  new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(word.toLowerCase())}($|[^a-z0-9])`,
  ).test(name.toLowerCase());

/** Lower-case slugs only: "z5" → "Z5", "compact" → "Compact". */
const titled = (word: string) =>
  word !== word.toLowerCase()
    ? word
    : /\d/.test(word) || word.length <= 2
      ? word.toUpperCase()
      : word[0].toUpperCase() + word.slice(1);

const fromSlug = (slug: string) =>
  slug.split(/[-_]+/).filter(Boolean).map(titled).join(' ');

// Where a phone or laptop slug stops naming the model and lists the
// configuration: "galaxy-book-pro-15-intel-core-i5-256gb-…".
const CONFIGURATION_WORD =
  /^(?:\d+(?:gb|tb)|intel|amd|core|i[3579]|wifi|lte|black|white|silver|grey|gray|gold|blue|green|pink|red|violet|purple)$/;
const modelPart = (slug: string) => {
  const words = slug.split('-');
  const at = words.findIndex((w) => CONFIGURATION_WORD.test(w));
  return (at < 0 ? words : words.slice(0, at)).join('-');
};

const DELL_FAMILIES: Record<string, string> = {
  latitude: 'Latitude',
  inspiron: 'Inspiron',
  vostro: 'Vostro',
  xps: 'XPS',
  precision: 'Precision',
  optiplex: 'OptiPlex',
  chromebook: 'Chromebook',
};

const LENOVO_FAMILIES: Record<string, string> = {
  thinkpad: 'ThinkPad',
  thinkcentre: 'ThinkCentre',
  thinkstation: 'ThinkStation',
  thinkbook: 'ThinkBook',
  ideapad: 'IdeaPad',
  ideacentre: 'IdeaCentre',
  legion: 'Legion',
  yoga: 'Yoga',
};

/** The first of `candidates` that names the entry's own model. */
const naming = (model: string, candidates: (string | null)[]) =>
  candidates.find((c): c is string => !!c && containsWord(c, model)) ?? null;

// "/xperia-z5/", "/galaxy-s/galaxy-s7/": every product slug of the URL.
const productSlugs = (url: string, prefix: string) =>
  [
    ...url
      .toLowerCase()
      .matchAll(new RegExp(`/${prefix}-([a-z0-9-]+?)(?=/|$|[?#])`, 'g')),
  ].map((m) => m[1]);

const RECOVERERS: Record<string, Recoverer> = {
  // The family from the URL; the number from the name, or from the URL when
  // the name has none. Dell numbers its series pages "5000" or "3200-series":
  // those do not name a model.
  dell: (model, url) => {
    const m = url
      .toLowerCase()
      .match(
        /(?:^|[/-])(latitude|inspiron|vostro|xps|precision|optiplex|chromebook)-([a-z0-9-]*)/,
      );
    if (!m) return null;
    const family = DELL_FAMILIES[m[1]];
    if (/^\d{4}[a-z]?$/i.test(model)) return `${family} ${model}`;
    const words = m[2].split('-');
    if (model && !words.includes(model.toLowerCase())) return null;
    const at = words.findIndex((w) => /^\d{4}[a-z]?$/.test(w));
    if (at < 0 || /^\d000$/.test(words[at]) || words[at + 1] === 'series') {
      return null;
    }
    return `${family} ${words[at]}`;
  },

  sony: (model, url) =>
    naming(
      model,
      productSlugs(url, 'xperia').map(
        (s) => `Xperia ${fromSlug(modelPart(s))}`,
      ),
    ),

  samsung: (model, url) =>
    naming(
      model,
      productSlugs(url, 'galaxy').map((s) =>
        `Galaxy ${fromSlug(modelPart(s))}`.replace(/ Plus\b/, '+'),
      ),
    ),

  // Product pages ("…/Lenovo-ThinkBook-15-G2-ITL/p/…"), PSREF sheets
  // ("…/Detail/ThinkStation_P8?M=…"), shop pages ("…/thinkcentre/…/edge-72/")
  // and the title of the description ("<b>ThinkStation P7</b>").
  lenovo: (model, url, description) => {
    const path = url.replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '');
    const segments = path.split('/').filter(Boolean);
    const familyOf = (name: string) =>
      LENOVO_FAMILIES[name.split(/[\s_-]/)[0].toLowerCase()];
    const withFamily = (name: string) => {
      if (familyOf(name)) return name.replace(/^\S+/, (w) => familyOf(w) ?? w);
      const family = segments
        .map((s) => LENOVO_FAMILIES[s.toLowerCase()])
        .find(Boolean);
      return family ? `${family} ${name}` : null;
    };

    const product = path.match(/\/(?:Lenovo-)?([A-Za-z]+-[A-Za-z0-9-]+)\/p\//);
    const psref = /psref\.lenovo\.com/i.test(url)
      ? segments[segments.length - 1]
      : undefined;
    const shop = /shop[a-z]*\.lenovo\.com/i.test(url)
      ? segments[segments.length - 1]
      : undefined;
    const title = description.match(/^<b>([^<]{3,60})<\/b>/)?.[1];

    return naming(model, [
      product ? withFamily(fromSlug(product[1])) : null,
      psref ? withFamily(fromSlug(psref)) : null,
      shop ? withFamily(fromSlug(shop)) : null,
      title && familyOf(title) ? title.trim() : null,
    ]);
  },
};
