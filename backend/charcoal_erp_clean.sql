-- Kivaro clean item-based ERP baseline.
--
-- This file is deliberately data-free apart from platform/template metadata required
-- to bootstrap stores, roles, permissions, and standard units.  It supersedes the
-- legacy variant / production-batch schema and is intended to be imported only into
-- a fresh database (the reset command archives before it drops a database).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stores (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  contact_name VARCHAR(150) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  address TEXT NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stores_code (code),
  UNIQUE KEY uq_stores_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  permission_key VARCHAR(150) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  is_system_role TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_store_name (store_id, name),
  CONSTRAINT fk_roles_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(100) NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(50) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_store_username (store_id, username),
  UNIQUE KEY uq_users_store_email (store_id, email),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(60) NULL,
  user_agent TEXT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_sessions_user_expiry (user_id, expires_at),
  KEY idx_user_sessions_token_hash (token_hash),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_modules (
  store_id BIGINT UNSIGNED NOT NULL,
  module_key VARCHAR(100) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, module_key),
  CONSTRAINT fk_store_modules_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  address TEXT NULL,
  logo_url VARCHAR(500) NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  tax_number VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_company_profiles_store (store_id),
  CONSTRAINT fk_company_profiles_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NULL,
  setting_key VARCHAR(150) NOT NULL,
  setting_value TEXT NULL,
  value_type ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  description TEXT NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_system_settings_store_key (store_id, setting_key),
  KEY idx_system_settings_updated_by (updated_by),
  CONSTRAINT fk_system_settings_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_system_settings_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NULL,
  record_id BIGINT UNSIGNED NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(60) NULL,
  user_agent TEXT NULL,
  request_path VARCHAR(500) NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_store_created (store_id, created_at),
  KEY idx_audit_logs_user_created (user_id, created_at),
  KEY idx_audit_logs_record (table_name, record_id),
  CONSTRAINT fk_audit_logs_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('info','warning','danger','success') NOT NULL DEFAULT 'info',
  reference_type VARCHAR(100) NULL,
  reference_id BIGINT UNSIGNED NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_store_user_created (store_id, user_id, created_at),
  CONSTRAINT fk_notifications_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_store_code (store_id, code),
  KEY idx_locations_store_status (store_id, status),
  CONSTRAINT fk_locations_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_locations_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sublocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  location_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sublocations_store_code (store_id, code),
  KEY idx_sublocations_location (location_id),
  CONSTRAINT fk_sublocations_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sublocations_location
    FOREIGN KEY (location_id) REFERENCES locations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_sublocations_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salesmen (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  vehicle_number VARCHAR(100) NULL,
  national_id VARCHAR(100) NULL,
  base_salary DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  joined_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_salesmen_user (user_id),
  KEY idx_salesmen_store_status (store_id, status),
  CONSTRAINT fk_salesmen_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salesmen_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salesman_sublocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salesman_id BIGINT UNSIGNED NOT NULL,
  sublocation_id BIGINT UNSIGNED NOT NULL,
  assigned_at DATE NOT NULL,
  unassigned_at DATE NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  active_assignment_key TINYINT GENERATED ALWAYS AS (
    CASE WHEN status = 'active' THEN 1 ELSE NULL END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_salesman_sublocation_active (salesman_id, sublocation_id, active_assignment_key),
  KEY idx_salesman_sublocations_sublocation (sublocation_id),
  CONSTRAINT fk_salesman_sublocations_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_sublocations_sublocation
    FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS location_targets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  location_id BIGINT UNSIGNED NOT NULL,
  target_period ENUM('daily','weekly','monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('draft','active','closed','cancelled') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_location_targets_store_period (store_id, period_start, period_end),
  CONSTRAINT fk_location_targets_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_location_targets_location
    FOREIGN KEY (location_id) REFERENCES locations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_location_targets_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sublocation_targets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  location_target_id BIGINT UNSIGNED NOT NULL,
  sublocation_id BIGINT UNSIGNED NOT NULL,
  target_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('draft','active','closed','cancelled') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sublocation_targets_target_sublocation (location_target_id, sublocation_id),
  CONSTRAINT fk_sublocation_targets_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sublocation_targets_target
    FOREIGN KEY (location_target_id) REFERENCES location_targets(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sublocation_targets_sublocation
    FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salesman_targets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  sublocation_target_id BIGINT UNSIGNED NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  target_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  achieved_sales_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('active','closed','cancelled') NOT NULL DEFAULT 'active',
  active_target_key TINYINT GENERATED ALWAYS AS (
    CASE WHEN status = 'active' THEN 1 ELSE NULL END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_salesman_targets_active (sublocation_target_id, salesman_id, active_target_key),
  KEY idx_salesman_targets_salesman (salesman_id),
  CONSTRAINT fk_salesman_targets_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_targets_sublocation_target
    FOREIGN KEY (sublocation_target_id) REFERENCES sublocation_targets(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_targets_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_categories_store_code (store_id, code),
  KEY idx_item_categories_parent (parent_id),
  CONSTRAINT fk_item_categories_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_categories_parent
    FOREIGN KEY (parent_id) REFERENCES item_categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(30) NOT NULL,
  unit_type ENUM('weight','quantity','volume','length','other') NOT NULL DEFAULT 'quantity',
  base_unit_id BIGINT UNSIGNED NULL,
  conversion_to_base DECIMAL(18,8) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_units_store_symbol (store_id, symbol),
  KEY idx_units_base_unit (base_unit_id),
  CONSTRAINT fk_units_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_units_base_unit
    FOREIGN KEY (base_unit_id) REFERENCES units(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_units_conversion CHECK (conversion_to_base > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  location_id BIGINT UNSIGNED NULL,
  address TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouses_store_code (store_id, code),
  KEY idx_warehouses_location (location_id),
  CONSTRAINT fk_warehouses_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_warehouses_location
    FOREIGN KEY (location_id) REFERENCES locations(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  base_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(80) NOT NULL,
  item_kind ENUM('normal','packaging') NOT NULL,
  stock_mode ENUM('carton_weight','weight','piece') NOT NULL,
  kg_per_carton DECIMAL(18,4) NULL,
  loose_units_per_carton INT UNSIGNED NULL,
  max_content_weight_kg DECIMAL(18,4) NULL,
  description TEXT NULL,
  default_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  default_selling_price DECIMAL(18,4) NULL,
  carton_selling_price DECIMAL(18,4) NULL,
  loose_unit_selling_price DECIMAL(18,4) NULL,
  reorder_level DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_store_code (store_id, code),
  KEY idx_items_store_kind_status (store_id, item_kind, status),
  KEY idx_items_category (category_id),
  KEY idx_items_base_unit (base_unit_id),
  CONSTRAINT fk_items_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_items_category
    FOREIGN KEY (category_id) REFERENCES item_categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_items_base_unit
    FOREIGN KEY (base_unit_id) REFERENCES units(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_items_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_items_nonnegative_configuration CHECK (
    default_cost >= 0
    AND reorder_level >= 0
    AND (max_content_weight_kg IS NULL OR max_content_weight_kg >= 0)
  ),
  CONSTRAINT chk_items_stock_configuration CHECK (
    (item_kind = 'packaging'
      AND stock_mode = 'piece'
      AND kg_per_carton IS NULL
      AND loose_units_per_carton IS NULL)
    OR (item_kind = 'normal' AND stock_mode = 'carton_weight'
      AND kg_per_carton > 0
      AND loose_units_per_carton > 0
      AND max_content_weight_kg IS NULL)
    OR (item_kind = 'normal' AND stock_mode IN ('weight','piece')
      AND kg_per_carton IS NULL
      AND loose_units_per_carton IS NULL
      AND max_content_weight_kg IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_stock_balances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  quantity_on_hand DECIMAL(18,4) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(18,4) NOT NULL DEFAULT 0,
  average_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  stock_value DECIMAL(36,8) GENERATED ALWAYS AS (quantity_on_hand * average_cost) STORED,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_stock_warehouse_item (warehouse_id, item_id),
  KEY idx_item_stock_store_item (store_id, item_id),
  CONSTRAINT fk_item_stock_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_stock_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_item_stock_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_item_stock_nonnegative CHECK (
    quantity_on_hand >= 0
    AND quantity_reserved >= 0
    AND quantity_reserved <= quantity_on_hand
    AND average_cost >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carton_stock_lots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  received_cartons INT UNSIGNED NOT NULL,
  remaining_cartons INT UNSIGNED NOT NULL,
  kg_per_carton DECIMAL(18,4) NOT NULL,
  loose_units_per_carton INT UNSIGNED NOT NULL,
  unit_cost_per_kg DECIMAL(18,4) NOT NULL DEFAULT 0,
  source_type VARCHAR(100) NULL,
  source_id BIGINT UNSIGNED NULL,
  received_at DATETIME NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_carton_stock_lots_fifo (warehouse_id, item_id, received_at, id),
  KEY idx_carton_stock_lots_store_item (store_id, item_id),
  CONSTRAINT fk_carton_stock_lots_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_carton_stock_lots_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_carton_stock_lots_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_carton_stock_lots_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_carton_stock_lots_quantities CHECK (
    received_cartons > 0
    AND remaining_cartons <= received_cartons
    AND kg_per_carton > 0
    AND loose_units_per_carton > 0
    AND unit_cost_per_kg >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS open_carton_shelves (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  carton_lot_id BIGINT UNSIGNED NOT NULL,
  initial_loose_units INT UNSIGNED NOT NULL,
  remaining_loose_units INT UNSIGNED NOT NULL,
  loose_unit_weight_kg DECIMAL(18,6) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  active_shelf_key TINYINT GENERATED ALWAYS AS (
    CASE WHEN status = 'open' THEN 1 ELSE NULL END
  ) STORED,
  opened_at DATETIME NOT NULL,
  opened_by BIGINT UNSIGNED NULL,
  closed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_open_carton_shelves_active (warehouse_id, item_id, active_shelf_key),
  KEY idx_open_carton_shelves_lot (carton_lot_id),
  CONSTRAINT fk_open_carton_shelves_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_open_carton_shelves_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_open_carton_shelves_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_open_carton_shelves_lot
    FOREIGN KEY (carton_lot_id) REFERENCES carton_stock_lots(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_open_carton_shelves_opened_by
    FOREIGN KEY (opened_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_open_carton_shelves_quantities CHECK (
    initial_loose_units > 0
    AND remaining_loose_units <= initial_loose_units
    AND loose_unit_weight_kg > 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  quantity_change DECIMAL(18,4) NOT NULL,
  quantity_before DECIMAL(18,4) NOT NULL DEFAULT 0,
  quantity_after DECIMAL(18,4) NOT NULL DEFAULT 0,
  reserved_quantity_change DECIMAL(18,4) NOT NULL DEFAULT 0,
  reserved_quantity_before DECIMAL(18,4) NOT NULL DEFAULT 0,
  reserved_quantity_after DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18,4) NULL,
  total_cost DECIMAL(18,4) NULL,
  reference_type VARCHAR(100) NULL,
  reference_id BIGINT UNSIGNED NULL,
  carton_stock_lot_id BIGINT UNSIGNED NULL,
  open_carton_shelf_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_stock_movements_store_created (store_id, created_at),
  KEY idx_item_stock_movements_item_created (item_id, created_at),
  KEY idx_item_stock_movements_reference (reference_type, reference_id),
  KEY idx_item_stock_movements_lot (carton_stock_lot_id),
  KEY idx_item_stock_movements_shelf (open_carton_shelf_id),
  CONSTRAINT fk_item_stock_movements_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_stock_movements_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_item_stock_movements_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_item_stock_movements_lot
    FOREIGN KEY (carton_stock_lot_id) REFERENCES carton_stock_lots(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_item_stock_movements_shelf
    FOREIGN KEY (open_carton_shelf_id) REFERENCES open_carton_shelves(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_item_stock_movements_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packaging_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(80) NOT NULL,
  input_item_id BIGINT UNSIGNED NOT NULL,
  default_warehouse_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_packaging_groups_store_code (store_id, code),
  KEY idx_packaging_groups_store_status (store_id, status),
  KEY idx_packaging_groups_input_item (input_item_id),
  CONSTRAINT fk_packaging_groups_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_groups_input_item
    FOREIGN KEY (input_item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_groups_default_warehouse
    FOREIGN KEY (default_warehouse_id) REFERENCES warehouses(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_groups_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packaging_group_components (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  packaging_group_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  component_role ENUM('outer_sellable','inner_sellable','consumable') NOT NULL,
  quantity_per_outer DECIMAL(18,4) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_packaging_group_components_group_role (packaging_group_id, component_role, sort_order),
  KEY idx_packaging_group_components_item (item_id),
  CONSTRAINT fk_packaging_group_components_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_group_components_group
    FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_group_components_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_packaging_group_components_quantity CHECK (quantity_per_outer > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packaging_operations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  operation_number VARCHAR(100) NOT NULL,
  packaging_group_id BIGINT UNSIGNED NOT NULL,
  input_item_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  output_carton_count INT UNSIGNED NOT NULL,
  raw_quantity_kg DECIMAL(18,4) NOT NULL,
  raw_unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  packaging_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  cost_per_outer DECIMAL(18,4) NOT NULL DEFAULT 0,
  cost_per_inner DECIMAL(18,4) NOT NULL DEFAULT 0,
  group_snapshot_json JSON NOT NULL,
  input_snapshot_json JSON NOT NULL,
  status ENUM('completed','cancelled') NOT NULL DEFAULT 'completed',
  completed_by BIGINT UNSIGNED NULL,
  completed_at DATETIME NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_packaging_operations_store_number (store_id, operation_number),
  KEY idx_packaging_operations_group_created (packaging_group_id, created_at),
  KEY idx_packaging_operations_warehouse_created (warehouse_id, created_at),
  CONSTRAINT fk_packaging_operations_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_operations_group
    FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_operations_input_item
    FOREIGN KEY (input_item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_operations_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_operations_completed_by
    FOREIGN KEY (completed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_packaging_operations_output CHECK (output_carton_count > 0 AND raw_quantity_kg > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packaging_operation_components (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  packaging_operation_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  component_role VARCHAR(50) NOT NULL,
  quantity_per_outer DECIMAL(18,4) NULL,
  required_quantity DECIMAL(18,4) NOT NULL,
  consumed_quantity DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  component_snapshot_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_packaging_operation_components_operation (packaging_operation_id),
  KEY idx_packaging_operation_components_item (item_id),
  CONSTRAINT fk_packaging_operation_components_operation
    FOREIGN KEY (packaging_operation_id) REFERENCES packaging_operations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_packaging_operation_components_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_packaging_operation_components_quantity CHECK (
    required_quantity >= 0 AND consumed_quantity >= 0 AND unit_cost >= 0 AND total_cost >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ready_stock_containers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  packaging_operation_id BIGINT UNSIGNED NOT NULL,
  packaging_group_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  outer_item_id BIGINT UNSIGNED NOT NULL,
  inner_item_id BIGINT UNSIGNED NOT NULL,
  outer_name_snapshot VARCHAR(255) NOT NULL,
  inner_name_snapshot VARCHAR(255) NOT NULL,
  initial_inner_quantity INT UNSIGNED NOT NULL,
  remaining_inner_quantity INT UNSIGNED NOT NULL,
  reserved_inner_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  capacity_kg DECIMAL(18,4) NOT NULL,
  total_cost DECIMAL(18,4) NOT NULL,
  remaining_cost DECIMAL(18,4) NOT NULL,
  status ENUM('full','partial','depleted','cancelled') NOT NULL DEFAULT 'full',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ready_stock_containers_available (warehouse_id, packaging_group_id, status, created_at),
  KEY idx_ready_stock_containers_operation (packaging_operation_id),
  CONSTRAINT fk_ready_stock_containers_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_containers_operation
    FOREIGN KEY (packaging_operation_id) REFERENCES packaging_operations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_containers_group
    FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_containers_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_containers_outer_item
    FOREIGN KEY (outer_item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_containers_inner_item
    FOREIGN KEY (inner_item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_ready_stock_containers_quantity CHECK (
    initial_inner_quantity > 0
    AND remaining_inner_quantity <= initial_inner_quantity
    AND reserved_inner_quantity <= remaining_inner_quantity
    AND capacity_kg > 0
    AND total_cost >= 0
    AND remaining_cost >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ready_stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  ready_stock_container_id BIGINT UNSIGNED NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  inner_quantity_change DECIMAL(18,4) NOT NULL,
  inner_quantity_before DECIMAL(18,4) NOT NULL,
  inner_quantity_after DECIMAL(18,4) NOT NULL,
  cost_change DECIMAL(18,4) NOT NULL DEFAULT 0,
  cost_before DECIMAL(18,4) NOT NULL DEFAULT 0,
  cost_after DECIMAL(18,4) NOT NULL DEFAULT 0,
  reference_type VARCHAR(100) NULL,
  reference_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ready_stock_movements_container_created (ready_stock_container_id, created_at),
  KEY idx_ready_stock_movements_store_created (store_id, created_at),
  KEY idx_ready_stock_movements_reference (reference_type, reference_id),
  CONSTRAINT fk_ready_stock_movements_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_movements_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_movements_container
    FOREIGN KEY (ready_stock_container_id) REFERENCES ready_stock_containers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ready_stock_movements_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_catalog_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  entry_type ENUM('normal_carton','normal_loose_unit','normal_weight','normal_piece','ready_outer_carton','ready_inner_unit') NOT NULL,
  item_id BIGINT UNSIGNED NULL,
  packaging_group_id BIGINT UNSIGNED NULL,
  display_name VARCHAR(255) NOT NULL,
  unit_label VARCHAR(50) NOT NULL,
  default_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
  is_pos_active TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sale_catalog_entries_store_pos (store_id, is_pos_active, status),
  KEY idx_sale_catalog_entries_item (item_id),
  KEY idx_sale_catalog_entries_group (packaging_group_id),
  CONSTRAINT fk_sale_catalog_entries_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sale_catalog_entries_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_sale_catalog_entries_group
    FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_sale_catalog_entries_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_sale_catalog_entries_subject CHECK (
    (item_id IS NOT NULL AND packaging_group_id IS NULL)
    OR (item_id IS NULL AND packaging_group_id IS NOT NULL)
  ),
  CONSTRAINT chk_sale_catalog_entries_values CHECK (default_price >= 0 AND vat_rate >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  address TEXT NULL,
  contact_person VARCHAR(150) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_suppliers_store_status (store_id, status),
  CONSTRAINT fk_suppliers_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_suppliers_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_type ENUM('cash','bank','wallet','other') NOT NULL DEFAULT 'cash',
  cash_flow_permission ENUM('incoming','outgoing','both') NOT NULL DEFAULT 'both',
  opening_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  current_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cash_accounts_store_name (store_id, account_name),
  KEY idx_cash_accounts_store_status (store_id, status),
  CONSTRAINT fk_cash_accounts_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  po_number VARCHAR(100) NOT NULL,
  supplier_id BIGINT UNSIGNED NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NULL,
  payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
  order_date DATE NOT NULL,
  expected_date DATE NULL,
  status ENUM('draft','pending','approved','partially_received','received','closed','cancelled') NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(18,4) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(18,4) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_orders_store_number (store_id, po_number),
  KEY idx_purchase_orders_supplier (supplier_id),
  KEY idx_purchase_orders_warehouse (warehouse_id),
  KEY idx_purchase_orders_cash_account (cash_account_id),
  CONSTRAINT fk_purchase_orders_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  ordered_quantity DECIMAL(18,4) NOT NULL,
  received_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  line_total DECIMAL(18,4) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purchase_order_items_item (item_id),
  CONSTRAINT fk_purchase_order_items_order
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_order_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  received_date DATE NOT NULL,
  status ENUM('posted','cancelled') NOT NULL DEFAULT 'posted',
  notes TEXT NULL,
  received_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_receipts_store_number (store_id, receipt_number),
  KEY idx_purchase_receipts_order (purchase_order_id),
  CONSTRAINT fk_purchase_receipts_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_receipts_order
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_receipts_received_by
    FOREIGN KEY (received_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_receipt_id BIGINT UNSIGNED NOT NULL,
  purchase_order_item_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  received_quantity DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purchase_receipt_items_item (item_id),
  CONSTRAINT fk_purchase_receipt_items_receipt
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_receipt_items_order_item
    FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_receipt_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expense_categories_store_name (store_id, name),
  CONSTRAINT fk_expense_categories_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  expense_category_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NULL,
  expense_date DATE NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
  reference_number VARCHAR(150) NULL,
  description TEXT NULL,
  status ENUM('active','voided') NOT NULL DEFAULT 'active',
  voided_by BIGINT UNSIGNED NULL,
  voided_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expenses_store_date (store_id, expense_date),
  KEY idx_expenses_store_status (store_id, status),
  KEY idx_expenses_cash_account (cash_account_id),
  CONSTRAINT fk_expenses_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_category
    FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_voided_by
    FOREIGN KEY (voided_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_expenses_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  customer_code VARCHAR(100) NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  secondary_phone VARCHAR(50) NULL,
  location_id BIGINT UNSIGNED NOT NULL,
  sublocation_id BIGINT UNSIGNED NOT NULL,
  assigned_salesman_id BIGINT UNSIGNED NULL,
  address VARCHAR(255) NULL,
  detailed_address TEXT NULL,
  credit_limit DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_store_code (store_id, customer_code),
  KEY idx_customers_store_salesman (store_id, assigned_salesman_id),
  KEY idx_customers_location (location_id, sublocation_id),
  CONSTRAINT fk_customers_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customers_location
    FOREIGN KEY (location_id) REFERENCES locations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_customers_sublocation
    FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_customers_salesman
    FOREIGN KEY (assigned_salesman_id) REFERENCES salesmen(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customers_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_number VARCHAR(100) NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  request_date DATE NOT NULL,
  status ENUM('draft','pending_approval','approved','dispatched','partially_settled','completed','cancelled') NOT NULL DEFAULT 'draft',
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  total_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_collected DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_debt DECIMAL(18,4) NOT NULL DEFAULT 0,
  submitted_by BIGINT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  dispatched_by BIGINT UNSIGNED NULL,
  dispatched_at DATETIME NULL,
  completed_by BIGINT UNSIGNED NULL,
  completed_at DATETIME NULL,
  cancelled_by BIGINT UNSIGNED NULL,
  cancelled_at DATETIME NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dispatch_requests_store_number (store_id, dispatch_number),
  KEY idx_dispatch_requests_store_status_date (store_id, status, request_date),
  KEY idx_dispatch_requests_salesman (salesman_id),
  CONSTRAINT fk_dispatch_requests_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_requests_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_requests_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_requests_submitted_by
    FOREIGN KEY (submitted_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_requests_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_requests_dispatched_by
    FOREIGN KEY (dispatched_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_requests_completed_by
    FOREIGN KEY (completed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_requests_cancelled_by
    FOREIGN KEY (cancelled_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  location_id BIGINT UNSIGNED NOT NULL,
  sublocation_id BIGINT UNSIGNED NOT NULL,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  customer_total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  collected_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  debt_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  payment_status ENUM('pending','paid','partial_debt','debt','cancelled') NOT NULL DEFAULT 'pending',
  receipt_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dispatch_customers_dispatch_customer (dispatch_request_id, customer_id),
  KEY idx_dispatch_customers_store_customer (store_id, customer_id),
  CONSTRAINT fk_dispatch_customers_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_customers_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_customers_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_customers_location
    FOREIGN KEY (location_id) REFERENCES locations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_customers_sublocation
    FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_customer_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  sale_catalog_entry_id BIGINT UNSIGNED NULL,
  item_id BIGINT UNSIGNED NULL,
  packaging_group_id BIGINT UNSIGNED NULL,
  line_type ENUM('sale','free_gift') NOT NULL DEFAULT 'sale',
  fulfillment_type ENUM('normal_carton','normal_loose_unit','normal_weight','normal_piece','ready_outer_carton','ready_inner_unit') NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  line_total DECIMAL(18,4) NOT NULL DEFAULT 0,
  returned_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  item_name_snapshot VARCHAR(255) NOT NULL,
  unit_label_snapshot VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dispatch_items_request (dispatch_request_id),
  KEY idx_dispatch_items_catalog (sale_catalog_entry_id),
  KEY idx_dispatch_items_item (item_id),
  KEY idx_dispatch_items_group (packaging_group_id),
  CONSTRAINT fk_dispatch_items_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_items_customer
    FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_items_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_items_catalog
    FOREIGN KEY (sale_catalog_entry_id) REFERENCES sale_catalog_entries(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_items_group
    FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_dispatch_items_quantity CHECK (quantity > 0 AND returned_quantity >= 0 AND returned_quantity <= quantity),
  CONSTRAINT chk_dispatch_items_gift_price CHECK ((line_type = 'free_gift' AND unit_price = 0) OR line_type = 'sale')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_line_allocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_item_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NULL,
  carton_stock_lot_id BIGINT UNSIGNED NULL,
  open_carton_shelf_id BIGINT UNSIGNED NULL,
  ready_stock_container_id BIGINT UNSIGNED NULL,
  allocation_type ENUM('item_balance','carton_lot','open_carton_shelf','ready_stock_container') NOT NULL,
  allocated_quantity DECIMAL(18,4) NOT NULL,
  inventory_quantity DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('reserved','dispatched','returned','released') NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dispatch_line_allocations_line (dispatch_item_id, status),
  KEY idx_dispatch_line_allocations_lot (carton_stock_lot_id),
  KEY idx_dispatch_line_allocations_shelf (open_carton_shelf_id),
  KEY idx_dispatch_line_allocations_container (ready_stock_container_id),
  CONSTRAINT fk_dispatch_line_allocations_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_line_allocations_item
    FOREIGN KEY (dispatch_item_id) REFERENCES dispatch_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_line_allocations_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_line_allocations_catalog_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_line_allocations_lot
    FOREIGN KEY (carton_stock_lot_id) REFERENCES carton_stock_lots(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_line_allocations_shelf
    FOREIGN KEY (open_carton_shelf_id) REFERENCES open_carton_shelves(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_line_allocations_container
    FOREIGN KEY (ready_stock_container_id) REFERENCES ready_stock_containers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_dispatch_line_allocations_quantities CHECK (allocated_quantity > 0 AND inventory_quantity > 0 AND total_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  dispatch_customer_id BIGINT UNSIGNED NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  revision INT UNSIGNED NOT NULL,
  status ENUM('issued','voided','cancelled') NOT NULL DEFAULT 'issued',
  invoice_date DATE NOT NULL,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  voided_by BIGINT UNSIGNED NULL,
  voided_at DATETIME NULL,
  void_reason TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_store_number (store_id, invoice_number),
  UNIQUE KEY uq_invoices_customer_revision (dispatch_customer_id, revision),
  KEY idx_invoices_dispatch_status (dispatch_request_id, status),
  CONSTRAINT fk_invoices_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_customer
    FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_voided_by
    FOREIGN KEY (voided_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  dispatch_item_id BIGINT UNSIGNED NULL,
  line_type ENUM('sale','free_gift') NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  unit_label VARCHAR(50) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  line_total DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice_lines_dispatch_item (dispatch_item_id),
  CONSTRAINT fk_invoice_lines_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_invoice_lines_dispatch_item
    FOREIGN KEY (dispatch_item_id) REFERENCES dispatch_items(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_invoice_lines_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_document_generations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  dispatch_customer_id BIGINT UNSIGNED NULL,
  invoice_id BIGINT UNSIGNED NULL,
  document_type ENUM('customer_table','quantity_table','invoice') NOT NULL,
  revision INT UNSIGNED NOT NULL,
  generated_by BIGINT UNSIGNED NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_name VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_dispatch_document_generations_gate (dispatch_request_id, revision, document_type),
  KEY idx_dispatch_document_generations_invoice (invoice_id),
  CONSTRAINT fk_dispatch_document_generations_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_document_generations_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_document_generations_customer
    FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_document_generations_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_document_generations_generated_by
    FOREIGN KEY (generated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  dispatch_item_id BIGINT UNSIGNED NOT NULL,
  returned_quantity DECIMAL(18,4) NOT NULL,
  reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dispatch_returns_dispatch_item (dispatch_item_id),
  CONSTRAINT fk_dispatch_returns_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_returns_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_returns_item
    FOREIGN KEY (dispatch_item_id) REFERENCES dispatch_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_returns_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_dispatch_returns_quantity CHECK (returned_quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_settlements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NULL,
  settlement_number VARCHAR(100) NOT NULL,
  settlement_date DATE NOT NULL,
  total_expected DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_collected DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_debt DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_returned_value DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  settled_by BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dispatch_settlements_store_number (store_id, settlement_number),
  KEY idx_dispatch_settlements_dispatch_status (dispatch_request_id, status),
  KEY idx_dispatch_settlements_cash_account (cash_account_id),
  CONSTRAINT fk_dispatch_settlements_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_settlements_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_settlements_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_settlements_settled_by
    FOREIGN KEY (settled_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_settlement_customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dispatch_settlement_id BIGINT UNSIGNED NOT NULL,
  dispatch_customer_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  expected_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  collected_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  debt_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  settlement_status ENUM('paid','partial_debt','debt','cancelled') NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dispatch_settlement_customers_customer (dispatch_settlement_id, dispatch_customer_id),
  KEY idx_dispatch_settlement_customers_customer (customer_id),
  CONSTRAINT fk_dispatch_settlement_customers_settlement
    FOREIGN KEY (dispatch_settlement_id) REFERENCES dispatch_settlements(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_settlement_customers_dispatch_customer
    FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_settlement_customers_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salesman_balances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NULL,
  balance_date DATE NOT NULL,
  expected_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  collected_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  debt_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  returned_stock_value DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
  closed_by BIGINT UNSIGNED NULL,
  closed_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_salesman_balances_status (store_id, salesman_id, status),
  CONSTRAINT fk_salesman_balances_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_balances_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_balances_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_balances_closed_by
    FOREIGN KEY (closed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_debts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NULL,
  dispatch_customer_id BIGINT UNSIGNED NULL,
  debt_number VARCHAR(100) NOT NULL,
  debt_date DATE NOT NULL,
  due_date DATE NULL,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  original_amount DECIMAL(18,4) NOT NULL,
  paid_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(18,4) NOT NULL,
  status ENUM('pending','partially_paid','paid','written_off','cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_debts_store_number (store_id, debt_number),
  KEY idx_customer_debts_status_balance (store_id, customer_id, status, remaining_amount),
  CONSTRAINT fk_customer_debts_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_debts_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_customer_debts_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_debts_dispatch_customer
    FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_debts_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_customer_debts_amounts CHECK (original_amount >= 0 AND paid_amount >= 0 AND remaining_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_debt_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  customer_debt_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NULL,
  adjustment_date DATE NOT NULL,
  adjustment_type ENUM('increase','decrease','write_off') NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  reason TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer_debt_adjustments_debt (customer_debt_id),
  CONSTRAINT fk_customer_debt_adjustments_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_debt_adjustments_debt
    FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_debt_adjustments_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_debt_adjustments_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_customer_debt_adjustments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NULL,
  collected_by_salesman_id BIGINT UNSIGNED NULL,
  payment_number VARCHAR(100) NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
  reference_number VARCHAR(150) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_payments_store_number (store_id, payment_number),
  KEY idx_customer_payments_customer_date (customer_id, payment_date),
  KEY idx_customer_payments_cash_account (cash_account_id),
  KEY idx_customer_payments_collector (collected_by_salesman_id, payment_date),
  CONSTRAINT fk_customer_payments_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_payments_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_customer_payments_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_payments_collector
    FOREIGN KEY (collected_by_salesman_id) REFERENCES salesmen(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_payments_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_customer_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_payment_allocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_payment_id BIGINT UNSIGNED NOT NULL,
  customer_debt_id BIGINT UNSIGNED NOT NULL,
  allocated_amount DECIMAL(18,4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_payment_allocations_pair (customer_payment_id, customer_debt_id),
  KEY idx_customer_payment_allocations_debt (customer_debt_id),
  CONSTRAINT fk_customer_payment_allocations_payment
    FOREIGN KEY (customer_payment_id) REFERENCES customer_payments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_payment_allocations_debt
    FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_customer_payment_allocations_amount CHECK (allocated_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_credits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  credit_number VARCHAR(100) NOT NULL,
  credit_date DATE NOT NULL,
  original_amount DECIMAL(18,4) NOT NULL,
  used_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(18,4) NOT NULL,
  status ENUM('available','partially_used','used','cancelled') NOT NULL DEFAULT 'available',
  reference_type VARCHAR(100) NULL,
  reference_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_credits_store_number (store_id, credit_number),
  KEY idx_customer_credits_customer_status (customer_id, status),
  CONSTRAINT fk_customer_credits_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_credits_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_customer_credits_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NULL,
  dispatch_customer_id BIGINT UNSIGNED NULL,
  customer_payment_id BIGINT UNSIGNED NULL,
  receipt_date DATE NOT NULL,
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  receipt_type ENUM('sale','payment','credit','other') NOT NULL DEFAULT 'sale',
  printed_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_receipts_store_number (store_id, receipt_number),
  KEY idx_customer_receipts_customer_date (customer_id, receipt_date),
  CONSTRAINT fk_customer_receipts_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_receipts_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_customer_receipts_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_receipts_dispatch_customer
    FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_receipts_payment
    FOREIGN KEY (customer_payment_id) REFERENCES customer_payments(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customer_receipts_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NULL,
  transaction_date DATETIME NOT NULL,
  transaction_type VARCHAR(100) NOT NULL,
  direction ENUM('in','out') NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  reference_type VARCHAR(100) NULL,
  reference_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_financial_transactions_store_date (store_id, transaction_date),
  KEY idx_financial_transactions_cash_account (cash_account_id),
  KEY idx_financial_transactions_reference (reference_type, reference_id),
  CONSTRAINT fk_financial_transactions_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_financial_transactions_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_financial_transactions_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_financial_transactions_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  purchase_order_id BIGINT UNSIGNED NULL,
  cash_account_id BIGINT UNSIGNED NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
  reference_number VARCHAR(150) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_supplier_payments_po (purchase_order_id, payment_date),
  KEY idx_supplier_payments_cash_account (cash_account_id),
  CONSTRAINT fk_supplier_payments_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_supplier_payments_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_supplier_payments_po
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_supplier_payments_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_supplier_payments_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_supplier_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  target_period ENUM('daily','weekly','monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
  below_target_rate DECIMAL(8,4) NOT NULL DEFAULT 5,
  at_target_rate DECIMAL(8,4) NOT NULL DEFAULT 10,
  above_target_extra_rate DECIMAL(8,4) NOT NULL DEFAULT 1,
  applies_from DATE NOT NULL,
  applies_to DATE NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_commission_rules_store_status (store_id, status),
  CONSTRAINT fk_commission_rules_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_commission_rules_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_calculations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  commission_rule_id BIGINT UNSIGNED NOT NULL,
  salesman_target_id BIGINT UNSIGNED NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  sublocation_id BIGINT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  sales_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  below_target_commission DECIMAL(18,4) NOT NULL DEFAULT 0,
  target_commission DECIMAL(18,4) NOT NULL DEFAULT 0,
  above_target_commission DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_commission DECIMAL(18,4) NOT NULL DEFAULT 0,
  status ENUM('draft','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_commission_calculations_target_status (salesman_target_id, status),
  CONSTRAINT fk_commission_calculations_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_commission_calculations_rule
    FOREIGN KEY (commission_rule_id) REFERENCES commission_rules(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_commission_calculations_target
    FOREIGN KEY (salesman_target_id) REFERENCES salesman_targets(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_commission_calculations_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_commission_calculations_sublocation
    FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_commission_calculations_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  commission_calculation_id BIGINT UNSIGNED NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
  reference_number VARCHAR(150) NULL,
  paid_by BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_commission_payments_calculation (commission_calculation_id),
  KEY idx_commission_payments_cash_account (cash_account_id),
  CONSTRAINT fk_commission_payments_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_commission_payments_calculation
    FOREIGN KEY (commission_calculation_id) REFERENCES commission_calculations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_commission_payments_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_commission_payments_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_commission_payments_paid_by
    FOREIGN KEY (paid_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_commission_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  order_number VARCHAR(100) NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  location_id BIGINT UNSIGNED NOT NULL,
  sublocation_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','accepted','cancelled','converted','rejected') NOT NULL DEFAULT 'pending',
  dispatch_request_id BIGINT UNSIGNED NULL,
  order_date DATE NOT NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  accepted_by BIGINT UNSIGNED NULL,
  accepted_at DATETIME NULL,
  cancelled_by BIGINT UNSIGNED NULL,
  cancelled_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pos_orders_store_number (store_id, order_number),
  KEY idx_pos_orders_salesman_status (salesman_id, status, created_at),
  KEY idx_pos_orders_customer (customer_id),
  KEY idx_pos_orders_dispatch (dispatch_request_id),
  CONSTRAINT fk_pos_orders_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_location
    FOREIGN KEY (location_id) REFERENCES locations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_sublocation
    FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_accepted_by
    FOREIGN KEY (accepted_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pos_orders_cancelled_by
    FOREIGN KEY (cancelled_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_order_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pos_order_id BIGINT UNSIGNED NOT NULL,
  sale_catalog_entry_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NULL,
  packaging_group_id BIGINT UNSIGNED NULL,
  line_type ENUM('sale','free_gift') NOT NULL DEFAULT 'sale',
  fulfillment_type ENUM('normal_carton','normal_loose_unit','normal_weight','normal_piece','ready_outer_carton','ready_inner_unit') NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pos_order_lines_catalog (sale_catalog_entry_id),
  CONSTRAINT fk_pos_order_lines_order
    FOREIGN KEY (pos_order_id) REFERENCES pos_orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pos_order_lines_catalog
    FOREIGN KEY (sale_catalog_entry_id) REFERENCES sale_catalog_entries(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pos_order_lines_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pos_order_lines_group
    FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_pos_order_lines_quantity CHECK (quantity > 0),
  CONSTRAINT chk_pos_order_lines_gift_price CHECK ((line_type = 'free_gift' AND unit_price = 0) OR line_type = 'sale')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_order_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  pos_order_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  old_values_json JSON NULL,
  new_values_json JSON NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pos_order_events_order_created (pos_order_id, created_at),
  KEY idx_pos_order_events_store_created (store_id, created_at),
  CONSTRAINT fk_pos_order_events_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pos_order_events_order
    FOREIGN KEY (pos_order_id) REFERENCES pos_orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pos_order_events_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_order_dispatch_links (
  pos_order_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pos_order_id, dispatch_request_id),
  KEY idx_pos_order_dispatch_links_dispatch (dispatch_request_id),
  CONSTRAINT fk_pos_order_dispatch_links_order
    FOREIGN KEY (pos_order_id) REFERENCES pos_orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pos_order_dispatch_links_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Canonical item/ready stock views.  Reports and dashboards consume these instead
-- of the retired variant stock and production-batch views.
CREATE OR REPLACE VIEW v_current_stock AS
SELECT
  b.id AS stock_balance_id,
  b.store_id,
  b.warehouse_id,
  w.name AS warehouse_name,
  b.item_id,
  i.name AS item_name,
  i.item_kind,
  i.stock_mode,
  u.symbol AS unit_symbol,
  b.quantity_on_hand,
  b.quantity_reserved,
  (b.quantity_on_hand - b.quantity_reserved) AS quantity_available,
  b.average_cost,
  b.stock_value,
  CASE
    WHEN i.reorder_level > 0
      AND b.quantity_on_hand - b.quantity_reserved <= i.reorder_level
    THEN 'low'
    ELSE 'healthy'
  END AS stock_health
FROM item_stock_balances b
JOIN warehouses w ON w.id = b.warehouse_id
JOIN items i ON i.id = b.item_id
JOIN units u ON u.id = i.base_unit_id;

CREATE OR REPLACE VIEW v_ready_stock AS
SELECT
  c.id AS ready_stock_container_id,
  c.store_id,
  c.warehouse_id,
  c.packaging_group_id,
  g.name AS packaging_group_name,
  c.outer_item_id,
  c.inner_item_id,
  c.outer_name_snapshot,
  c.inner_name_snapshot,
  c.initial_inner_quantity,
  c.remaining_inner_quantity,
  c.reserved_inner_quantity,
  (c.remaining_inner_quantity - c.reserved_inner_quantity) AS available_inner_quantity,
  c.capacity_kg,
  c.remaining_cost,
  c.status,
  c.created_at
FROM ready_stock_containers c
JOIN packaging_groups g ON g.id = c.packaging_group_id;

CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
  c.id AS customer_id,
  c.store_id,
  c.name AS customer_name,
  l.name AS location_name,
  sl.name AS sublocation_name,
  COALESCE(debt_totals.total_debt_subtotal, 0) AS total_debt_subtotal,
  COALESCE(debt_totals.total_debt_vat, 0) AS total_debt_vat,
  COALESCE(debt_totals.total_debt_created, 0) AS total_debt_created,
  COALESCE(debt_totals.total_debt_paid, 0) AS total_debt_paid,
  COALESCE(debt_totals.total_remaining_debt, 0) AS total_remaining_debt,
  COALESCE(credit_totals.available_credit, 0) AS available_credit,
  COALESCE(debt_totals.total_remaining_debt, 0) - COALESCE(credit_totals.available_credit, 0) AS net_customer_balance
FROM customers c
JOIN locations l ON l.id = c.location_id
JOIN sublocations sl ON sl.id = c.sublocation_id
LEFT JOIN (
  SELECT
    customer_id,
    SUM(subtotal_amount) AS total_debt_subtotal,
    SUM(vat_amount) AS total_debt_vat,
    SUM(original_amount) AS total_debt_created,
    SUM(paid_amount) AS total_debt_paid,
    SUM(remaining_amount) AS total_remaining_debt
  FROM customer_debts
  WHERE status IN ('pending', 'partially_paid')
  GROUP BY customer_id
) debt_totals ON debt_totals.customer_id = c.id
LEFT JOIN (
  SELECT customer_id, SUM(remaining_amount) AS available_credit
  FROM customer_credits
  WHERE status IN ('available', 'partially_used')
  GROUP BY customer_id
) credit_totals ON credit_totals.customer_id = c.id;

CREATE OR REPLACE VIEW v_dispatch_summary AS
SELECT
  dr.id AS dispatch_request_id,
  dr.store_id,
  dr.dispatch_number,
  dr.request_date,
  dr.status,
  dr.revision,
  s.full_name AS salesman_name,
  w.name AS warehouse_name,
  COUNT(DISTINCT dc.customer_id) AS customers_count,
  dr.total_quantity,
  dr.subtotal_amount,
  dr.vat_amount,
  dr.total_amount,
  dr.total_collected,
  dr.total_debt,
  COALESCE(line_costs.gift_cogs, 0) AS gift_cogs
FROM dispatch_requests dr
JOIN salesmen s ON s.id = dr.salesman_id
JOIN warehouses w ON w.id = dr.warehouse_id
LEFT JOIN dispatch_customers dc ON dc.dispatch_request_id = dr.id
LEFT JOIN (
  SELECT
    di.dispatch_request_id,
    SUM(CASE WHEN di.line_type = 'free_gift' AND dla.status = 'dispatched' THEN dla.total_cost ELSE 0 END) AS gift_cogs
  FROM dispatch_line_allocations dla
  JOIN dispatch_items di ON di.id = dla.dispatch_item_id
  GROUP BY di.dispatch_request_id
) line_costs ON line_costs.dispatch_request_id = dr.id
GROUP BY dr.id, dr.store_id, dr.dispatch_number, dr.request_date, dr.status, dr.revision,
         s.full_name, w.name, dr.total_quantity, dr.subtotal_amount, dr.vat_amount,
         dr.total_amount, dr.total_collected, dr.total_debt, line_costs.gift_cogs;

CREATE OR REPLACE VIEW v_salesman_target_progress AS
SELECT
  st.id AS salesman_target_id,
  st.store_id,
  s.id AS salesman_id,
  s.full_name AS salesman_name,
  s.base_salary,
  l.id AS location_id,
  l.name AS location_name,
  sl.id AS sublocation_id,
  sl.name AS sublocation_name,
  lt.target_period,
  lt.period_start,
  lt.period_end,
  st.target_amount,
  COALESCE(SUM(CASE
    WHEN dr.status IN ('dispatched', 'partially_settled', 'completed')
      AND DATE(COALESCE(dr.dispatched_at, dr.request_date)) BETWEEN lt.period_start AND lt.period_end
      THEN di.line_total * GREATEST((di.quantity - di.returned_quantity) / NULLIF(di.quantity, 0), 0)
    ELSE 0
  END), 0) AS achieved_sales_amount,
  CASE WHEN st.target_amount = 0 THEN 0 ELSE ROUND((COALESCE(SUM(CASE
    WHEN dr.status IN ('dispatched', 'partially_settled', 'completed')
      AND DATE(COALESCE(dr.dispatched_at, dr.request_date)) BETWEEN lt.period_start AND lt.period_end
      THEN di.line_total * GREATEST((di.quantity - di.returned_quantity) / NULLIF(di.quantity, 0), 0)
    ELSE 0
  END), 0) / st.target_amount) * 100, 2) END AS achievement_percentage
FROM salesman_targets st
JOIN salesmen s ON s.id = st.salesman_id
JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
JOIN location_targets lt ON lt.id = slt.location_target_id
JOIN sublocations sl ON sl.id = slt.sublocation_id
JOIN locations l ON l.id = sl.location_id
LEFT JOIN dispatch_requests dr ON dr.salesman_id = st.salesman_id
LEFT JOIN dispatch_customers dc ON dc.dispatch_request_id = dr.id AND dc.sublocation_id = sl.id
LEFT JOIN dispatch_items di ON di.dispatch_customer_id = dc.id AND di.line_type = 'sale'
WHERE st.status = 'active'
GROUP BY st.id, st.store_id, s.id, s.full_name, s.base_salary, l.id, l.name, sl.id, sl.name,
         lt.target_period, lt.period_start, lt.period_end, st.target_amount;

-- Template data only: it enables the existing platform bootstrap flow without
-- copying any prior operational activity, users, items, inventory, sales, or money.
INSERT INTO stores (id, name, code, slug, status, currency_code, notes)
VALUES (1, 'Kivaro Template Store', 'KIVARO-TEMPLATE', 'kivaro-template', 'active', 'USD',
        'Template store used to clone system roles, modules, and standard units.')
ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code), slug = VALUES(slug);

INSERT INTO permissions (id, module, action, permission_key, description) VALUES
  (1, 'dashboard', 'view', 'dashboard.view', 'View dashboard'),
  (2, 'users', 'view', 'users.view', 'View users'),
  (3, 'users', 'create', 'users.create', 'Create users'),
  (4, 'users', 'update', 'users.update', 'Update users'),
  (5, 'users', 'delete', 'users.delete', 'Delete users'),
  (6, 'roles', 'manage', 'roles.manage', 'Manage roles and permissions'),
  (7, 'inventory', 'view', 'inventory.view', 'View inventory'),
  (8, 'inventory', 'create', 'inventory.create', 'Create inventory records'),
  (9, 'inventory', 'update', 'inventory.update', 'Update inventory records'),
  (10, 'inventory', 'delete', 'inventory.delete', 'Delete inventory records'),
  (11, 'stock', 'adjust', 'stock.adjust', 'Adjust stock'),
  (12, 'stock', 'movements', 'stock.movements', 'View stock movements'),
  (13, 'purchase_orders', 'view', 'purchase_orders.view', 'View purchase orders'),
  (14, 'purchase_orders', 'create', 'purchase_orders.create', 'Create purchase orders'),
  (15, 'purchase_orders', 'approve', 'purchase_orders.approve', 'Approve purchase orders'),
  (16, 'purchase_orders', 'receive', 'purchase_orders.receive', 'Receive purchase orders'),
  (17, 'purchase_orders', 'cancel', 'purchase_orders.cancel', 'Cancel purchase orders'),
  (22, 'locations', 'manage', 'locations.manage', 'Manage locations and sublocations'),
  (23, 'targets', 'manage', 'targets.manage', 'Manage targets'),
  (24, 'salesmen', 'manage', 'salesmen.manage', 'Manage salesmen'),
  (25, 'customers', 'view', 'customers.view', 'View customers'),
  (26, 'customers', 'create', 'customers.create', 'Create customers'),
  (27, 'customers', 'update', 'customers.update', 'Update customers'),
  (28, 'customers', 'delete', 'customers.delete', 'Delete customers'),
  (29, 'dispatch', 'view', 'dispatch.view', 'View dispatch requests'),
  (30, 'dispatch', 'create', 'dispatch.create', 'Create dispatch requests'),
  (31, 'dispatch', 'approve', 'dispatch.approve', 'Approve dispatch requests'),
  (32, 'dispatch', 'settle', 'dispatch.settle', 'Settle dispatch requests'),
  (33, 'dispatch', 'print', 'dispatch.print', 'Generate dispatch documents'),
  (34, 'dispatch', 'gift_approve', 'dispatch.gifts.approve', 'Approve requested free gifts'),
  (35, 'invoices', 'view', 'invoices.view', 'View invoices'),
  (36, 'invoices', 'print', 'invoices.print', 'Generate invoice PDFs'),
  (37, 'accounting', 'view', 'accounting.view', 'View accounting'),
  (38, 'accounting', 'manage', 'accounting.manage', 'Manage accounting records'),
  (39, 'debts', 'manage', 'debts.manage', 'Manage customer debts'),
  (40, 'commissions', 'manage', 'commissions.manage', 'Manage commissions'),
  (41, 'reports', 'view', 'reports.view', 'View reports'),
  (42, 'reports', 'export', 'reports.export', 'Export reports'),
  (43, 'audit_logs', 'view', 'audit_logs.view', 'View audit logs'),
  (44, 'settings', 'manage', 'settings.manage', 'Manage system settings'),
  (45, 'superadmin', 'manage', 'superadmin.manage', 'Manage stores and module availability'),
  (46, 'pos', 'own_orders', 'pos.own_orders', 'Create and manage own pending POS orders'),
  (47, 'pos', 'review', 'pos.review', 'Review POS orders'),
  (48, 'pos', 'accept', 'pos.accept', 'Accept POS orders into dispatches'),
  (49, 'pos', 'create_customers', 'pos.create_customers', 'Create POS customers in assigned territories'),
  (50, 'pos', 'request_gifts', 'pos.request_gifts', 'Request free gifts in POS'),
  (51, 'salesman_workspace', 'view', 'salesman_workspace.view', 'View own salesman workspace')
ON DUPLICATE KEY UPDATE module = VALUES(module), action = VALUES(action), description = VALUES(description);

INSERT INTO roles (id, store_id, name, display_name, description, is_system_role, status) VALUES
  (1, 1, 'owner', 'System Owner', 'Full access to the entire store system.', 1, 'active'),
  (2, 1, 'admin', 'Admin', 'Administrative access.', 1, 'active'),
  (3, 1, 'accountant', 'Accountant', 'Accounting, payments, debts, commissions, settlements.', 1, 'active'),
  (4, 1, 'inventory_manager', 'Inventory Manager', 'Items, purchasing, carton stock, packaging, and ready stock.', 1, 'active'),
  (5, 1, 'salesman', 'Salesman / Driver', 'Own POS and delivery workspace access.', 1, 'active'),
  (6, 1, 'viewer', 'Viewer', 'Read-only reporting access.', 1, 'active'),
  (7, NULL, 'superadmin', 'Superadmin', 'Platform-level store and module administration.', 1, 'active')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), description = VALUES(description), status = VALUES(status);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE permission_key NOT IN ('superadmin.manage', 'salesman_workspace.view');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_key <> 'superadmin.manage';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE permission_key IN (
  'dashboard.view','customers.view','dispatch.view','dispatch.approve','dispatch.settle','dispatch.print',
  'invoices.view','invoices.print','accounting.view','accounting.manage','debts.manage','commissions.manage',
  'reports.view','reports.export','salesman_workspace.view'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE permission_key IN (
  'dashboard.view','inventory.view','inventory.create','inventory.update','stock.adjust','stock.movements',
  'purchase_orders.view','purchase_orders.create','purchase_orders.approve','purchase_orders.receive',
  'dispatch.view','dispatch.print',
  'reports.view','reports.export'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_key IN (
  'dashboard.view','customers.view','customers.create',
  'pos.own_orders','pos.create_customers','pos.request_gifts','salesman_workspace.view'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE permission_key IN (
  'dashboard.view','inventory.view','customers.view','dispatch.view','invoices.view','reports.view','salesman_workspace.view'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE permission_key = 'superadmin.manage';

INSERT INTO company_profiles (store_id, company_name, currency_code)
VALUES (1, 'Kivaro Template Store', 'USD')
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name), currency_code = VALUES(currency_code);

INSERT INTO units (id, store_id, name, symbol, unit_type, base_unit_id, conversion_to_base) VALUES
  (1, 1, 'Kilogram', 'kg', 'weight', NULL, 1),
  (2, 1, 'Piece', 'pc', 'quantity', NULL, 1),
  (3, 1, 'Gram', 'g', 'weight', 1, 0.001),
  (4, 1, 'Ton', 'ton', 'weight', 1, 1000)
ON DUPLICATE KEY UPDATE name = VALUES(name), unit_type = VALUES(unit_type), base_unit_id = VALUES(base_unit_id), conversion_to_base = VALUES(conversion_to_base);

INSERT INTO system_settings (store_id, setting_key, setting_value, value_type, description) VALUES
  (NULL, 'platform.store_url_prefix', 'store', 'string', 'Global URL prefix for store workspaces'),
  (1, 'sales.vat.enabled', 'false', 'boolean', 'Enable VAT on new customer sale lines'),
  (1, 'sales.vat.rate', '0', 'number', 'VAT percentage applied to new customer sale lines')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), value_type = VALUES(value_type), description = VALUES(description);

INSERT INTO store_modules (store_id, module_key, enabled) VALUES
  (1, 'dashboard', 1),
  (1, 'inventory', 1),
  (1, 'inventory.items', 1),
  (1, 'inventory.packaging', 1),
  (1, 'inventory.categories', 1),
  (1, 'inventory.units', 1),
  (1, 'inventory.warehouses', 1),
  (1, 'inventory.balances', 1),
  (1, 'inventory.movements', 1),
  (1, 'inventory.adjustments', 1),
  (1, 'purchases', 1),
  (1, 'purchases.orders', 1),
  (1, 'purchases.suppliers', 1),
  (1, 'purchases.payments', 1),
  (1, 'locations', 1),
  (1, 'locations.locations', 1),
  (1, 'locations.sublocations', 1),
  (1, 'locations.salesmen', 1),
  (1, 'locations.targets', 1),
  (1, 'customers', 1),
  (1, 'dispatch', 1),
  (1, 'dispatch.requests', 1),
  (1, 'invoices', 1),
  (1, 'pos', 1),
  (1, 'salesman_workspace', 1),
  (1, 'accounting', 1),
  (1, 'accounting.cash-accounts', 1),
  (1, 'accounting.expense-categories', 1),
  (1, 'accounting.expenses', 1),
  (1, 'accounting.financial-transactions', 1),
  (1, 'accounting.salesman-balances', 1),
  (1, 'payments', 1),
  (1, 'payments.customer-credits', 1),
  (1, 'payments.customer-payments', 1),
  (1, 'payments.debts', 1),
  (1, 'payments.receipts', 1),
  (1, 'commissions', 1),
  (1, 'commissions.calculations', 1),
  (1, 'commissions.rules', 1),
  (1, 'reports', 1),
  (1, 'reports.current-stock', 1),
  (1, 'reports.normal-stock', 1),
  (1, 'reports.packaging-stock', 1),
  (1, 'reports.ready-stock', 1),
  (1, 'reports.customer-balances', 1),
  (1, 'reports.salesman-target-progress', 1),
  (1, 'reports.salesman-performance', 1),
  (1, 'reports.dispatch-summary', 1),
  (1, 'reports.sales', 1),
  (1, 'reports.invoices', 1),
  (1, 'reports.gifts', 1),
  (1, 'reports.pos-orders', 1),
  (1, 'reports.debts', 1),
  (1, 'reports.purchases', 1),
  (1, 'reports.packaging-operations', 1),
  (1, 'reports.packaging-shortages', 1),
  (1, 'reports.stock-movements', 1),
  (1, 'reports.profit-loss', 1),
  (1, 'reports.commissions', 1),
  (1, 'audit_logs', 1),
  (1, 'notifications', 1),
  (1, 'settings', 1),
  (1, 'users', 1),
  (1, 'roles', 1)
ON DUPLICATE KEY UPDATE enabled = VALUES(enabled);

INSERT INTO schema_migrations (migration_name)
VALUES
  ('025_item_based_rebuild.sql'),
  ('026_restrict_owner_platform_permission.sql'),
  ('027_restrict_owner_salesman_workspace.sql')
ON DUPLICATE KEY UPDATE migration_name = VALUES(migration_name);

SET FOREIGN_KEY_CHECKS = 1;
