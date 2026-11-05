import { NestFactory } from "@nestjs/core";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ApiTool,
  ApiToolCategory,
  ApiToolAuthType,
  ApiToolPricingModel,
  ApiToolStatus,
  ApiToolSupportedFormat,
} from "../api-catalog/entities/api-tool.entity";
import { SeedModule } from "./seed.module";

const SCALAR_BASE = "https://care2repair.eu/api/scalar";
const BASE = "https://care2repair.eu/api/v1";
const OPENAPI_JSON = "https://care2repair.eu/api/api-json";

/** Build a Scalar deep-link anchor directly to a specific operation.
 *  Format: https://care2repair.eu/api/scalar#tag/{tag-slug}/{METHOD}/api/v1/{path}
 */
function scalar(tag: string, method: "GET" | "POST", path: string): string {
  const slug = tag.toLowerCase().replace(/\s+/g, "-");
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${SCALAR_BASE}#tag/${slug}/${method}/api/v1/${cleanPath}`;
}

const BUILTIN_TOOLS: Partial<ApiTool>[] = [
  {
    name: "Fixometer Impact Calculator",
    shortDescription:
      "Estimate the environmental impact (CO₂, waste) of repairing vs. replacing a device.",
    fullDescription:
      "Powered by the Fixometer project from The Restart Project, this API calculates the environmental benefits of repairing electrical and electronic equipment rather than replacing it. Returns CO₂ savings, waste diversion metrics, and comparable impact data based on device type, weight, and electrical classification.",
    websiteUrl: "https://care2repair.eu",
    baseApiUrl: BASE,
    category: ApiToolCategory.RECYCLING,
    tags: ["fixometer", "impact", "co2", "recycling", "environment", "eee"],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.OPEN_SOURCE,
    pricingDetails:
      "Free to use. Data sourced from the open-source Fixometer project.",
    documentationUrl: scalar(
      "External Adapters",
      "GET",
      "/external-adapters/fixometer/impact-metrics",
    ),
    swaggerUrl: scalar(
      "External Adapters",
      "GET",
      "/external-adapters/fixometer/impact-metrics",
    ),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON],
    endpoints: [
      {
        method: "GET",
        path: "/external-adapters/fixometer/impact-metrics",
        description:
          "Fetch Fixometer environmental impact metrics for a given device type",
      },
    ],
  },
  {
    name: "Device Recognition",
    shortDescription:
      "Identify an EEE device from a photo using AI (Gemini 2.5 Pro).",
    fullDescription:
      "Upload an image of an electrical or electronic device and receive structured identification data: product name, brand, model, release date, end-of-life date, and GTIN. Powered by Google Gemini 2.5 Pro. Supports JPEG, PNG, GIF, WebP, and HEIC formats.",
    websiteUrl: "https://care2repair.eu",
    baseApiUrl: BASE,
    category: ApiToolCategory.DIAGNOSIS,
    tags: ["ai", "image-recognition", "gemini", "device-identification", "eee"],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.FREE,
    documentationUrl: scalar(
      "Identification",
      "POST",
      "/identification/analyze",
    ),
    swaggerUrl: scalar("Identification", "POST", "/identification/analyze"),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON],
    endpoints: [
      {
        method: "POST",
        path: "/identification/analyze",
        description:
          "Upload a device image (multipart/form-data). Returns Product, Brand, Model, ReleaseDate, EndOfLifeDate, GTIN.",
      },
    ],
  },
  {
    name: "Fast Plan Eco",
    shortDescription:
      "Optimize multi-stop repair routes with carbon footprint estimation and GPX/Google Maps export.",
    fullDescription:
      "Given a list of waypoints (address or lat/lon), this API computes a TSP-optimized route for the selected vehicle type (car, electric car, utility, bike, on foot) using OSRM, then calculates the carbon footprint of the journey. Supports GPX export and Google Maps URL generation.",
    websiteUrl: "https://care2repair.eu",
    baseApiUrl: BASE,
    category: ApiToolCategory.OTHER,
    tags: [
      "routing",
      "tsp",
      "carbon-footprint",
      "gpx",
      "eco",
      "repair-journey",
    ],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.OPEN_SOURCE,
    documentationUrl: scalar(
      "Fast Plan Eco",
      "POST",
      "/fast-plan-eco/calculate-route",
    ),
    swaggerUrl: scalar(
      "Fast Plan Eco",
      "POST",
      "/fast-plan-eco/calculate-route",
    ),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON, ApiToolSupportedFormat.XML],
    endpoints: [
      {
        method: "POST",
        path: "/fast-plan-eco/geocode-address",
        description: "Geocode a text address via Nominatim",
      },
      {
        method: "POST",
        path: "/fast-plan-eco/calculate-route",
        description: "Compute TSP-optimized route + carbon footprint",
      },
      {
        method: "POST",
        path: "/fast-plan-eco/export-gpx",
        description: "Export optimized route as a GPX file",
      },
      {
        method: "POST",
        path: "/fast-plan-eco/export-googlemaps",
        description: "Generate a Google Maps URL from ordered waypoints",
      },
    ],
  },
  {
    name: "iFixit Tutorial Search",
    shortDescription:
      "Search iFixit repair guides and device information for EEE.",
    fullDescription:
      "Access the iFixit repair guide database through the Service Hub proxy. Search for guides by keyword, device type, subject, or difficulty level. Also retrieve device parts lists and individual guide steps.",
    websiteUrl: "https://www.ifixit.com",
    baseApiUrl: BASE,
    category: ApiToolCategory.REPAIR,
    tags: ["ifixit", "tutorial", "repair-guide", "diy", "spare-parts"],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.FREE,
    pricingDetails: "Free. Proxied from the iFixit public API (CC BY-NC-SA).",
    documentationUrl: scalar(
      "External Adapters",
      "GET",
      "/external-adapters/ifixit/search",
    ),
    swaggerUrl: scalar(
      "External Adapters",
      "GET",
      "/external-adapters/ifixit/search",
    ),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON],
    endpoints: [
      {
        method: "GET",
        path: "/external-adapters/ifixit/search",
        description: "Search guides/devices by query, type, difficulty",
      },
      {
        method: "GET",
        path: "/external-adapters/ifixit/devices",
        description: "Paginated list of iFixit devices",
      },
      {
        method: "GET",
        path: "/external-adapters/ifixit/devices/:id",
        description: "Single device details",
      },
      {
        method: "GET",
        path: "/external-adapters/ifixit/devices/:id/parts",
        description: "Spare parts for a device",
      },
      {
        method: "GET",
        path: "/external-adapters/ifixit/devices/:id/guide/:guideid",
        description: "Full guide with step-by-step instructions",
      },
    ],
  },
  {
    name: "Device Search",
    shortDescription:
      "Search the Service Hub device catalog (EEE) by name, URN, or category.",
    fullDescription:
      "Query the community device catalog used across Service Hub. Supports full-text search, filtering by category, and paginated browsing. Each device record includes technical specifications, URN identifiers, and optionally linked repair tutorials.",
    websiteUrl: "https://care2repair.eu",
    baseApiUrl: BASE,
    category: ApiToolCategory.REPAIR,
    tags: ["devices", "catalog", "eee", "search", "urn"],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.FREE,
    documentationUrl: scalar("Devices", "GET", "/devices"),
    swaggerUrl: scalar("Devices", "GET", "/devices"),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON],
    endpoints: [
      {
        method: "GET",
        path: "/devices",
        description: "Paginated device list with optional search and filters",
      },
      {
        method: "GET",
        path: "/devices/search",
        description: "Full-text device search",
      },
      {
        method: "GET",
        path: "/devices/filters",
        description: "Available filter values (categories, brands…)",
      },
      {
        method: "GET",
        path: "/devices/:id",
        description: "Single device by numeric ID",
      },
      {
        method: "GET",
        path: "/devices/urn/:urn",
        description: "Device lookup by URN identifier",
      },
    ],
  },
  {
    name: "Issue Classifier",
    shortDescription:
      "Predict the origin of a device issue (mechanical, electrical, software…) from a text description.",
    fullDescription:
      "Powered by a fine-tuned RoBERTa model trained on ORDP repair data, this API classifies a free-text device problem description into one of 9 issue-origin categories: MECHANICAL, POWER_ELECTRICAL, BEHAVIOUR_SYMPTOM, MAINTENANCE, SOFTWARE, USER_RELATED, BATTERY, CONTROL_ELECTRONIC, or NONE_OTHER. Input format: 'machine : {device} ; Description : {problem}'. Returns the top prediction with a confidence score and all ranked predictions.",
    websiteUrl: "https://care2repair.eu",
    baseApiUrl: BASE,
    category: ApiToolCategory.DIAGNOSIS,
    tags: [
      "ai",
      "nlp",
      "classification",
      "roberta",
      "issue-origin",
      "diagnosis",
      "eee",
    ],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.FREE,
    documentationUrl: scalar("Issue Tag", "POST", "/issue-tag/classify"),
    swaggerUrl: scalar("Issue Tag", "POST", "/issue-tag/classify"),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON],
    endpoints: [
      {
        method: "POST",
        path: "/issue-tag/classify",
        description:
          "Classify device issue origin from a text description. Body: { input: string }. Returns finalPrediction[] and predictions[].",
      },
    ],
  },
  {
    name: "Repairer Search",
    shortDescription:
      "Find certified repairers near a location, filterable by device type and country.",
    fullDescription:
      "Search the Service Hub repairer directory with geolocation support. Filter by country, device type, or free-text search. Results include repairer profiles with address, accepted device categories, and contact information.",
    websiteUrl: "https://care2repair.eu",
    baseApiUrl: BASE,
    category: ApiToolCategory.REPAIR,
    tags: ["repairers", "geolocation", "directory", "search", "eee"],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.FREE,
    documentationUrl: scalar("Repairers", "GET", "/repairers"),
    swaggerUrl: scalar("Repairers", "GET", "/repairers"),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON],
    endpoints: [
      {
        method: "GET",
        path: "/repairers",
        description: "Paginated repairer list with geo and device filters",
      },
      {
        method: "POST",
        path: "/repairers/search",
        description: "Advanced repairer search with full SearchDto body",
      },
      {
        method: "GET",
        path: "/repairers/filters",
        description: "Available filter values (countries, device types…)",
      },
      {
        method: "GET",
        path: "/repairers/:id",
        description: "Single repairer profile",
      },
      {
        method: "POST",
        path: "/repairers/nearest",
        description: "Find nearest repairers by geolocation",
      },
    ],
  },
  {
    name: "Spare Parts Search",
    shortDescription:
      "Search second-hand and reconditioned spare parts offered by repairers, with prices and availability.",
    fullDescription:
      "Access the PartsFinder catalogue through the Service Hub proxy. Search the parts repairers put up for sale, browse them by page, or list the ones compatible with a given device brand and model. Each record carries the part model, condition, asking prices, photos, and the repairer selling it with their address and delivery methods. Search results come from PartsFinder's Meilisearch indexes; a single part is read from its API, so the detail is authoritative rather than a cached copy.",
    // The upstream catalogue, as iFixit's entry points at ifixit.com: the API
    // below is the Service Hub proxy, the site is where the parts live.
    websiteUrl: "https://data.spareparts.care2repair.eu",
    baseApiUrl: BASE,
    category: ApiToolCategory.SPARE_PARTS,
    tags: [
      "spare-parts",
      "partsfinder",
      "second-hand",
      "reconditioned",
      "repairers",
      "eee",
    ],
    isPubliclyAccessible: true,
    requiresAccount: false,
    requiresApiKey: false,
    authType: ApiToolAuthType.NONE,
    pricingModel: ApiToolPricingModel.FREE,
    documentationUrl: scalar("Spare Parts", "GET", "/spare-parts/search"),
    swaggerUrl: scalar("Spare Parts", "GET", "/spare-parts/search"),
    openApiSpecUrl: OPENAPI_JSON,
    supportedFormats: [ApiToolSupportedFormat.JSON],
    endpoints: [
      {
        method: "GET",
        path: "/spare-parts/search",
        description:
          "Full-text spare part search with brand and category filters",
      },
      {
        method: "GET",
        path: "/spare-parts/by-device",
        description:
          "Spare parts compatible with a device, by brand and model name",
      },
      {
        method: "GET",
        path: "/spare-parts/multi-search",
        description:
          "One query across the spare part, device and repairer indexes",
      },
      {
        method: "GET",
        path: "/spare-parts",
        description: "Paginated spare part list",
      },
      {
        method: "GET",
        path: "/spare-parts/:id",
        description:
          "Single spare part, read from the PartsFinder API with the index as fallback",
      },
    ],
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const repo = app.get<Repository<ApiTool>>(getRepositoryToken(ApiTool));

  for (const toolData of BUILTIN_TOOLS) {
    const existing = await repo.findOne({ where: { name: toolData.name } });
    if (existing) {
      // Update fields but preserve id, createdAt, submitterUserId
      await repo.save({
        ...existing,
        ...toolData,
        isBuiltIn: true,
        status: ApiToolStatus.APPROVED,
        approvedAt: existing.approvedAt ?? new Date(),
      });
      console.log(`✅ Updated: ${toolData.name}`);
    } else {
      await repo.save(
        repo.create({
          ...toolData,
          isBuiltIn: true,
          status: ApiToolStatus.APPROVED,
          approvedAt: new Date(),
        }),
      );
      console.log(`✅ Seeded: ${toolData.name}`);
    }
  }

  console.log("🌱 API Catalog built-in tools seeded successfully.");
  await app.close();
}

bootstrap().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
