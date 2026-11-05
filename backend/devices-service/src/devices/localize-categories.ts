export interface LocalizableCategory {
  id: number;
  name: string;
  canonicalName?: string;
}

/**
 * Puts the categories' names in the caller's locale, keeping the canonical
 * one in `canonicalName`, for devices and models alike.
 */
export async function localizeCategories<
  T extends { categories?: LocalizableCategory[] },
>(
  holders: T[],
  locale: string | undefined,
  query: (sql: string, params: unknown[]) => Promise<unknown[]>,
): Promise<T[]> {
  // Always carried, in every locale: a field that appears in some and not
  // others is a trap for anyone matching on it.
  const stampCanonical = () => {
    for (const holder of holders) {
      for (const cat of holder.categories ?? []) {
        cat.canonicalName = cat.name;
      }
    }
  };

  if (!locale || locale === 'en' || holders.length === 0) {
    stampCanonical();
    return holders;
  }
  const categoryIds = [
    ...new Set(holders.flatMap((h) => (h.categories ?? []).map((c) => c.id))),
  ];
  if (categoryIds.length === 0) return holders;
  const rows = (await query(
    `SELECT category_id, translated_name FROM device_category_translations WHERE category_id = ANY($1) AND locale = $2`,
    [categoryIds, locale],
  )) as { category_id: string; translated_name: string }[];
  const map = new Map(
    rows.map((r) => [Number(r.category_id), r.translated_name]),
  );
  // Stamped before translating, so the identifier survives `name` becoming
  // a label.
  stampCanonical();
  for (const holder of holders) {
    for (const cat of holder.categories ?? []) {
      const translated = map.get(cat.id);
      if (translated) cat.name = translated;
    }
  }
  return holders;
}
