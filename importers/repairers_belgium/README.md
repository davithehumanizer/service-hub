# Repairers Importer

This script imports repairers from the `locations_repairconnects.csv` file into the Service Hub API.

## Prerequisites

- Node.js 14+ installed
- Service Hub API running (default: `http://localhost:3000`)
- OAuth2 client credentials with `repairer.create` permission

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your `.env` file with your OAuth2 credentials:
```env
API_URL=http://localhost:3000
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
CSV_FILE=locations_repairconnects.csv
```

## Usage

Run the import script:
```bash
node import_repairers.js
```

The script will:
1. Authenticate using OAuth2 client credentials
2. Read the CSV file
3. Parse and transform each row
4. POST each repairer to the API
5. Display progress and summary

## Data Mapping

The script maps CSV columns to API fields as follows:

| CSV Column | API Field | Notes |
|------------|-----------|-------|
| `id` | `repairer_import_id` | Unique identifier from source |
| `name` | `name` | Repairer name |
| `description` | `description` | Description |
| `address_formatted` | `address` | Full address |
| `address_country_code` | `country` | Country code (e.g., "BE") |
| `address_postal_code` | `postal_code` | Postal code |
| `address_city` | `city` | City name |
| `contacts_email` | `email` | First email from JSON array |
| `contacts_phone` | `phone` | First phone from JSON array |
| `contacts_website` | `website` | First website from JSON array |
| `geom` | `latitude`, `longitude` | WKB geometry parsed to coordinates |
| `device_types` | `repairerDevices` | Array of device types |

## Troubleshooting

- **Authentication fails**: Verify your `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` are correct
- **File not found**: Ensure `CSV_FILE` path is correct relative to the script location
- **Import errors**: Check API logs for detailed error messages
