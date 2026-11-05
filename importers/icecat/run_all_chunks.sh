#!/bin/bash

# Script to run Icecat import on all CSV chunks
# Optimized for 8GB RAM server - WITHOUT FeaturesList.xml
# Usage: ./run_all_chunks.sh

CHUNKS_DIR="./chunks"
MAPPING="./mappings/category_mapping.json"
SELECTED_IDS="./mappings/selected_ids.json"
FEATURES_JSON="./data/features.json"

# Check if chunks directory exists
if [ ! -d "$CHUNKS_DIR" ]; then
  echo "Error: Chunks directory not found: $CHUNKS_DIR"
  echo "Please run split_csv.js first to create chunks"
  exit 1
fi

# Count total chunks
TOTAL_CHUNKS=$(ls -1 "$CHUNKS_DIR"/chunk_*.csv 2>/dev/null | wc -l)

if [ "$TOTAL_CHUNKS" -eq 0 ]; then
  echo "Error: No chunk files found in $CHUNKS_DIR"
  exit 1
fi

echo "========================================="
echo "Icecat Import - Processing $TOTAL_CHUNKS chunks"
echo "Optimized for 8GB RAM (NO FeaturesList.xml)"
echo "========================================="
echo ""

CURRENT=0
FAILED=0

# Process each chunk
for CHUNK_FILE in "$CHUNKS_DIR"/chunk_*.csv; do
  CURRENT=$((CURRENT + 1))
  CHUNK_NAME=$(basename "$CHUNK_FILE")
  
  echo "[$CURRENT/$TOTAL_CHUNKS] Processing $CHUNK_NAME..."
  
  # Run import WITHOUT featuresXml to save ~500MB RAM
  # Property names will be IDs instead of readable names
  node --max-old-space-size=1024 --expose-gc import_icecat.js \
    --csv "$CHUNK_FILE" \
    --mapping "$MAPPING" \
    --selectedIds "$SELECTED_IDS" \
    --featuresJson "$FEATURES_JSON" \
    --noUpdate \
    --concurrency 20
  
  if [ $? -eq 0 ]; then
    echo "✓ $CHUNK_NAME completed successfully"
  else
    echo "✗ $CHUNK_NAME failed"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
  
  # Longer pause between chunks to let garbage collector clean up
  sleep 10
done

echo "========================================="
echo "Import Summary"
echo "========================================="
echo "Total chunks: $TOTAL_CHUNKS"
echo "Successful: $((TOTAL_CHUNKS - FAILED))"
echo "Failed: $FAILED"
echo "========================================="

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
