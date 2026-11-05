import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { gtinVariants } from './gtin';

export const MODELS_INDEX = 'device_models';

/** A device model as the search finds it: one document per model. */
export interface ModelDocument {
  model_id: number;
  brand: string;
  name: string;
  title: string;
  /** Canonical names: searched as text, faceted and filtered on keyword. */
  categories: string[];
  variant_count: number;
  /** False when only resellers list it: ranked after manufacturers' models. */
  has_manufacturer_variant: boolean;
  /** The representative variant's picture, or ''. */
  thumbnail: string;
  /** When it was last written: a full sync removes what it did not see. */
  synced_at: string;
}

/**
 * Explicit, unlike `devices`: a field mapped from the first value it meets
 * cannot be changed afterwards. Changing one means deleting the index and
 * running search:sync-models.
 */
export const MODELS_MAPPING = {
  dynamic: 'strict' as const,
  properties: {
    model_id: { type: 'integer' as const },
    // Sorted on lowercase, as one reads: "iPhone" between "Iconia" and "IQ".
    brand: {
      type: 'text' as const,
      fields: {
        keyword: { type: 'keyword' as const, normalizer: 'lowercase' },
      },
    },
    name: {
      type: 'text' as const,
      fields: {
        keyword: { type: 'keyword' as const, normalizer: 'lowercase' },
      },
    },
    title: { type: 'text' as const },
    categories: {
      type: 'text' as const,
      fields: { keyword: { type: 'keyword' as const } },
    },
    variant_count: { type: 'integer' as const },
    has_manufacturer_variant: { type: 'boolean' as const },
    thumbnail: { type: 'keyword' as const, index: false },
    synced_at: { type: 'date' as const },
  },
};

export type ModelSort =
  | 'relevance'
  | 'brandAZ'
  | 'brandZA'
  | 'modelAZ'
  | 'modelZA';

export interface ModelSearchOptions {
  page: number;
  limit: number;
  search?: string;
  /** brand + name as a phrase, for a name read from a photo. */
  strict?: boolean;
  /** Canonical names. */
  categories?: string[];
  sortBy?: ModelSort;
}

export interface ModelSearchResult {
  ids: number[];
  total: number;
  /** Per canonical category, before the category filter. */
  categoryFacets: Record<string, number>;
}

const TEXT_FIELDS = ['title^3', 'brand^2', 'name^2', 'categories'];

// ES pages through the first 10,000 hits only (index.max_result_window).
const MAX_RESULT_WINDOW = 10_000;

// Keyword sorts end on the id, so that a page never repeats a model.
const SORTS: Record<ModelSort, object[]> = {
  // Equal scores, and a search with no text, go to the most listed models.
  relevance: [
    { _score: 'desc' },
    { variant_count: 'desc' },
    { model_id: 'asc' },
  ],
  brandAZ: [
    { 'brand.keyword': 'asc' },
    { 'name.keyword': 'asc' },
    { model_id: 'asc' },
  ],
  brandZA: [
    { 'brand.keyword': 'desc' },
    { 'name.keyword': 'desc' },
    { model_id: 'asc' },
  ],
  modelAZ: [
    { 'name.keyword': 'asc' },
    { 'brand.keyword': 'asc' },
    { model_id: 'asc' },
  ],
  modelZA: [
    { 'name.keyword': 'desc' },
    { 'brand.keyword': 'desc' },
    { model_id: 'asc' },
  ],
};

/**
 * The query for a model search: every word must match, with typos allowed
 * in words without digits only, since "s22" is not a typo for "s23" but
 * another model; a barcode must match one of its GTIN forms exactly. A "+"
 * or a "-" is no word: nothing is indexed for it, it would match nothing.
 * Models a manufacturer lists score a little higher than resellers' own.
 */
export function modelQuery(search?: string, strict = false): object {
  const must: object[] = [];
  const text = search?.trim();
  const words = (text ?? '')
    .split(/[\s,]+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  if (text && strict) {
    must.push({ match_phrase: { title: text } });
  } else if (words.length > 0) {
    for (const word of words) {
      const variants = gtinVariants(word);
      must.push(
        variants.length > 1
          ? {
              bool: {
                should: variants.map((v) => ({
                  multi_match: { query: v, fields: TEXT_FIELDS },
                })),
                minimum_should_match: 1,
              },
            }
          : {
              multi_match: {
                query: word,
                fields: TEXT_FIELDS,
                fuzziness: /\d/.test(word) ? 0 : 'AUTO',
              },
            },
      );
    }
  } else {
    must.push({ match_all: {} });
  }
  return {
    bool: {
      must,
      // A constant: scored as a term, a value nearly every model has would
      // weigh next to nothing.
      should: [
        {
          constant_score: {
            filter: { term: { has_manufacturer_variant: true } },
            boost: 2,
          },
        },
      ],
    },
  };
}

/** The device_models index: written and searched here. */
@Injectable()
export class ModelSearchService {
  private readonly logger = new Logger(ModelSearchService.name);
  private ready?: Promise<void>;

  constructor(private readonly elasticsearch: ElasticsearchService) {}

  /**
   * Creates the index with its mapping when it is missing: writing to a
   * missing index would create it with a mapping guessed from the document.
   * A failed attempt is not kept, the next call tries again.
   */
  ensureIndex(): Promise<void> {
    this.ready ??= this.createIndex().catch((e) => {
      this.ready = undefined;
      throw e;
    });
    return this.ready;
  }

  private async createIndex(): Promise<void> {
    if (await this.elasticsearch.indices.exists({ index: MODELS_INDEX })) {
      return;
    }
    try {
      await this.elasticsearch.indices.create({
        index: MODELS_INDEX,
        mappings: MODELS_MAPPING,
      });
    } catch (e) {
      // Another process created it in between.
      if (errorType(e) !== 'resource_already_exists_exception') throw e;
    }
  }

  /** Writes the documents; returns how many ES refused. */
  async indexModels(docs: ModelDocument[]): Promise<number> {
    if (docs.length === 0) return 0;
    await this.ensureIndex();
    const result = await this.elasticsearch.bulk({
      operations: docs.flatMap((doc) => [
        { index: { _index: MODELS_INDEX, _id: String(doc.model_id) } },
        doc,
      ]),
    });
    const refused = result.items.filter((item) => item.index?.error);
    refused
      .slice(0, 5)
      .forEach((item) =>
        this.logger.error(
          `Failed to index model ${item.index?._id}: ${item.index?.error?.reason}`,
        ),
      );
    return refused.length;
  }

  async removeModels(modelIds: number[]): Promise<void> {
    if (modelIds.length === 0) return;
    await this.ensureIndex();
    // A model never indexed answers not_found, which is what was wanted.
    await this.elasticsearch.bulk({
      operations: modelIds.map((id) => ({
        delete: { _index: MODELS_INDEX, _id: String(id) },
      })),
    });
  }

  /** The ids of a page of models, the total and the category facets. */
  async searchModels(o: ModelSearchOptions): Promise<ModelSearchResult> {
    const categories = o.categories ?? [];
    // Beyond what ES pages through, the total and the facets without a page,
    // rather than an error the database would answer slowly.
    const from = (o.page - 1) * o.limit;
    const reachable = from + o.limit <= MAX_RESULT_WINDOW;
    const result = await this.elasticsearch.search(
      {
        index: MODELS_INDEX,
        from: reachable ? from : 0,
        size: reachable ? o.limit : 0,
        query: modelQuery(o.search, o.strict),
        sort: SORTS[o.sortBy ?? 'relevance'] as never,
        track_total_hits: true,
        _source: ['model_id'],
        // A filter after the facets, so that they still count every category.
        ...(categories.length > 0
          ? { post_filter: { terms: { 'categories.keyword': categories } } }
          : {}),
        aggs: {
          by_category: { terms: { field: 'categories.keyword', size: 200 } },
        },
      },
      // A slow index is answered from the database, as an unreachable one.
      { requestTimeout: 5000, maxRetries: 0 },
    );
    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total?.value ?? 0);
    const buckets: { key: string; doc_count: number }[] =
      (result.aggregations?.by_category as { buckets?: [] })?.buckets ?? [];
    return {
      ids: result.hits.hits.map((h) => (h._source as ModelDocument).model_id),
      total,
      categoryFacets: Object.fromEntries(
        buckets.map((b) => [b.key, b.doc_count]),
      ),
    };
  }

  /** Removes the documents written before `since`: models deleted since. */
  async removeUnseen(since: Date): Promise<number> {
    const result = await this.elasticsearch.deleteByQuery({
      index: MODELS_INDEX,
      query: { range: { synced_at: { lt: since.toISOString() } } },
      refresh: true,
      conflicts: 'proceed',
    });
    return result.deleted ?? 0;
  }
}

const errorType = (e: unknown): string | undefined =>
  (e as { meta?: { body?: { error?: { type?: string } } } }).meta?.body?.error
    ?.type;
