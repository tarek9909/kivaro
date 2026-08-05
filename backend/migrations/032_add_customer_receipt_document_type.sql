-- Allow one generated receipt PDF to be tracked for each dispatch customer.
ALTER TABLE dispatch_document_generations
  MODIFY COLUMN document_type ENUM('customer_table', 'quantity_table', 'invoice', 'customer_receipt') NOT NULL;
