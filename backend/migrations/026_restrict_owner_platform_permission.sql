-- Store owners administer their own workspace.  Platform administration is
-- reserved for the global superadmin role, otherwise impersonated owner
-- sessions are incorrectly treated as cross-store superadmin sessions.
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.store_id IS NOT NULL
  AND r.name = 'owner'
  AND p.permission_key = 'superadmin.manage';
