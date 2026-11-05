const fs = require("fs");
const path = require("path");
const csv = require("fast-csv");
const fetch = require("node-fetch");
const crypto = require("crypto");
require("dotenv").config();

const API_URL = process.env.API_URL || "http://localhost:3000";
const CLIENT_ID = process.env.OAUTH_CLIENT_ID || "repair-importer";
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const CSV_FILE = "acteurs-full.csv";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn(
    "Warning: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET not set. Use --dry-run to skip auth."
  );
}

// utility: detect delimiter from first line
function detectDelimiter(filePath) {
  try {
    const head =
      fs
        .readFileSync(filePath, { encoding: "utf8", flag: "r" })
        .split(/\r?\n/)[0] || "";
    const commaCount = (head.match(/,/g) || []).length;
    const semiCount = (head.match(/;/g) || []).length;
    return semiCount > commaCount ? ";" : ",";
  } catch (e) {
    return ",";
  }
}

function generateId(name, address) {
  return crypto
    .createHash("md5")
    .update(`${name || ""}${address || ""}`)
    .digest("hex");
}

async function authenticate() {
  console.log("Authenticating...");
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Authentication failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log("Authentication successful");
    return data.access_token;
  } catch (error) {
    console.error("Authentication error:", error.message);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeAddress(address) {
  if (!address) return null;
  await sleep(1200); // respect Nominatim ~1 request/sec
  try {
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ServiceHub-Importer/1.0 (info@care2repair.eu)",
      },
    });
    if (!response.ok) {
      console.warn(`Geocoding failed for ${address}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data && data.length > 0)
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
  } catch (err) {
    console.warn(`Geocoding error for ${address}: ${err.message}`);
  }
  return null;
}

function normalizeKey(k) {
  return (k || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
}

function parsePropositionsField(value) {
  if (!value) return [];
  value = value.toString().trim();
  // If JSON
  if (value.startsWith("[") || value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      // parsed may be array of objects with sous_categories
      const out = [];
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && item.sous_categories) {
            if (Array.isArray(item.sous_categories))
              out.push(...item.sous_categories.map((s) => s.trim()));
            else out.push(item.sous_categories.toString().trim());
          }
        });
      } else if (parsed.sous_categories) {
        if (Array.isArray(parsed.sous_categories))
          return parsed.sous_categories;
        return [parsed.sous_categories.toString().trim()];
      }
      return out;
    } catch (e) {
      // fallthrough
    }
  }
  // otherwise split by pipe, comma or semicolon
  return value
    .split(/\||,|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function importActeurs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const noGeocode = args.includes("--no-geocode");
  const limitArgIndex = args.indexOf("--limit");
  const limit =
    limitArgIndex !== -1 && args[limitArgIndex + 1]
      ? parseInt(args[limitArgIndex + 1], 10)
      : null;

  const filePath = path.resolve(__dirname, CSV_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // load category mapping
  let categoryMapping = {};
  const mappingPath = path.resolve(__dirname, "category_mapping_fr.json");
  try {
    categoryMapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
  } catch (e) {
    console.warn(
      "Warning: Could not load category_mapping_fr.json — continuing with empty mapping"
    );
  }
  // load backend mapping (tokens -> backend category names)
  let backendMapping = {};
  const backendMappingPath = path.resolve(
    __dirname,
    "category_mapping_backend.json"
  );
  try {
    backendMapping = JSON.parse(fs.readFileSync(backendMappingPath, "utf8"));
  } catch (e) {
    console.warn(
      "Warning: Could not load category_mapping_backend.json — continuing with empty backend mapping"
    );
  }

  let token = null;
  if (!dryRun) {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error(
        "Client credentials missing; use --dry-run or set OAUTH_CLIENT_ID/OAUTH_CLIENT_SECRET"
      );
      process.exit(1);
    }
    token = await authenticate();
  } else {
    console.log("Dry run: skipping authentication");
  }

  const delimiter = detectDelimiter(filePath);
  console.log(`Detected delimiter: '${delimiter}'`);

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, delimiter, trim: true }))
      .on("error", (err) => reject(err))
      .on("data", (row) => rows.push(row))
      .on("end", (rowCount) => resolve(rowCount));
  });

  // Pre-filter rows: keep only those that have 'reparer' or 'trier' (or propositions_de_services indicating these actions)
  const filteredRows = rows.filter((rawRow) => {
    const r = {};
    Object.keys(rawRow).forEach((k) => {
      let v = rawRow[k];
      if (typeof v === "string") v = v.replace(/\t/g, " ").trim();
      r[normalizeKey(k)] = v;
    });
    const getField = (...names) => {
      for (const n of names) {
        const v = r[normalizeKey(n)];
        if (v !== undefined && v !== null) return v;
      }
      return null;
    };

    const repl = (val) => {
      if (!val && val !== 0) return false;
      const s = val.toString().trim().toLowerCase();
      if (!s) return false;
      if (["1", "true", "oui", "yes"].includes(s)) return true;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed))
          return parsed.some(
            (p) =>
              (p.action && ["reparer", "trier"].includes(p.action)) || false
          );
      } catch (e) {}
      return true;
    };

    const hasReparer = repl(getField("reparer"));
    const hasTrier = repl(getField("trier"));

    // Also inspect propositions_de_services JSON for actions
    let propServices =
      getField("propositions_de_services") ||
      getField("proposition_de_services") ||
      "";
    let propActions = [];
    try {
      if (
        propServices &&
        (propServices.startsWith("[") || propServices.startsWith("{"))
      ) {
        const parsed = JSON.parse(propServices);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (p && p.action) propActions.push(p.action);
          });
        } else if (parsed.action) propActions.push(parsed.action);
      }
    } catch (e) {
      /* ignore parse errors here */
    }

    return (
      hasReparer ||
      hasTrier ||
      propActions.includes("reparer") ||
      propActions.includes("trier")
    );
  });

  console.log(
    `Found ${rows.length} rows. ${filteredRows.length} rows match reparer/trier and will be processed.`
  );

  let createdCount = 0;
  let errorCount = 0;
  let skippedDuplicates = 0;
  let skippedNoBackendDevices = 0;
  const unmapped = {};
  let processed = 0;

  // load previously imported SIRENs to avoid re-importing
  const importedSirensPath = path.resolve(__dirname, "imported_sirens.json");
  const importedSirens = new Set();
  try {
    if (fs.existsSync(importedSirensPath)) {
      const data = JSON.parse(fs.readFileSync(importedSirensPath, "utf8"));
      if (Array.isArray(data)) data.forEach((s) => importedSirens.add(s));
    }
  } catch (e) {
    console.warn("Could not read imported_sirens.json:", e.message);
  }
  for (const rawRow of filteredRows) {
    if (limit && processed >= limit) break;
    processed++;

    // normalize keys
    const row = {};
    Object.keys(rawRow).forEach((k) => {
      let v = rawRow[k];
      if (typeof v === "string") v = v.replace(/\t/g, " ").trim();
      row[normalizeKey(k)] = v;
    });

    // helper to get field by candidate names
    const get = (...names) => {
      for (const n of names) {
        const v = row[normalizeKey(n)];
        if (v !== undefined && v !== null) return v;
      }
      return null;
    };

    // extract SIREN (prefer 'siren' then 'siret') and normalize to 9 digits
    const rawSirenField = get("siren") || get("siret") || "";
    let sirenValue = null;
    if (rawSirenField) {
      const digits = rawSirenField.toString().replace(/\D/g, "");
      if (digits.length >= 9) {
        // if SIRET (14) take first 9, otherwise take first 9 digits
        sirenValue = digits.substr(0, 9);
      }
    }
    const name = get("nom", "nom_commercial", "name") || "";

    // skip if SIREN already imported
    if (sirenValue && importedSirens.has(sirenValue)) {
      console.log(`SKIP DUPLICATE SIREN: ${sirenValue} (${name || "unknown"})`);
      skippedDuplicates++;
      continue;
    }

    const address =
      (get("adresse") || "") +
      (get("complement_dadresse") ? ", " + get("complement_dadresse") : "");
    const city = get("ville") || "";
    const postal = get("code_postal") || "";
    const email = get("email", "e-mail", "e_mail", "contact_email") || null;
    const phone = get("telephone", "tel", "phone") || null;
    const lat = get("latitude") || "";
    const lon = get("longitude") || "";

    // Decide if this is a repairer or tri center
    const repl = (val) => {
      if (!val && val !== 0) return false;
      const s = val.toString().trim().toLowerCase();
      if (!s) return false;
      if (["1", "true", "oui", "yes"].includes(s)) return true;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed))
          return parsed.some(
            (p) =>
              (p.action && ["reparer", "trier"].includes(p.action)) || false
          );
      } catch (e) {}
      return true; // non-empty -> truthy
    };

    const hasReparer = repl(get("reparer")) || false;
    const hasTrier = repl(get("trier")) || false;
    // Also check propositions_de_services JSON for actions
    let propServices =
      get("propositions_de_services") || get("proposition_de_services") || "";
    let propActions = [];
    try {
      if (
        propServices &&
        (propServices.startsWith("[") || propServices.startsWith("{"))
      ) {
        const parsed = JSON.parse(propServices);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (p && p.action) propActions.push(p.action);
          });
        } else if (parsed.action) propActions.push(parsed.action);
      }
    } catch (e) {}

    if (
      !hasReparer &&
      !hasTrier &&
      !propActions.includes("reparer") &&
      !propActions.includes("trier")
    ) {
      // skip
      continue;
    }

    // extract product categories
    let products = [];
    if (propServices) products = parsePropositionsField(propServices);
    // fallback to some common product columns
    if (products.length === 0) {
      const fallback = get(
        "propositions_de_services_text",
        "produits",
        "type_de_services",
        "type_de_service",
        "propositions_de_services"
      );
      if (fallback) products = parsePropositionsField(fallback);
    }

    // also try fields that may contain pipe-separated values
    if (products.length === 0) {
      const candidate = get(""); // nothing
    }

    const mapped = new Set();
    products.forEach((p) => {
      const key = p.toString().trim();
      if (!key) return;
      // try mapping to backend using backendMapping first, then fallback to categoryMapping
      if (backendMapping[key]) mapped.add(backendMapping[key]);
      else {
        const foundBackend = Object.keys(backendMapping).find(
          (k) => k.toLowerCase() === key.toLowerCase()
        );
        if (foundBackend) mapped.add(backendMapping[foundBackend]);
        else {
          // record unmapped
          unmapped[key] = (unmapped[key] || 0) + 1;
        }
      }
    });

    const repairerDevices = Array.from(mapped).map((device_type) => ({
      device_type,
    }));

    const importId = generateId(name, address);
    // If none of the products map to backend categories, skip this actor
    if (repairerDevices.length === 0) {
      console.log(`SKIP (no backend device types): ${name} (${importId})`);
      skippedNoBackendDevices++;
      continue;
    }

    // prepare payload
    const sourceField = get("paternite") || "Longue Vie Aux Objets - Acteurs";
    const payload = {
      repairer_import_id: importId,
      name: name || "unknown",
      description: get("description") || "",
      address: address || "",
      country:
        get("nom_departement") || get("nom_region") || "FR" ? "FR" : "FR",
      postal_code: postal || "",
      city: city || "",
      latitude: lat ? Number(lat) : null,
      longitude: lon ? Number(lon) : null,
      email: email || null,
      phone: phone || null,
      website: get("site_web") || get("website") || null,
      source: sourceField,
      repairerDevices,
    };

    // geocode if needed
    if ((!payload.latitude || !payload.longitude) && !noGeocode) {
      const addrForGeocode = [
        payload.address,
        payload.postal_code,
        payload.city,
        "France",
      ]
        .filter(Boolean)
        .join(", ");
      const g = await geocodeAddress(addrForGeocode);
      if (g) {
        payload.latitude = g.latitude;
        payload.longitude = g.longitude;
      }
    }

    if (dryRun) {
      console.log(
        `[DRY] Would create: ${name} (${importId}) -> devices: ${JSON.stringify(
          payload
        )}`
      );
      // in dry-run, mark SIREN as seen to avoid duplicate dry-run outputs in same run
      if (sirenValue) importedSirens.add(sirenValue);
      createdCount++;
      continue;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/repairers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        createdCount++;
        if (sirenValue) importedSirens.add(sirenValue);
        console.log(`CREATED: ${name} (${importId})`);
      } else {
        const text = await res.text();
        console.error(`FAILED: ${name} (${importId}) -> ${res.status} ${text}`);
        errorCount++;
      }
    } catch (err) {
      console.error(`EXCEPTION for ${name}: ${err.message}`);
      errorCount++;
    }
  }

  // write unmapped
  try {
    fs.writeFileSync(
      path.resolve(__dirname, "unmapped_products_fr.json"),
      JSON.stringify(unmapped, null, 2),
      "utf8"
    );
    console.log("Wrote unmapped_products_fr.json");
  } catch (e) {
    console.warn("Could not write unmapped_products_fr.json:", e.message);
  }

  // persist imported SIRENs (only when not dry-run)
  if (!dryRun) {
    try {
      fs.writeFileSync(
        importedSirensPath,
        JSON.stringify(Array.from(importedSirens), null, 2),
        "utf8"
      );
      console.log(`Wrote ${importedSirensPath}`);
    } catch (e) {
      console.warn(`Could not write ${importedSirensPath}:`, e.message);
    }
  }

  console.log("\nImport completed.");
  console.log(`Created (or dry-run count): ${createdCount}`);
  console.log(`Skipped duplicates (existing SIREN): ${skippedDuplicates}`);
  console.log(`Errors: ${errorCount}`);
}

importActeurs();
