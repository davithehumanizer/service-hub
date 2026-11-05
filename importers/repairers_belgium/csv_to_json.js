const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const wkx = require('wkx');
require('dotenv').config();

const CSV_FILE = process.env.CSV_FILE || 'locations_repairconnects.csv';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'output';

// Load device type mapping
let deviceTypeMapping = {};
try {
  deviceTypeMapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'device_type_mapping.json'), 'utf8'));
  console.log(`Loaded ${Object.keys(deviceTypeMapping).length} device type mappings`);
} catch (e) {
  console.warn('Warning: Could not load device_type_mapping.json, device types will not be mapped');
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
    const buffer = Buffer.from(wkbHex, 'hex');
    const geometry = wkx.Geometry.parse(buffer);
    if (geometry.x && geometry.y) {
        return { latitude: geometry.y, longitude: geometry.x };
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
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

async function convertCsvToJson() {
  const filePath = path.resolve(__dirname, CSV_FILE);
  const outputDir = path.resolve(__dirname, OUTPUT_DIR);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Reading CSV from ${filePath}...`);
  console.log(`Output directory: ${outputDir}`);

  let processedCount = 0;
  let errorCount = 0;
  const allRepairers = [];

  const stream = fs.createReadStream(filePath)
    .pipe(csv.parse({ headers: true }))
    .on('error', error => console.error(error))
    .on('data', (row) => {
        try {
            const coords = extractCoordinates(row.geom);
            const emails = parseJsonField(row.contacts_email, []);
            const phones = parseJsonField(row.contacts_phone, []);
            const websites = parseJsonField(row.contacts_website, []);
            const deviceTypesRaw = parseJsonField(row.device_types, []);

            const repairerData = {
                repairer_import_id: row.id,
                name: row.name,
                description: row.description || '',
                address: row.address_formatted,
                country: row.address_country_code,
                postal_code: row.address_postal_code,
                city: row.address_city,
                latitude: coords ? coords.latitude : null,
                longitude: coords ? coords.longitude : null,
                email: emails.length > 0 ? emails[0].value : null,
                phone: phones.length > 0 ? phones[0].value : null,
                website: websites.length > 0 ? websites[0].value : null,
                source: 'RepairConnects Belgium CSV',
                ...(deviceTypesRaw.length > 0 && {
                    repairerDevices: [...new Set(deviceTypesRaw.map(dt => mapDeviceType(dt.code)))]
                        .map(device_type => ({ device_type }))
                })
            };

            allRepairers.push(repairerData);
            processedCount++;
            
            if (processedCount % 100 === 0) {
                process.stdout.write('.');
            }

        } catch (err) {
            errorCount++;
            console.error(`Error processing row ${row.id}:`, err.message);
        }
    })
    .on('end', () => {
      console.log(`\nConversion completed.`);
      console.log(`Processed: ${processedCount}`);
      console.log(`Errors: ${errorCount}`);

      // Write all repairers to a single JSON file
      const outputFile = path.join(outputDir, 'repairers.json');
      fs.writeFileSync(outputFile, JSON.stringify(allRepairers, null, 2));
      console.log(`\nWritten ${allRepairers.length} repairers to ${outputFile}`);

      // Optionally, write individual files
      console.log(`\nWriting individual JSON files...`);
      allRepairers.forEach((repairer, index) => {
        const filename = path.join(outputDir, `repairer_${repairer.repairer_import_id}.json`);
        fs.writeFileSync(filename, JSON.stringify(repairer, null, 2));
        if ((index + 1) % 100 === 0) {
          process.stdout.write('.');
        }
      });
      console.log(`\nDone! Created ${allRepairers.length} individual JSON files.`);
    });
}

convertCsvToJson();
