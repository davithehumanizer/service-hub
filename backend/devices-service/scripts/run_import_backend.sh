#!/bin/bash
# Script to run Icecat import DIRECTLY in backend (bypasses API)

# Get absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="/app"
IMPORTERS_DIR="$PROJECT_ROOT/importers/icecat"

CHUNKS_DIR="$IMPORTERS_DIR/chunks"
MAPPING="$IMPORTERS_DIR/mappings/category_mapping.json"
SELECTED_IDS="$IMPORTERS_DIR/mappings/selected_ids.json"
FEATURES_JSON="$IMPORTERS_DIR/data/features.json"

# Check if chunks directory exists
if [ ! -d "$CHUNKS_DIR" ]; then
  echo "Error: Chunks directory not found: $CHUNKS_DIR"
  exit 1
fi

# Count total chunks
TOTAL_CHUNKS=$(ls -1 "$CHUNKS_DIR"/chunk_*.csv 2>/dev/null | wc -l)

if [ "$TOTAL_CHUNKS" -eq 0 ]; then
  echo "Error: No chunk files found in $CHUNKS_DIR"
  exit 1
fi

echo "========================================="
echo "Icecat Backend Import - Processing $TOTAL_CHUNKS chunks"
echo "Direct DB Access Mode"
echo "========================================="
echo ""

CURRENT=0
FAILED=0

# Process each chunk
for CHUNK_FILE in "$CHUNKS_DIR"/chunk_*.csv; do
  CURRENT=$((CURRENT + 1))
  CHUNK_NAME=$(basename "$CHUNK_FILE")
  
  echo "[$CURRENT/$TOTAL_CHUNKS] Processing $CHUNK_NAME..."
  
  # Run import command
  # We use npm run command to execute the NestJS CLI
  npm run cli -- import:icecat \
    --csv "$CHUNK_FILE" \
    --mapping "$MAPPING" \
    --selectedIds "$SELECTED_IDS" \
    --featuresJson "$FEATURES_JSON" \
    --noUpdate \
    --concurrency 10
  
  if [ $? -eq 0 ]; then
    echo "✓ $CHUNK_NAME completed successfully"
  else
    echo "✗ $CHUNK_NAME failed"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
  
  # Brief pause
  sleep 2
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
