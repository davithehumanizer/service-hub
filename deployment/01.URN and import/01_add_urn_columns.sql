-- Migration 01: Add URN columns to devices and device_categories tables
-- This migration adds URN (Uniform Resource Name) columns for unique identification

-- Add URN column to devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS urn VARCHAR(255);

-- Add URN column to device_categories table
ALTER TABLE device_categories 
ADD COLUMN IF NOT EXISTS urn VARCHAR(255);

-- Create unique indexes on URN columns
CREATE UNIQUE INDEX IF NOT EXISTS devices_urn_unique_idx 
ON devices (urn) 
WHERE urn IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS device_categories_urn_unique_idx 
ON device_categories (urn) 
WHERE urn IS NOT NULL;

-- Backfill URN values for existing devices
UPDATE devices 
SET urn = 'urn:care2repair:device:' || device_id 
WHERE urn IS NULL;

-- Backfill URN values for existing device categories
UPDATE device_categories 
SET urn = 'urn:care2repair:category:' || id 
WHERE urn IS NULL;

-- Verify migration
SELECT 
  'devices' as table_name,
  COUNT(*) as total_rows,
  COUNT(urn) as rows_with_urn,
  COUNT(*) - COUNT(urn) as rows_without_urn
FROM devices
UNION ALL
SELECT 
  'device_categories' as table_name,
  COUNT(*) as total_rows,
  COUNT(urn) as rows_with_urn,
  COUNT(*) - COUNT(urn) as rows_without_urn
FROM device_categories;
