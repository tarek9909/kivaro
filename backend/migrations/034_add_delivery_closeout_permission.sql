-- Delivery closeout is an explicit management authority, never a salesman-workspace action.
INSERT INTO permissions (module, action, permission_key, description)
VALUES ('dispatch', 'closeout', 'delivery.closeout', 'Submit a delivery closeout for collection, debt, and review')
ON DUPLICATE KEY UPDATE
  module = VALUES(module),
  action = VALUES(action),
  description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key = 'delivery.closeout'
WHERE r.name IN ('owner', 'admin');
