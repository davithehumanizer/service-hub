/**
 * Dry run of the model normalisation over a catalogue export, before anything
 * is written to a database.
 *
 *   npx ts-node --transpile-only scripts/device-models-report.ts <entries.tsv> <report.md>
 *
 * The input is one line per entry, in COPY text format:
 *
 *   COPY (SELECT d.device_id, d.brand, d.model, d.product_code, d.source,
 *                coalesce(string_agg(c.name, '|' ORDER BY c.name), '')
 *         FROM devices d
 *         LEFT JOIN device_category_device_link l ON l."devicesDeviceId" = d.device_id
 *         LEFT JOIN device_categories c ON c.id = l."deviceCategoriesId"
 *         GROUP BY d.device_id) TO STDOUT;
 *
 * Over the 1.12 M production entries it needs a larger heap
 * (NODE_OPTIONS=--max-old-space-size=6144).
 */
import { createReadStream, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { normalizeModel } from '../src/device-models/normalize-model';
import {
  KnownModels,
  Placement,
  placeModel,
} from '../src/device-models/place-model';
import {
  DEFAULT_RULES,
  NormalizationRules,
} from '../src/device-models/normalization-rules';
import { recoverModelName } from '../src/device-models/recover-model-name';

interface Entry {
  id: string;
  brand: string;
  model: string;
  productCode: string;
  categories: string[];
}

type Outcome = Placement;

interface Model {
  key: string;
  brand: string;
  names: Map<string, number>;
  originals: Map<string, number>;
  variants: number;
  fromResellers: number;
  categories: Map<string, number>;
}

const ESCAPES: Record<string, string> = { t: '\t', n: '\n', r: '\r' };
const unescape = (field: string) =>
  field === '\\N'
    ? ''
    : field.replace(/\\(.)/g, (_, c: string) => ESCAPES[c] ?? c);

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const sample = <T>(items: T[], n: number, id: (t: T) => string) =>
  [...items].sort((a, b) => hash(id(a)) - hash(id(b))).slice(0, n);
const top = <K>(m: Map<K, number>) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]);
const add = <K>(m: Map<K, number>, k: K, n = 1) =>
  m.set(k, (m.get(k) ?? 0) + n);
const fmt = (n: number) => n.toLocaleString('fr-FR');
const cell = (s: string) => s.replace(/\|/g, '\\|');

async function readEntries(path: string): Promise<Entry[]> {
  const entries: Entry[] = [];
  const lines = createInterface({
    input: createReadStream(path, 'utf8'),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const [id, brand, model, productCode, , categories] = line
      .split('\t')
      .map(unescape);
    entries.push({
      id,
      brand,
      model,
      productCode,
      categories: categories ? categories.split('|') : [],
    });
  }
  return entries;
}

/** device_id, property name, value: the URL and description of an entry. */
async function readFamilyProps(path: string) {
  const props = new Map<string, { url: string; description: string }>();
  const lines = createInterface({
    input: createReadStream(path, 'utf8'),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const [id, name, value] = line.split('\t').map(unescape);
    const p = props.get(id) ?? { url: '', description: '' };
    if (name === 'URL') p.url = value;
    else p.description = value;
    props.set(id, p);
  }
  return props;
}

async function main() {
  const [input, output, familyProps] = process.argv.slice(2);
  if (!input || !output)
    throw new Error(
      'usage: device-models-report.ts <entries.tsv> <report.md> [family-props.tsv]',
    );
  const entries = await readEntries(input);

  // Every brand that is not a reseller is known as itself.
  const rules: NormalizationRules = {
    ...DEFAULT_RULES,
    brandAliases: { ...DEFAULT_RULES.brandAliases },
  };
  for (const e of entries) {
    const lower = e.brand.trim().toLowerCase();
    if (
      lower &&
      !rules.resellerBrands.includes(lower) &&
      !rules.brandAliases[lower]
    ) {
      rules.brandAliases[lower] = e.brand.trim();
    }
  }

  // Names that lost their family, recovered from the stored URL and
  // description when an export of them is given.
  const props = familyProps ? await readFamilyProps(familyProps) : new Map();
  const recovered = new Map<number, string>();
  entries.forEach((e, i) => {
    const p = props.get(e.id);
    if (!p) return;
    const brand = rules.brandAliases[e.brand.trim().toLowerCase()] ?? e.brand;
    const name = recoverModelName(brand, e.model, p.url, p.description);
    if (name) recovered.set(i, name);
  });

  const normalized = entries.map((e, i) =>
    normalizeModel(
      e.brand,
      recovered.get(i) ?? e.model,
      rules,
      e.productCode,
      e.categories[0] ?? '',
    ),
  );
  // What a reseller entry can join: a manufacturer model, or the model that a
  // reseller name clean enough to trust has made under the real brand.
  const manufacturerKeys = new Set<string>();
  const cleanResellerKeys = new Set<string>();
  normalized.forEach((n) => {
    if (!n.key) return;
    if (!n.fromReseller) manufacturerKeys.add(n.key);
    else if (!n.cutAtConfiguration && !n.makerUnknown)
      cleanResellerKeys.add(n.key);
  });

  const models = new Map<string, Model>();
  const outcomes = new Map<Outcome, number>();
  const byReseller = new Map<string, Map<Outcome, number>>();
  const isolatedByBrand = new Map<string, number>();
  const isolatedSamples = new Map<string, Map<string, number>>();
  const resellerOwn: { reseller: string; original: string; name: string }[] =
    [];
  const brandStats = new Map<string, { entries: number; names: Set<string> }>();

  const known: KnownModels = {
    fromManufacturer: (key) => manufacturerKeys.has(key),
    exists: (key) => manufacturerKeys.has(key) || cleanResellerKeys.has(key),
  };

  normalized.forEach((n, i) => {
    const e = entries[i];
    const placed = placeModel(n, e.brand, known);
    const { key, brand } = placed;
    const outcome: Outcome = placed.placement;
    if (outcome === 'isolated') {
      add(isolatedByBrand, n.brand);
      const s = isolatedSamples.get(n.brand) ?? new Map<string, number>();
      add(s, e.model.trim() === '' ? '(vide)' : e.model.trim());
      isolatedSamples.set(n.brand, s);
    } else if (outcome === 'reseller-own') {
      resellerOwn.push({
        reseller: e.brand,
        original: e.model,
        name: n.name,
      });
    }
    add(outcomes, outcome);
    // Counted under the brand the entry's model is filed under, as its keys.
    const stats = brandStats.get(brand) ?? {
      entries: 0,
      names: new Set<string>(),
    };
    stats.entries++;
    stats.names.add(`${e.brand.toLowerCase()}|${e.model.toLowerCase()}`);
    brandStats.set(brand, stats);
    if (n.fromReseller) {
      const r = byReseller.get(e.brand) ?? new Map<Outcome, number>();
      add(r, outcome);
      byReseller.set(e.brand, r);
    }
    if (!key) return;

    const m =
      models.get(key) ??
      ({
        key,
        brand,
        names: new Map(),
        originals: new Map(),
        variants: 0,
        fromResellers: 0,
        categories: new Map(),
      } as Model);
    m.variants++;
    if (n.fromReseller) m.fromResellers++;
    else add(m.names, n.name);
    if (n.fromReseller && m.names.size === 0) add(m.names, n.name);
    add(m.originals, `${e.brand} · ${e.model}`);
    e.categories.forEach((c) => add(m.categories, c));
    models.set(key, m);
  });

  const isolated = outcomes.get('isolated') ?? 0;
  const lowerPairs = new Set(
    entries.map((e) => `${e.brand.toLowerCase()}|${e.model.toLowerCase()}`),
  );
  const displayName = (m: Model) => top(m.names)[0]?.[0] ?? '';
  const modelLine = (m: Model) =>
    `| ${cell(m.brand)} | ${cell(displayName(m))} | ${fmt(m.variants)} | ${fmt(m.fromResellers)} | ${fmt(m.originals.size)} |`;
  const all = [...models.values()];
  const out: string[] = [];
  const p = (...lines: string[]) => out.push(...lines);

  p(
    '# Rapport de normalisation des modèles (répétition, aucune écriture)',
    '',
    `Source : ${fmt(entries.length)} entrées de la copie locale du catalogue de prod. ` +
      'Généré par `backend/devices-service/scripts/device-models-report.ts`.',
    '',
    '## 1. Synthèse',
    '',
    '| Mesure | Valeur |',
    '|---|---|',
    `| Entrées | ${fmt(entries.length)} |`,
    `| Couples (marque, modèle) distincts, en minuscules | ${fmt(lowerPairs.size)} |`,
    `| **Modèles obtenus** (clés + entrées isolées) | **${fmt(models.size + isolated)}** |`,
    `| dont modèles regroupés par clé | ${fmt(models.size)} |`,
    `| dont entrées isolées (nom incomplet, une par modèle) | ${fmt(isolated)} |`,
    `| Entrées fabricant | ${fmt(outcomes.get('manufacturer') ?? 0)} |`,
    `| Entrées revendeur rattachées à un modèle fabricant | ${fmt(outcomes.get('attached') ?? 0)} |`,
    `| Entrées revendeur formant un modèle sous la vraie marque (aucune variante fabricant) | ${fmt(outcomes.get('maker-model') ?? 0)} |`,
    `| Entrées revendeur gardées sous la marque du revendeur | ${fmt(outcomes.get('reseller-own') ?? 0)} |`,
    '',
  );

  p(
    '## 2. Par marque (25 premières par entrées)',
    '',
    "| Marque | Entrées | Noms d'origine | Modèles (clés) | Entrées isolées |",
    '|---|---|---|---|---|',
  );
  const keysByBrand = new Map<string, number>();
  all.forEach((m) => add(keysByBrand, m.brand));
  [...brandStats.entries()]
    .sort((a, b) => b[1].entries - a[1].entries)
    .slice(0, 25)
    .forEach(([brand, s]) =>
      p(
        `| ${cell(brand)} | ${fmt(s.entries)} | ${fmt(s.names.size)} | ${fmt(keysByBrand.get(brand) ?? 0)} | ${fmt(isolatedByBrand.get(brand) ?? 0)} |`,
      ),
    );
  p('');

  p(
    '## 3. Les plus gros modèles',
    '',
    "| Marque | Modèle | Variantes | dont revendeurs | Noms d'origine |",
    '|---|---|---|---|---|',
    ...all
      .sort((a, b) => b.variants - a.variants)
      .slice(0, 25)
      .map(modelLine),
    '',
  );

  p('## 4. Échantillons de regroupements par règle', '');
  for (const brand of ['ASUS', 'MSI', 'Philips', 'HP', 'Samsung', 'Dell']) {
    const merged = all.filter((m) => m.brand === brand && m.originals.size > 1);
    p(
      `### ${brand} — ${fmt(merged.length)} modèles regroupant plusieurs noms d'origine`,
      '',
      "| Modèle | Variantes | Noms d'origine (5 plus fréquents) |",
      '|---|---|---|',
      ...sample(merged, 10, (m) => m.key).map(
        (m) =>
          `| ${cell(displayName(m))} | ${fmt(m.variants)} | ${cell(
            top(m.originals)
              .slice(0, 5)
              .map(([o, c]) => `${o} (${c})`)
              .join(' ; '),
          )} |`,
      ),
      '',
    );
  }

  p('## 5. Les cas du PBI 13848', '');
  for (const [label, test] of [
    ['« Galaxy S23 »', (m: Model) => m.key.startsWith('samsung|galaxy s23')],
    ['« iPhone 11 »', (m: Model) => /^apple\|iphone 11\b/.test(m.key)],
    ['« Latitude 5590 »', (m: Model) => m.key.includes('latitude 5590')],
  ] as [string, (m: Model) => boolean][]) {
    p(
      `### ${label}`,
      '',
      "| Marque | Modèle | Variantes | dont revendeurs | Noms d'origine |",
      '|---|---|---|---|---|',
      ...all
        .filter(test)
        .sort((a, b) => b.variants - a.variants)
        .slice(0, 15)
        .map(modelLine),
      '',
    );
  }
  const latitude = all.filter((m) => m.key.startsWith('dell|latitude'));
  p(
    `« Dell Latitude » : ${fmt(latitude.reduce((s, m) => s + m.variants, 0))} entrées → ` +
      `${fmt(latitude.length)} modèles.`,
    '',
  );

  p(
    '## 6. Revendeurs',
    '',
    '| Revendeur | Rattachées | Modèle sous la vraie marque | Gardées sous le revendeur | Isolées |',
    '|---|---|---|---|---|',
    ...[...byReseller.entries()]
      .sort(
        (a, b) =>
          [...b[1].values()].reduce((x, y) => x + y) -
          [...a[1].values()].reduce((x, y) => x + y),
      )
      .map(
        ([r, o]) =>
          `| ${cell(r)} | ${fmt(o.get('attached') ?? 0)} | ${fmt(o.get('maker-model') ?? 0)} | ${fmt(o.get('reseller-own') ?? 0)} | ${fmt(o.get('isolated') ?? 0)} |`,
      ),
    '',
    '### Gardées sous le revendeur : nom nettoyé sans modèle fabricant correspondant (décision 1)',
    '',
    "| Revendeur | Nom d'origine | Nom nettoyé |",
    '|---|---|---|',
    ...sample(
      [
        ...new Map(
          resellerOwn.map((r) => [`${r.reseller}|${r.original}`, r]),
        ).values(),
      ],
      25,
      (r) => r.original,
    ).map(
      (r) => `| ${cell(r.reseller)} | ${cell(r.original)} | ${cell(r.name)} |`,
    ),
    '',
    '### Modèles sous la vraie marque, connus seulement par des revendeurs (30 plus gros)',
    '',
    "| Marque | Modèle | Variantes | dont revendeurs | Noms d'origine |",
    '|---|---|---|---|---|',
    ...all
      .filter((m) => m.fromResellers === m.variants && !byReseller.has(m.brand))
      .sort((a, b) => b.variants - a.variants)
      .slice(0, 30)
      .map(modelLine),
    '',
  );

  p(
    '## 7. Entrées isolées (nom incomplet)',
    '',
    '| Marque | Entrées isolées | Noms les plus fréquents |',
    '|---|---|---|',
    ...top(isolatedByBrand)
      .slice(0, 15)
      .map(
        ([b, c]) =>
          `| ${cell(b)} | ${fmt(c)} | ${cell(
            top(isolatedSamples.get(b)!)
              .slice(0, 8)
              .map(([n, k]) => `${n} (${k})`)
              .join(', '),
          )} |`,
      ),
    '',
  );

  const byCategory = all.filter((m) => m.key.split('|').length === 3);
  const byCategoryEntries = new Map<string, number>();
  byCategory.forEach((m) => add(byCategoryEntries, m.brand, m.variants));
  p(
    "## 7 bis. Noms courts regroupés à l'intérieur de leur catégorie",
    '',
    `${fmt(byCategory.length)} modèles, ${fmt(byCategory.reduce((s, m) => s + m.variants, 0))} entrées. ` +
      "Un nom court ou purement numérique (« P50 », « 3470 ») n'est regroupé qu'avec les entrées de la même catégorie.",
    '',
    '| Marque | Entrées | Plus gros modèles (catégorie) |',
    '|---|---|---|',
    ...top(byCategoryEntries)
      .slice(0, 12)
      .map(
        ([b, c]) =>
          `| ${cell(b)} | ${fmt(c)} | ${cell(
            byCategory
              .filter((m) => m.brand === b)
              .sort((x, y) => y.variants - x.variants)
              .slice(0, 6)
              .map(
                (m) =>
                  `${displayName(m)} · ${m.key.split('|')[2]} (${m.variants})`,
              )
              .join(', '),
          )} |`,
      ),
    '',
  );

  // A model whose variants fall in unrelated categories is likely two
  // products merged by mistake. Icecat files mobile workstations under
  // "Desktop computer", so ZBook-like laptop/desktop pairs are expected.
  const mixed = all.filter((m) => {
    const cats = top(m.categories);
    return cats.length > 1 && cats[1][1] >= Math.max(2, m.variants * 0.2);
  });
  p(
    '## 8. Fusions douteuses : variantes dans plusieurs catégories',
    '',
    `${fmt(mixed.length)} modèles ont au moins 20 % de variantes (et 2 au minimum) hors de leur catégorie principale.`,
    '',
    '| Marque | Modèle | Variantes | Catégories |',
    '|---|---|---|---|',
    ...mixed
      .sort((a, b) => b.variants - a.variants)
      .slice(0, 30)
      .map(
        (m) =>
          `| ${cell(m.brand)} | ${cell(displayName(m))} | ${fmt(m.variants)} | ${cell(
            top(m.categories)
              .slice(0, 4)
              .map(([c, k]) => `${c} (${k})`)
              .join(', '),
          )} |`,
      ),
    '',
  );

  const twinOf = (m: Model) => models.get(m.key.replace(/ amd$/, ' intel'));
  const amd = all.filter((m) => m.brand === 'Lenovo' && / amd$/.test(m.key));
  const pairs = amd.filter((m) => twinOf(m));
  const generic = pairs.filter((m) => models.has(m.key.replace(/ amd$/, '')));
  p(
    '## 9. Décision 4 : Lenovo « (AMD) » / « (Intel) »',
    '',
    `${fmt(amd.length)} modèles Lenovo dont le nom finit par « AMD », dont ${fmt(pairs.length)} ont un jumeau « Intel », ` +
      `et ${fmt(generic.length)} ont aussi un modèle sans mention du processeur (entrées de revendeurs, en général). ` +
      "Ils restent aujourd'hui des modèles distincts.",
    '',
    ...sample(pairs, 10, (m) => m.key).map((m) => {
      const bare = models.get(m.key.replace(/ amd$/, ''));
      return (
        `- ${displayName(m)} (${m.variants}) / ${displayName(twinOf(m)!)} (${twinOf(m)!.variants})` +
        (bare ? ` / ${displayName(bare)} (${bare.variants})` : '')
      );
    }),
    '',
  );

  if (props.size > 0) {
    const baseKeys = new Set<string>();
    normalized.forEach(
      (n, i) => n.key && !recovered.has(i) && baseKeys.add(n.key),
    );
    const stats = new Map<
      string,
      {
        targeted: number;
        recovered: number;
        joined: number;
        created: number;
        isolated: number;
      }
    >();
    const examples = new Map<string, Map<string, number>>();
    entries.forEach((e, i) => {
      if (!props.has(e.id)) return;
      const brand = normalized[i].brand;
      const s = stats.get(brand) ?? {
        targeted: 0,
        recovered: 0,
        joined: 0,
        created: 0,
        isolated: 0,
      };
      s.targeted++;
      const name = recovered.get(i);
      if (name) {
        s.recovered++;
        const key = normalized[i].key;
        if (!key) s.isolated++;
        else if (baseKeys.has(key)) s.joined++;
        else s.created++;
        const ex = examples.get(brand) ?? new Map<string, number>();
        add(ex, `${e.model} → ${name}`);
        examples.set(brand, ex);
      }
      stats.set(brand, s);
    });
    p(
      "## 10. Familles retrouvées dans l'URL et la description Icecat",
      '',
      `${fmt(props.size)} entrées sans famille ont une URL ou une description ; ` +
        `${fmt(recovered.size)} en tirent un nom complet. Les autres restent isolées.`,
      '',
      '| Marque | Avec URL ou description | Nom retrouvé | dont rejoint un modèle existant | dont nouveau modèle | dont encore isolé |',
      '|---|---|---|---|---|---|',
      ...[...stats.entries()]
        .sort((a, b) => b[1].targeted - a[1].targeted)
        .slice(0, 12)
        .map(
          ([b, s]) =>
            `| ${cell(b)} | ${fmt(s.targeted)} | ${fmt(s.recovered)} | ${fmt(s.joined)} | ${fmt(s.created)} | ${fmt(s.isolated)} |`,
        ),
      '',
      ...[...examples.entries()]
        .sort((a, b) => b[1].size - a[1].size)
        .flatMap(([b, ex]) => [
          `- **${b}** : ${top(ex)
            .slice(0, 8)
            .map(([pair, c]) => `${pair} (${c})`)
            .join(' ; ')}`,
        ]),
      '',
    );
  }

  writeFileSync(output, out.join('\n'));
  console.log(
    `${fmt(entries.length)} entrées → ${fmt(models.size + isolated)} modèles ; rapport : ${output}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
