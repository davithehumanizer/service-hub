# Repairers Import System - Scripts

## create_missing_categories.js

Creates missing device categories in the backend and updates the mapping file.

### Usage

```bash
# Make sure .env is configured with OAuth credentials
node create_missing_categories.js
```

### What it does

1. Reads `unmapped_device_types.json`
2. Converts CSV codes to readable names (e.g., `power-tool` → `Power Tool`)
3. Creates each category via `POST /api/v1/device-categories`
4. Updates `device_type_mapping.json` with the new mappings

### Example transformations

- `power-tool` → `Power Tool`
- `small-kitchen-item` → `Small Kitchen Item`
- `handheld-entertainment-device` → `Handheld Entertainment Device`
- `e-bikes` → `E Bikes`
