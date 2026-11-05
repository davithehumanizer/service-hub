-- Verification script for all migrations
-- Run this after executing all migration scripts to verify everything is correct

\echo '=== Verification of Database Migrations ==='
\echo ''

-- 1. Check URN columns exist
\echo '1. Checking URN columns...'
SELECT 
  table_name,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_name IN ('devices', 'device_categories')
AND column_name = 'urn'
ORDER BY table_name;

\echo ''

-- 2. Check import tracking fields exist
\echo '2. Checking import tracking fields...'
SELECT 
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_name = 'devices' 
AND column_name IN ('import_id', 'import_date', 'source_id')
ORDER BY column_name;

\echo ''

-- 3. Check EAN constraint
\echo '3. Checking EAN constraint...'
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'devices' 
AND indexname LIKE '%ean%';

\echo ''

-- 4. Check old EAN constraint is removed
\echo '4. Verifying old EAN constraint is removed...'
SELECT 
  COUNT(*) as old_constraint_count,
  CASE WHEN COUNT(*) = 0 THEN 'OK - Removed' ELSE 'ERROR - Still exists' END as status
FROM pg_constraint 
WHERE conrelid = 'devices'::regclass 
AND conname = 'UQ_e91fe787be9170b4d72010096f5';

\echo ''

-- 5. Check permissions
\echo '5. Checking new permissions...'
SELECT 
  r.name as role_name, 
  p.name as permission_name
FROM roles r
JOIN roles_permissions_permission rp ON r.id = rp."rolesId"
JOIN permission p ON rp."permissionId" = p.id
WHERE p.name IN ('device.getBySourceId', 'device.update')
ORDER BY r.name, p.name;

\echo ''

-- 6. Check indexes
\echo '6. Checking indexes...'
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'devices' 
AND (indexname LIKE '%urn%' OR indexname LIKE '%source%' OR indexname LIKE '%import%')
ORDER BY indexname;

\echo ''

-- 7. Sample data check
\echo '7. Sample data check (first 5 devices)...'
SELECT 
  device_id,
  urn,
  source_id,
  import_id,
  import_date,
  ean
FROM devices 
ORDER BY device_id 
LIMIT 5;

\echo ''
\echo '=== Verification Complete ==='
