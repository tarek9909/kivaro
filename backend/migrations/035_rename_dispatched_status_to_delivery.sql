-- Rename the customer-facing order workflow state without changing stock-allocation audit states.
ALTER TABLE dispatch_requests
  MODIFY COLUMN status ENUM('draft', 'pending_approval', 'approved', 'dispatched', 'delivery', 'partially_settled', 'completed', 'cancelled') NOT NULL DEFAULT 'draft';

UPDATE dispatch_requests
SET status = 'delivery'
WHERE status = 'dispatched';

ALTER TABLE dispatch_requests
  MODIFY COLUMN status ENUM('draft', 'pending_approval', 'approved', 'delivery', 'partially_settled', 'completed', 'cancelled') NOT NULL DEFAULT 'draft';
