import table from "../data/propertyKeys.json";

/**
 * The technical properties the variant form proposes, per canonical
 * category: Icecat's names, types, units and allowed values, chosen from the
 * catalogue (docs/demo-data-keys.md). Values are stored as Icecat stores
 * them: numbers in the key's unit, Y or N for a yes or no.
 */
export type KeyType = "number" | "yesno" | "choice" | "multi" | "text";

export type KeyDefinition = {
  type: KeyType;
  label: Record<string, string>;
  unit?: Record<string, string>;
  values?: string[];
};

type Table = {
  base: string[];
  categories: Record<string, string[]>;
  /** Where a category stores a key in another unit: a printer's memory in MB. */
  overrides: Record<string, Record<string, KeyDefinition>>;
  keys: Record<string, KeyDefinition>;
};

const TABLE = table as Table;

/** A key the table does not know: typed in as text. */
const free = (name: string): KeyDefinition => ({ type: "text", label: { en: name } });

export const definitionOf = (name: string, categories: string[]): KeyDefinition => {
  for (const category of categories) {
    const override = TABLE.overrides[category]?.[name];
    if (override) return override;
  }
  return TABLE.keys[name] ?? free(name);
};

/** The base for every model, then each of its categories' keys, once. */
export const proposedKeys = (categories: string[]): string[] => [
  ...new Set([...TABLE.base, ...categories.flatMap((c) => TABLE.categories[c] ?? [])]),
];

export const labelOf = (definition: KeyDefinition, language: string): string =>
  definition.label[language.slice(0, 2)] ?? definition.label.en;

export const unitOf = (definition: KeyDefinition, language: string): string | undefined =>
  definition.unit?.[language.slice(0, 2)] ?? definition.unit?.en;
