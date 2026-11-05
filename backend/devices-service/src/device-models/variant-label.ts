/** The technical properties a variant label is made of, Icecat's names. */
export const LABEL_PROPERTIES = [
  'Processor family',
  'Processor model',
  'RAM capacity',
  'Internal memory',
  'Internal storage capacity',
  'Total storage capacity',
  'Product colour',
  'Display diagonal',
  'Discrete graphics card model',
  'Operating system installed',
  'Keyboard language',
  'Keyboard layout',
  'SIM card capability',
];

type Properties = Record<string, string | undefined>;

// What says "none": no dedicated graphics card, no operating system.
const NOTHING = new Set(['', '-', 'n', 'no', 'none', 'not available']);
const meaningful = (value?: string): string | null => {
  const v = value?.trim();
  return v && !NOTHING.has(v.toLowerCase()) ? v : null;
};

/**
 * Icecat gives capacities in GB: 1500 reads 1.5 TB; below 1, 0.5 is 512 MB
 * but 0.064 is 64 MB, so a binary fraction is read as such. A sum such as
 * 1256 (1 TB and 256 GB) stays in GB, 0 says nothing.
 */
const capacity = (value?: string): string | null => {
  const v = meaningful(value);
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (n <= 0) return null;
  if (n >= 1000 && n % 500 === 0) return `${n / 1000} TB`;
  if (n < 1) {
    return `${Number.isInteger(n * 1024) ? n * 1024 : Math.round(n * 1000)} MB`;
  }
  return `${n} GB`;
};

/** A printer's memory, which Icecat gives in MB: 1024 reads 1 GB. */
const megabytes = (value?: string): string | null => {
  const v = meaningful(value);
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (n <= 0) return null;
  if (n >= 1000 && n % 1000 === 0) return `${n / 1000} GB`;
  if (n >= 1024 && n % 512 === 0) return `${n / 1024} GB`;
  return `${n} MB`;
};

/** What Internal memory holds for a model, after its categories. */
type Memory = 'GB' | 'MB' | null;

const COMPUTERS = new Set(['Laptop', 'Desktop computer']);

/**
 * A computer's RAM in GB, a printer's in MB; a television's or a monitor's
 * storage, in MB, which labels leave out, as a phone's: its RAM is in RAM
 * capacity. A model without category is taken for a computer, as most are.
 */
const memoryIn = (categories: string[]): Memory => {
  if (categories.length === 0 || categories.some((c) => COMPUTERS.has(c))) {
    return 'GB';
  }
  return categories.includes('Printer') ? 'MB' : null;
};

/**
 * "i5-8350U" as Intel names it, "Ryzen 5 5600U" or "Core Ultra 7 155H"
 * where the model alone would not say which processor it is.
 */
const processor = (p: Properties): string | null => {
  const model = meaningful(p['Processor model']);
  const family = meaningful(p['Processor family'])
    ?.replace(/[®™]/g, '')
    .replace(/^(Intel|AMD|Apple|Qualcomm|MediaTek|Samsung)\s+/i, '');
  if (!model) return family ?? null;
  if (!family) return model;
  const last = family.split(/\s+/).pop() ?? '';
  return model.toLowerCase().startsWith(`${last.toLowerCase()}-`)
    ? model
    : `${family} ${model}`;
};

/**
 * The parts of a label, in the order they tell a variant apart: the
 * properties each is read from, and how it reads.
 */
const PARTS: {
  key: string;
  from: string[];
  /** What the label adds to the value: "16 GB RAM", where the part is "16 GB". */
  suffix?: string;
  show: (p: Properties, memory: Memory) => string | null;
}[] = [
  { key: 'processor', from: ['Processor family', 'Processor model'], show: processor },
  {
    // A phone's RAM is in RAM capacity, a computer's in Internal memory.
    key: 'ram',
    from: ['RAM capacity', 'Internal memory'],
    suffix: ' RAM',
    show: (p, memory) => {
      const internal = p['Internal memory'];
      return (
        capacity(p['RAM capacity']) ??
        (memory === 'GB'
          ? capacity(internal)
          : memory === 'MB'
            ? megabytes(internal)
            : null)
      );
    },
  },
  {
    key: 'storage',
    from: ['Internal storage capacity', 'Total storage capacity'],
    show: (p) =>
      capacity(p['Internal storage capacity']) ??
      capacity(p['Total storage capacity']),
  },
  {
    key: 'colour',
    from: ['Product colour'],
    show: (p) =>
      meaningful(p['Product colour'])?.replace(/\s*,\s*/g, '/') ?? null,
  },
  {
    key: 'display',
    from: ['Display diagonal'],
    show: (p) => {
      // Some say "6.31 inch" where most say "6.31".
      const inches = meaningful(p['Display diagonal'])?.replace(
        /\s*(inch(es)?|")$/i,
        '',
      );
      return inches ? `${inches}"` : null;
    },
  },
  {
    key: 'graphics',
    from: ['Discrete graphics card model'],
    show: (p) => meaningful(p['Discrete graphics card model']),
  },
  {
    key: 'os',
    from: ['Operating system installed'],
    show: (p) => meaningful(p['Operating system installed']),
  },
  {
    key: 'keyboard',
    from: ['Keyboard language', 'Keyboard layout'],
    show: (p) =>
      meaningful(p['Keyboard language']) ?? meaningful(p['Keyboard layout']),
  },
  {
    key: 'sim',
    from: ['SIM card capability'],
    show: (p) => meaningful(p['SIM card capability']),
  },
];

// What a variant says of a part, "none" included, which tells a variant
// without a graphics card from one with; null when it says nothing.
const said = (part: (typeof PARTS)[number], p: Properties): string | null => {
  const values = part.from.map((name) => p[name]?.trim().toLowerCase() ?? '');
  return values.some(Boolean) ? values.join('|') : null;
};

const SHOWN = 4;

/**
 * Labels the variants of one model with what tells them apart: only the
 * parts whose values differ between them, four at most, more for variants
 * that four would leave identical. A model with one variant, or variants
 * nothing tells apart, gets no label: its variants differ by reference or
 * seller, which the API returns beside the label.
 */
export function variantLabels(
  variants: { id: number; properties: Properties }[],
  categories: string[] = [],
): Map<number, string | null> {
  const labels = new Map<number, string | null>(
    variants.map((v) => [v.id, null]),
  );
  if (variants.length < 2) return labels;

  const memory = memoryIn(categories);
  const differing = PARTS.map(
    (part) =>
      new Set(variants.map((v) => said(part, v.properties)).filter(Boolean))
        .size > 1,
  );
  const parts = variants.map((v) =>
    PARTS.filter((_, i) => differing[i])
      .map((part) => {
        const value = part.show(v.properties, memory);
        return value && value + (part.suffix ?? '');
      })
      .filter((value): value is string => value !== null),
  );

  // Shown parts per variant: four, then one more for each variant still
  // sharing its label with another it could be told apart from.
  const shown = parts.map((p) => Math.min(SHOWN, p.length));
  const label = (i: number) => parts[i].slice(0, shown[i]).join(' · ');
  for (;;) {
    const byLabel = new Map<string, number[]>();
    parts.forEach((_, i) => {
      const group = byLabel.get(label(i));
      if (group) group.push(i);
      else byLabel.set(label(i), [i]);
    });
    let extended = false;
    for (const group of byLabel.values()) {
      if (group.length < 2) continue;
      const full = new Set(group.map((i) => parts[i].join('\u0000')));
      if (full.size < 2) continue;
      for (const i of group) {
        if (shown[i] < parts[i].length) {
          shown[i] += 1;
          extended = true;
        }
      }
    }
    if (!extended) break;
  }

  variants.forEach((v, i) => labels.set(v.id, label(i) || null));
  return labels;
}

/** The keys of a label's parts, in their order. */
export const PART_KEYS = PARTS.map((part) => part.key);

/**
 * What tells the variants of one model apart, part by part: every part
 * whose values differ between them, unlike the label, which keeps four;
 * none for a model of one variant. A visitor narrows the variants down by
 * these, as one picks a size and a colour.
 */
export function variantParts(
  variants: { id: number; properties: Properties }[],
  categories: string[] = [],
): Map<number, Record<string, string>> {
  const memory = memoryIn(categories);
  const differing =
    variants.length < 2
      ? []
      : PARTS.filter(
          (part) =>
            new Set(
              variants.map((v) => said(part, v.properties)).filter(Boolean),
            ).size > 1,
        );
  return new Map(
    variants.map((v) => [
      v.id,
      Object.fromEntries(
        differing
          .map((part) => [part.key, part.show(v.properties, memory)])
          .filter(([, value]) => value !== null),
      ),
    ]),
  );
}
