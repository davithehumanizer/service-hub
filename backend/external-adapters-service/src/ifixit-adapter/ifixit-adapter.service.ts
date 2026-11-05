/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

@Injectable()
export class IfixitAdapterService {
  private readonly logger = new Logger(IfixitAdapterService.name);

  constructor(private readonly httpService: HttpService) {}

  async getAllDevices(page: number, limit: number): Promise<any> {
    try {
      const url = `${process.env.IFIXIT_API_URL}/wikis/CATEGORY?limit=${limit}&page=${page}`;
      const response = await firstValueFrom(this.httpService.get<any>(url));
      return response.data;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  async getDeviceById(id: string, lang?: string): Promise<any> {
    try {
      const url = `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/${id}${lang ? `?langid=${lang}` : ""}`;
      const response = await firstValueFrom(this.httpService.get<any>(url));
      return response.data;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  async getDeviceParts(id: string): Promise<any> {
    try {
      const url = `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/${id}/parts`;
      const response = await firstValueFrom(this.httpService.get<any>(url));
      return response.data;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  async getDeviceGuide(id: string, guideid: string): Promise<any> {
    try {
      const url = `${process.env.IFIXIT_API_URL}/guides/${guideid}`;
      const response = await firstValueFrom(this.httpService.get<any>(url));
      return response.data;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  /**
   * Performs a single iFixit `/search/{query}?filter=guide` call and applies
   * the mandatory `dataType === "guide"` filter plus the optional
   * type/subject/difficulty filters. `query` is always URL-encoded to
   * support device names with spaces or special characters
   * (e.g. "iPhone 14 Pro Max").
   */
  private async fetchGuides(
    query: string,
    type: string,
    subject: string,
    difficulty: string,
    lang?: string,
  ): Promise<any> {
    const url = `${process.env.IFIXIT_API_URL}/search/${encodeURIComponent(query)}?filter=guide${lang ? `&langid=${lang}` : ""}`;
    const response = await firstValueFrom(this.httpService.get<any>(url));

    if (response.data && Array.isArray(response.data.results)) {
      let filteredGuides = response.data.results.filter(
        (item) => item.dataType === "guide",
      );

      if (type) {
        filteredGuides = filteredGuides.filter((guide) => guide.type === type);
      }
      if (subject) {
        filteredGuides = filteredGuides.filter(
          (guide) => guide.subject === subject,
        );
      }
      if (difficulty) {
        filteredGuides = filteredGuides.filter(
          (guide) => guide.difficulty === difficulty,
        );
      }

      return {
        ...response.data,
        results: filteredGuides,
      };
    }
    return response.data;
  }

  private dedupe(candidates: string[]): string[] {
    return candidates.filter(
      (candidate, index) => candidates.indexOf(candidate) === index,
    );
  }

  /**
   * Candidates that can identify the citizen's own device: `brand + model`,
   * then `model` alone.
   *
   * The category is deliberately absent. iFixit resolves "Washing Machine" to
   * a wiki of that name, so including it made every appliance report its
   * category page as the resolved device, with `matchQuality: 'exact'`.
   */
  private buildDeviceCandidates(query: string, brand?: string): string[] {
    const trimmedQuery = query?.trim();
    const trimmedBrand = brand?.trim();

    const candidates: string[] = [];
    // "Bosch KGN76CXE0N" already carries its brand: "Bosch Bosch …" is no
    // name iFixit knows.
    const lowerQuery = trimmedQuery?.toLowerCase() ?? "";
    const lowerBrand = trimmedBrand?.toLowerCase() ?? "";
    const carriesBrand =
      lowerQuery === lowerBrand || lowerQuery.startsWith(`${lowerBrand} `);
    if (trimmedBrand && trimmedQuery && !carriesBrand) {
      candidates.push(`${trimmedBrand} ${trimmedQuery}`);
    }
    if (trimmedQuery) {
      candidates.push(trimmedQuery);
    }

    return this.dedupe(candidates);
  }

  /**
   * Free-text fallback queries, from most to least specific: `brand + model`,
   * `model`, `brand + category`, then `category`.
   *
   * `brand + category` keeps the brand in play one step longer: dropping
   * straight to the category answers a Bosch washing machine with Whirlpool
   * guides, where "Bosch washing machine" finds Bosch ones.
   */
  private buildSearchCandidates(
    query: string,
    brand?: string,
    category?: string,
  ): string[] {
    const trimmedBrand = brand?.trim();
    const trimmedCategory = category?.trim();

    const candidates = this.buildDeviceCandidates(query, brand);
    if (trimmedBrand && trimmedCategory) {
      candidates.push(`${trimmedBrand} ${trimmedCategory}`);
    }
    if (trimmedCategory) {
      candidates.push(trimmedCategory);
    }

    return this.dedupe(candidates);
  }

  /**
   * Resolves a free-text device name to an actual iFixit device wiki.
   *
   * `/suggest` matches against the device index and tolerates the variance
   * that `/search` does not: "IdeaPad Flex 3 Chrome 15IJL7" resolves to
   * "Lenovo IdeaPad Flex 3 Chromebook 15IJL7", where a guide search returns
   * nothing at all.
   *
   * A suggestion named exactly like the candidate wins over the first one:
   * "Fairphone" suggests the Fairphone 6 first, whose two guides were then
   * shown as the exact match to any Fairphone.
   *
   * @returns The resolved device, or null when nothing matches.
   */
  private async resolveDevice(candidates: string[]): Promise<{
    title: string;
    display_title?: string;
    wikiid?: number;
    url?: string;
  } | null> {
    for (const candidate of candidates) {
      try {
        const suggestion = await this.suggestDevice(candidate);
        const results: unknown = suggestion?.results;
        if (Array.isArray(results) && results.length > 0) {
          const wanted = candidate.trim().toLowerCase();
          const sameName = (results as Record<string, unknown>[]).find((r) =>
            [r?.title, r?.display_title].some(
              (name) =>
                typeof name === "string" && name.trim().toLowerCase() === wanted,
            ),
          );
          const chosen = (sameName ?? results[0]) as Record<string, unknown>;
          const title = chosen?.title ?? chosen?.display_title;
          if (typeof title === "string" && title.trim()) {
            return {
              title,
              display_title:
                typeof chosen.display_title === "string"
                  ? chosen.display_title
                  : undefined,
              wikiid:
                typeof chosen.wikiid === "number" ? chosen.wikiid : undefined,
              url: typeof chosen.url === "string" ? chosen.url : undefined,
            };
          }
        }
      } catch (error) {
        this.logger.error(error);
      }
    }
    return null;
  }

  /**
   * Reads the guides attached to a resolved device wiki.
   *
   * The device endpoint is keyed by the *title slug* — `/wikis/CATEGORY/
   * Lenovo_ThinkPad_Z16_Gen_1` — not by the numeric wikiid, which returns
   * nothing.
   */
  private async fetchGuidesForDevice(
    deviceTitle: string,
    type: string,
    subject: string,
    difficulty: string,
    lang?: string,
  ): Promise<any[]> {
    // Titles carry characters that must not land raw in a path segment —
    // "Lenovo ThinkPad X1 Yoga (7th Gen)", and slashes in some categories.
    const slug = encodeURIComponent(deviceTitle.trim().replace(/\s+/g, "_"));
    const device = await this.getDeviceById(slug, lang);
    const guides: unknown = device?.guides;
    if (!Array.isArray(guides)) {
      return [];
    }

    let filtered = guides as any[];
    if (type) {
      filtered = filtered.filter((guide) => guide.type === type);
    }
    if (subject) {
      filtered = filtered.filter((guide) => guide.subject === subject);
    }
    if (difficulty) {
      filtered = filtered.filter((guide) => guide.difficulty === difficulty);
    }
    // Align with the shape `/search` returns, so both sources render the same.
    return filtered.map((guide) => ({ ...guide, dataType: "guide" }));
  }

  /**
   * Finds repair guides for a device.
   *
   * Resolution first, free-text second. `/search` alone is unreliable in both
   * directions: it misses devices that exist (SKU variance — "Chrome" vs
   * "Chromebook", "14IAH7" vs "14ARH7") and it returns guides belonging to
   * *neighbouring* devices, which used to be displayed as if they were the
   * right ones. Measured on 30 production devices, it answered for 9 — and
   * some of those were guides for a different model.
   *
   * So: resolve the device against iFixit's device index, read the guides
   * actually attached to it, and only then fall back to free text — labelled
   * as related rather than exact.
   *
   * The response keeps `results` as the field the frontend already renders, so
   * this is a drop-in change; `matchQuality`, `resolvedDevice`, `exactGuides`
   * and `relatedGuides` are additive and let the UI stop conflating the two.
   *
   * `lang` asks iFixit for its own translations of titles, subjects and links.
   * A wiki lists every guide, translated or not; a text search only the
   * translated ones, so it falls back to English when it finds none.
   */
  async searchDevice(
    query: string,
    type: string,
    subject: string,
    difficulty: string,
    brand?: string,
    category?: string,
    categoryWikiId?: string,
    lang?: string,
  ): Promise<any> {
    const candidates = this.buildSearchCandidates(query, brand, category);

    // ── 1. Resolve the device, then read its own guides ──────────────────
    // Only the device-identifying candidates: a category must never become
    // the resolved device.
    const resolvedDevice = await this.resolveDevice(
      this.buildDeviceCandidates(query, brand),
    );
    let exactGuides: any[] = [];
    if (resolvedDevice) {
      try {
        exactGuides = await this.fetchGuidesForDevice(
          resolvedDevice.title,
          type,
          subject,
          difficulty,
          lang,
        );
      } catch (error) {
        this.logger.error(error);
      }
    }

    if (exactGuides.length > 0) {
      return {
        results: exactGuides,
        exactGuides,
        relatedGuides: [],
        resolvedDevice,
        matchQuality: "exact",
      };
    }

    // ── 2. The category's own iFixit wiki, when one has been mapped ───────
    // A decided mapping beats a guess: our category names are UNU labels
    // ("Washing machine / Combi dryer") that iFixit does not answer to, and
    // searching them as text is what returned soldering-iron guides for a
    // clothes iron. Read before free text, never as `exact` — these are the
    // category's guides, not this device's.
    if (categoryWikiId) {
      try {
        const categoryGuides = await this.fetchGuidesForDevice(
          categoryWikiId,
          type,
          subject,
          difficulty,
          lang,
        );
        if (categoryGuides.length > 0) {
          return {
            results: categoryGuides,
            exactGuides: [],
            relatedGuides: categoryGuides,
            resolvedDevice,
            matchQuality: "related",
          };
        }
      } catch (error) {
        this.logger.error(error);
      }
    }

    // ── 3. Fall back to free-text search, including the resolved title ────
    const fallbackQueries = [...candidates];
    if (resolvedDevice && !fallbackQueries.includes(resolvedDevice.title)) {
      fallbackQueries.push(resolvedDevice.title);
    }

    let firstSuccessResult: any = null;
    let anySucceeded = false;
    for (const candidate of fallbackQueries) {
      try {
        let result = await this.fetchGuides(
          candidate,
          type,
          subject,
          difficulty,
          lang,
        );
        if (lang && lang !== "en" && !(result?.results?.length > 0)) {
          result = await this.fetchGuides(candidate, type, subject, difficulty);
        }
        anySucceeded = true;
        if (firstSuccessResult === null) {
          firstSuccessResult = result;
        }
        if (result?.results?.length > 0) {
          return {
            ...result,
            exactGuides: [],
            relatedGuides: result.results,
            resolvedDevice,
            matchQuality: "related",
          };
        }
      } catch (error) {
        this.logger.error(error);
      }
    }

    // Every call failed: that is an outage, not an empty result. Keep
    // returning null so the caller does not render "no tutorial exists" when
    // iFixit is simply unreachable.
    if (!anySucceeded && !resolvedDevice) {
      return null;
    }

    // ── 4. Nothing found. Say which kind of nothing it is. ───────────────
    return {
      ...(firstSuccessResult ?? {}),
      results: [],
      exactGuides: [],
      relatedGuides: [],
      resolvedDevice,
      // `device-without-guides` means iFixit knows the device but nobody has
      // written a guide for it — a different answer from "unknown device", and
      // the signal the UI needs to offer another source instead of a blank page.
      matchQuality: resolvedDevice ? "device-without-guides" : "none",
    };
  }

  /**
   * Official iFixit autocomplete/suggestion endpoint. Restricted to
   * `device`/`category` doctypes (iFixit aliases both to `topic`) so
   * suggestions are device wikis rather than guides or questions.
   */
  async suggestDevice(query: string): Promise<any> {
    try {
      if (!query || !query.trim()) {
        return { results: [] };
      }
      const url = `${process.env.IFIXIT_API_URL}/suggest/${encodeURIComponent(query)}?doctypes=device,category`;
      const response = await firstValueFrom(this.httpService.get<any>(url));
      return response.data;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }
}
