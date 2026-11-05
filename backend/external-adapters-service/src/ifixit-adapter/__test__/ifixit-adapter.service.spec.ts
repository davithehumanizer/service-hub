/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from "@nestjs/testing";
import { IfixitAdapterService } from "../ifixit-adapter.service";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { Logger } from "@nestjs/common";

describe("IfixitAdapterService", () => {
  let service: IfixitAdapterService;
  let httpService: HttpService;
  let errorSpy: jest.SpyInstance; // Declare errorSpy here

  beforeAll(() => {
    process.env.IFIXIT_API_URL = "http://localhost:8080"; // Mock the environment variable
  });

  beforeEach(async () => {
    // Spy on the Logger.prototype.error before creating the module
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IfixitAdapterService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IfixitAdapterService>(IfixitAdapterService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    errorSpy.mockRestore(); // Restore the original implementation after each test
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAllDevices", () => {
    it("should return all devices", async () => {
      const mockResponse = {
        data: { devices: [{ id: 1, title: "Device 1" }] },
      };
      jest.spyOn(httpService, "get").mockReturnValue(of(mockResponse as any));

      const result = await service.getAllDevices(1, 10);
      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/wikis/CATEGORY?limit=10&page=1`,
      );
    });

    it("should return null and log error if an error occurs", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(throwError(() => new Error("Test Error")));

      const result = await service.getAllDevices(1, 10);
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled(); // Use the top-level errorSpy
    });
  });

  describe("getDeviceById", () => {
    it("should return a device by ID", async () => {
      const mockResponse = { data: { id: 1, title: "Device 1" } };
      jest.spyOn(httpService, "get").mockReturnValue(of(mockResponse as any));

      const result = await service.getDeviceById("1");
      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/1`,
      );
    });

    it("should return null and log error if an error occurs", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(throwError(() => new Error("Test Error")));

      const result = await service.getDeviceById("1");
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled(); // Use the top-level errorSpy
    });
  });

  describe("getDeviceParts", () => {
    it("should return device parts", async () => {
      const mockResponse = { data: { parts: [{ id: 1, title: "Part 1" }] } };
      jest.spyOn(httpService, "get").mockReturnValue(of(mockResponse as any));

      const result = await service.getDeviceParts("1");
      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/1/parts`,
      );
    });

    it("should return null and log error if an error occurs", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(throwError(() => new Error("Test Error")));

      const result = await service.getDeviceParts("1");
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled(); // Use the top-level errorSpy
    });
  });

  describe("getDeviceGuide", () => {
    it("should return a device guide", async () => {
      const mockResponse = { data: { id: 1, title: "Guide 1" } };
      jest.spyOn(httpService, "get").mockReturnValue(of(mockResponse as any));

      const result = await service.getDeviceGuide("1", "guide1");
      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/guides/guide1`,
      );
    });

    it("should return null and log error if an error occurs", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(throwError(() => new Error("Test Error")));

      const result = await service.getDeviceGuide("1", "guide1");
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled(); // Use the top-level errorSpy
    });
  });

  describe("searchDevice", () => {
    const mockGuides = {
      results: [
        {
          dataType: "guide",
          type: "replacement",
          subject: "screen",
          difficulty: "easy",
        },
        {
          dataType: "guide",
          type: "repair",
          subject: "battery",
          difficulty: "hard",
        },
        {
          dataType: "wiki",
          type: "replacement",
          subject: "screen",
          difficulty: "easy",
        },
        {
          dataType: "guide",
          type: "replacement",
          subject: "battery",
          difficulty: "easy",
        },
      ],
    };

    it("should return filtered guides based on type", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: mockGuides } as any));
      const result = await service.searchDevice("query", "repair", "", "");
      expect(result.results.length).toBe(1);
      expect(result.results[0].type).toBe("repair");
    });

    it("should return filtered guides based on subject", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: mockGuides } as any));
      const result = await service.searchDevice("query", "", "screen", "");
      expect(result.results.length).toBe(1);
      expect(result.results[0].subject).toBe("screen");
    });

    it("should return filtered guides based on difficulty", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: mockGuides } as any));
      const result = await service.searchDevice("query", "", "", "hard");
      expect(result.results.length).toBe(1);
      expect(result.results[0].difficulty).toBe("hard");
    });

    it("should return all guides when no filters are provided", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: mockGuides } as any));
      const result = await service.searchDevice("query", "", "", "");
      expect(result.results.length).toBe(3);
    });

    it("should call the iFixit API with the correct URL", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: mockGuides } as any));
      await service.searchDevice("query", "", "", "");
      expect(httpService.get).toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/search/query?filter=guide`,
      );
    });

    it("should return null and log error if an error occurs", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(throwError(() => new Error("Test Error")));
      const result = await service.searchDevice("query", "", "", "");
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should URL-encode the query (spaces/special characters)", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: mockGuides } as any));
      await service.searchDevice("iPhone 14 Pro Max", "", "", "");
      expect(httpService.get).toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/search/${encodeURIComponent("iPhone 14 Pro Max")}?filter=guide`,
      );
    });

    it("should try brand+query before falling back to query alone", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest "Apple query"
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest "query"
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // search "Apple query"
        .mockReturnValueOnce(of({ data: mockGuides } as any)); // search "query"

      const result = await service.searchDevice("query", "", "", "", "Apple");

      expect(getSpy).toHaveBeenNthCalledWith(
        3,
        `${process.env.IFIXIT_API_URL}/search/${encodeURIComponent("Apple query")}?filter=guide`,
      );
      expect(getSpy).toHaveBeenNthCalledWith(
        4,
        `${process.env.IFIXIT_API_URL}/search/query?filter=guide`,
      );
      expect(result.results.length).toBe(3);
      expect(result.matchQuality).toBe("related");
    });

    it("should fall back to category when brand+query and query both return no results", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValue(of({ data: { results: [] } } as any))
        // three suggest calls, then three search calls
        .mockReturnValueOnce(of({ data: { results: [] } } as any))
        .mockReturnValueOnce(of({ data: { results: [] } } as any))
        .mockReturnValueOnce(of({ data: { results: [] } } as any))
        .mockReturnValueOnce(of({ data: { results: [] } } as any))
        .mockReturnValueOnce(of({ data: { results: [] } } as any))
        .mockReturnValueOnce(of({ data: mockGuides } as any));

      const result = await service.searchDevice(
        "query",
        "",
        "",
        "",
        "Apple",
        "Smartphone",
      );

      expect(getSpy).toHaveBeenNthCalledWith(
        6,
        `${process.env.IFIXIT_API_URL}/search/Smartphone?filter=guide`,
      );
      expect(result.results.length).toBe(3);
    });

    // ── Resolution-first behaviour ────────────────────────────────────────

    it("should resolve the device and return the guides attached to it", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValueOnce(
          of({
            data: {
              results: [
                { title: "Lenovo ThinkPad X13s Gen 1", wikiid: 548019 },
              ],
            },
          } as any),
        ) // suggest
        .mockReturnValueOnce(
          of({
            data: {
              guides: [
                { guideid: 1, title: "Battery Replacement", type: "repair" },
              ],
            },
          } as any),
        ); // device wiki

      const result = await service.searchDevice(
        "ThinkPad X13s Gen 1",
        "",
        "",
        "",
      );

      // Keyed by the title slug: the numeric wikiid returns nothing.
      expect(getSpy).toHaveBeenNthCalledWith(
        2,
        `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/Lenovo_ThinkPad_X13s_Gen_1`,
      );
      expect(result.matchQuality).toBe("exact");
      expect(result.exactGuides.length).toBe(1);
      expect(result.results.length).toBe(1);
      expect(result.resolvedDevice.title).toBe("Lenovo ThinkPad X13s Gen 1");
      // No free-text search once the device answered.
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it("should prefer the suggestion named exactly like the query", async () => {
      // iFixit suggests the Fairphone 6 first for "Fairphone": taking it gave
      // any Fairphone the Fairphone 6 guides, as an exact match.
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValueOnce(
          of({
            data: {
              results: [
                { title: "Fairphone 6" },
                { title: "Fairphone Fairbuds" },
                { title: "Fairphone" },
              ],
            },
          } as any),
        ) // suggest
        .mockReturnValueOnce(of({ data: { guides: [] } } as any)) // brand page, no guides of its own
        .mockReturnValueOnce(
          of({
            data: {
              results: [
                { dataType: "guide", guideid: 1, title: "Fairphone 4 Screen Replacement" },
                { dataType: "guide", guideid: 2, title: "Fairphone 6 Screen Flex Cables" },
              ],
            },
          } as any),
        ); // free-text search

      const result = await service.searchDevice("fairphone", "", "", "");

      expect(getSpy).toHaveBeenNthCalledWith(
        2,
        `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/Fairphone`,
      );
      expect(result.resolvedDevice.title).toBe("Fairphone");
      expect(result.matchQuality).toBe("related");
      expect(result.results.length).toBe(2);
    });

    it("should ask the device wiki for the guides in the language given", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValueOnce(of({ data: { results: [{ title: "Fairphone 4" }] } } as any)) // suggest
        .mockReturnValueOnce(
          of({
            data: { guides: [{ guideid: 1, title: "Fairphone 4 Akku tauschen", subject: "Akku" }] },
          } as any),
        ); // device wiki

      const result = await service.searchDevice(
        "Fairphone 4", "", "", "", undefined, undefined, undefined, "de",
      );

      expect(getSpy).toHaveBeenNthCalledWith(
        2,
        `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/Fairphone_4?langid=de`,
      );
      expect(result.results[0].title).toBe("Fairphone 4 Akku tauschen");
    });

    it("should search in English when the language given finds nothing", async () => {
      // A text search returns only the guides translated into that language.
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // search, in Dutch
        .mockReturnValueOnce(
          of({ data: { results: [{ dataType: "guide", guideid: 2, title: "Battery Replacement" }] } } as any),
        ); // search, in English

      const result = await service.searchDevice(
        "XR-200", "", "", "", undefined, undefined, undefined, "nl",
      );

      expect(getSpy).toHaveBeenNthCalledWith(
        2,
        `${process.env.IFIXIT_API_URL}/search/XR-200?filter=guide&langid=nl`,
      );
      expect(getSpy).toHaveBeenNthCalledWith(
        3,
        `${process.env.IFIXIT_API_URL}/search/XR-200?filter=guide`,
      );
      expect(result.matchQuality).toBe("related");
      expect(result.results.length).toBe(1);
    });

    it("should not prefix the brand to a query that already starts with it", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy.mockReturnValue(of({ data: { results: [] } } as any));

      await service.searchDevice("Bosch KGN76CXE0N", "", "", "", "Bosch");

      expect(getSpy).toHaveBeenNthCalledWith(
        1,
        `${process.env.IFIXIT_API_URL}/suggest/Bosch%20KGN76CXE0N?doctypes=device,category`,
      );
      expect(getSpy).not.toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/suggest/Bosch%20Bosch%20KGN76CXE0N?doctypes=device,category`,
      );
    });

    it("should keep the first suggestion when none has the exact name", async () => {
      // "Chrome" must still resolve to the Chromebook it abbreviates.
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValueOnce(
          of({
            data: {
              results: [
                { title: "Lenovo IdeaPad Flex 3 Chromebook 15IJL7" },
                { title: "Lenovo IdeaPad Flex 3" },
              ],
            },
          } as any),
        ) // suggest
        .mockReturnValueOnce(
          of({ data: { guides: [{ guideid: 1, title: "Battery Replacement" }] } } as any),
        ); // device wiki

      const result = await service.searchDevice(
        "IdeaPad Flex 3 Chrome 15IJL7",
        "",
        "",
        "",
      );

      expect(result.resolvedDevice.title).toBe(
        "Lenovo IdeaPad Flex 3 Chromebook 15IJL7",
      );
      expect(result.matchQuality).toBe("exact");
    });

    it("should report device-without-guides rather than an empty search", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValueOnce(
          of({
            data: { results: [{ title: "Lenovo ThinkPad Z16 Gen 1" }] },
          } as any),
        ) // suggest resolves
        .mockReturnValue(of({ data: { results: [], guides: [] } } as any)); // wiki has no guides, searches empty

      const result = await service.searchDevice("ThinkPad Z16 Gen 1", "", "", "");

      expect(result.matchQuality).toBe("device-without-guides");
      expect(result.results).toEqual([]);
      expect(result.resolvedDevice.title).toBe("Lenovo ThinkPad Z16 Gen 1");
    });

    it("should not resolve the category as the device", async () => {
      // iFixit answers /suggest/Washing Machine with a wiki of that name. Once
      // that counted as a resolution, every appliance whose model is unknown
      // reported the category page as an exact match on its own device.
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest brand+model
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest model
        .mockReturnValue(of({ data: { results: [] } } as any));

      const result = await service.searchDevice(
        "FWDD117168W",
        "",
        "",
        "",
        "Whirlpool",
        "Washing Machine",
      );

      expect(result.resolvedDevice).toBeNull();
      expect(result.matchQuality).not.toBe("exact");
      // Two suggest calls, not three: the category is never offered for
      // resolution.
      expect(getSpy).toHaveBeenNthCalledWith(
        1,
        `${process.env.IFIXIT_API_URL}/suggest/Whirlpool%20FWDD117168W?doctypes=device,category`,
      );
      expect(getSpy).toHaveBeenNthCalledWith(
        2,
        `${process.env.IFIXIT_API_URL}/suggest/FWDD117168W?doctypes=device,category`,
      );
      expect(getSpy).not.toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/suggest/Washing%20Machine?doctypes=device,category`,
      );
    });

    it("should try brand + category before the category alone", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValue(of({ data: { results: [] } } as any))
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest brand+model
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest model
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // search brand+model
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // search model
        .mockReturnValueOnce(of({ data: mockGuides } as any)); // search brand+category

      const result = await service.searchDevice(
        "WAN28290",
        "",
        "",
        "",
        "Bosch",
        "Washing Machine",
      );

      expect(getSpy).toHaveBeenNthCalledWith(
        5,
        `${process.env.IFIXIT_API_URL}/search/Bosch%20Washing%20Machine?filter=guide`,
      );
      expect(result.matchQuality).toBe("related");
      // The category alone was never needed.
      expect(getSpy).toHaveBeenCalledTimes(5);
    });

    it("should read the mapped category wiki before any free-text search", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValue(of({ data: { results: [] } } as any))
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest brand+model
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest model
        .mockReturnValueOnce(
          of({
            data: {
              guides: [
                { guideid: 7, title: "Washing Machine Door Seal", type: "repair" },
              ],
            },
          } as any),
        ); // the category wiki

      const result = await service.searchDevice(
        "WAN28290",
        "",
        "",
        "",
        "Bosch",
        "Washing machine / Combi dryer",
        "Washing_Machine",
      );

      expect(getSpy).toHaveBeenNthCalledWith(
        3,
        `${process.env.IFIXIT_API_URL}/wikis/CATEGORY/Washing_Machine`,
      );
      expect(result.matchQuality).toBe("related");
      expect(result.relatedGuides.length).toBe(1);
      // Category guides are never this device's own.
      expect(result.exactGuides).toEqual([]);
      // No free-text search was needed.
      expect(getSpy).toHaveBeenCalledTimes(3);
    });

    it("should fall through to free text when the mapped wiki has no guides", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      getSpy
        .mockReturnValue(of({ data: mockGuides } as any))
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest brand+model
        .mockReturnValueOnce(of({ data: { results: [] } } as any)) // suggest model
        .mockReturnValueOnce(of({ data: { guides: [] } } as any)); // empty category wiki

      const result = await service.searchDevice(
        "WAN28290",
        "",
        "",
        "",
        "Bosch",
        "Washing machine / Combi dryer",
        "Washing_Machine",
      );

      expect(result.matchQuality).toBe("related");
      expect(result.results.length).toBe(3);
    });

    it("should report none when the device cannot be resolved at all", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(of({ data: { results: [] } } as any));

      const result = await service.searchDevice("zzzz unknown", "", "", "");

      expect(result.matchQuality).toBe("none");
      expect(result.resolvedDevice).toBeNull();
    });

    it("should apply the type filter to guides read from the device wiki", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValueOnce(
          of({ data: { results: [{ title: "Some Device" }] } } as any),
        )
        .mockReturnValueOnce(
          of({
            data: {
              guides: [
                { guideid: 1, type: "repair" },
                { guideid: 2, type: "replacement" },
              ],
            },
          } as any),
        );

      const result = await service.searchDevice("Some Device", "repair", "", "");

      expect(result.exactGuides.length).toBe(1);
      expect(result.exactGuides[0].type).toBe("repair");
    });
  });

  describe("suggestDevice", () => {
    it("should call the iFixit suggest endpoint with an encoded query", async () => {
      const mockResponse = { data: { results: [{ title: "iPhone 14" }] } };
      jest.spyOn(httpService, "get").mockReturnValue(of(mockResponse as any));

      const result = await service.suggestDevice("iPhone 1");
      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        `${process.env.IFIXIT_API_URL}/suggest/iPhone%201?doctypes=device,category`,
      );
    });

    it("should return an empty results array without calling the API for an empty query", async () => {
      const getSpy = jest.spyOn(httpService, "get");
      const result = await service.suggestDevice("   ");
      expect(result).toEqual({ results: [] });
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("should return null and log error if an error occurs", async () => {
      jest
        .spyOn(httpService, "get")
        .mockReturnValue(throwError(() => new Error("Test Error")));
      const result = await service.suggestDevice("query");
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
