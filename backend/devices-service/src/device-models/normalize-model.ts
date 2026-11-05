import { NormalizationRules } from './normalization-rules';

export interface NormalizedModel {
  /** The real maker, canonical; the reseller itself when no maker is found. */
  brand: string;
  /** The model name, cleaned, for display. */
  name: string;
  /**
   * Identity of the model; null when the name is too incomplete to group on
   * ("15", "Yoga"). A short name is only grouped within its category.
   */
  key: string | null;
  /** The key includes the category: the name alone is too short to trust. */
  groupedByCategory: boolean;
  isRefurbished: boolean;
  /** Listed by a reseller under its own brand. */
  fromReseller: boolean;
  /** A reseller name was cut where its configuration starts: a guess. */
  cutAtConfiguration: boolean;
  /** A reseller name in which no maker could be found. */
  makerUnknown: boolean;
  /** Processor maker read in the configuration that was cut off. */
  cpuVendor?: 'intel' | 'amd';
}

const REFURBISHED_IN_BRACKETS =
  /\([^)]*\b(?:refurbished|remanufactured|renewed|reconditioned)\b[^)]*\)/gi;
const REFURBISHED_WORD =
  /\b(?:certified\s+)?(?:refurbished|remanufactured|renewed|reconditioned)\b/gi;
const GRADE = /\bgrade\s+[a-c]\+?(?=[\s,)]|$)/gi;
const GRADE_AFTER_MENTION =
  /\b(?:refurbished|remanufactured|renewed|reconditioned)\b\)?\s+[A-C]$/i;
const WARRANTY = /\b\d+\s+years?\b.*\bwarranty\b.*$/i;

// Where a reseller name stops naming the model and starts listing the
// configuration. Applied to reseller names only: manufacturer names such as
// "ZBook Power 15.6 inch G8" carry the model after a screen size.
const CONFIGURATION =
  /\s+-\s+|,|\s(?:intel|amd|core\s+i[3579]|i[3579](?:-\d{3,5}\w*)?|ryzen|celeron|pentium|xeon|\d+\s?(?:gb|tb)|ssd|hdd|nvme|fhd|uhd|qhd|wuxga|win(?:dows)?\s?1[01]|w1[01]\w*)\b/i;
// Not cut for Apple, whose models are named by their size ("MacBook Pro 13").
const SCREEN_SIZE = /\s\d{1,2}(?:[.,]\d)?\s?(?:"|”|inch\b)/i;
const INTEL = /\b(?:intel|core\s+i[3579]|i[3579]|celeron|pentium|xeon)\b/i;
const AMD = /\b(?:amd|ryzen|athlon)\b/i;

const TRAILING_GENERIC = /\s+(?:laptop|notebook|desktop)(?:\s+pc)?$/i;

// HP names come translated, or wrapped in the product type.
const HP_LEADING = [
  'computadora portátil',
  'computadora de escritorio',
  'equipo de escritorio mini',
  'equipo de escritorio',
  'equipo portátil',
  'equipo de factor de forma reducido',
  'equipo de factor de forma pequeño',
  'pc de factor de forma reducido',
  'pc de factor de forma pequeño',
  'workstation móvil',
  'workstation móvel',
  'station de travail mobile',
  'station de travail',
  'ordinateur portable',
  'ordinateur',
  'pc notebook',
  'workstation',
  'equipo',
  'pc',
];
const HP_TRAILING = [
  'entertainment notebook pc',
  'mobile workstation pc',
  'mobile workstation',
  'workstation pc',
  'workstation',
  'all-in-one pc',
  'all-in-one',
  'notebook pc',
  'desktop pc',
  'laptop pc',
  'business pc',
];

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const trimSeparators = (s: string) =>
  s.replace(/^[\s\-–,;:/]+|[\s\-–,;:/]+$/g, '');

/** Lowercase, without accents or punctuation; "+" is kept ("S23+"). */
export const toKey = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+\+/g, '+')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();

/** The alias the name starts with, as a whole word, longest first. */
const leadingAlias = (lower: string, aliases: string[]): string | undefined =>
  aliases.find(
    (alias) =>
      lower === alias ||
      (lower.startsWith(alias) && /[\s,\-–:]/.test(lower[alias.length])),
  );

const stripLeading = (name: string, length: number) =>
  trimSeparators(name.slice(length));

const stripDescriptors = (
  name: string,
  leading: string[],
  trailing: string[],
) => {
  let previous: string;
  do {
    previous = name;
    const lead = leadingAlias(name.toLowerCase(), leading);
    if (lead) name = stripLeading(name, lead.length);
    const trail = trailing.find((d) => name.toLowerCase().endsWith(' ' + d));
    if (trail) name = name.slice(0, name.length - trail.length).trim();
  } while (name !== previous);
  return name;
};

const BRAND_RULES: Record<string, (name: string) => string> = {
  // "UX310UA-FC339T": the model, then the configuration it was sold in.
  asus: (name) => {
    const m = name.match(/^([A-Z0-9]{3,})-[A-Z0-9]+(?:-[A-Z0-9]+)*(?:\s.*)?$/);
    return m && /\d/.test(m[1]) ? m[1] : name;
  },
  // "GS63VR 7RG(Stealth Pro)-051TR": a marketing name, then the configuration.
  msi: (name) => {
    const bare = collapse(name.replace(/\([^)]*\)/g, ''));
    const m = bare.match(/^(.*\S)-\d{3}[A-Z0-9]*(?:\s.*)?$/);
    return m ? m[1] : bare;
  },
  // "HD9622/21": the model, then a regional or colour variant.
  philips: (name) => name.replace(/^(.+?)\/[0-9A-Z]{2,4}$/, '$1'),
  hp: (name) => stripDescriptors(name, HP_LEADING, HP_TRAILING),
  // Resellers write "Gen 2i" or "G2i" for Lenovo's "Gen 2 (Intel)".
  lenovo: (name) =>
    name
      .replace(/\b(?:Gen |G)([1-9])i\b/g, 'Gen $1 (Intel)')
      .replace(/\b(?:Gen |G)([1-9])a\b/g, 'Gen $1 (AMD)'),
};

// Lenovo writes "ThinkPad T14 Gen 1" but "ThinkBook 15 G2", and resellers use
// either: the key treats them alike, the name keeps Lenovo's spelling.
const generationKey = (name: string, brandKey: string) =>
  brandKey === 'lenovo'
    ? name.replace(/(\s)G([1-9])(?=\s|$)/g, '$1Gen $2')
    : name;

/** The processor maker named first: "Ryzen 5 … Intel Wi-Fi" is an AMD. */
const firstVendor = (configuration: string): NormalizedModel['cpuVendor'] => {
  const intel = configuration.search(INTEL);
  const amd = configuration.search(AMD);
  if (intel < 0) return amd < 0 ? undefined : 'amd';
  return amd >= 0 && amd < intel ? 'amd' : 'intel';
};

// Aliases sorted longest first, overall and per brand; computed once per rules
// object, which is therefore not to be changed once in use.
const aliasCache = new WeakMap<
  NormalizationRules,
  { all: string[]; byBrand: Map<string, string[]> }
>();
const aliasesOf = (rules: NormalizationRules) => {
  let cached = aliasCache.get(rules);
  if (!cached) {
    const all = Object.keys(rules.brandAliases).sort(
      (a, b) => b.length - a.length,
    );
    const byBrand = new Map<string, string[]>();
    for (const alias of all) {
      const brand = rules.brandAliases[alias];
      byBrand.set(brand, [...(byBrand.get(brand) ?? []), alias]);
    }
    cached = { all, byBrand };
    aliasCache.set(rules, cached);
  }
  return cached;
};

/**
 * How far a name can be trusted to identify one product. "15", "Yoga" or
 * "MacBook Pro" name a family, not a model. "P50" or "3470" do name a model,
 * but Dell gives the same number to a desktop and a laptop: grouped only
 * within one category.
 */
const confidence = (
  name: string,
  brandKey: string,
  rules: NormalizationRules,
): 'none' | 'category' | 'full' => {
  const lower = name.toLowerCase();
  if (
    toKey(name) === '' ||
    /^[^\d\s]+$/.test(name) ||
    rules.familyOnlyNames.includes(lower)
  ) {
    return 'none';
  }
  if (
    rules.isolatedNumberBrands.includes(brandKey) &&
    /^\d+[a-z]?$/i.test(name)
  ) {
    return 'none';
  }
  if (rules.shortNameBrands.includes(brandKey)) return 'full';
  if (name.length <= 2 || /^\d{1,2}$/.test(name)) return 'none';
  if (name.length <= 4 || /^\d+$/.test(name)) return 'category';
  return 'full';
};

/**
 * Turns a catalogue entry's brand and model into the model it is a variant of.
 * Pure: everything it knows comes from its arguments.
 */
export function normalizeModel(
  rawBrand: string,
  rawModel: string,
  rules: NormalizationRules,
  productCode = '',
  category = '',
): NormalizedModel {
  const aliases = aliasesOf(rules);
  const brandLower = collapse(rawBrand).toLowerCase();
  const fromReseller = rules.resellerBrands.includes(brandLower);

  let name = collapse(collapse(rawModel).replace(WARRANTY, ' '));
  let isRefurbished = fromReseller;
  const unmarked = collapse(
    name
      .replace(REFURBISHED_IN_BRACKETS, ' ')
      .replace(REFURBISHED_WORD, ' ')
      .replace(GRADE, ' '),
  );
  if (unmarked !== name) {
    isRefurbished = true;
    // "Latitude 5590 (Refurbished) B": the grade left on its own. Not the
    // "A" of "Galaxy Tab A (Refurbished)", which comes before the mention.
    name = GRADE_AFTER_MENTION.test(name)
      ? unmarked.replace(/\s[A-C]$/i, '')
      : unmarked;
  }

  let brand = rules.brandAliases[brandLower] ?? collapse(rawBrand);
  let makerUnknown = false;
  let cutAtConfiguration = false;
  let cpuVendor: NormalizedModel['cpuVendor'];

  if (fromReseller) {
    // The maker comes first, or a family that names it ("Latitude…"), or it
    // follows the reseller's own name or a label ("BSI certified Dell…"):
    // looked for up to the fourth word. Some brands are common words, hence
    // the family before the later words.
    const ownName = [brandLower, brandLower.split(' ')[0]].find((own) =>
      leadingAlias(name.toLowerCase(), [own]),
    );
    if (ownName) name = stripLeading(name, ownName.length);
    const words = name.split(' ');
    const makerAt = (at: number) =>
      leadingAlias(words.slice(at).join(' ').toLowerCase(), aliases.all);
    const family = words[0].toLowerCase().replace(/,$/, '');
    let found = makerAt(0) ? { at: 0, alias: makerAt(0)! } : undefined;
    for (
      let at = 1;
      at < Math.min(4, words.length) && !found && !rules.familyBrands[family];
      at++
    ) {
      const alias = makerAt(at);
      if (alias) found = { at, alias };
    }
    if (found) {
      brand = rules.brandAliases[found.alias];
      name = stripLeading(words.slice(found.at).join(' '), found.alias.length);
    } else if (rules.familyBrands[family]) {
      brand = rules.familyBrands[family];
    } else {
      brand = collapse(rawBrand);
      makerUnknown = true;
    }

    const cuts = [name.search(CONFIGURATION)];
    if (brand.toLowerCase() !== 'apple') cuts.push(name.search(SCREEN_SIZE));
    const cut = Math.min(...cuts.filter((c) => c > 0));
    if (Number.isFinite(cut)) {
      cpuVendor = firstVendor(name.slice(cut));
      name = name.slice(0, cut);
      cutAtConfiguration = true;
    }
    name = name.replace(TRAILING_GENERIC, '');
  }

  // "Samsung Galaxy S23 Ultra" under Samsung.
  const own = aliases.byBrand.get(brand) ?? [];
  const stripOwnBrand = () => {
    const alias = leadingAlias(name.toLowerCase(), own);
    if (alias) name = stripLeading(name, alias.length);
  };
  if (!fromReseller) stripOwnBrand();

  const brandKey = brand.toLowerCase();
  const rule = BRAND_RULES[brandKey];
  if (rule) {
    name = rule(name);
    // Translated HP names carry the brand after the product type.
    stripOwnBrand();
  }

  // "Pavilion p7-1179c Desktop PC QX340AA": the product code at the end. Not
  // when it is the model number itself: "Eee PC 1002HA" is not an "Eee PC".
  const code = productCode.toLowerCase();
  for (const candidate of [code, code.split('#')[0]]) {
    if (candidate && name.toLowerCase().endsWith(' ' + candidate)) {
      const rest = name.slice(0, name.length - candidate.length);
      if (!/\d/.test(rest)) break;
      name = rest;
      if (rule) name = rule(name.trim());
    }
  }

  name = trimSeparators(collapse(name));
  const trust = confidence(name, brandKey, rules);
  const nameKey = toKey(generationKey(name, brandKey));
  const key =
    trust === 'none'
      ? null
      : trust === 'category'
        ? `${brandKey}|${nameKey}|${toKey(category)}`
        : `${brandKey}|${nameKey}`;
  return {
    brand,
    name,
    key,
    groupedByCategory: trust === 'category',
    isRefurbished,
    fromReseller,
    cutAtConfiguration,
    makerUnknown,
    cpuVendor,
  };
}
