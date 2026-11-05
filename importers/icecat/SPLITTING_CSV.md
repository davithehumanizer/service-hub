# Splitting Large CSV Files for Icecat Import

## Problem

When importing large CSV files (like `files.index.csv` with ~900MB), Node.js may run out of memory, especially on servers with limited RAM (8GB) and running Docker containers.

## Solution: Split CSV into Chunks

### Step 1: Split the CSV File

Use the `split_csv.js` script to divide the large CSV into smaller chunks:

```bash
cd importers/icecat

# Split into chunks of 10,000 lines each (adjust based on your needs)
node split_csv.js --input data/files.index.csv --lines 10000 --output chunks/
```

**Options:**
- `--input`: Path to the large CSV file
- `--lines`: Number of lines per chunk (default: 10000)
- `--output`: Output directory for chunks (default: ./chunks/)

**Example output:**
```
Splitting data/files.index.csv into chunks of 10000 lines...
✓ Created chunks/chunk_0001.csv (10000 lines)
✓ Created chunks/chunk_0002.csv (10000 lines)
✓ Created chunks/chunk_0003.csv (10000 lines)
...
✅ Done! Created 50 chunk files in chunks/
Total lines processed: 500000
```

### Step 2: Process All Chunks Automatically

Use the `run_all_chunks.sh` script to process all chunks sequentially:

```bash
chmod +x run_all_chunks.sh
./run_all_chunks.sh
```

This script will:
- Process each chunk file in order
- Use limited memory (`--max-old-space-size=2048`)
- Add a 2-second pause between chunks
- Show progress and summary

**Example output:**
```
=========================================
Icecat Import - Processing 50 chunks
=========================================

[1/50] Processing chunk_0001.csv...
✓ chunk_0001.csv completed successfully

[2/50] Processing chunk_0002.csv...
✓ chunk_0002.csv completed successfully

...

=========================================
Import Summary
=========================================
Total chunks: 50
Successful: 50
Failed: 0
=========================================
```

### Step 3: Manual Processing (Alternative)

If you prefer to process chunks manually:

```bash
# Process first chunk
NODE_OPTIONS="--max-old-space-size=2048" node import_icecat.js \
  --csv chunks/chunk_0001.csv \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json \
  --featuresXml data/FeaturesList.xml

# Process second chunk
NODE_OPTIONS="--max-old-space-size=2048" node import_icecat.js \
  --csv chunks/chunk_0002.csv \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json \
  --featuresXml data/FeaturesList.xml

# ... and so on
```

## Recommended Chunk Sizes

Based on available RAM:

| Available RAM | Recommended Lines per Chunk |
|---------------|----------------------------|
| 2-4 GB        | 5,000 - 10,000            |
| 4-8 GB        | 10,000 - 20,000           |
| 8+ GB         | 20,000 - 50,000           |

**For your server (8GB with Docker):** Start with **10,000 lines** per chunk.

## Monitoring Progress

All chunks will use the same log file pattern: `logs/import_YYYY-MM-DD.log`

You can monitor progress in real-time:

```bash
tail -f logs/import_$(date +%Y-%m-%d).log
```

## Resuming After Interruption

If a chunk fails or is interrupted:

1. Check the logs to see which chunk failed
2. Re-run only that specific chunk:
   ```bash
   NODE_OPTIONS="--max-old-space-size=2048" node import_icecat.js \
     --csv chunks/chunk_0042.csv \
     --mapping mappings/category_mapping.json \
     --selectedIds mappings/selected_ids.json \
     --featuresXml data/FeaturesList.xml
   ```

## Cleanup

After successful import, you can delete the chunks:

```bash
rm -rf chunks/
```

## Troubleshooting

### Still running out of memory?

1. **Reduce chunk size**: Use `--lines 5000` instead of 10000
2. **Reduce Node memory**: Use `--max-old-space-size=1024` instead of 2048
3. **Stop other Docker containers** temporarily during import

### Import is too slow?

1. **Increase chunk size**: Use `--lines 20000` if you have enough RAM
2. **Remove the sleep** in `run_all_chunks.sh` (line with `sleep 2`)

### Duplicate imports?

The importer checks for existing devices by `source_id`, so re-running chunks won't create duplicates. Existing devices will be updated instead.
