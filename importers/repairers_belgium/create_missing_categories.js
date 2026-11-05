const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

// Function to convert CSV code to readable name
function codeToReadableName(code) {
  return code
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function authenticate() {
  console.log('Authenticating...');
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
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✓ Authenticated');
  return data.access_token;
}

async function createCategory(token, name) {
  const response = await fetch(`${API_URL}/api/v1/device-categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create category "${name}": ${response.status} ${text}`);
  }

  return response.json();
}

async function main() {
  try {
    // Load unmapped types
    const unmapped = JSON.parse(fs.readFileSync('unmapped_device_types.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('device_type_mapping.json', 'utf8'));

    console.log(`Found ${unmapped.length} unmapped device types\n`);

    // Authenticate
    const token = await authenticate();

    // Create categories and update mapping
    const newMappings = {};
    let created = 0;
    let errors = 0;

    for (const code of unmapped) {
      const readableName = codeToReadableName(code);
      
      try {
        console.log(`Creating category: "${readableName}" (from: ${code})`);
        await createCategory(token, readableName);
        newMappings[code] = readableName;
        created++;
        console.log(`  ✓ Created`);
      } catch (error) {
        errors++;
        console.error(`  ✗ Error: ${error.message}`);
        // Keep the code as-is if creation fails
        newMappings[code] = code;
      }
    }

    // Update mapping file
    const updatedMapping = { ...mapping, ...newMappings };
    fs.writeFileSync(
      'device_type_mapping.json',
      JSON.stringify(updatedMapping, null, 2)
    );

    console.log(`\n✓ Summary:`);
    console.log(`  Categories created: ${created}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Mapping file updated`);

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
