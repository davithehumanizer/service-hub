-- Migration 03: Fix EAN constraint to allow multiple empty values
-- This migration modifies the unique constraint on EAN to allow multiple devices with empty EAN
-- while maintaining uniqueness for non-empty EAN values

-- Drop the existing unique constraint on ean
ALTER TABLE devices 
DROP CONSTRAINT IF EXISTS "UQ_e91fe787be9170b4d72010096f5";

-- Create a partial unique index that only applies to non-empty EAN values
-- This allows multiple devices with empty EAN while keeping uniqueness for real EANs
CREATE UNIQUE INDEX IF NOT EXISTS devices_ean_unique_idx 
ON devices (ean) 
WHERE ean != '' AND ean IS NOT NULL;

-- Verify the constraint was removed and index was created
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'devices'::regclass 
AND conname LIKE '%ean%';

SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'devices' 
AND indexname LIKE '%ean%';

-- Test: This should work (multiple empty EANs)
-- INSERT INTO devices (ean, serial_number, manufacturer, brand, model, device_type, functional_state, visual_state, age, source)
-- VALUES ('', 'TEST001', 'Test', 'Test', 'Test1', '', '', '', 0, 'TEST');
-- INSERT INTO devices (ean, serial_number, manufacturer, brand, model, device_type, functional_state, visual_state, age, source)
-- VALUES ('', 'TEST002', 'Test', 'Test', 'Test2', '', '', '', 0, 'TEST');

-- Test: This should fail (duplicate non-empty EAN)
-- INSERT INTO devices (ean, serial_number, manufacturer, brand, model, device_type, functional_state, visual_state, age, source)
-- VALUES ('1234567890123', 'TEST003', 'Test', 'Test', 'Test3', '', '', '', 0, 'TEST');
-- INSERT INTO devices (ean, serial_number, manufacturer, brand, model, device_type, functional_state, visual_state, age, source)
-- VALUES ('1234567890123', 'TEST004', 'Test', 'Test', 'Test4', '', '', '', 0, 'TEST');
