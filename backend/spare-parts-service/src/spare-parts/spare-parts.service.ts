import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RpcException } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { PartsFinderApiService } from "./parts-finder-api.service";

const SPAREPART_INDEX = "app_prod_data_subdomain_sparepart";
const DEVICE_INDEX = "app_prod_data_subdomain_device";
const REPAIRER_INDEX = "app_prod_data_subdomain_repairer";

/** Case and punctuation differ between the two catalogues; the appliance does not. */
const squash = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/**
 * Meilisearch ranks by relevance and never refuses: a known brand always brings
 * back that brand's other appliances. The hit has to be checked, not trusted.
 *
 * Model comparison is loose in both directions — the two catalogues name the
 * same machine at different lengths ("Galaxy S23" / "Galaxy S23 5G").
 */
const matchesDevice = (hit: any, brand: string, model: string): boolean => {
  if (!hit?.objectID) {
    return false;
  }

  const hitBrand = squash(hit?.model?.brand?.name);
  const hitModel = squash(hit?.model?.name);
  const wantBrand = squash(brand);
  const wantModel = squash(model);

  if (!hitBrand || !hitModel || !wantBrand || !wantModel) {
    return false;
  }

  return (
    hitBrand === wantBrand &&
    (hitModel === wantModel ||
      hitModel.includes(wantModel) ||
      wantModel.includes(hitModel))
  );
};

@Injectable()
export class SparePartsAdapterService {
  private readonly logger = new Logger(SparePartsAdapterService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly partsFinderApi: PartsFinderApiService,
  ) {
    this.baseUrl = this.configService.get<string>(
      "MEILISEARCH_URL",
      "https://search.spc-e6.cris-tech.io",
    );
    this.token = this.configService.get<string>("MEILISEARCH_SEARCH_TOKEN", "");
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async search(data: {
    q?: string;
    brand?: string;
    category?: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const { q = "", brand, category, offset = 0, limit = 20 } = data;

      // Append brand/category to the query string — Meilisearch full-text search
      // handles them without requiring filterable attributes to be pre-configured.
      const terms = [q, brand, category].filter(Boolean).join(" ");

      const body: Record<string, any> = {
        q: terms,
        offset,
        limit,
      };

      const url = `${this.baseUrl}/indexes/${SPAREPART_INDEX}/search`;
      const response = await firstValueFrom(
        this.httpService.post<any>(url, body, { headers: this.headers() }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Meilisearch search error: ${error?.message}`);
      return { hits: [], estimatedTotalHits: 0, offset: 0, limit: 20 };
    }
  }
  /**
   * One part, read from the PartsFinder API rather than the search index.
   *
   * The index is a search projection: its shape is decided by a normalizer on
   * the other side and changes without notice, it holds only what someone
   * thought worth searching, and it drops anything the normalizer rejects. For a
   * detail view that is the wrong contract. The API is versioned, scoped, and
   * carries the fields a detail page actually needs — prices, the device the
   * part belongs to, image links.
   *
   * Falls back to the index when the API is unreachable or unconfigured, so a
   * misconfigured client degrades to the previous behaviour instead of an empty
   * page.
   */
  async getById(data: { id: string }): Promise<any> {
    const fromApi = await this.partsFinderApi.getSparePart(data.id);
    if (fromApi) {
      return fromApi;
    }

    try {
      // Fallback: search the index for the id and take the matching hit. This
      // is a search for a known identifier, which is why it is a fallback and
      // not the main path — Meilisearch tokenises the UUID and can return
      // near-misses, so the exact objectID match below is doing real work.
      const url = `${this.baseUrl}/indexes/${SPAREPART_INDEX}/search`;
      const body = { q: data.id, limit: 5 };
      const response = await firstValueFrom(
        this.httpService.post<any>(url, body, { headers: this.headers() }),
      );
      const hits: any[] = response.data?.hits ?? [];

      return hits.find((h) => h.objectID === data.id) ?? null;
    } catch (error: any) {
      this.logger.error(`Meilisearch getById error: ${error?.message}`);
      // An index out of reach says nothing about the part: null would be
      // answered "not found".
      throw new RpcException({
        message: "Spare parts catalogue unreachable",
        status: 503,
      });
    }
  }
  async list(data: { offset?: number; limit?: number }): Promise<any> {
    return this.search({ q: "", offset: data.offset, limit: data.limit });
  }

  async searchByDevice(data: {
    brand: string;
    model: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    const { brand, model, offset = 0, limit = 20 } = data;
    try {
      // Ten candidates, not one: the top hit is often the wrong appliance of the
      // right brand. See matchesDevice.
      const deviceUrl = `${this.baseUrl}/indexes/${DEVICE_INDEX}/search`;
      const deviceResponse = await firstValueFrom(
        this.httpService.post<any>(
          deviceUrl,
          { q: `${brand} ${model}`, limit: 10 },
          { headers: this.headers() },
        ),
      );
      const deviceHit = (deviceResponse.data?.hits ?? []).find((hit: any) =>
        matchesDevice(hit, brand, model),
      );

      if (!deviceHit) {
        // No brand-only fallback here on purpose: it is what put a television
        // board on a phone page.
        this.logger.warn(
          `searchByDevice: no device matching "${brand} ${model}", returning nothing`,
        );
        return { hits: [], estimatedTotalHits: 0, offset, limit };
      }

      // Step 2: filter spare parts on the device they belong to.
      //
      // This used to pass the device UUID as the query text. No spare part
      // document contained it, so Meilisearch split the UUID on its hyphens,
      // matched the fragments against everything, and returned the entire
      // catalogue for every device — a wrong answer that looks like a right
      // one. A filter either matches or returns nothing.
      //
      // device.id must be in the index's filterable attributes; Meilisearch
      // rejects the request outright otherwise, which the catch below turns
      // into an empty list.
      const spareUrl = `${this.baseUrl}/indexes/${SPAREPART_INDEX}/search`;
      const response = await firstValueFrom(
        this.httpService.post<any>(
          spareUrl,
          {
            q: '',
            filter: `device.id = "${deviceHit.objectID}"`,
            offset,
            limit,
          },
          { headers: this.headers() },
        ),
      );

      return response.data;
    } catch (error: any) {
      // Meilisearch explains a rejected filter in the response body; the axios
      // message alone is just the status code, which is what made the previous
      // failure so hard to see.
      this.logger.error(
        `Meilisearch searchByDevice error: ${error?.message}` +
          (error?.response?.data
            ? ` — ${JSON.stringify(error.response.data)}`
            : ''),
      );
      return { hits: [], estimatedTotalHits: 0, offset, limit };
    }
  }

  async multiSearch(data: { q: string }): Promise<any> {
    try {
      const { q } = data;
      const url = `${this.baseUrl}/multi-search`;
      const body = {
        queries: [
          { indexUid: SPAREPART_INDEX, q, limit: 5 },
          { indexUid: DEVICE_INDEX, q, limit: 5 },
          { indexUid: REPAIRER_INDEX, q, limit: 5 },
        ],
      };
      const response = await firstValueFrom(
        this.httpService.post<any>(url, body, { headers: this.headers() }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Meilisearch multi-search error: ${error?.message}`);
      return { results: [] };
    }
  }
}
