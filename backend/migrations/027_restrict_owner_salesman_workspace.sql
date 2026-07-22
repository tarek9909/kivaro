-- The salesman workspace is self-service data for a user linked to a
-- salesman profile. Store owners are operational managers, not implicitly
-- linked salesmen, so exposing this permission sends them to an invalid page.
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.store_id IS NOT NULL
  AND r.name = 'owner'
  AND p.permission_key = 'salesman_workspace.view';
