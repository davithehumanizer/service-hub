/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from "@nestjs/testing";
import { YoutubeAdapterService } from "../youtube-adapter.service";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { Logger } from "@nestjs/common";

describe("YoutubeAdapterService", () => {
  let service: YoutubeAdapterService;
  let httpService: HttpService;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  const originalApiKey = process.env.YOUTUBE_API_KEY;

  beforeEach(async () => {
    process.env.YOUTUBE_API_KEY = "test-api-key";
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YoutubeAdapterService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<YoutubeAdapterService>(YoutubeAdapterService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    process.env.YOUTUBE_API_KEY = originalApiKey;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("searchRepairVideos", () => {
    it("should map YouTube API results to a simplified shape", async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "How to repair iPhone 14",
                description: "desc",
                channelTitle: "channel",
                publishedAt: "2024-01-01T00:00:00Z",
                thumbnails: { medium: { url: "http://thumb.url" } },
              },
            },
          ],
        },
      };
      jest.spyOn(httpService, "get").mockReturnValue(of(mockResponse as any));

      const result = await service.searchRepairVideos("iPhone 14 Pro Max");

      expect(result.results).toEqual([
        {
          videoId: "abc123",
          title: "How to repair iPhone 14",
          description: "desc",
          channelTitle: "channel",
          publishedAt: "2024-01-01T00:00:00Z",
          thumbnail: "http://thumb.url",
          url: "https://www.youtube.com/watch?v=abc123",
        },
      ]);
    });

    it("should URL-encode the search term and append the api key", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: { items: [] } } as any));

      await service.searchRepairVideos("iPhone 14 Pro Max");

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent("iPhone 14 Pro Max repair tutorial"),
        ),
      );
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining("key=test-api-key"),
      );
    });

    it("should skip the API call and return empty results when YOUTUBE_API_KEY is not configured", async () => {
      delete process.env.YOUTUBE_API_KEY;
      const getSpy = jest.spyOn(httpService, "get");

      const result = await service.searchRepairVideos("iPhone 14");

      expect(result).toEqual({ results: [] });
      expect(getSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    });

    it("should return empty results for an empty query without calling the API", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      const result = await service.searchRepairVideos("   ");
      expect(result).toEqual({ results: [] });
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("should return null and log error if an error occurs", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(throwError(() => new Error("Test Error")));

      const result = await service.searchRepairVideos("iPhone 14");
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // A search.list call costs 100 of a 10,000/day quota, so the whole platform
  // gets ~100 searches a day. Without these guards the feature dies daily.
  describe("quota protection", () => {
    const apiResponse = {
      data: {
        items: [
          {
            id: { videoId: "abc123" },
            snippet: {
              title: "Kettle repair",
              description: "",
              channelTitle: "Fixer",
              publishedAt: "",
              thumbnails: { medium: { url: "http://img" } },
            },
          },
        ],
      },
    };

    it("should serve a repeated query from cache without calling the API again", async () => {
      const getSpy = jest
        .spyOn(httpService, "get")
        .mockReturnValue(of(apiResponse as any));

      const first = await service.searchRepairVideos("Philips kettle");
      const second = await service.searchRepairVideos("Philips kettle");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(second.results).toEqual(first.results);
    });

    it("should treat the cache key case- and whitespace-insensitively", async () => {
      const getSpy = jest
        .spyOn(httpService, "get")
        .mockReturnValue(of(apiResponse as any));

      await service.searchRepairVideos("Philips Kettle");
      await service.searchRepairVideos("  philips   kettle ");

      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it("should stop calling the API once the daily budget is spent", async () => {
      const getSpy = jest
        .spyOn(httpService, "get")
        .mockReturnValue(of(apiResponse as any));

      // Default budget is 80; distinct queries so the cache never answers.
      for (let i = 0; i < 80; i++) {
        await service.searchRepairVideos(`device ${i}`);
      }
      expect(getSpy).toHaveBeenCalledTimes(80);

      const overBudget = await service.searchRepairVideos("device 999");

      expect(getSpy).toHaveBeenCalledTimes(80);
      expect(overBudget.results).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("should fall back to a stale cached entry when the API fails", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy.mockReturnValueOnce(of(apiResponse as any));
      const fresh = await service.searchRepairVideos("Bosch drill");

      // Same query, API now down: stale beats empty.
      getSpy.mockReturnValue(throwError(() => new Error("quota exceeded")));
      // Bypass the cache TTL check by advancing time past it.
      jest
        .spyOn(Date, "now")
        .mockReturnValue(Date.now() + 8 * 24 * 60 * 60 * 1000);

      const stale = await service.searchRepairVideos("Bosch drill");

      expect(stale.results).toEqual(fresh.results);
      jest.spyOn(Date, "now").mockRestore();
    });
  });
});
