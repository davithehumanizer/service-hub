-- Migration 02: Add import tracking fields to devices table
-- This migration adds fields to track device imports (import_id, import_date, source_id)

-- Add import_id column (batch identifier)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS import_id VARCHAR(255);

-- Add import_date column (timestamp of import)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS import_date TIMESTAMP;

-- Add source_id column (external source identifier, e.g., Icecat ID)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);

-- Create index on source_id for fast lookups
CREATE INDEX IF NOT EXISTS devices_source_id_idx 
ON devices (source_id) 
WHERE source_id IS NOT NULL;

-- Create index on import_id for batch queries
CREATE INDEX IF NOT EXISTS devices_import_id_idx 
ON devices (import_id) 
WHERE import_id IS NOT NULL;

-- Verify migration
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'devices' 
AND column_name IN ('import_id', 'import_date', 'source_id')
ORDER BY column_name;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'devices' 
AND indexname LIKE '%import%' OR indexname LIKE '%source%';
