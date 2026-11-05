-- Migration 04: Add new permissions for device upsert functionality
-- This migration adds permissions for the new endpoints: getBySourceId and update

-- Add permission device.getBySourceId
INSERT INTO permission (name)
VALUES ('device.getBySourceId')
ON CONFLICT (name) DO NOTHING;

-- Add permission device.update
INSERT INTO permission (name)
VALUES ('device.update')
ON CONFLICT (name) DO NOTHING;

-- Add device.getBySourceId permission to guest role
INSERT INTO roles_permissions_permission ("rolesId", "permissionId")
SELECT r.id, p.id
FROM roles r, permission p
WHERE r.name = 'guest' AND p.name = 'device.getBySourceId'
ON CONFLICT DO NOTHING;

-- Add device.getBySourceId permission to user role
INSERT INTO roles_permissions_permission ("rolesId", "permissionId")
SELECT r.id, p.id
FROM roles r, permission p
WHERE r.name = 'user' AND p.name = 'device.getBySourceId'
ON CONFLICT DO NOTHING;

-- Add device.update permission to user role
INSERT INTO roles_permissions_permission ("rolesId", "permissionId")
SELECT r.id, p.id
FROM roles r, permission p
WHERE r.name = 'user' AND p.name = 'device.update'
ON CONFLICT DO NOTHING;

-- Verify permissions were added
SELECT 
  r.name as role_name, 
  p.name as permission_name
FROM roles r
JOIN roles_permissions_permission rp ON r.id = rp."rolesId"
JOIN permission p ON rp."permissionId" = p.id
WHERE p.name IN ('device.getBySourceId', 'device.update')
ORDER BY r.name, p.name;
