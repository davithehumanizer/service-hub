interface IcecatGeneralInfo {
  Title?: unknown;
  ProductFamily?: { Value?: unknown };
  ProductSeries?: { Value?: unknown };
}

/**
 * The family, series and full title of an Icecat product, as informational
 * properties. ProductName alone can lose them ("15" for a ThinkBook 15, a bare
 * number for a Dell Latitude or Inspiron), and the model cannot then be told
 * apart from another of the same name.
 */
export function icecatNamingProperties(
  g: IcecatGeneralInfo,
): { property_name: string; property_value: string }[] {
  return (
    [
      ['ProductFamily', g.ProductFamily?.Value],
      ['ProductSeries', g.ProductSeries?.Value],
      ['Title', g.Title],
    ] as [string, unknown][]
  )
    .filter(
      (pair): pair is [string, string] =>
        typeof pair[1] === 'string' && pair[1].trim().length > 0,
    )
    .map(([property_name, property_value]) => ({
      property_name,
      property_value,
    }));
}
