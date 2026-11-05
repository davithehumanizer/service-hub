#!/usr/bin/env node
/*
Simple importer for Icecat product IDs.

Usage:
  node import_icecat.js --csv products.csv --featuresXml FeaturesList.xml --apiUrl http://localhost:3000/devices --token <BEARER_TOKEN>

Resume options:
  --skip N          Skip the first N lines (useful to resume after interruption)
  --startId ID      Start from a specific product ID (searches for it in the CSV)

Notes:
 - Requires Node 18+ (global fetch). If not available, install node-fetch and adjust.
 - Install dependency: npm install fast-xml-parser
*/

const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

// Load environment variables from .env file if it exists
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch (e) {
  // dotenv not installed or .env doesn't exist - continue without it
}

/**
 * Simple file-based logger
 */
class Logger {
  constructor(logDir) {
    this.logDir = logDir || process.env.LOG_DIR || path.join(__dirname, "logs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    this.logFile = path.join(this.logDir, `import_${timestamp}.log`);
    this.stats = {
      total: 0,
      success: 0,
      updated: 0,
      skipped: 0,
      brandRestricted: 0,
      errors: 0,
      icecatApiCalls: 0,
      errorDetails: [],
    };
    this.startTime = Date.now();

    this.log("INFO", "Logger initialized", `Log file: ${this.logFile}`);
  }

  log(level, message, details = "") {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}${details ? " - " + details : ""}\n`;

    // Write to file
    fs.appendFileSync(this.logFile, logLine, "utf8");

    // Also log to console
    console.log(`[${level}] ${message}${details ? " - " + details : ""}`);
  }

  incrementIcecatApiCalls() {
    this.stats.icecatApiCalls++;
  }

  incrementBrandRestricted() {
    this.stats.brandRestricted++;
  }

  logSuccess(deviceId, ean, action = "CREATED") {
    this.stats.total++;
    if (action === "CREATED") {
      this.stats.success++;
    } else if (action === "UPDATED") {
      this.stats.updated++;
    } else if (action === "SKIPPED") {
      this.stats.skipped++;
    }
    this.log(
      "SUCCESS",
      `${action}: Device ${deviceId}`,
      `EAN: ${ean || "N/A"}`,
    );
  }

  logError(productId, ean, error) {
    this.stats.total++;
    this.stats.errors++;
    const errorMsg = error.message || error;
    this.stats.errorDetails.push({ productId, ean, error: errorMsg });
    this.log(
      "ERROR",
      `Failed to process product ${productId}`,
      `EAN: ${ean || "N/A"}, Error: ${errorMsg}`,
    );
  }

  getElapsedTime() {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  logSummary(interrupted = false) {
    const elapsedTime = this.getElapsedTime();
    const summary = `
========================================
${interrupted ? "IMPORT INTERRUPTED (Ctrl+C)" : "IMPORT SUMMARY"}
========================================
Execution Time: ${elapsedTime}
Icecat API Calls: ${this.stats.icecatApiCalls}
----------------------------------------
Total Processed: ${this.stats.total}
Successful Creates: ${this.stats.success}
Successful Updates: ${this.stats.updated}
Skipped (No Changes): ${this.stats.skipped}
Brand Restricted: ${this.stats.brandRestricted}
Errors: ${this.stats.errors}
========================================
`;

    fs.appendFileSync(this.logFile, summary, "utf8");
    console.log(summary);

    if (this.stats.errorDetails.length > 0) {
      const errorSummary =
        "\nError Details:\n" +
        this.stats.errorDetails
          .map(
            (e) =>
              `  - Product ${e.productId} (EAN: ${e.ean || "N/A"}): ${e.error}`,
          )
          .join("\n") +
        "\n";
      fs.appendFileSync(this.logFile, errorSummary, "utf8");
      console.log(errorSummary);
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val =
        args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

// Stream CSV lines to avoid loading very large files fully in memory
function readCsvStream(csvPath, selectedIdsSet, skipLines = 0, startId = null) {
  async function* gen() {
    const readline = require("readline");
    const input = fs.createReadStream(csvPath, { encoding: "utf8" });
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    let headerParsed = false;
    let delimiter = null; // ',' or '\t'
    let productIdIndex = -1;
    let catIdIndex = -1;
    let lineCount = 0;
    let skippedCount = 0;
    let foundStartId = startId ? false : true; // If no startId, we're already "found"

    for await (const rawLine of rl) {
      const line = rawLine.trim();
      if (!line) continue;

      // detect delimiter on first non-empty line if not set
      if (!headerParsed) {
        // try tab first, then comma
        const tabCols = line.split("\t");
        const commaCols = line.split(",");
        // if header contains the word 'product_id' use that as header
        const lower = line.toLowerCase();
        if (lower.includes("product_id") || lower.includes("product id")) {
          // header line
          delimiter = line.includes("\t") ? "\t" : ",";
          const headers = line
            .split(delimiter)
            .map((h) => h.trim().toLowerCase());
          productIdIndex = headers.indexOf("product_id");
          catIdIndex = headers.indexOf("catid");
          headerParsed = true;
          // skip header line
          continue;
        }

        // no explicit header - choose delimiter heuristically
        delimiter = tabCols.length > commaCols.length ? "\t" : ",";
        // if first data line, we haven't seen header; treat this line as data below
        headerParsed = true;
      }

      const cols = delimiter
        ? line.split(delimiter).map((c) => c.trim())
        : line.split(",").map((c) => c.trim());

      // Check category filter if enabled and column found
      if (selectedIdsSet && catIdIndex >= 0 && catIdIndex < cols.length) {
        const catId = cols[catIdIndex];
        if (!selectedIdsSet.has(catId)) {
          continue; // Skip this product
        }
      }

      let productId = undefined;
      if (productIdIndex >= 0 && productIdIndex < cols.length) {
        productId = cols[productIdIndex];
      } else {
        // fallback: try to find a pure numeric token that looks like product id but avoid timestamps
        // prefer shortish numeric tokens (<=10 digits) as product ids, otherwise accept any numeric token
        const numericTokens = cols.filter((c) => /^\d+$/.test(c));
        if (numericTokens.length === 1) productId = numericTokens[0];
        else if (numericTokens.length > 1) {
          const short = numericTokens.find(
            (t) => t.length <= 6 || t.length <= 8,
          );
          productId = short || numericTokens[0];
        } else {
          // no numeric token, take first column
          productId = cols[0];
        }
      }

      if (productId) {
        lineCount++;

        // Skip lines if --skip option is used
        if (skipLines > 0 && skippedCount < skipLines) {
          skippedCount++;
          if (skippedCount === 1 || skippedCount % 100 === 0) {
            console.log(`Skipping line ${skippedCount}/${skipLines}...`);
          }
          continue;
        }

        // If startId is specified, skip until we find it
        if (!foundStartId) {
          if (productId === startId) {
            foundStartId = true;
            console.log(`Found start ID: ${startId} at line ${lineCount}`);
          } else {
            if (lineCount % 100 === 0) {
              console.log(
                `Searching for start ID ${startId}... (current: ${productId}, line ${lineCount})`,
              );
            }
            continue;
          }
        }

        yield productId;
      }
    }
  }

  return gen();
}

function buildFeatureMapFromXml(xmlPath) {
  if (!xmlPath || !fs.existsSync(xmlPath)) return { signMap: {}, nameMap: {} };
  const xml = fs.readFileSync(xmlPath, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const j = parser.parse(xml);
  const signMap = {}; // Sign ID -> sign text (EN)
  const nameMap = {}; // Feature ID -> Feature name (EN)
  // XML structure depends on file; try to locate Feature elements
  // common shapes: Features > Feature or FeatureList > Feature
  function walk(obj) {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (k.toLowerCase().includes("feature")) {
        if (Array.isArray(val)) {
          for (const f of val) extractFeature(f);
        } else if (typeof val === "object") {
          extractFeature(val);
        }
      } else {
        walk(val);
      }
    }
  }

  function extractFeature(f) {
    if (!f) return;
    // Feature ID
    const featureId =
      f.ID ||
      f.Id ||
      f.Id ||
      f.FeatureID ||
      f.FeatureId ||
      f["@_ID"] ||
      f["@_Id"];

    // Extract English feature name from Names -> Name (langid=1) or Name with Language='EN'
    let featureName = null;
    if (f.Names && f.Names.Name) {
      const ns = Array.isArray(f.Names.Name) ? f.Names.Name : [f.Names.Name];
      const en = ns.find(
        (n) =>
          String(n?.langid || n?.Language || n?.language) === "1" ||
          String(n?.langid) === "1" ||
          String(n?.Language) === "EN",
      );
      if (en)
        featureName =
          typeof en === "string"
            ? en
            : en.Value || en["#text"] || en[""] || null;
    }
    // also try direct Name property
    if (!featureName && f.Name) {
      if (Array.isArray(f.Name)) {
        const en = f.Name.find(
          (n) =>
            String(n?.langid || n?.Language) === "1" ||
            String(n?.Language) === "EN",
        );
        featureName = en
          ? en.Value || en["#text"] || en
          : typeof f.Name[0] === "string"
            ? f.Name[0]
            : null;
      } else if (typeof f.Name === "object") {
        featureName =
          f.Name.Value ||
          f.Name["#text"] ||
          (String(f.Name.langid || f.Name.Language) === "1"
            ? f.Name.Value || f.Name["#text"]
            : null);
      } else if (typeof f.Name === "string") {
        featureName = f.Name;
      }
    }

    if (featureId && featureName) nameMap[String(featureId)] = featureName;

    // Extract signs inside Measure -> Signs -> Sign with langid=1 (EN)
    const measures = f.Measure
      ? Array.isArray(f.Measure)
        ? f.Measure
        : [f.Measure]
      : [];
    for (const m of measures) {
      const signs =
        m.Signs && m.Signs.Sign
          ? Array.isArray(m.Signs.Sign)
            ? m.Signs.Sign
            : [m.Signs.Sign]
          : [];
      for (const s of signs) {
        const signId = s.ID || s.Id || s.id || s["@_ID"] || s["@_Id"];
        const lang = String(s.langid || s.Language || s.language || "");
        const signText =
          typeof s === "string" ? s : s.Value || s["#text"] || s[""] || null;
        if (signId && (lang === "1" || lang.toUpperCase() === "EN")) {
          signMap[String(signId)] = signText || null;
        }
      }
    }
  }

  walk(j);
  return { signMap, nameMap };
}

function loadFeaturesFromJson(jsonPath) {
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.warn(
      `Features JSON not found at ${jsonPath}, feature names will use IDs`,
    );
    return { signMap: {}, nameMap: {} };
  }

  try {
    console.log(`Loading features from ${jsonPath}...`);
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    console.log(
      `Loaded ${Object.keys(data.nameMap || {}).length} feature names and ${Object.keys(data.signMap || {}).length} signs`,
    );

    return {
      signMap: data.signMap || {},
      nameMap: data.nameMap || {},
    };
  } catch (e) {
    console.error(`Failed to load features JSON: ${e.message}`);
    return { signMap: {}, nameMap: {} };
  }
}

async function fetchIcecatJson(productId, logger) {
  const url = `https://live.icecat.biz/api?lang=EN&shopname=openIcecat-live&icecat_id=${productId}`;
  const res = await fetch(url);

  // Increment API call counter
  if (logger) logger.incrementIcecatApiCalls();

  // Parse response as JSON first to check for Icecat error messages
  const json = await res.json();

  // Check if Icecat returned an error object (brand restrictions, access limited, etc.)
  if (json.StatusCode || json.Error || json.Code) {
    // Check for brand restrictions specifically
    if (
      json.Code === 404 &&
      json.Message &&
      json.Message.includes("brand restrictions")
    ) {
      const error = new Error(`Product ${productId}: ${json.Message}`);
      error.code = "BRAND_RESTRICTED";
      throw error;
    }
    // Other Icecat errors
    throw new Error(
      `Icecat API error for product ${productId}: ${json.Message || json.Error || "Unknown error"}`,
    );
  }

  // If response is not ok and we didn't get a JSON error object
  if (!res.ok) {
    throw new Error(`Icecat fetch failed ${res.status} ${res.statusText}`);
  }

  return json;
}

async function postToApi(apiUrl, token, payload) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  if (!res.ok)
    throw new Error(
      `API POST failed ${res.status} ${res.statusText} - ${JSON.stringify(
        json,
      )}`,
    );
  return json;
}

async function checkDeviceExists(apiBase, token, sourceId) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Remove /devices from apiBase if present, then add correct path

  const url = `${apiBase}/api/v1/devices/source/${sourceId}`;

  try {
    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Check existence failed ${res.status}: ${text}`);
    }

    const text = await res.text();
    if (!text || text.trim() === "") return null;

    return JSON.parse(text);
  } catch (e) {
    if (e.message.includes("404") || e.message.includes("Not Found")) {
      return null;
    }
    throw e;
  }
}

async function updateDevice(apiBase, token, id, payload) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${apiBase}/api/v1/devices/${id}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Update failed ${res.status} - ${txt}`);
  }
  return res.json();
}

function hasChanges(existing, payload) {
  if (existing.brand !== payload.brand) return true;
  if (existing.model !== payload.model) return true;
  // Compare technical properties
  const existingProps = (existing.technicalProperties || [])
    .map((p) => `${p.property_name}:${p.property_value}`)
    .sort()
    .join("|");
  const newProps = (payload.technicalProperties || [])
    .map((p) => `${p.property_name}:${p.property_value}`)
    .sort()
    .join("|");

  if (existingProps !== newProps) return true;

  // Compare informational properties
  const existingInfo = (existing.informationalProperties || [])
    .map((p) => `${p.property_name}:${p.property_value}`)
    .sort()
    .join("|");
  const newInfo = (payload.informationalProperties || [])
    .map((p) => `${p.property_name}:${p.property_value}`)
    .sort()
    .join("|");

  return existingInfo !== newInfo;
}

// The family, series and full title of the product. ProductName alone can lose
// them ("15" for a ThinkBook 15), and the model cannot then be told apart.
// Same as icecatNamingProperties in devices-service.
function namingProperties(g) {
  return [
    ["ProductFamily", g.ProductFamily?.Value],
    ["ProductSeries", g.ProductSeries?.Value],
    ["Title", g.Title],
  ]
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([property_name, property_value]) => ({
      property_name,
      property_value,
    }));
}

function extractFeaturesFromIcecat(json) {
  const out = [];
  try {
    const groups = json?.data?.FeaturesGroups || json?.FeaturesGroups || [];
    console.log(`Found ${groups.length} feature groups`);
    for (const g of groups) {
      const features = g.Features || [];
      console.log(
        `  Group ${g.GroupName || g.Name || g["@_GroupName"] || ""} has ${
          features.length
        } features`,
      );
      console.log(features);
      if (!Array.isArray(features)) continue;
      for (const f of features) {
        // Prefer the mapping: feature name = Feature->Name->Value, feature value = RawValue
        // Many Icecat exports put the human-readable name under f.Feature.Name.Value and the product-specific value under f.RawValue
        const featWrapper = f.Feature || f; // wrapper may be nested or the object itself
        const featureObj = featWrapper; // feature object containing ID, Name, Measure, Sign, ...
        // Feature name: try Feature.Name.Value (prefer Language 'EN' if available)
        let featureName = null;
        if (featureObj && featureObj.Name) {
          if (typeof featureObj.Name === "object") {
            // Some structures: { Value: 'Display diagonal', Language: 'EN' }
            if (
              featureObj.Name.Value &&
              (!featureObj.Name.Language ||
                String(featureObj.Name.Language).toUpperCase() === "EN")
            ) {
              featureName = featureObj.Name.Value;
            } else if (featureObj.Name.Value) {
              featureName = featureObj.Name.Value;
            }
          } else if (typeof featureObj.Name === "string") {
            featureName = featureObj.Name;
          }
        }

        // Value: prefer the RawValue present on the feature instance, fall back to various Value fields
        const rawValue =
          f.RawValue ||
          f.Raw_Value ||
          f.Value ||
          featWrapper.Value ||
          featWrapper.PresentationValue ||
          featWrapper.DisplayValue ||
          featWrapper.ValueText ||
          "";

        // feature id
        const featureId =
          featureObj && (featureObj.ID || featureObj.Id || featureObj.FeatureID)
            ? String(featureObj.ID || featureObj.Id || featureObj.FeatureID)
            : undefined;

        // sign handling (keep for backwards compatibility)
        const signCandidates = [];
        if (featureObj && featureObj.Sign) signCandidates.push(featureObj.Sign);
        if (featureObj && featureObj.SignId)
          signCandidates.push(featureObj.SignId);
        if (featureObj && featureObj.SignID)
          signCandidates.push(featureObj.SignID);
        // Check Measure -> Signs
        const measure =
          featureObj && (featureObj.Measure || featureObj.Measurement)
            ? featureObj.Measure || featureObj.Measurement
            : null;
        let measureSignId = undefined;
        let measureSignText = undefined;
        if (measure && measure.Signs) {
          const signsNode = measure.Signs;
          if (signsNode.ID) {
            measureSignId = signsNode.ID;
            measureSignText =
              signsNode._ || signsNode.Value || signsNode["#text"] || null;
          } else if (signsNode.Sign) {
            const signsList = Array.isArray(signsNode.Sign)
              ? signsNode.Sign
              : [signsNode.Sign];
            const enSign = signsList.find(
              (s) =>
                String(s?.langid || s?.Language) === "1" ||
                String(s?.Language) === "EN",
            );
            const pick = enSign || signsList[0];
            if (pick) {
              measureSignId =
                pick.ID || pick.Id || pick["@_ID"] || pick["@_Id"] || null;
              measureSignText =
                typeof pick === "string"
                  ? pick
                  : pick._ || pick.Value || pick["#text"] || null;
            }
          }
        }
        if (measureSignId) signCandidates.push(measureSignId);
        const sign = signCandidates.find(
          (s) => s !== undefined && s !== null && s !== "",
        );

        // push standardized feature object
        out.push({
          featureId: featureId,
          name: featureName || undefined,
          value: rawValue ? String(rawValue) : "",
          sign: sign ? String(sign) : undefined,
          signText: measureSignText || undefined,
        });
      }
    }
  } catch (e) {
    // fallback: try features array directly under data
    const feats = json?.data?.Features || json?.Features || [];
    if (Array.isArray(feats)) {
      for (const feat of feats) {
        const sign = feat.SignId || feat.SignID;
        const value = feat.Value || feat.ValueText;
        out.push({
          sign: sign ? String(sign) : undefined,
          value: value ? String(value) : "",
        });
      }
    }
  }
  return out;
}

/**
 * Authenticate with the API Gateway using OAuth2 Client Credentials
 * @param {string} apiBase - Base URL of the API
 * @param {string} clientId - OAuth2 client ID
 * @param {string} clientSecret - OAuth2 client secret
 * @returns {Promise<string>} Access token
 */
async function authenticate(apiBase, clientId, clientSecret) {
  const authUrl = `${apiBase}/api/v1/auth/oauth2/token`;
  console.log(`Authenticating with ${authUrl}...`);

  try {
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error("No access_token in authentication response");
    }

    console.log("Authentication successful");
    return data.access_token;
  } catch (error) {
    console.error("Authentication error:", error.message);
    throw error;
  }
}

async function main() {
  const args = parseArgs();
  if (!args.csv) {
    console.error("Missing --csv argument");
    process.exit(1);
  }

  // Configuration from environment variables or arguments

  const apiBase = process.env.API_BASE_URL || "http://localhost:3000";
  const clientId = process.env.OAUTH_CLIENT_ID || "icecat-importer";
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  if (!clientSecret) {
    console.error("Missing OAUTH_CLIENT_SECRET (see README.md).");
    process.exit(1);
  }

  // Authenticate and get token
  let token;
  try {
    token = await authenticate(apiBase, clientId, clientSecret);
  } catch (error) {
    console.error("Failed to authenticate. Exiting.");
    process.exit(1);
  }

  const featuresXml = args.featuresXml || null;
  const concurrency = parseInt(args.concurrency || "1", 10);
  const mode = args.mode || (args.outDir ? "files" : "api"); // 'api' or 'files'
  const outDir = args.outDir || null;

  if (mode === "files" && outDir) {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  }

  // Generate import tracking info
  const importId = `icecat-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const importDate = new Date().toISOString();

  // Initialize logger
  const logger = new Logger(args.logDir);
  logger.log(
    "INFO",
    `Starting import batch: ${importId}`,
    `Date: ${importDate}`,
  );
  logger.log("INFO", `Mode: ${mode}`, `Concurrency: ${concurrency}`);
  logger.log("INFO", `API Base: ${apiBase}`);

  // Setup graceful shutdown handler (Ctrl+C)
  let isShuttingDown = false;
  process.on("SIGINT", () => {
    if (isShuttingDown) {
      console.log("\nForce quit detected. Exiting immediately.");
      process.exit(1);
    }
    isShuttingDown = true;
    console.log(
      "\n\nInterrupt signal received (Ctrl+C). Finishing current product and generating summary...",
    );
    logger.log("WARN", "Import interrupted by user (Ctrl+C)");
  });

  // Load category mapping if provided
  const mappingPath = args.mapping ? path.resolve(args.mapping) : null;
  let categoryMapping = null;
  if (mappingPath && fs.existsSync(mappingPath)) {
    try {
      categoryMapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
      console.log(`Loaded category mapping from ${mappingPath}`);
    } catch (e) {
      console.warn(`Failed to parse mapping file ${mappingPath}: ${e.message}`);
    }
  }

  async function ensureCategory(categoryObj) {
    if (!categoryObj) return null;
    // categoryObj: { CategoryID: '1893', Name: { Value: 'Smartphones', Language: 'EN' } }
    const catName =
      (categoryObj.Name && (categoryObj.Name.Value || categoryObj.Name)) ||
      categoryObj.Value ||
      String(categoryObj);
    const icecatId = categoryObj.CategoryID;

    // Check mapping first
    if (categoryMapping && icecatId && categoryMapping[icecatId]) {
      const mapped = categoryMapping[icecatId];
      // console.log(`Mapped Icecat category ${icecatId} (${mapped.icecatName}) to Backend category ${mapped.backendId} (${mapped.backendName})`);
      return { id: mapped.backendId, name: mapped.backendName };
    }

    if (!catName) return null;

    try {
      const listRes = await fetch(`${apiBase}/api/v1/device-categories`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!listRes.ok)
        throw new Error(`Failed to fetch categories ${listRes.status}`);
      const categories = await listRes.json();
      // find by name (case-insensitive)
      const found = (categories || []).find(
        (c) =>
          String(c.name || "").toLowerCase() === String(catName).toLowerCase(),
      );
      if (found && found.id) return { id: found.id, name: found.name };

      // create category
      const createRes = await fetch(`${apiBase}/api/v1/device-categories`, {
        method: "POST",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          token ? { Authorization: `Bearer ${token}` } : {},
        ),
        body: JSON.stringify({ name: catName }),
      });
      if (!createRes.ok) {
        const txt = await createRes.text();
        throw new Error(
          `Failed to create category ${createRes.status} ${createRes.statusText} - ${txt}`,
        );
      }
      const created = await createRes.json();
      return { id: created?.id || null, name: created?.name || catName };
    } catch (e) {
      console.error("ensureCategory error:", e.message || e);
      return null;
    }
  }

  // Load selected category ids filter (optional). If provided via --selectedIds or
  // if a default `selected_ids.json` exists next to the importer, we'll use it to
  // filter devices: only devices whose resolved backend category id is present
  // in this set will be imported.
  const selectedIdsPath = args.selectedIds
    ? path.resolve(args.selectedIds)
    : path.join(__dirname, "selected_ids.json");
  let selectedIdsSet = null;
  if (fs.existsSync(selectedIdsPath)) {
    try {
      const raw = fs.readFileSync(selectedIdsPath, "utf8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        selectedIdsSet = new Set(arr.map((v) => String(v).trim()));
        console.log(
          `Loaded ${selectedIdsSet.size} selected category ids from ${selectedIdsPath}`,
        );
      } else {
        console.warn(
          `Selected ids file ${selectedIdsPath} does not contain a top-level array, ignoring filter.`,
        );
      }
    } catch (e) {
      console.warn(
        `Failed to parse selected ids file ${selectedIdsPath}, ignoring filter: ${
          e.message || e
        }`,
      );
      selectedIdsSet = null;
    }
  } else {
    // no file found: selectedIdsSet stays null and no filtering is applied
    console.log(
      `No selected ids file at ${selectedIdsPath} - proceeding without category filter (use --selectedIds to set one).`,
    );
  }

  // Parse resume options
  const skipLines = args.skip ? parseInt(args.skip, 10) : 0;
  const startId = args.startId || null;

  if (skipLines > 0) {
    console.log(`Resume mode: Skipping first ${skipLines} lines`);
  }
  if (startId) {
    console.log(`Resume mode: Starting from product ID ${startId}`);
  }

  const idsIterator = readCsvStream(
    args.csv,
    selectedIdsSet,
    skipLines,
    startId,
  );
  console.log(`Reading CSV stream from ${args.csv}`);
  //const { signMap, nameMap } = buildFeatureMapFromXml(featuresXml || "");
  // NEW:
  let signMap = {};
  let nameMap = {};

  if (args.featuresJson) {
    const result = loadFeaturesFromJson(args.featuresJson);
    signMap = result.signMap;
    nameMap = result.nameMap;
  } else if (featuresXml) {
    const result = buildFeatureMapFromXml(featuresXml);
    signMap = result.signMap;
    nameMap = result.nameMap;
  } else {
    console.warn("No features file provided, feature names will use IDs");
  }
  console.log(
    `Loaded ${Object.keys(signMap).length} signs and ${
      Object.keys(nameMap).length
    } feature names from XML`,
  );

  // If --dryJson is provided, load a local Icecat JSON file and print the payload without posting/writing files
  if (args.dryJson) {
    const jsonPath = args.dryJson;
    if (!fs.existsSync(jsonPath)) {
      console.error("dryJson file not found:", jsonPath);
      process.exit(1);
    }
    const j = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const g = j.data?.GeneralInfo || j.GeneralInfo || {};
    const eans = g?.GTIN || g?.GTINs || [];
    const ean = Array.isArray(eans) && eans.length ? String(eans[0]) : "";
    const serial = g.BrandPartCode || String(g.IcecatId || "");
    const manufacturer = g.Brand || g.BrandInfo?.BrandName || "";
    const brand = g.Brand || "";
    const model =
      g.ProductName || g.ProductSeries?.Value || g.ProductFamily?.Value || "";

    const icecatFeatures = extractFeaturesFromIcecat(j);
    const technicalProperties = icecatFeatures
      .map((f) => {
        const jsonFeatureName = f.name;
        const featureNameFromXml = f.featureId && nameMap[f.featureId];
        const signTextFromXml = f.sign && signMap[f.sign];
        const propName =
          jsonFeatureName ||
          featureNameFromXml ||
          signTextFromXml ||
          f.signText ||
          f.sign ||
          "unknown";
        return { property_name: propName, property_value: f.value || "" };
      })
      .filter((p) => p.property_name && p.property_value !== undefined);

    if (technicalProperties == undefined) {
      technicalProperties = [];
    }

    if (j?.data?.GeneralInfo?.BrandPartCode) {
      technicalProperties.push({
        property_name: "BrandPartCode",
        property_value: j.data.GeneralInfo.BrandPartCode,
      });
    }

    // Extract additional metadata from Icecat JSON (Duplicate logic for dry run)
    const additionalProperties = [];

    // Add ReleaseDate and EndOfLifeDate
    if (j?.data?.GeneralInfo?.ReleaseDate) {
      additionalProperties.push({
        property_name: "ReleaseDate",
        property_value: j.data.GeneralInfo.ReleaseDate,
      });
    }
    if (j?.data?.GeneralInfo?.EndOfLifeDate) {
      additionalProperties.push({
        property_name: "EndOfLifeDate",
        property_value: j.data.GeneralInfo.EndOfLifeDate,
      });
    }

    // Add Description metadata
    if (j?.data?.GeneralInfo?.Description?.Updated) {
      additionalProperties.push({
        property_name: "Updated",
        property_value: j.data.GeneralInfo.Description.Updated,
      });
    }
    if (j?.data?.GeneralInfo?.Description?.URL) {
      additionalProperties.push({
        property_name: "URL",
        property_value: j.data.GeneralInfo.Description.URL,
      });
    }
    if (j?.data?.GeneralInfo?.Description?.LongDesc) {
      additionalProperties.push({
        property_name: "LongDescription",
        property_value: j.data.GeneralInfo.Description.LongDesc,
      });
    }

    // Add Image URLs
    if (j?.data?.Image?.HighPic) {
      additionalProperties.push({
        property_name: "Image_HighPic",
        property_value: j.data.Image.HighPic,
      });
    }
    if (j?.data?.Image?.LowPic) {
      additionalProperties.push({
        property_name: "Image_LowPic",
        property_value: j.data.Image.LowPic,
      });
    }
    if (j?.data?.Image?.Pic500x500) {
      additionalProperties.push({
        property_name: "Image_Pic500x500",
        property_value: j.data.Image.Pic500x500,
      });
    }
    if (j?.data?.Image?.ThumbPic) {
      additionalProperties.push({
        property_name: "Image_ThumbPic",
        property_value: j.data.Image.ThumbPic,
      });
    }

    // Add Multimedia as JSON string
    if (
      j?.data?.Multimedia &&
      Array.isArray(j.data.Multimedia) &&
      j.data.Multimedia.length > 0
    ) {
      additionalProperties.push({
        property_name: "Multimedia",
        property_value: JSON.stringify(j.data.Multimedia),
      });
    }

    additionalProperties.push(...namingProperties(g));

    const payload = {
      ean: ean || "",
      serial_number: "",
      product_code: serial || "",
      manufacturer: manufacturer || "",
      brand: brand || "",
      model: model || "",
      categories: [],
      device_type: "UNKNOWN",
      source: "ICECAT",
      import_id: importId,
      import_date: importDate,
      source_id: String(g.IcecatId || ""), // Icecat ID
      technicalProperties: technicalProperties,
      informationalProperties: additionalProperties,
    };

    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
  }

  // Concurrency control
  let activePromises = 0;
  let processingComplete = false;
  let totalProcessed = 0;

  // Function to process a single product
  const processProduct = async (id, index) => {
    // Check if shutdown was requested
    if (isShuttingDown) return;

    console.log(`Processing #${index}: ${id}`);

    // Check if device already exists to avoid unnecessary Icecat API calls
    // Only check in API mode (not files mode)
    // If --no-update is set, we check here and skip if exists
    if (mode !== "files" && args.noUpdate) {
      try {
        const existing = await checkDeviceExists(apiBase, token, id);
        if (existing) {
          logger.logSuccess(
            id,
            existing.ean || "N/A",
            "SKIPPED (ALREADY EXISTS - NO UPDATE)",
          );
          // Force garbage collection occasionally even when skipping
          if (index % 50 === 0 && global.gc) {
            global.gc();
          }
          return;
        }
      } catch (err) {
        console.warn(`Failed to check existence for ${id}: ${err.message}`);
        // Continue with import if check fails
      }
    }

    try {
      const j = await fetchIcecatJson(id, logger);
      const g = j.data?.GeneralInfo || j.GeneralInfo || {};
      const eans = g?.GTIN || g?.GTINs || [];
      const ean = Array.isArray(eans) && eans.length ? String(eans[0]) : "";
      const serial = g.BrandPartCode || String(id);
      const manufacturer = g.Brand || g.BrandInfo?.BrandName || "";
      const brand = g.Brand || "";
      const model =
        g.ProductName || g.ProductSeries?.Value || g.ProductFamily?.Value || "";

      console.log(
        `Fetched Icecat product: ${manufacturer} ${model} (EAN: ${ean}, SN: ${serial})`,
      );
      const icecatFeatures = extractFeaturesFromIcecat(j);
      // resolve category id(s)
      // - In API mode: resolve Icecat category -> backend category id (may create)
      // - In files mode: DO NOT call the backend. Use the Icecat category id from
      //   the product JSON and include it in the output. Filtering by
      //   `selected_ids.json` will compare against these Icecat IDs.
      let categoryIds = [];
      try {
        const catObj =
          j.data?.GeneralInfo?.Category || j.Category || g.Category || null;

        // Try to resolve using mapping first, even in files mode if mapping is present
        let mappedCategory = null;
        if (
          categoryMapping &&
          catObj &&
          catObj.CategoryID &&
          categoryMapping[catObj.CategoryID]
        ) {
          const m = categoryMapping[catObj.CategoryID];
          mappedCategory = { id: m.backendId, name: m.backendName };
        }

        if (mappedCategory) {
          categoryIds = [mappedCategory];
        } else if (mode === "files") {
          // extract Icecat category id from various possible shapes
          let icecatCatId = {};
          if (!catObj) icecatCatId = null;
          else if (typeof catObj === "string") icecatCatId = catObj;
          else {
            icecatCatId = { name: catObj.Name.Value, id: catObj.CategoryID };
          }
          if (icecatCatId) categoryIds = [icecatCatId];
        } else {
          const catId = await ensureCategory(catObj);
          if (catId) categoryIds = [catId];
        }
      } catch (e) {
        console.error("Category resolution failed for", id, e.message || e);
      }

      const technicalProperties = icecatFeatures
        .map((f) => {
          // prefer the feature name from the product JSON (Feature->Name->Value) first
          const jsonFeatureName = f.name;
          const featureNameFromXml = f.featureId && nameMap[f.featureId];
          const signTextFromXml = f.sign && signMap[f.sign];
          const propName =
            jsonFeatureName ||
            featureNameFromXml ||
            signTextFromXml ||
            f.signText ||
            f.sign ||
            "unknown";
          return { property_name: propName, property_value: f.value || "" };
        })
        .filter((p) => p.property_name && p.property_value !== undefined);

      if (technicalProperties == undefined) {
        technicalProperties = [];
      }

      if (
        j?.data?.GeneralInfo?.BrandPartCode &&
        typeof j.data.GeneralInfo.BrandPartCode === "string" &&
        j.data.GeneralInfo.BrandPartCode.length > 0
      ) {
        technicalProperties.push({
          property_name: "BrandPartCode",
          property_value: j.data.GeneralInfo.BrandPartCode,
        });
      }

      if (
        j?.data?.GeneralInfo?.GTIN &&
        Array.isArray(j.data.GeneralInfo.GTIN) &&
        j.data.GeneralInfo.GTIN.length > 0
      ) {
        technicalProperties.push({
          property_name: "GTIN",
          property_value: j.data.GeneralInfo.GTIN.join(","),
        });
      } else if (
        j?.data?.GeneralInfo?.GTIN &&
        typeof j.data.GeneralInfo.GTIN === "string" &&
        j.data.GeneralInfo.GTIN.length > 0
      ) {
        technicalProperties.push({
          property_name: "GTIN",
          property_value: j.data.GeneralInfo.GTIN,
        });
      }
      // Extract additional metadata from Icecat JSON
      const additionalProperties = [];

      // Add ReleaseDate and EndOfLifeDate
      if (
        j?.data?.GeneralInfo?.ReleaseDate &&
        typeof j.data.GeneralInfo.ReleaseDate === "string" &&
        j.data.GeneralInfo.ReleaseDate.length > 0
      ) {
        additionalProperties.push({
          property_name: "ReleaseDate",
          property_value: j.data.GeneralInfo.ReleaseDate,
        });
      }
      if (
        j?.data?.GeneralInfo?.EndOfLifeDate &&
        typeof j.data.GeneralInfo.EndOfLifeDate === "string" &&
        j.data.GeneralInfo.EndOfLifeDate.length > 0
      ) {
        additionalProperties.push({
          property_name: "EndOfLifeDate",
          property_value: j.data.GeneralInfo.EndOfLifeDate,
        });
      }

      // Add Description metadata
      if (
        j?.data?.GeneralInfo?.Description?.LongDesc &&
        typeof j.data.GeneralInfo.Description.LongDesc === "string" &&
        j.data.GeneralInfo.Description.LongDesc.length > 0
      ) {
        additionalProperties.push({
          property_name: "LongDesc",
          property_value: j.data.GeneralInfo.Description.LongDesc,
        });
      }
      if (
        j?.data?.GeneralInfo?.Description?.Updated &&
        typeof j.data.GeneralInfo.Description.Updated === "string" &&
        j.data.GeneralInfo.Description.Updated.length > 0
      ) {
        additionalProperties.push({
          property_name: "Updated",
          property_value: j.data.GeneralInfo.Description.Updated,
        });
      }
      if (
        j?.data?.GeneralInfo?.Description?.URL &&
        typeof j.data.GeneralInfo.Description.URL === "string" &&
        j.data.GeneralInfo.Description.URL.length > 0
      ) {
        additionalProperties.push({
          property_name: "URL",
          property_value: j.data.GeneralInfo.Description.URL,
        });
      }

      // Add Image URLs
      if (
        j?.data?.Image?.HighPic &&
        typeof j.data.Image.HighPic === "string" &&
        j.data.Image.HighPic.length > 0
      ) {
        additionalProperties.push({
          property_name: "Image_HighPic",
          property_value: j.data.Image.HighPic,
        });
      }
      if (
        j?.data?.Image?.LowPic &&
        typeof j.data.Image.LowPic === "string" &&
        j.data.Image.LowPic.length > 0
      ) {
        additionalProperties.push({
          property_name: "Image_LowPic",
          property_value: j.data.Image.LowPic,
        });
      }
      if (
        j?.data?.Image?.Pic500x500 &&
        typeof j.data.Image.Pic500x500 === "string" &&
        j.data.Image.Pic500x500.length > 0
      ) {
        additionalProperties.push({
          property_name: "Image_Pic500x500",
          property_value: j.data.Image.Pic500x500,
        });
      }
      if (
        j?.data?.Image?.ThumbPic &&
        typeof j.data.Image.ThumbPic === "string" &&
        j.data.Image.ThumbPic.length > 0
      ) {
        additionalProperties.push({
          property_name: "Image_ThumbPic",
          property_value: j.data.Image.ThumbPic,
        });
      }

      // Add Multimedia as JSON string
      if (
        j?.data?.Multimedia &&
        Array.isArray(j.data.Multimedia) &&
        j.data.Multimedia.length > 0
      ) {
        additionalProperties.push({
          property_name: "Multimedia",
          property_value: JSON.stringify(j.data.Multimedia),
        });
      }

      additionalProperties.push(...namingProperties(g));

      // Combine technical properties with additional metadata
      const informationalProperties = [...additionalProperties];

      const payload = {
        ean: ean || "",
        serial_number: "",
        product_code: serial || "",
        manufacturer: manufacturer || "",
        brand: brand || "",
        model: model || "",
        categories: categoryIds
          .map((c) => Number(c.id))
          .filter((id) => !isNaN(id)),
        device_type: "",
        source: "ICECAT",
        import_id: importId,
        import_date: importDate,
        source_id: String(id), // Icecat ID
        technicalProperties: technicalProperties,
        informationalProperties: informationalProperties,
      };

      if (mode === "files") {
        // write payload to a JSON file per device
        const safeName = (payload.ean || payload.product_code || id || "device")
          .toString()
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = path.join(outDir || ".", `${safeName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
        console.log("Wrote device JSON to", filePath);
      } else {
        console.log(
          "Posting device payload with",
          "properties (",
          technicalProperties.length,
          "technical +",
          informationalProperties.length,
          "informational)",
        );

        // Check if device exists
        const existing = await checkDeviceExists(
          apiBase,
          token,
          payload.source_id,
        );

        if (existing) {
          logger.log(
            "INFO",
            `Device exists (ID: ${existing.device_id})`,
            `Source ID: ${payload.source_id}`,
          );

          if (args.noUpdate) {
            logger.logSuccess(
              existing.device_id,
              payload.ean,
              "SKIPPED (NO UPDATE)",
            );
          } else if (hasChanges(existing, payload)) {
            logger.log(
              "INFO",
              "Changes detected. Updating device...",
              `EAN: ${payload.ean || "N/A"}`,
            );
            const res = await updateDevice(
              apiBase,
              token,
              existing.device_id,
              payload,
            );
            logger.logSuccess(res.device_id, payload.ean, "UPDATED");
          } else {
            logger.logSuccess(existing.device_id, payload.ean, "SKIPPED");
          }
        } else {
          logger.log(
            "INFO",
            "Device not found. Creating new device...",
            `EAN: ${payload.ean || "N/A"}`,
          );
          const res = await postToApi(
            apiBase + "/api/v1/devices",
            token,
            payload,
          );
          console.log(res);
          logger.logSuccess(res.device_id, payload.ean, "CREATED");
        }
      }
    } catch (e) {
      // Check if this is a brand restriction error
      if (e.code === "BRAND_RESTRICTED") {
        logger.incrementBrandRestricted();
        logger.log("WARN", `Skipping product ${id}`, `Reason: ${e.message}`);
        return; // Skip this product
      }
      // For other errors, log as error
      logger.logError(id, null, e);
    }

    // Explicit GC every 50 items
    if (index % 50 === 0 && global.gc) {
      global.gc();
    }
  };

  let i = 0;
  const promises = [];

  for await (const id of idsIterator) {
    i += 1;

    // Check if shutdown was requested
    if (isShuttingDown) {
      logger.log("INFO", "Stopping import due to user interrupt");
      break;
    }

    // Wait if concurrency limit reached
    while (activePromises >= concurrency) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    activePromises++;
    const p = processProduct(id, i).finally(() => {
      activePromises--;
    });
    promises.push(p);

    // Cleanup finished promises to avoid memory leak in long running process
    if (promises.length > concurrency * 2) {
      // This is a simple cleanup, in a real queue we would remove finished items
      // But here we just let them accumulate in memory if we don't clear them
      // Since we await them at the end, we can't easily clear the array
      // But we can rely on activePromises for flow control
    }
  }

  // Wait for all remaining promises
  if (activePromises > 0) {
    console.log(`Waiting for ${activePromises} active requests to finish...`);
    while (activePromises > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Log final summary
  logger.logSummary(isShuttingDown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
