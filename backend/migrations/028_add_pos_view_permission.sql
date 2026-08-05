-- POS has operational permissions for creating and approving orders, but it
-- also needs a standalone read permission for roles that only review orders.
INSERT INTO permissions (module, action, permission_key, description)
VALUES ('pos', 'view', 'pos.view', 'View Mini POS orders and manager review')
ON DUPLICATE KEY UPDATE
  module = VALUES(module),
  action = VALUES(action),
  description = VALUES(description);

-- Existing store admins should gain access immediately. Other roles can be
-- assigned pos.view through Roles and Permissions.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key = 'pos.view'
WHERE r.store_id IS NOT NULL
  AND r.name = 'admin';
