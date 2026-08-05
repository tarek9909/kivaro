-- Intentionally irreversible: the retired pending Mini POS workflow and all
-- of its stored orders are permanently removed. Direct POS creates dispatch
-- drafts and is not represented by these tables.

-- Preserve direct POS access for every former own-order role before retiring
-- the old permission.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT legacy_rp.role_id, direct_permission.id
FROM role_permissions legacy_rp
JOIN permissions legacy_permission ON legacy_permission.id = legacy_rp.permission_id
JOIN permissions direct_permission ON direct_permission.permission_key = 'pos.create_own'
WHERE legacy_permission.permission_key = 'pos.own_orders';

-- Required delivery PDFs must remain available to every delivery workflow
-- role. Existing roles are repaired with dispatch.print when neither print
-- capability has been assigned.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT DISTINCT workflow_rp.role_id, dispatch_print.id
FROM role_permissions workflow_rp
JOIN permissions workflow_permission ON workflow_permission.id = workflow_rp.permission_id
JOIN permissions dispatch_print ON dispatch_print.permission_key = 'dispatch.print'
WHERE workflow_permission.permission_key IN (
  'delivery.release', 'delivery.dispatch', 'delivery.record_returns',
  'delivery.closeout', 'dispatch.settle', 'finance.settle_deliveries'
)
AND NOT EXISTS (
  SELECT 1
  FROM role_permissions existing_rp
  JOIN permissions existing_permission ON existing_permission.id = existing_rp.permission_id
  WHERE existing_rp.role_id = workflow_rp.role_id
    AND existing_permission.permission_key IN ('dispatch.print', 'invoices.print')
);

-- Dispatch customers no longer retain a legacy POS source reference.
ALTER TABLE dispatch_customers
  DROP FOREIGN KEY fk_dispatch_customers_pos_order,
  DROP COLUMN pos_order_id;

DROP TABLE IF EXISTS pos_order_events;
DROP TABLE IF EXISTS pos_order_dispatch_links;
DROP TABLE IF EXISTS pos_order_lines;
DROP TABLE IF EXISTS pos_orders;

-- Permission deletes cascade role assignments after the compatibility map.
DELETE FROM permissions
WHERE permission_key IN (
  'pos.own_orders', 'pos.view', 'pos.review', 'pos.accept', 'pos.manage_pending'
);
