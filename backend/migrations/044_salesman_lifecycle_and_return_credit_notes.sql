ALTER TABLE salesmen ADD COLUMN IF NOT EXISTS employment_end_date DATE NULL AFTER joined_at;
ALTER TABLE salesmen ADD COLUMN IF NOT EXISTS employment_end_date_is_estimated TINYINT(1) NOT NULL DEFAULT 0 AFTER employment_end_date;
ALTER TABLE salesmen ADD COLUMN IF NOT EXISTS deactivated_at DATETIME NULL AFTER employment_end_date_is_estimated;
ALTER TABLE salesmen ADD COLUMN IF NOT EXISTS deactivated_by BIGINT UNSIGNED NULL AFTER deactivated_at;

ALTER TABLE salesmen
  ADD CONSTRAINT fk_salesmen_deactivated_by
    FOREIGN KEY (deactivated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS dispatch_return_credit_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_return_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  dispatch_customer_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  credit_note_number VARCHAR(100) NOT NULL,
  credit_note_date DATE NOT NULL,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_return_credit_note_return (dispatch_return_id),
  UNIQUE KEY uq_return_credit_note_number (store_id, credit_note_number),
  KEY idx_return_credit_note_date (store_id, credit_note_date),
  CONSTRAINT fk_return_credit_note_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_return_credit_note_return FOREIGN KEY (dispatch_return_id) REFERENCES dispatch_returns(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_return_credit_note_dispatch FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_return_credit_note_customer_line FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_return_credit_note_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_return_credit_note_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_return_credit_note_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
