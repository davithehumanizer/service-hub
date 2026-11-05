/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

export interface YoutubeVideoResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
}

interface YoutubeApiSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string } };
  };
}

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";
const MAX_RESULTS = 6;

/**
 * A `search.list` call costs 100 units against a default daily quota of
 * 10,000 — i.e. **100 searches per day for the whole platform**. Without a
 * cache the feature dies every morning, so results are held for a week
 * (repair videos for a given device do not change meaningfully faster) and a
 * daily budget stops us burning the quota on a traffic spike.
 */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DAILY_CALL_BUDGET = Number(process.env.YOUTUBE_DAILY_BUDGET ?? 80);

interface CacheEntry {
  expiresAt: number;
  results: YoutubeVideoResult[];
}

@Injectable()
export class YoutubeAdapterService {
  private readonly logger = new Logger(YoutubeAdapterService.name);

  /**
   * In-memory, so it is lost on restart and not shared between replicas. That
   * is acceptable while a single instance runs; move it to a shared store if
   * the service is ever scaled out.
   */
  private readonly cache = new Map<string, CacheEntry>();
  private callsToday = 0;
  private budgetResetAt = 0;

  constructor(private readonly httpService: HttpService) {}

  private cacheKey(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, " ");
  }

  /** Rolls the daily counter over at most once per 24h window. */
  private budgetRemaining(): number {
    const now = Date.now();
    if (now >= this.budgetResetAt) {
      this.callsToday = 0;
      this.budgetResetAt = now + 24 * 60 * 60 * 1000;
    }
    return DAILY_CALL_BUDGET - this.callsToday;
  }

  /**
   * Searches YouTube for repair tutorial videos matching `query`. Used as a
   * fallback alternative source when iFixit has no guides for a device.
   * The API key is only ever used server-side and never forwarded to the
   * frontend.
   */
  async searchRepairVideos(query: string): Promise<{
    results: YoutubeVideoResult[];
  } | null> {
    if (!process.env.YOUTUBE_API_KEY) {
      this.logger.warn(
        "YOUTUBE_API_KEY is not configured, skipping YouTube search.",
      );
      return { results: [] };
    }
    if (!query || !query.trim()) {
      return { results: [] };
    }

    const key = this.cacheKey(query);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { results: cached.results };
    }

    if (this.budgetRemaining() <= 0) {
      this.logger.warn(
        `YouTube daily budget of ${DAILY_CALL_BUDGET} searches exhausted; serving no videos until it resets.`,
      );
      // Stale beats empty: an expired entry is still relevant for a device.
      return { results: cached?.results ?? [] };
    }

    try {
      const searchTerm = `${query.trim()} repair tutorial`;
      const url =
        `${YOUTUBE_API_URL}?part=snippet&type=video` +
        `&maxResults=${MAX_RESULTS}` +
        `&q=${encodeURIComponent(searchTerm)}` +
        `&key=${process.env.YOUTUBE_API_KEY}`;

      this.callsToday += 1;
      const response = await firstValueFrom(this.httpService.get<any>(url));
      const rawItems: unknown = response.data?.items;
      const items: YoutubeApiSearchItem[] = Array.isArray(rawItems)
        ? (rawItems as YoutubeApiSearchItem[])
        : [];

      const results: YoutubeVideoResult[] = items
        .filter((item) => Boolean(item?.id?.videoId))
        .map(
          (item): YoutubeVideoResult => ({
            videoId: item.id.videoId,
            title: item.snippet?.title ?? "",
            description: item.snippet?.description ?? "",
            channelTitle: item.snippet?.channelTitle ?? "",
            publishedAt: item.snippet?.publishedAt ?? "",
            thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          }),
        );

      this.cache.set(key, {
        results,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return { results };
    } catch (error) {
      this.logger.error(error);
      // Quota errors and outages look the same from here; fall back to a stale
      // entry rather than showing nothing.
      if (cached) {
        return { results: cached.results };
      }
      return null;
    }
  }
}
