-- Rollback script for all migrations
-- WARNING: This will remove all changes made by the migration scripts
-- Only use this if you need to completely rollback the deployment

\echo '=== ROLLBACK WARNING ==='
\echo 'This script will remove all migration changes.'
\echo 'Press Ctrl+C to cancel, or press Enter to continue...'
\prompt 'Continue? (yes/no): ' confirm

-- Rollback 04: Remove permissions
\echo 'Rolling back permissions...'

DELETE FROM roles_permissions_permission 
WHERE "permissionId" IN (
  SELECT id FROM permission 
  WHERE name IN ('device.getBySourceId', 'device.update')
);

DELETE FROM permission 
WHERE name IN ('device.getBySourceId', 'device.update');

-- Rollback 03: Restore original EAN constraint
\echo 'Rolling back EAN constraint...'

DROP INDEX IF EXISTS devices_ean_unique_idx;

ALTER TABLE devices 
ADD CONSTRAINT "UQ_e91fe787be9170b4d72010096f5" UNIQUE (ean);

-- Rollback 02: Remove import tracking fields
\echo 'Rolling back import tracking fields...'

DROP INDEX IF EXISTS devices_source_id_idx;
DROP INDEX IF EXISTS devices_import_id_idx;

ALTER TABLE devices 
DROP COLUMN IF EXISTS import_id,
DROP COLUMN IF EXISTS import_date,
DROP COLUMN IF EXISTS source_id;

-- Rollback 01: Remove URN columns
\echo 'Rolling back URN columns...'

DROP INDEX IF EXISTS devices_urn_unique_idx;
DROP INDEX IF EXISTS device_categories_urn_unique_idx;

ALTER TABLE devices 
DROP COLUMN IF EXISTS urn;

ALTER TABLE device_categories 
DROP COLUMN IF EXISTS urn;

\echo ''
\echo '=== Rollback Complete ==='
\echo 'All migration changes have been removed.'
\echo 'You may need to restart your services.'
