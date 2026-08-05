-- Track the acceptance-and-consent PDF independently from the delivery receipt.
ALTER TABLE dispatch_document_generations
  MODIFY COLUMN document_type ENUM('customer_table', 'quantity_table', 'invoice', 'customer_receipt', 'customer_acceptance_consent') NOT NULL;
