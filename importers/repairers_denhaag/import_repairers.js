const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const CSV_FILE = 'Den haag - Reparatiekaart data.csv';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

// Load category mapping
let categoryMapping = {};
try {
  categoryMapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'category_mapping.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: Could not load category_mapping.json');
}

async function authenticate() {
  console.log('Authenticating...');
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Authentication failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log('Authentication successful');
    return data.access_token;
  } catch (error) {
    console.error('Authentication error:', error.message);
    process.exit(1);
  }
}

function generateId(name, address) {
  return crypto.createHash('md5').update(`${name}${address}`).digest('hex');
}

async function geocodeAddress(address) {
    if (!address) return null;
    
    // Respect Nominatim usage policy: max 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
        const query = encodeURIComponent(address);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ServiceHub-Importer/1.0 (info@care2repair.eu)' 
            }
        });

        if (!response.ok) {
            console.warn(`Geocoding failed for ${address}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        console.warn(`Geocoding error for ${address}: ${error.message}`);
    }
    return null;
}

function mapCategories(productString) {
    if (!productString) return [];
    
    const products = productString.split(';').map(p => p.trim()).filter(p => p);
    const mapped = new Set();

    products.forEach(p => {
        // Try exact match
        if (categoryMapping[p]) {
            mapped.add(categoryMapping[p]);
        } else {
            // Try case-insensitive match
            const lowerP = p.toLowerCase();
            const found = Object.keys(categoryMapping).find(k => k.toLowerCase() === lowerP);
            if (found) {
                mapped.add(categoryMapping[found]);
            } else {
                console.log(`Unmapped category: ${p}`);
            }
        }
    });

    return Array.from(mapped).map(device_type => ({ device_type }));
}

async function importRepairers() {
  let token = null;
  if (!process.argv.includes('--dry-run')) {
      token = await authenticate();
  } else {
      console.log('Dry run: Skipping authentication');
  }
  
  const filePath = path.resolve(__dirname, CSV_FILE);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Reading CSV from ${filePath}...`);
  
  let createdCount = 0;
  let errorCount = 0;
  const rows = [];

  // Read all rows first to handle async processing sequentially
  await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv.parse({ headers: true, delimiter: ';' }))
        .on('error', error => reject(error))
        .on('data', row => rows.push(row))
        .on('end', () => resolve());
  });

  console.log(`Found ${rows.length} rows. Processing...`);

  for (const row of rows) {
      try {
          // Skip empty rows or rows without name or address
          if (!row.Naam || !row.Adres) continue;

          const importId = generateId(row.Naam, row.Adres);
          const address = row.Adres ? row.Adres.replace(/\n/g, ', ') : '';
          
          console.log(`Processing: ${row.Naam} (${importId})`);

          // Geocode
          let coords = null;
          if (address) {
              coords = await geocodeAddress(address);
              if (coords) console.log(`  Geocoded: ${coords.latitude}, ${coords.longitude}`);
              else console.log(`  Geocoding failed or no result`);
          }

          const repairerData = {
              repairer_import_id: importId,
              name: row.Naam,
              description: row.Type || '', // Using Type as description for now
              address: address,
              country: 'NL', // Assuming Den Haag is NL
              postal_code: '', // Could extract from address if needed, but address field has it
              city: 'Den Haag',
              latitude: coords ? coords.latitude : null,
              longitude: coords ? coords.longitude : null,
              email: row['E-mail'] || null,
              phone: row.Telefoonnummer || null,
              website: row.Website || null,
              source: 'Den Haag Reparatiekaart CSV',
              repairerDevices: mapCategories(row.Producten)
          };

          // Check if exists (optional, but good practice to avoid 409s if API doesn't handle upsert)
          // For now, we'll just try to create and catch errors
          
          if (process.argv.includes('--dry-run')) {
              console.log(`  [DRY RUN] Would create repairer:`, JSON.stringify(repairerData, null, 2));
              createdCount++;
              continue;
          }

          const response = await fetch(`${API_URL}/api/v1/repairers`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(repairerData)
          });

          if (response.ok) {
              createdCount++;
              console.log(`  CREATED`);
          } else {
              const text = await response.text();
              console.error(`  FAILED: ${response.status} - ${text}`);
              errorCount++;
          }

      } catch (err) {
          console.error(`  EXCEPTION: ${err.message}`);
          errorCount++;
      }
  }

  console.log(`\nImport completed.`);
  console.log(`Created: ${createdCount}`);
  console.log(`Errors: ${errorCount}`);
}

importRepairers();
