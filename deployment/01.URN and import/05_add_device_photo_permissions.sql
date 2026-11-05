-- Migration 05: Add device photo permissions
-- Grants device.photos.upload and device.photos.delete to user and admin roles

-- Insert permissions (idempotent)
INSERT INTO permission (name)
VALUES ('device.photos.upload')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permission (name)
VALUES ('device.photos.delete')
ON CONFLICT (name) DO NOTHING;

-- Grant to user role
INSERT INTO roles_permissions_permission ("rolesId", "permissionId")
SELECT r.id, p.id
FROM roles r, permission p
WHERE r.name = 'user' AND p.name = 'device.photos.upload'
ON CONFLICT DO NOTHING;

INSERT INTO roles_permissions_permission ("rolesId", "permissionId")
SELECT r.id, p.id
FROM roles r, permission p
WHERE r.name = 'user' AND p.name = 'device.photos.delete'
ON CONFLICT DO NOTHING;

-- Grant to admin role
INSERT INTO roles_permissions_permission ("rolesId", "permissionId")
SELECT r.id, p.id
FROM roles r, permission p
WHERE r.name = 'admin' AND p.name = 'device.photos.upload'
ON CONFLICT DO NOTHING;

INSERT INTO roles_permissions_permission ("rolesId", "permissionId")
SELECT r.id, p.id
FROM roles r, permission p
WHERE r.name = 'admin' AND p.name = 'device.photos.delete'
ON CONFLICT DO NOTHING;

-- Verify
SELECT r.name AS role_name, p.name AS permission_name
FROM roles r
JOIN roles_permissions_permission rp ON r.id = rp."rolesId"
JOIN permission p ON rp."permissionId" = p.id
WHERE p.name IN ('device.photos.upload', 'device.photos.delete')
ORDER BY r.name, p.name;
