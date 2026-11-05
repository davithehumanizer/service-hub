# Memory Optimization for Icecat Import

## Problem

The Icecat importer runs out of memory (heap out of memory) even with `--max-old-space-size=2048` on servers with limited RAM (8GB).

## Root Cause

The main memory consumers are:
1. **FeaturesList.xml** (~500MB) loaded entirely into memory
2. **Large JSON responses** from Icecat API
3. **Accumulated data** from processing many products

## Solutions

### Solution 1: Run Without Features XML (Recommended for Low RAM)

The `FeaturesList.xml` file is only used to enrich feature names. You can skip it to save ~500MB of RAM:

```bash
# Run without --featuresXml argument
NODE_OPTIONS="--max-old-space-size=1536 --expose-gc" node import_icecat.js \
  --csv chunks/chunk_0001.csv \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json
  # NO --featuresXml argument
```

**Trade-off**: Feature names will use Icecat's internal IDs instead of human-readable names, but all data will still be imported.

### Solution 2: Reduce Chunk Size

Split CSV into smaller chunks (5,000 lines instead of 10,000):

```bash
node split_csv.js --input data/files.index.csv --lines 5000 --output chunks/
```

### Solution 3: Stop Docker Containers Temporarily

Free up RAM by stopping non-essential Docker containers during import:

```bash
# Stop all containers except database
docker stop $(docker ps -q | grep -v $(docker ps -q --filter "name=db"))

# Run import
./run_all_chunks.sh

# Restart containers
docker-compose up -d
```

### Solution 4: Use Swap Space (Linux)

Add swap space to handle memory spikes:

```bash
# Create 4GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Updated run_all_chunks.sh

The script has been updated to:
- Use `--expose-gc` to enable manual garbage collection
- Reduce memory limit to 1536MB (safer for 8GB server)
- Add pauses between chunks

## Recommended Workflow for 8GB Server

```bash
# 1. Stop non-essential Docker containers
docker-compose stop frontend api-gateway notifications-service

# 2. Split CSV into small chunks
node split_csv.js --input data/files.index.csv --lines 5000 --output chunks/

# 3. Run import WITHOUT features XML
NODE_OPTIONS="--max-old-space-size=1536 --expose-gc" node import_icecat.js \
  --csv chunks/chunk_0001.csv \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json

# 4. Or use the automated script (edit it to remove --featuresXml)
./run_all_chunks.sh

# 5. Restart Docker containers
docker-compose up -d
```

## Monitoring Memory Usage

Monitor memory during import:

```bash
# In another terminal
watch -n 1 'free -h && echo "---" && ps aux | grep node | grep -v grep'
```

## If Still Running Out of Memory

1. **Reduce chunk size to 2,500 lines**
2. **Process chunks one by one manually** with 5-minute breaks between each
3. **Consider upgrading server RAM** or using a more powerful machine for initial import
4. **Use a separate import server** then copy the database

## Performance Impact

Without `FeaturesList.xml`:
- ✅ Memory usage: ~500MB less
- ✅ Startup time: Much faster
- ⚠️ Feature names: Will be IDs instead of readable names
- ✅ All data: Still imported correctly

The feature names can be enriched later if needed by running a separate script that only updates the `property_name` fields.
