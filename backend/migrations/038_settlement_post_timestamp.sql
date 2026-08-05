ALTER TABLE dispatch_settlements
  ADD COLUMN posted_at DATETIME NULL AFTER settled_by,
  ADD COLUMN posted_at_is_estimated TINYINT(1) NOT NULL DEFAULT 0 AFTER posted_at;

UPDATE dispatch_settlements
SET posted_at = created_at,
    posted_at_is_estimated = 1
WHERE status = 'posted'
  AND posted_at IS NULL;
