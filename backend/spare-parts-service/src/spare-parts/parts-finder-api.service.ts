import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import {
  mapPartsFinderSparePart,
  PartsFinderSparePart,
} from "./parts-finder.mapper";

/**
 * Reads one spare part from the PartsFinder API.
 *
 * Search stays on Meilisearch — ranking, typo tolerance and facets are what it
 * is for. Fetching a known id is a different job: this returns the authoritative
 * representation, behind an OAuth2 scope and a documented contract, rather than
 * whatever shape the search index happens to hold today.
 *
 * The index route could not do this honestly anyway. getById used to run a
 * full-text search for the UUID and take the first hit, because the search token
 * has no other permission — the same pattern that made searchByDevice return the
 * whole catalogue.
 */
@Injectable()
export class PartsFinderApiService {
  private readonly logger = new Logger(PartsFinderApiService.name);
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  /** Cached until shortly before it expires; see token(). */
  private accessToken: string | null = null;
  private expiresAt = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      "PARTSFINDER_API_URL",
      "https://api.spareparts.care2repair.eu",
    );
    this.tokenUrl = `${this.baseUrl}/oauth2/token`;
    this.clientId = this.configService.get<string>("PARTSFINDER_CLIENT_ID", "");
    this.clientSecret = this.configService.get<string>(
      "PARTSFINDER_CLIENT_SECRET",
      "",
    );
  }

  get configured(): boolean {
    return this.clientId !== "" && this.clientSecret !== "";
  }

  private async token(): Promise<string> {
    // 60s of slack: a token that expires between this check and the request it
    // authorises would surface as a spurious 401.
    if (this.accessToken && Date.now() < this.expiresAt - 60_000) {
      return this.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "spare_part_read device_read brand_read",
    });

    const response = await firstValueFrom(
      this.httpService.post<{ access_token: string; expires_in?: number }>(
        this.tokenUrl,
        body.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      ),
    );

    this.accessToken = response.data.access_token;
    this.expiresAt = Date.now() + (response.data.expires_in ?? 3600) * 1000;

    return this.accessToken;
  }

  /** Returns null when the part does not exist, or when the API cannot answer. */
  async getSparePart(id: string): Promise<any | null> {
    if (!this.configured) {
      this.logger.warn(
        "PARTSFINDER_CLIENT_ID/SECRET are unset — falling back to the search index",
      );
      return null;
    }

    try {
      const token = await this.token();
      const response = await firstValueFrom(
        this.httpService.get<any>(
          `${this.baseUrl}/spare_parts/${encodeURIComponent(id)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/ld+json",
            },
          },
        ),
      );

      // Mapped here rather than in the caller: what leaves this service is the
      // shape the rest of Service Hub speaks, whichever backend answered.
      return mapPartsFinderSparePart(response.data as PartsFinderSparePart);
    } catch (error: any) {
      // A 401 usually means the cached token was rejected; drop it so the next
      // call mints a fresh one instead of failing the same way.
      if (error?.response?.status === 401) {
        this.accessToken = null;
      }

      this.logger.error(
        `PartsFinder API getSparePart(${id}) failed: ${error?.message}` +
          (error?.response?.data
            ? ` — ${JSON.stringify(error.response.data).slice(0, 300)}`
            : ""),
      );

      return null;
    }
  }
}
