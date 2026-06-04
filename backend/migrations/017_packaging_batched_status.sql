ALTER TABLE packaging_group_assignments
  MODIFY COLUMN status ENUM('calculated','batched','consumed','cancelled') NOT NULL DEFAULT 'calculated';
