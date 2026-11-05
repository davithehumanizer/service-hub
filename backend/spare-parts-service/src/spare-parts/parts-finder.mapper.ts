/**
 * Turns a PartsFinder API document into the shape the rest of Service Hub
 * already speaks — the one the Meilisearch index produces.
 *
 * Two sources, one contract. The frontend reads `objectID`, a single
 * `repairer.address` and a `_geo` pair; the API answers JSON-LD with `id`, an
 * `addresses` array and no geo. Without this, a part opened from a list and the
 * same part opened by URL would render differently, and the catalogue link —
 * built from `objectID` — would break on one of the two paths.
 *
 * A pure function on purpose: no HTTP, no Nest, testable on its own.
 */

/** What the API returns for one spare part. Loose by design: it is someone else's contract. */
export interface PartsFinderSparePart {
  id?: string;
  model?: any;
  status?: { slug?: string; name?: string } | null;
  serialNumber?: string | null;
  internalNumber?: string | null;
  estimatedDate?: string | null;
  description?: string | null;
  device?: string | null;
  mediaObjects?: string[];
  prices?: Array<Record<string, any>>;
  repairer?: {
    id?: string;
    name?: string;
    slug?: string;
    addresses?: Array<Record<string, any>>;
    deliveryMethods?: any[];
  } | null;
  [key: string]: any;
}

/**
 * The API exposes a status slug but not its translated label — that lives in the
 * Type translations, which only the search normalizer resolves. Deriving a
 * readable label keeps the badge legible; exposing the real translation in the
 * API would be the proper fix.
 */
const labelFromSlug = (slug?: string): string | undefined => {
  if (!slug) {
    return undefined;
  }

  return slug
    // Any status slug, not just a part's: brand-status-active reaches here too.
    .replace(/^.*-status-/, '')
    .replace(/-/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
};

/**
 * `Type` carries no name in the API — only a slug and its translations — so a
 * brand status arrives label-less and the badge renders empty. The search index
 * resolves the translation; here the slug is all there is.
 */
const withBrandStatusLabel = (model?: Record<string, any> | null) => {
  const status = model?.brand?.status;
  if (!model || !status || status.name) {
    return model ?? null;
  }

  return {
    ...model,
    brand: {
      ...model.brand,
      status: { ...status, name: labelFromSlug(status.slug) },
    },
  };
};

const geoFrom = (address?: Record<string, any>) => {
  const lat = address?.latitude;
  const lng = address?.longitude;

  return lat && lng ? { lat: String(lat), lng: String(lng) } : undefined;
};

export const mapPartsFinderSparePart = (
  payload: PartsFinderSparePart,
): Record<string, any> => {
  const repairer = payload.repairer ?? undefined;
  // The index carries one address; the API carries the collection it came from.
  const address = repairer?.addresses?.[0];
  const geo = geoFrom(address);

  const mapped: Record<string, any> = {
    // The frontend keys everything off objectID, including the link back to the
    // catalogue. The API calls it id.
    objectID: payload.id,
    id: payload.id,
    model: withBrandStatusLabel(payload.model),
    serialNumber: payload.serialNumber ?? null,
    internalNumber: payload.internalNumber ?? null,
    estimatedDate: payload.estimatedDate ?? null,
    description: payload.description ?? null,
    device: payload.device ?? null,
    mediaObjects: payload.mediaObjects ?? [],
    status: payload.status
      ? {
          slug: payload.status.slug,
          name: payload.status.name ?? labelFromSlug(payload.status.slug),
        }
      : null,
    prices: (payload.prices ?? []).map((price) => ({
      ...price,
      // The index nests this as an object; the API sends the enum value.
      productPricingTarget:
        typeof price.productPricingTarget === 'string'
          ? { slug: price.productPricingTarget, name: price.productPricingTarget }
          : (price.productPricingTarget ?? null),
    })),
    repairer: repairer
      ? {
          id: repairer.id,
          name: repairer.name,
          slug: repairer.slug,
          address: address ?? null,
          deliveryMethods: repairer.deliveryMethods ?? [],
        }
      : null,
  };

  if (geo) {
    mapped._geo = geo;
  }

  return mapped;
};
