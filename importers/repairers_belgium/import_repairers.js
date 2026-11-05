const fs = require("fs");
const path = require("path");
const csv = require("fast-csv");
const wkx = require("wkx");
const fetch = require("node-fetch");
require("dotenv").config();

const API_URL = process.env.API_URL || "http://localhost:3000";
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const CSV_FILE = process.env.CSV_FILE || "locations_repairconnects.csv";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Error: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET must be set in .env"
  );
  process.exit(1);
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

function parseJsonField(field, defaultValue) {
  try {
    return field ? JSON.parse(field) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function extractCoordinates(wkbHex) {
  try {
    const buffer = Buffer.from(wkbHex, "hex");
    const geometry = wkx.Geometry.parse(buffer);
    if (geometry.x && geometry.y) {
      return { latitude: geometry.x, longitude: geometry.y }; // Note: wkx usually parses as x=lon, y=lat, but check your data
    }
    return null;
  } catch (error) {
    return null;
  }
}

function mapDeviceType(code) {
  // Map CSV device type code to backend category name
  // If not mapped, convert code to readable name (e.g., "power-tool" -> "Power Tool")
  if (deviceTypeMapping[code]) {
    return deviceTypeMapping[code];
  }

  // Convert unmapped codes to readable names
  return code
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Load device type mapping
let deviceTypeMapping = {};
try {
  deviceTypeMapping = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "device_type_mapping.json"), "utf8")
  );
  console.log(
    `Loaded ${Object.keys(deviceTypeMapping).length} device type mappings`
  );
} catch (e) {
  console.warn(
    "Warning: Could not load device_type_mapping.json, device types will not be mapped"
  );
}

async function importRepairers() {
  const token = await authenticate();
  const filePath = path.resolve(__dirname, CSV_FILE);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Reading CSV from ${filePath}...`);
  console.log("Fetching existing repairers to check for duplicates...");

  // Fetch all existing repairers to check for duplicates
  let existingRepairers = [];
  try {
    const response = await fetch(`${API_URL}/api/v1/repairers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      existingRepairers = await response.json();
      console.log(`Found ${existingRepairers.length} existing repairers`);
    }
  } catch (err) {
    console.warn(
      "Could not fetch existing repairers, will attempt to create all:",
      err.message
    );
  }

  // Create a map for quick lookup by import_id
  const existingByImportId = new Map();
  existingRepairers.forEach((r) => {
    if (r.repairer_import_id) {
      existingByImportId.set(r.repairer_import_id, r);
    }
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Error tracking
  const errors = [];
  const logDir = path.resolve(__dirname, "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(logDir, `import_${timestamp}.log`);

  function log(message) {
    const logMessage = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
  }

  log(`Starting import from ${filePath}`);
  log(`Found ${existingRepairers.length} existing repairers`);

  const stream = fs
    .createReadStream(filePath)
    .pipe(csv.parse({ headers: true }))
    .on("error", (error) => console.error(error))
    .on("data", async (row) => {
      stream.pause();

      try {
        const coords = extractCoordinates(row.geom);
        const emails = parseJsonField(row.contacts_email, []);
        const phones = parseJsonField(row.contacts_phone, []);
        const websites = parseJsonField(row.contacts_website, []);
        const deviceTypesRaw = parseJsonField(row.device_types, []);

        const repairerData = {
          repairer_import_id: row.id,
          name: row.name,
          description: row.description || "",
          address: row.address_formatted,
          country: row.address_country_code,
          postal_code: row.address_postal_code,
          city: row.address_city,
          latitude: coords ? coords.latitude : null,
          longitude: coords ? coords.longitude : null,
          email: emails.length > 0 ? emails[0].value : null,
          phone: phones.length > 0 ? phones[0].value : null,
          website: websites.length > 0 ? websites[0].value : null,
          source: "RepairConnects Belgium CSV",
          // Only include repairerDevices if there are device types
          // Send only device_type, the cascade relationship will handle the rest
          // Deduplicate device types after mapping
          ...(deviceTypesRaw.length > 0 && {
            repairerDevices: [
              ...new Set(deviceTypesRaw.map((dt) => mapDeviceType(dt.code))),
            ].map((device_type) => ({ device_type })),
          }),
        };

        // Check if repairer already exists
        const existing = existingByImportId.get(row.id);

        if (!existing) {
          // Create new repairer
          const response = await fetch(`${API_URL}/api/v1/repairers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(repairerData),
          });

          if (response.ok) {
            createdCount++;
            if (createdCount % 100 === 0) process.stdout.write(".");
            log(`CREATED: ${row.name} (${row.id})`);
            //add to existing map to prevent duplicates in same import
            const createdRepairer = await response.json();
            existingByImportId.set(row.id, createdRepairer);
          } else {
            errorCount++;
            const errorText = await response.text();
            const errorMsg = `CREATE FAILED: ${row.name} (${row.id}) - Status: ${response.status} - ${errorText}`;
            log(errorMsg);
            errors.push({
              id: row.id,
              name: row.name,
              operation: "CREATE",
              status: response.status,
              error: errorText,
            });
          }
        } else {
          //just log existing, no update
          log(`Existing: ${row.name} (${row.id}), skip`);
        }
      } catch (err) {
        errorCount++;
        const errorMsg = `EXCEPTION: ${row.name} (${row.id}) - ${err.message}`;
        log(errorMsg);
        errors.push({
          id: row.id,
          name: row.name || "Unknown",
          operation: "EXCEPTION",
          error: err.message,
        });
        console.error(`Error processing row ${row.id}:`, err.message);
      }

      stream.resume();
    })
    .on("end", (rowCount) => {
      console.log(`\nImport completed.`);
      console.log(`Total rows: ${rowCount}`);
      console.log(`Created: ${createdCount}`);
      console.log(`Updated: ${updatedCount}`);
      console.log(`Skipped: ${skippedCount}`);
      console.log(`Errors: ${errorCount}`);

      log(`\n=== IMPORT SUMMARY ===`);
      log(`Total rows: ${rowCount}`);
      log(`Created: ${createdCount}`);
      log(`Updated: ${updatedCount}`);
      log(`Skipped: ${skippedCount}`);
      log(`Errors: ${errorCount}`);

      // Write error summary
      if (errors.length > 0) {
        const errorSummaryFile = path.join(logDir, `errors_${timestamp}.json`);
        fs.writeFileSync(errorSummaryFile, JSON.stringify(errors, null, 2));
        console.log(`\nError details written to: ${errorSummaryFile}`);
        log(`Error details written to: ${errorSummaryFile}`);

        // Group errors by status code
        const errorsByStatus = {};
        errors.forEach((e) => {
          const key = e.status || "EXCEPTION";
          if (!errorsByStatus[key]) errorsByStatus[key] = [];
          errorsByStatus[key].push(e);
        });

        console.log("\nError breakdown:");
        Object.keys(errorsByStatus).forEach((status) => {
          console.log(`  ${status}: ${errorsByStatus[status].length} errors`);
          log(`Error ${status}: ${errorsByStatus[status].length} occurrences`);
        });
      }

      console.log(`\nFull log written to: ${logFile}`);
    });
}

importRepairers();
