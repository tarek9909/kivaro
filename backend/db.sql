-- ============================================================
-- Charcoal Distribution Management System
-- MySQL 8.0+ Full Database Schema
-- Modules:
-- Users, Roles, Permissions, Inventory, Purchase Orders,
-- Packaging / Production, Locations, Customers, Dispatch,
-- Accounting, Debts, Commissions, Reports, Audit Logs
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS charcoal_erp;
CREATE DATABASE charcoal_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE charcoal_erp;

CREATE TABLE stores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    contact_name VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    address TEXT NULL,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 1. SYSTEM / AUTHORIZATION
-- ============================================================

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    is_system_role TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_roles_store_name (store_id, name),
    CONSTRAINT fk_roles_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    permission_key VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
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
) ENGINE=InnoDB;

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
    UNIQUE KEY uq_users_store_username (store_id, username),
    UNIQUE KEY uq_users_store_email (store_id, email),
    CONSTRAINT fk_users_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE store_modules (
    store_id BIGINT UNSIGNED NOT NULL,
    module_key VARCHAR(100) NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (store_id, module_key),
    CONSTRAINT fk_store_modules_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(60) NULL,
    user_agent TEXT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. BUSINESS SETTINGS
-- ============================================================

CREATE TABLE system_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    setting_key VARCHAR(150) NOT NULL,
    setting_value TEXT NULL,
    value_type ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
    description TEXT NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_system_settings_store_key (store_id, setting_key),
    CONSTRAINT fk_system_settings_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_system_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE company_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    company_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    address TEXT NULL,
    logo_url VARCHAR(500) NULL,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
    tax_number VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_company_profiles_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. LOCATIONS, SUBLOCATIONS, SALESMEN
-- ============================================================

CREATE TABLE locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NULL UNIQUE,
    description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_locations_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sublocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NULL,
    description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sublocation_location_name (location_id, name),
    CONSTRAINT fk_sublocations_location
        FOREIGN KEY (location_id) REFERENCES locations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sublocations_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE salesmen (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    vehicle_number VARCHAR(100) NULL,
    national_id VARCHAR(100) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    joined_at DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_salesmen_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE salesman_sublocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    salesman_id BIGINT UNSIGNED NOT NULL,
    sublocation_id BIGINT UNSIGNED NOT NULL,
    assigned_at DATE NOT NULL,
    unassigned_at DATE NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    active_assignment_key TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_salesman_active_sublocation (salesman_id, sublocation_id, active_assignment_key),
    KEY idx_salesman_sublocations_salesman_fk (salesman_id),
    KEY idx_salesman_sublocations_sublocation_fk (sublocation_id),
    CONSTRAINT fk_salesman_sublocations_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_salesman_sublocations_sublocation
        FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE location_targets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location_id BIGINT UNSIGNED NOT NULL,
    target_period ENUM('daily','weekly','monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    target_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('draft','active','closed','cancelled') NOT NULL DEFAULT 'draft',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_location_target_period (location_id, period_start, period_end),
    CONSTRAINT fk_location_targets_location
        FOREIGN KEY (location_id) REFERENCES locations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_location_targets_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_location_target_dates CHECK (period_end >= period_start),
    CONSTRAINT chk_location_target_amount CHECK (target_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE sublocation_targets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location_target_id BIGINT UNSIGNED NOT NULL,
    sublocation_id BIGINT UNSIGNED NOT NULL,
    target_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('draft','active','closed','cancelled') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sublocation_target_period (location_target_id, sublocation_id),
    CONSTRAINT fk_sublocation_targets_location_target
        FOREIGN KEY (location_target_id) REFERENCES location_targets(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sublocation_targets_sublocation
        FOREIGN KEY (sublocation_id) REFERENCES sublocations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_sublocation_target_amount CHECK (target_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE salesman_targets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sublocation_target_id BIGINT UNSIGNED NOT NULL,
    salesman_id BIGINT UNSIGNED NOT NULL,
    target_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    achieved_sales_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('active','closed','cancelled') NOT NULL DEFAULT 'active',
    active_target_key TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_salesman_target_sublocation_target (sublocation_target_id, salesman_id, active_target_key),
    KEY idx_salesman_targets_sublocation_target_fk (sublocation_target_id),
    KEY idx_salesman_targets_salesman_fk (salesman_id),
    CONSTRAINT fk_salesman_targets_sublocation_target
        FOREIGN KEY (sublocation_target_id) REFERENCES sublocation_targets(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_salesman_targets_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_salesman_target_amount CHECK (target_amount >= 0),
    CONSTRAINT chk_salesman_achieved_sales CHECK (achieved_sales_amount >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- 4. SUPPLIERS AND INVENTORY MASTER DATA
-- ============================================================

CREATE TABLE suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    address TEXT NULL,
    contact_person VARCHAR(150) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_suppliers_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE item_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NULL UNIQUE,
    description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_categories_parent
        FOREIGN KEY (parent_id) REFERENCES item_categories(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(30) NOT NULL UNIQUE,
    unit_type ENUM('weight','quantity','volume','length','other') NOT NULL DEFAULT 'quantity',
    base_unit_id BIGINT UNSIGNED NULL,
    conversion_to_base DECIMAL(18,8) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_units_base_unit
        FOREIGN KEY (base_unit_id) REFERENCES units(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_unit_conversion CHECK (conversion_to_base > 0)
) ENGINE=InnoDB;

CREATE TABLE items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    base_unit_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(80) NOT NULL UNIQUE,
    item_type ENUM('raw_charcoal','packaging','finished_product','service','other') NOT NULL,
    tracking_type ENUM('stocked','non_stocked') NOT NULL DEFAULT 'stocked',
    description TEXT NULL,
    default_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    default_selling_price DECIMAL(18,4) NULL,
    reorder_level DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_items_category
        FOREIGN KEY (category_id) REFERENCES item_categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_items_base_unit
        FOREIGN KEY (base_unit_id) REFERENCES units(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_items_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_item_default_cost CHECK (default_cost >= 0),
    CONSTRAINT chk_item_default_selling_price CHECK (default_selling_price IS NULL OR default_selling_price >= 0),
    CONSTRAINT chk_item_reorder_level CHECK (reorder_level >= 0)
) ENGINE=InnoDB;

CREATE TABLE item_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT UNSIGNED NOT NULL,
    variant_name VARCHAR(150) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    attributes_json JSON NULL,
    cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    selling_price DECIMAL(18,4) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_variants_item
        FOREIGN KEY (item_id) REFERENCES items(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_item_variant_cost CHECK (cost >= 0),
    CONSTRAINT chk_item_variant_selling_price CHECK (selling_price IS NULL OR selling_price >= 0)
) ENGINE=InnoDB;

CREATE TABLE warehouses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    location_id BIGINT UNSIGNED NULL,
    address TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_warehouses_location
        FOREIGN KEY (location_id) REFERENCES locations(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE item_stock_balances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    quantity_on_hand DECIMAL(18,4) NOT NULL DEFAULT 0,
    quantity_allocated DECIMAL(18,4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_item_stock_warehouse_item (warehouse_id, item_id),
    INDEX idx_item_stock_store_item (store_id, item_id),
    CONSTRAINT fk_item_stock_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_item_stock_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_item_stock_item
        FOREIGN KEY (item_id) REFERENCES items(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_item_stock_quantity_on_hand CHECK (quantity_on_hand >= 0),
    CONSTRAINT chk_item_stock_quantity_allocated CHECK (quantity_allocated >= 0)
) ENGINE=InnoDB;

CREATE TABLE stock_balances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    quantity_on_hand DECIMAL(18,4) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(18,4) NOT NULL DEFAULT 0,
    average_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_stock_warehouse_variant (warehouse_id, item_variant_id),
    CONSTRAINT fk_stock_balances_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_balances_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_stock_quantity_on_hand CHECK (quantity_on_hand >= 0),
    CONSTRAINT chk_stock_quantity_reserved CHECK (quantity_reserved >= 0),
    CONSTRAINT chk_stock_average_cost CHECK (average_cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM(
        'purchase_receive',
        'production_consume',
        'production_output',
        'dispatch_reserve',
        'dispatch_unreserve',
        'dispatch_out',
        'dispatch_return',
        'sales_settle',
        'damage',
        'adjustment',
        'transfer_in',
        'transfer_out'
    ) NOT NULL,
    quantity_change DECIMAL(18,4) NOT NULL,
    quantity_before DECIMAL(18,4) NOT NULL DEFAULT 0,
    quantity_after DECIMAL(18,4) NOT NULL DEFAULT 0,
    reserved_quantity_change DECIMAL(18,4) NOT NULL DEFAULT 0,
    reserved_quantity_before DECIMAL(18,4) NOT NULL DEFAULT 0,
    reserved_quantity_after DECIMAL(18,4) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(18,4) NULL,
    reference_type VARCHAR(100) NULL,
    reference_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stock_movements_reference (reference_type, reference_id),
    CONSTRAINT fk_stock_movements_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_movements_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_movements_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_stock_movement_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- 5. PURCHASE ORDERS AND PARTIAL RECEIVING
-- ============================================================

CREATE TABLE purchase_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(100) NOT NULL UNIQUE,
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
    CONSTRAINT fk_purchase_orders_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_orders_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_orders_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_orders_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_po_amounts CHECK (
        subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND amount_paid >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT UNSIGNED NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    ordered_quantity DECIMAL(18,4) NOT NULL,
    received_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,4) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_order_items_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_order_items_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_poi_quantities CHECK (
        ordered_quantity > 0 AND received_quantity >= 0 AND received_quantity <= ordered_quantity
    ),
    CONSTRAINT chk_poi_amounts CHECK (unit_cost >= 0 AND line_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE purchase_receipts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT UNSIGNED NOT NULL,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    received_date DATE NOT NULL,
    status ENUM('posted','cancelled') NOT NULL DEFAULT 'posted',
    notes TEXT NULL,
    received_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_receipts_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_receipts_received_by
        FOREIGN KEY (received_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE purchase_receipt_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_receipt_id BIGINT UNSIGNED NOT NULL,
    purchase_order_item_id BIGINT UNSIGNED NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    received_quantity DECIMAL(18,4) NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_receipt_items_receipt
        FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_receipt_items_po_item
        FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_receipt_items_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_pri_quantities CHECK (received_quantity > 0),
    CONSTRAINT chk_pri_unit_cost CHECK (unit_cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE supplier_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT UNSIGNED NOT NULL,
    purchase_order_id BIGINT UNSIGNED NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
    reference_number VARCHAR(150) NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_supplier_payments_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_supplier_payments_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_supplier_payments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_supplier_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- ============================================================
-- 6. PACKAGING CONFIGURATION / PRODUCTION / COSTING
-- ============================================================

CREATE TABLE packaging_configurations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    config_name VARCHAR(150) NOT NULL,
    output_item_variant_id BIGINT UNSIGNED NOT NULL,
    charcoal_variant_id BIGINT UNSIGNED NULL,
    packaging_type ENUM('carton_with_packages','carton_direct','loose_shawl','custom') NOT NULL,
    charcoal_quantity_per_output DECIMAL(18,4) NOT NULL DEFAULT 0,
    charcoal_unit_id BIGINT UNSIGNED NULL,
    packages_per_carton INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_config_output_variant
        FOREIGN KEY (output_item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_config_charcoal_variant
        FOREIGN KEY (charcoal_variant_id) REFERENCES item_variants(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_config_charcoal_unit
        FOREIGN KEY (charcoal_unit_id) REFERENCES units(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_config_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_packaging_charcoal_qty CHECK (charcoal_quantity_per_output >= 0)
) ENGINE=InnoDB;

CREATE TABLE packaging_configuration_components (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    packaging_configuration_id BIGINT UNSIGNED NOT NULL,
    component_item_variant_id BIGINT UNSIGNED NOT NULL,
    quantity_per_output DECIMAL(18,4) NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    component_role ENUM('charcoal','carton','package_bag','sticker','other') NOT NULL,
    waste_percentage DECIMAL(8,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_components_config
        FOREIGN KEY (packaging_configuration_id) REFERENCES packaging_configurations(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_components_variant
        FOREIGN KEY (component_item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_components_unit
        FOREIGN KEY (unit_id) REFERENCES units(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_packaging_component_qty CHECK (quantity_per_output > 0),
    CONSTRAINT chk_packaging_component_waste CHECK (waste_percentage >= 0)
) ENGINE=InnoDB;

CREATE TABLE production_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    packaging_configuration_id BIGINT UNSIGNED NULL,
    packaging_group_id BIGINT UNSIGNED NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    charcoal_variant_id BIGINT UNSIGNED NULL,
    output_item_variant_id BIGINT UNSIGNED NOT NULL,
    planned_quantity DECIMAL(18,4) NOT NULL,
    produced_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_component_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    cost_per_output DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('draft','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_production_batches_config
        FOREIGN KEY (packaging_configuration_id) REFERENCES packaging_configurations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_production_batches_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_production_batches_charcoal_variant
        FOREIGN KEY (charcoal_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_production_batches_output_variant
        FOREIGN KEY (output_item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_production_batches_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_production_quantities CHECK (planned_quantity > 0 AND produced_quantity >= 0),
    CONSTRAINT chk_production_costs CHECK (total_component_cost >= 0 AND cost_per_output >= 0)
) ENGINE=InnoDB;

CREATE TABLE production_batch_components (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    production_batch_id BIGINT UNSIGNED NOT NULL,
    component_item_variant_id BIGINT UNSIGNED NOT NULL,
    planned_quantity DECIMAL(18,4) NOT NULL,
    consumed_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_production_components_batch
        FOREIGN KEY (production_batch_id) REFERENCES production_batches(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_production_components_variant
        FOREIGN KEY (component_item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_production_component_quantities CHECK (planned_quantity > 0 AND consumed_quantity >= 0),
    CONSTRAINT chk_production_component_costs CHECK (unit_cost >= 0 AND total_cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE product_cost_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    packaging_configuration_id BIGINT UNSIGNED NULL,
    calculated_cost DECIMAL(18,4) NOT NULL,
    selling_price DECIMAL(18,4) NULL,
    profit_amount DECIMAL(18,4) NULL,
    profit_margin_percentage DECIMAL(8,4) NULL,
    effective_from DATETIME NOT NULL,
    effective_to DATETIME NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_cost_history_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_product_cost_history_config
        FOREIGN KEY (packaging_configuration_id) REFERENCES packaging_configurations(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_product_cost_history_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_product_cost_history_cost CHECK (calculated_cost >= 0),
    CONSTRAINT chk_product_cost_history_selling CHECK (selling_price IS NULL OR selling_price >= 0)
) ENGINE=InnoDB;

CREATE TABLE packaging_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(80) NOT NULL,
    charcoal_variant_id BIGINT UNSIGNED NULL,
    default_warehouse_id BIGINT UNSIGNED NULL,
    description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_groups_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_groups_charcoal_variant
        FOREIGN KEY (charcoal_variant_id) REFERENCES item_variants(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_groups_default_warehouse
        FOREIGN KEY (default_warehouse_id) REFERENCES warehouses(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_groups_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY uq_packaging_groups_store_code (store_id, code),
    INDEX idx_packaging_groups_store_status (store_id, status),
    INDEX idx_packaging_groups_charcoal_variant (charcoal_variant_id)
) ENGINE=InnoDB;

CREATE TABLE packaging_group_components (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    packaging_group_id BIGINT UNSIGNED NOT NULL,
    parent_component_id BIGINT UNSIGNED NULL,
    level_key ENUM('category','item','sub_item','sub_sub_item') NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    unit_symbol ENUM('g','kg','ton','pc') NOT NULL DEFAULT 'pc',
    quantity_per_parent DECIMAL(18,4) NULL,
    capacity_kg DECIMAL(18,4) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_group_components_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_components_group
        FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_components_parent
        FOREIGN KEY (parent_component_id) REFERENCES packaging_group_components(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_components_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_packaging_group_components_qty CHECK (quantity_per_parent IS NULL OR quantity_per_parent > 0),
    CONSTRAINT chk_packaging_group_components_capacity CHECK (capacity_kg IS NULL OR capacity_kg >= 0),
    INDEX idx_packaging_group_components_group_level (packaging_group_id, level_key, sort_order),
    INDEX idx_packaging_group_components_parent (parent_component_id),
    INDEX idx_packaging_group_components_variant (item_variant_id)
) ENGINE=InnoDB;

CREATE TABLE packaging_group_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    packaging_group_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    charcoal_variant_id BIGINT UNSIGNED NOT NULL,
    output_item_variant_id BIGINT UNSIGNED NULL,
    charcoal_quantity_kg DECIMAL(18,4) NOT NULL,
    primary_container_count INT NOT NULL DEFAULT 0,
    produced_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_packaging_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    cost_per_kg DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('calculated','consumed','cancelled') NOT NULL DEFAULT 'calculated',
    production_batch_id BIGINT UNSIGNED NULL,
    calculation_json JSON NULL,
    consumed_at DATETIME NULL,
    consumed_by BIGINT UNSIGNED NULL,
    consumed_movements_json JSON NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_group_assignments_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_assignments_group
        FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_assignments_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_assignments_charcoal_variant
        FOREIGN KEY (charcoal_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_assignments_output_variant
        FOREIGN KEY (output_item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_assignments_production_batch
        FOREIGN KEY (production_batch_id) REFERENCES production_batches(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_assignments_consumed_by
        FOREIGN KEY (consumed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_assignments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_packaging_group_assignments_qty CHECK (charcoal_quantity_kg > 0),
    INDEX idx_packaging_group_assignments_store_created (store_id, created_at),
    INDEX idx_packaging_group_assignments_status (store_id, status),
    INDEX idx_packaging_group_assignments_group (packaging_group_id),
    INDEX idx_packaging_group_assignments_warehouse (warehouse_id),
    INDEX idx_packaging_group_assignments_charcoal_variant (charcoal_variant_id),
    INDEX idx_packaging_group_assignments_output_variant (output_item_variant_id),
    INDEX idx_packaging_group_assignments_production_batch (production_batch_id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. CUSTOMERS
-- ============================================================

CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(100) NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    secondary_phone VARCHAR(50) NULL,
    location_id BIGINT UNSIGNED NOT NULL,
    sublocation_id BIGINT UNSIGNED NOT NULL,
    assigned_salesman_id BIGINT UNSIGNED NULL,
    address VARCHAR(255) NULL,
    detailed_address TEXT NULL,
    notes TEXT NULL,
    status ENUM('active','inactive','blocked') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
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
) ENGINE=InnoDB;

-- ============================================================
-- 8. DISPATCH, DELIVERY, SETTLEMENT
-- ============================================================

CREATE TABLE dispatch_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispatch_number VARCHAR(100) NOT NULL UNIQUE,
    salesman_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    request_date DATE NOT NULL,
    status ENUM(
        'draft',
        'pending_approval',
        'approved',
        'dispatched',
        'partially_settled',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'draft',
    total_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_collected DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_debt DECIMAL(18,4) NOT NULL DEFAULT 0,
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,
    dispatched_by BIGINT UNSIGNED NULL,
    dispatched_at DATETIME NULL,
    completed_by BIGINT UNSIGNED NULL,
    completed_at DATETIME NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatch_requests_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_requests_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_requests_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_requests_dispatched_by
        FOREIGN KEY (dispatched_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_requests_completed_by
        FOREIGN KEY (completed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_requests_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_dispatch_totals CHECK (
        total_quantity >= 0 AND subtotal_amount >= 0 AND vat_amount >= 0 AND total_amount >= 0 AND total_collected >= 0 AND total_debt >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE dispatch_customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
    receipt_number VARCHAR(100) NULL UNIQUE,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dispatch_customer (dispatch_request_id, customer_id),
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
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_dispatch_customer_amounts CHECK (
        subtotal_amount >= 0 AND vat_amount >= 0 AND customer_total_amount >= 0 AND collected_amount >= 0 AND debt_amount >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE dispatch_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispatch_customer_id BIGINT UNSIGNED NOT NULL,
    dispatch_request_id BIGINT UNSIGNED NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    packaging_assignment_id BIGINT UNSIGNED NULL,
    quantity DECIMAL(18,4) NOT NULL,
    unit_price DECIMAL(18,4) NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,4) NOT NULL,
    returned_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatch_items_dispatch_customer
        FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_items_dispatch_request
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_items_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_items_packaging_assignment
        FOREIGN KEY (packaging_assignment_id) REFERENCES packaging_group_assignments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_dispatch_item_quantities CHECK (
        quantity > 0 AND returned_quantity >= 0 AND returned_quantity <= quantity
    ),
    CONSTRAINT chk_dispatch_item_amounts CHECK (
        unit_price >= 0 AND unit_cost >= 0 AND subtotal_amount >= 0 AND vat_rate >= 0 AND vat_amount >= 0 AND line_total >= 0
    ),
    INDEX idx_dispatch_items_packaging_assignment (packaging_assignment_id)
) ENGINE=InnoDB;

CREATE TABLE dispatch_signatures (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispatch_request_id BIGINT UNSIGNED NOT NULL,
    signer_type ENUM('inventory_manager','salesman','accountant','customer') NOT NULL,
    signer_name VARCHAR(150) NULL,
    signature_image_url VARCHAR(500) NULL,
    signed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatch_signatures_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dispatch_settlements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispatch_request_id BIGINT UNSIGNED NOT NULL,
    settlement_number VARCHAR(100) NOT NULL UNIQUE,
    settlement_date DATE NOT NULL,
    total_expected DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_collected DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_debt DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_returned_value DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
    settled_by BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatch_settlements_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_settlements_settled_by
        FOREIGN KEY (settled_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_dispatch_settlement_totals CHECK (
        total_expected >= 0 AND total_collected >= 0 AND total_debt >= 0 AND total_returned_value >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE dispatch_settlement_customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispatch_settlement_id BIGINT UNSIGNED NOT NULL,
    dispatch_customer_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    expected_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    collected_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    debt_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    settlement_status ENUM('paid','partial_debt','debt','cancelled') NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_settlement_customer (dispatch_settlement_id, dispatch_customer_id),
    CONSTRAINT fk_settlement_customers_settlement
        FOREIGN KEY (dispatch_settlement_id) REFERENCES dispatch_settlements(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_settlement_customers_dispatch_customer
        FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_settlement_customers_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_settlement_customer_amounts CHECK (
        expected_amount >= 0 AND collected_amount >= 0 AND debt_amount >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE dispatch_returns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispatch_request_id BIGINT UNSIGNED NOT NULL,
    dispatch_item_id BIGINT UNSIGNED NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    returned_quantity DECIMAL(18,4) NOT NULL,
    reason VARCHAR(255) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatch_returns_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_returns_dispatch_item
        FOREIGN KEY (dispatch_item_id) REFERENCES dispatch_items(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_returns_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dispatch_returns_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_dispatch_return_qty CHECK (returned_quantity > 0)
) ENGINE=InnoDB;

-- ============================================================
-- 9. CUSTOMER DEBTS, PAYMENTS, RECEIPTS
-- ============================================================

CREATE TABLE customer_debts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    salesman_id BIGINT UNSIGNED NULL,
    dispatch_request_id BIGINT UNSIGNED NULL,
    dispatch_customer_id BIGINT UNSIGNED NULL,
    debt_date DATE NOT NULL,
    subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    original_amount DECIMAL(18,4) NOT NULL,
    paid_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(18,4) NOT NULL,
    status ENUM('pending','partially_paid','paid','written_off','cancelled') NOT NULL DEFAULT 'pending',
    due_date DATE NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_debts_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_debts_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_debts_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_debts_dispatch_customer
        FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_debts_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_customer_debt_amounts CHECK (
        subtotal_amount >= 0 AND vat_amount >= 0 AND original_amount > 0 AND paid_amount >= 0 AND remaining_amount >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE customer_debt_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    customer_debt_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    salesman_id BIGINT UNSIGNED NULL,
    dispatch_request_id BIGINT UNSIGNED NULL,
    dispatch_customer_id BIGINT UNSIGNED NULL,
    adjustment_type ENUM('write_off','cancel') NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_debt_adjustments_debt (customer_debt_id),
    INDEX idx_debt_adjustments_dispatch (dispatch_request_id, dispatch_customer_id),
    INDEX idx_debt_adjustments_store_customer (store_id, customer_id),
    CONSTRAINT fk_debt_adjustments_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_debt
        FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_dispatch_customer
        FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_debt_adjustments_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE customer_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    customer_debt_id BIGINT UNSIGNED NULL,
    dispatch_request_id BIGINT UNSIGNED NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
    reference_number VARCHAR(150) NULL,
    collected_by_salesman_id BIGINT UNSIGNED NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_payments_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_payments_debt
        FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_payments_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_payments_collected_by_salesman
        FOREIGN KEY (collected_by_salesman_id) REFERENCES salesmen(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_payments_received_by_user
        FOREIGN KEY (received_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_customer_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE customer_payment_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_payment_id BIGINT UNSIGNED NOT NULL,
    customer_debt_id BIGINT UNSIGNED NOT NULL,
    allocated_amount DECIMAL(18,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_payment_allocations_payment
        FOREIGN KEY (customer_payment_id) REFERENCES customer_payments(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_customer_payment_allocations_debt
        FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_customer_payment_allocations_amount CHECK (allocated_amount > 0)
) ENGINE=InnoDB;

CREATE TABLE customer_credits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    direction ENUM('credit','debit') NOT NULL DEFAULT 'credit',
    amount DECIMAL(18,4) NOT NULL,
    source_payment_id BIGINT UNSIGNED NULL,
    customer_debt_id BIGINT UNSIGNED NULL,
    reference_type VARCHAR(80) NULL,
    reference_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_credits_customer (store_id, customer_id, created_at),
    CONSTRAINT fk_customer_credits_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_payment
        FOREIGN KEY (source_payment_id) REFERENCES customer_payments(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_debt
        FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_customer_credits_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE customer_receipts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
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
    receipt_type ENUM('sale','payment','debt','return') NOT NULL DEFAULT 'sale',
    printed_at DATETIME NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_customer_receipt_amounts CHECK (
        subtotal_amount >= 0 AND vat_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0 AND remaining_amount >= 0
    )
) ENGINE=InnoDB;

-- ============================================================
-- 10. ACCOUNTING
-- ============================================================

CREATE TABLE expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_category_id BIGINT UNSIGNED NOT NULL,
    expense_date DATE NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
    cash_account_id BIGINT UNSIGNED NULL,
    description TEXT NULL,
    reference_number VARCHAR(150) NULL,
    status ENUM('active','voided') NOT NULL DEFAULT 'active',
    voided_at DATETIME NULL,
    voided_by BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_category
        FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_expenses_voided_by
        FOREIGN KEY (voided_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_expenses_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_expense_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE cash_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(150) NOT NULL UNIQUE,
    account_type ENUM('cash','bank','wallet','other') NOT NULL DEFAULT 'cash',
    opening_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
    current_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE expenses ADD CONSTRAINT fk_expenses_cash_account
    FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE financial_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cash_account_id BIGINT UNSIGNED NULL,
    transaction_date DATETIME NOT NULL,
    transaction_type ENUM(
        'sale_collection',
        'customer_debt_payment',
        'supplier_payment',
        'expense',
        'commission_payment',
        'manual_adjustment'
    ) NOT NULL,
    direction ENUM('in','out') NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    reference_type VARCHAR(100) NULL,
    reference_id BIGINT UNSIGNED NULL,
    description TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_financial_reference (reference_type, reference_id),
    CONSTRAINT fk_financial_transactions_cash_account
        FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_financial_transactions_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_financial_transaction_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE salesman_balances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
    CONSTRAINT fk_salesman_balances_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_salesman_balances_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_salesman_balances_closed_by
        FOREIGN KEY (closed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_salesman_balance_amounts CHECK (
        expected_amount >= 0 AND collected_amount >= 0 AND debt_amount >= 0 AND returned_stock_value >= 0
    )
) ENGINE=InnoDB;

-- ============================================================
-- 11. COMMISSIONS
-- ============================================================

CREATE TABLE commission_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    target_period ENUM('daily','weekly','monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
    below_target_rate DECIMAL(8,4) NOT NULL DEFAULT 5.0000,
    at_target_rate DECIMAL(8,4) NOT NULL DEFAULT 10.0000,
    above_target_extra_rate DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
    applies_from DATE NOT NULL,
    applies_to DATE NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_commission_rules_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_commission_rates CHECK (
        below_target_rate >= 0 AND at_target_rate >= 0 AND above_target_extra_rate >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE commission_calculations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
    CONSTRAINT fk_commission_calculations_rule
        FOREIGN KEY (commission_rule_id) REFERENCES commission_rules(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_commission_calculations_salesman_target
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
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_commission_amounts CHECK (
        target_amount >= 0 AND sales_amount >= 0 AND
        below_target_commission >= 0 AND target_commission >= 0 AND
        above_target_commission >= 0 AND total_commission >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE commission_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    commission_calculation_id BIGINT UNSIGNED NOT NULL,
    salesman_id BIGINT UNSIGNED NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
    reference_number VARCHAR(150) NULL,
    paid_by BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_commission_payments_calculation
        FOREIGN KEY (commission_calculation_id) REFERENCES commission_calculations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_commission_payments_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_commission_payments_paid_by
        FOREIGN KEY (paid_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_commission_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- ============================================================
-- 12. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NULL,
    record_id BIGINT UNSIGNED NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(60) NULL,
    user_agent TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_module_action (module, action),
    INDEX idx_audit_table_record (table_name, record_id),
    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 13. NOTIFICATIONS / INTERNAL ALERTS
-- ============================================================

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('info','warning','danger','success') NOT NULL DEFAULT 'info',
    reference_type VARCHAR(100) NULL,
    reference_id BIGINT UNSIGNED NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_reference (reference_type, reference_id),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE locations ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_locations_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE sublocations ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_sublocations_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE salesmen ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_salesmen_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE location_targets ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_location_targets_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE sublocation_targets ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_sublocation_targets_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE salesman_targets ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_salesman_targets_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE suppliers ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_suppliers_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE item_categories ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_item_categories_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE units ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_units_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE items ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_items_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE item_variants ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_item_variants_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE warehouses ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_warehouses_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE stock_balances ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_stock_balances_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE stock_movements ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_stock_movements_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE purchase_orders ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_purchase_orders_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE purchase_receipts ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_purchase_receipts_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE supplier_payments ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_supplier_payments_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE packaging_configurations ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_packaging_configurations_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE production_batches ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_production_batches_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE product_cost_history ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_product_cost_history_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE customers ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_customers_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE dispatch_requests ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_dispatch_requests_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE dispatch_customers ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_dispatch_customers_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE dispatch_settlements ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_dispatch_settlements_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE dispatch_returns ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_dispatch_returns_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE customer_debts ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_customer_debts_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE customer_payments ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_customer_payments_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE customer_receipts ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_customer_receipts_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE expense_categories ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_expense_categories_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE expenses ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_expenses_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE cash_accounts ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_cash_accounts_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE financial_transactions ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_financial_transactions_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE salesman_balances ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_salesman_balances_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE commission_rules ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_commission_rules_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE commission_calculations ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_commission_calculations_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE commission_payments ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_commission_payments_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE audit_logs ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_audit_logs_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE notifications ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_notifications_store FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE locations DROP INDEX code;
ALTER TABLE item_categories DROP INDEX code;
ALTER TABLE units DROP INDEX symbol;
ALTER TABLE items DROP INDEX code;
ALTER TABLE item_variants DROP INDEX sku;
ALTER TABLE warehouses DROP INDEX code;
ALTER TABLE purchase_orders DROP INDEX po_number;
ALTER TABLE purchase_receipts DROP INDEX receipt_number;
ALTER TABLE customers DROP INDEX customer_code;
ALTER TABLE dispatch_requests DROP INDEX dispatch_number;
ALTER TABLE dispatch_customers DROP INDEX receipt_number;
ALTER TABLE dispatch_settlements DROP INDEX settlement_number;
ALTER TABLE customer_receipts DROP INDEX receipt_number;

ALTER TABLE locations ADD UNIQUE KEY uq_locations_store_code (store_id, code);
ALTER TABLE item_categories ADD UNIQUE KEY uq_item_categories_store_code (store_id, code);
ALTER TABLE units ADD UNIQUE KEY uq_units_store_symbol (store_id, symbol);
ALTER TABLE items ADD UNIQUE KEY uq_items_store_code (store_id, code);
ALTER TABLE item_variants ADD UNIQUE KEY uq_item_variants_store_sku (store_id, sku);
ALTER TABLE warehouses ADD UNIQUE KEY uq_warehouses_store_code (store_id, code);
ALTER TABLE purchase_orders ADD UNIQUE KEY uq_purchase_orders_store_number (store_id, po_number);
ALTER TABLE purchase_orders ADD INDEX idx_purchase_orders_cash_account (cash_account_id);
ALTER TABLE purchase_receipts ADD UNIQUE KEY uq_purchase_receipts_store_number (store_id, receipt_number);
ALTER TABLE customers ADD UNIQUE KEY uq_customers_store_code (store_id, customer_code);
ALTER TABLE dispatch_requests ADD UNIQUE KEY uq_dispatch_requests_store_number (store_id, dispatch_number);
ALTER TABLE dispatch_customers ADD UNIQUE KEY uq_dispatch_customers_store_receipt (store_id, receipt_number);
ALTER TABLE dispatch_settlements ADD UNIQUE KEY uq_dispatch_settlements_store_number (store_id, settlement_number);
ALTER TABLE customer_receipts ADD UNIQUE KEY uq_customer_receipts_store_number (store_id, receipt_number);

ALTER TABLE stock_balances ADD INDEX idx_stock_balances_store_variant (store_id, item_variant_id);
ALTER TABLE dispatch_items ADD INDEX idx_dispatch_items_request_variant (dispatch_request_id, item_variant_id);
ALTER TABLE dispatch_settlements ADD INDEX idx_dispatch_settlements_dispatch_status (dispatch_request_id, status);
ALTER TABLE dispatch_settlement_customers ADD INDEX idx_settlement_customers_settlement (dispatch_settlement_id, dispatch_customer_id);
ALTER TABLE customer_debts ADD INDEX idx_customer_debts_status_balance (store_id, customer_id, status, remaining_amount);
ALTER TABLE customer_debts ADD INDEX idx_customer_debts_dispatch_balance (dispatch_request_id, dispatch_customer_id, salesman_id, status, remaining_amount);
ALTER TABLE customer_payment_allocations ADD INDEX idx_payment_allocations_debt (customer_debt_id);
ALTER TABLE supplier_payments ADD INDEX idx_supplier_payments_po (purchase_order_id, payment_date);
ALTER TABLE commission_calculations ADD INDEX idx_commission_calculations_target_status (salesman_target_id, status);
ALTER TABLE commission_payments ADD INDEX idx_commission_payments_calculation (commission_calculation_id);
ALTER TABLE salesman_balances ADD INDEX idx_salesman_balances_status (store_id, salesman_id, status);

-- ============================================================
-- 14. USEFUL REPORTING VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_current_stock AS
SELECT
    sb.id AS stock_balance_id,
    sb.store_id,
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    i.id AS item_id,
    i.name AS item_name,
    i.item_type,
    u.unit_type AS unit_type,
    iv.id AS item_variant_id,
    iv.variant_name,
    iv.sku,
    CASE WHEN u.unit_type = 'weight' THEN 'kg' ELSE u.symbol END AS unit_symbol,
    sb.quantity_on_hand,
    sb.quantity_reserved,
    (sb.quantity_on_hand - sb.quantity_reserved) AS quantity_available,
    sb.average_cost,
    (sb.quantity_on_hand * sb.average_cost) AS stock_value
FROM stock_balances sb
JOIN warehouses w ON w.id = sb.warehouse_id
JOIN item_variants iv ON iv.id = sb.item_variant_id
JOIN items i ON i.id = iv.item_id
JOIN units u ON u.id = i.base_unit_id;

CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
    c.id AS customer_id,
    c.store_id,
    c.name AS customer_name,
    l.name AS location_name,
    sl.name AS sublocation_name,
    COALESCE(SUM(cd.subtotal_amount), 0) AS total_debt_subtotal,
    COALESCE(SUM(cd.vat_amount), 0) AS total_debt_vat,
    COALESCE(SUM(cd.original_amount), 0) AS total_debt_created,
    COALESCE(SUM(cd.paid_amount), 0) AS total_debt_paid,
    COALESCE(SUM(cd.remaining_amount), 0) AS total_remaining_debt,
    COALESCE(credits.available_credit, 0) AS available_credit,
    GREATEST(COALESCE(SUM(cd.remaining_amount), 0) - COALESCE(credits.available_credit, 0), 0) AS net_customer_balance
FROM customers c
JOIN locations l ON l.id = c.location_id
JOIN sublocations sl ON sl.id = c.sublocation_id
LEFT JOIN customer_debts cd ON cd.customer_id = c.id
    AND cd.status IN ('pending','partially_paid')
LEFT JOIN (
    SELECT
        customer_id,
        store_id,
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS available_credit
    FROM customer_credits
    GROUP BY customer_id, store_id
) credits ON credits.customer_id = c.id AND credits.store_id = c.store_id
GROUP BY c.id, c.store_id, c.name, l.name, sl.name, credits.available_credit;

CREATE OR REPLACE VIEW v_salesman_target_progress AS
SELECT
    progress.salesman_target_id,
    progress.store_id,
    progress.salesman_id,
    progress.salesman_name,
    progress.location_name,
    progress.sublocation_name,
    progress.target_period,
    progress.period_start,
    progress.period_end,
    progress.target_amount,
    progress.achieved_sales_amount,
    CASE
        WHEN progress.target_amount = 0 THEN 0
        ELSE ROUND((progress.achieved_sales_amount / progress.target_amount) * 100, 2)
    END AS achievement_percentage
FROM (
    SELECT
        st.id AS salesman_target_id,
        st.store_id,
        s.id AS salesman_id,
        s.full_name AS salesman_name,
        l.name AS location_name,
        sl.name AS sublocation_name,
        lt.target_period,
        lt.period_start,
        lt.period_end,
        st.target_amount,
        COALESCE((
            SELECT SUM(
                CASE WHEN di.quantity > 0
                    THEN di.line_total - (di.line_total * di.returned_quantity / di.quantity)
                    ELSE di.line_total
                END
            )
            FROM dispatch_items di
            JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id
            JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
            WHERE dr.salesman_id = st.salesman_id
              AND dr.store_id = st.store_id
              AND dc.sublocation_id = subt.sublocation_id
              AND dr.status = 'completed'
              AND dr.request_date BETWEEN lt.period_start AND lt.period_end
        ), 0) AS achieved_sales_amount
    FROM salesman_targets st
    JOIN salesmen s ON s.id = st.salesman_id
    JOIN sublocation_targets subt ON subt.id = st.sublocation_target_id
    JOIN location_targets lt ON lt.id = subt.location_target_id
    JOIN sublocations sl ON sl.id = subt.sublocation_id
    JOIN locations l ON l.id = sl.location_id
    WHERE st.status = 'active'
) progress;

CREATE OR REPLACE VIEW v_dispatch_summary AS
SELECT
    dr.id AS dispatch_request_id,
    dr.store_id,
    dr.dispatch_number,
    dr.request_date,
    dr.status,
    s.full_name AS salesman_name,
    w.name AS warehouse_name,
    COALESCE(customers.customers_count, 0) AS customers_count,
    dr.total_quantity,
    dr.subtotal_amount,
    dr.vat_amount,
    dr.total_amount,
    COALESCE(items.returned_subtotal_amount, 0) AS returned_subtotal_amount,
    COALESCE(items.returned_vat_amount, 0) AS returned_vat_amount,
    COALESCE(items.returned_total_amount, 0) AS returned_total_amount,
    GREATEST(dr.subtotal_amount - COALESCE(items.returned_subtotal_amount, 0), 0) AS net_subtotal_amount,
    GREATEST(dr.vat_amount - COALESCE(items.returned_vat_amount, 0), 0) AS net_vat_amount,
    GREATEST(dr.total_amount - COALESCE(items.returned_total_amount, 0), 0) AS net_total_amount,
    dr.total_collected,
    dr.total_debt,
    COALESCE(adjustments.debt_adjustment_amount, 0) AS debt_adjustment_amount,
    COALESCE(debts.outstanding_debt_amount, 0) AS outstanding_debt_amount
FROM dispatch_requests dr
JOIN salesmen s ON s.id = dr.salesman_id
JOIN warehouses w ON w.id = dr.warehouse_id
LEFT JOIN (
    SELECT dispatch_request_id, COUNT(DISTINCT customer_id) AS customers_count
    FROM dispatch_customers
    GROUP BY dispatch_request_id
) customers ON customers.dispatch_request_id = dr.id
LEFT JOIN (
    SELECT
        dispatch_request_id,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN subtotal_amount * returned_quantity / quantity ELSE 0 END), 0) AS returned_subtotal_amount,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN vat_amount * returned_quantity / quantity ELSE 0 END), 0) AS returned_vat_amount,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN line_total * returned_quantity / quantity ELSE 0 END), 0) AS returned_total_amount
    FROM dispatch_items
    GROUP BY dispatch_request_id
) items ON items.dispatch_request_id = dr.id
LEFT JOIN (
    SELECT dispatch_request_id, COALESCE(SUM(amount), 0) AS debt_adjustment_amount
    FROM customer_debt_adjustments
    GROUP BY dispatch_request_id
) adjustments ON adjustments.dispatch_request_id = dr.id
LEFT JOIN (
    SELECT dispatch_request_id, COALESCE(SUM(remaining_amount), 0) AS outstanding_debt_amount
    FROM customer_debts
    WHERE status IN ('pending', 'partially_paid')
    GROUP BY dispatch_request_id
) debts ON debts.dispatch_request_id = dr.id;

-- ============================================================
-- 15. BASIC SEED DATA
-- Password hashes below are placeholders; replace in your backend.
-- ============================================================

INSERT INTO stores (id, name, code, slug, status, contact_name, currency_code, notes) VALUES
(1, 'Default Store', 'DEFAULT', 'default', 'active', 'System Owner', 'USD', 'Initial store created during setup.');

INSERT INTO roles (id, store_id, name, display_name, description, is_system_role) VALUES
(1, 1, 'owner', 'System Owner', 'Full access to the entire system.', 1),
(2, 1, 'admin', 'Admin', 'Administrative access.', 1),
(3, 1, 'accountant', 'Accountant', 'Accounting, payments, debts, commissions, settlements.', 1),
(4, 1, 'inventory_manager', 'Inventory Manager', 'Inventory, purchase receiving, stock movements, production.', 1),
(5, 1, 'salesman', 'Salesman / Driver', 'Can create dispatch requests and view own customers/targets.', 1),
(6, 1, 'viewer', 'Viewer', 'Read-only reporting access.', 1),
(7, NULL, 'superadmin', 'Superadmin', 'Platform-level store and module administration.', 1);

INSERT INTO permissions (module, action, permission_key, description) VALUES
('dashboard','view','dashboard.view','View dashboard'),
('users','view','users.view','View users'),
('users','create','users.create','Create users'),
('users','update','users.update','Update users'),
('users','delete','users.delete','Delete users'),
('roles','manage','roles.manage','Manage roles and permissions'),

('inventory','view','inventory.view','View inventory'),
('inventory','create','inventory.create','Create inventory records'),
('inventory','update','inventory.update','Update inventory records'),
('inventory','delete','inventory.delete','Delete inventory records'),
('stock','adjust','stock.adjust','Adjust stock'),
('stock','movements','stock.movements','View stock movements'),

('purchase_orders','view','purchase_orders.view','View purchase orders'),
('purchase_orders','create','purchase_orders.create','Create purchase orders'),
('purchase_orders','approve','purchase_orders.approve','Approve purchase orders'),
('purchase_orders','receive','purchase_orders.receive','Receive purchase orders'),
('purchase_orders','cancel','purchase_orders.cancel','Cancel purchase orders'),

('production','view','production.view','View production and packaging'),
('production','create','production.create','Create production batches'),
('production','complete','production.complete','Complete production batches'),

('locations','manage','locations.manage','Manage locations and sublocations'),
('targets','manage','targets.manage','Manage targets'),
('salesmen','manage','salesmen.manage','Manage salesmen'),

('customers','view','customers.view','View customers'),
('customers','create','customers.create','Create customers'),
('customers','update','customers.update','Update customers'),
('customers','delete','customers.delete','Delete customers'),

('dispatch','view','dispatch.view','View dispatch requests'),
('dispatch','create','dispatch.create','Create dispatch requests'),
('dispatch','approve','dispatch.approve','Approve dispatch requests'),
('dispatch','settle','dispatch.settle','Settle dispatch requests'),
('dispatch','print','dispatch.print','Print dispatch documents'),

('accounting','view','accounting.view','View accounting'),
('accounting','manage','accounting.manage','Manage accounting records'),
('debts','manage','debts.manage','Manage customer debts'),
('commissions','manage','commissions.manage','Manage commissions'),

('reports','view','reports.view','View reports'),
('reports','export','reports.export','Export reports'),
('audit_logs','view','audit_logs.view','View audit logs'),
('settings','manage','settings.manage','Manage system settings'),
('vat','view','vat.view','View VAT settings'),
('vat','manage','vat.manage','Manage VAT settings'),
('superadmin','manage','superadmin.manage','Manage stores and module availability');

-- Give owner all permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE permission_key <> 'superadmin.manage';

-- Give superadmin platform administration only.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions
WHERE permission_key IN ('superadmin.manage');

-- Admin broad permissions except full role management can be adjusted later.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE permission_key NOT IN ('roles.manage');

-- Accountant permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE permission_key IN (
    'dashboard.view',
    'customers.view',
    'dispatch.view',
    'dispatch.approve',
    'dispatch.settle',
    'dispatch.print',
    'accounting.view',
    'accounting.manage',
    'debts.manage',
    'commissions.manage',
    'reports.view',
    'reports.export'
);

-- Inventory manager permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions
WHERE permission_key IN (
    'dashboard.view',
    'inventory.view',
    'inventory.create',
    'inventory.update',
    'stock.adjust',
    'stock.movements',
    'purchase_orders.view',
    'purchase_orders.create',
    'purchase_orders.receive',
    'production.view',
    'production.create',
    'production.complete',
    'dispatch.view',
    'dispatch.print',
    'reports.view'
);

-- Salesman permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions
WHERE permission_key IN (
    'dashboard.view',
    'customers.view',
    'dispatch.view',
    'dispatch.create',
    'dispatch.print'
);

-- Viewer permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions
WHERE permission_key IN (
    'dashboard.view',
    'reports.view',
    'inventory.view',
    'dispatch.view',
    'customers.view'
);

INSERT INTO store_modules (store_id, module_key, enabled) VALUES
(1, 'dashboard', 1),
(1, 'inventory', 1),
(1, 'purchases', 1),
(1, 'production', 1),
(1, 'locations', 1),
(1, 'customers', 1),
(1, 'dispatch', 1),
(1, 'accounting', 1),
(1, 'payments', 1),
(1, 'commissions', 1),
(1, 'reports', 1),
(1, 'audit_logs', 1),
(1, 'notifications', 1),
(1, 'settings', 1),
(1, 'settings.vat', 1),
(1, 'users', 1),
(1, 'roles', 1);

INSERT INTO store_modules (store_id, module_key, enabled) VALUES
(1, 'inventory.items', 1),
(1, 'inventory.packaging', 1),
(1, 'inventory.variants', 1),
(1, 'inventory.categories', 1),
(1, 'inventory.units', 1),
(1, 'inventory.warehouses', 1),
(1, 'inventory.balances', 1),
(1, 'inventory.movements', 1),
(1, 'inventory.adjustments', 1),
(1, 'purchases.orders', 1),
(1, 'purchases.suppliers', 1),
(1, 'purchases.payments', 1),
(1, 'production.configurations', 1),
(1, 'production.batches', 1),
(1, 'production.cost-history', 1),
(1, 'locations.locations', 1),
(1, 'locations.sublocations', 1),
(1, 'locations.salesmen', 1),
(1, 'locations.targets', 1),
(1, 'dispatch.requests', 1),
(1, 'accounting.expense-categories', 1),
(1, 'accounting.expenses', 1),
(1, 'accounting.cash-accounts', 1),
(1, 'accounting.financial-transactions', 1),
(1, 'accounting.salesman-balances', 1),
(1, 'payments.debts', 1),
(1, 'payments.customer-payments', 1),
(1, 'payments.customer-credits', 1),
(1, 'payments.receipts', 1),
(1, 'commissions.rules', 1),
(1, 'commissions.calculations', 1),
(1, 'reports.current-stock', 1),
(1, 'reports.customer-balances', 1),
(1, 'reports.salesman-target-progress', 1),
(1, 'reports.dispatch-summary', 1),
(1, 'reports.sales', 1),
(1, 'reports.debts', 1),
(1, 'reports.purchases', 1),
(1, 'reports.packaging-assignments', 1),
(1, 'reports.packaging-shortages', 1),
(1, 'reports.stock-movements', 1),
(1, 'reports.profit-loss', 1),
(1, 'reports.commissions', 1);

INSERT INTO units (id, name, symbol, unit_type, base_unit_id, conversion_to_base) VALUES
(1, 'Kilogram', 'kg', 'weight', NULL, 1),
(2, 'Gram', 'g', 'weight', 1, 0.001),
(3, 'Ton', 'ton', 'weight', 1, 1000),
(4, 'Piece', 'pc', 'quantity', NULL, 1),
(5, 'Carton', 'carton', 'quantity', NULL, 1),
(6, 'Bag', 'bag', 'quantity', NULL, 1);

INSERT INTO item_categories (id, parent_id, name, code, description) VALUES
(1, NULL, 'Raw Charcoal', 'RAW_CHARCOAL', 'Raw charcoal by size/type'),
(2, NULL, 'Packaging Materials', 'PACKAGING', 'Cartons, package bags, stickers, labels'),
(3, NULL, 'Finished Products', 'FINISHED_PRODUCTS', 'Ready-to-sell packaged charcoal products');

INSERT IGNORE INTO items (
    store_id, category_id, base_unit_id, name, code, item_type, tracking_type,
    description, default_cost, default_selling_price, reorder_level, status
) VALUES
(1, 2, 4, 'Starter retail packaging category', 'PKG_STARTER_CATEGORY', 'packaging', 'stocked', 'Starter category node for packaging hierarchy demos', 0, NULL, 0, 'active'),
(1, 2, 4, 'Starter 10kg carton', 'PKG_STARTER_CARTON_10KG', 'packaging', 'stocked', 'Demo carton with 10kg capacity', 0.5000, NULL, 0, 'active'),
(1, 2, 4, 'Starter 400g bag', 'PKG_STARTER_BAG_400G', 'packaging', 'stocked', 'Demo bag with 400g capacity', 0.0500, NULL, 0, 'active'),
(1, 2, 4, 'Starter bag sticker', 'PKG_STARTER_STICKER', 'packaging', 'stocked', 'Demo sticker used once per bag', 0.0100, NULL, 0, 'active');

INSERT IGNORE INTO item_variants (store_id, item_id, variant_name, sku, attributes_json, cost, selling_price, status)
SELECT 1, id, 'Retail packaging category', 'PKG-CAT-STARTER', JSON_OBJECT('packaging_unit', 'pc'), 0, NULL, 'active'
FROM items WHERE code = 'PKG_STARTER_CATEGORY';
INSERT IGNORE INTO item_variants (store_id, item_id, variant_name, sku, attributes_json, cost, selling_price, status)
SELECT 1, id, '10kg carton', 'PKG-CARTON-10KG', JSON_OBJECT('packaging_unit', 'pc'), 0.5000, NULL, 'active'
FROM items WHERE code = 'PKG_STARTER_CARTON_10KG';
INSERT IGNORE INTO item_variants (store_id, item_id, variant_name, sku, attributes_json, cost, selling_price, status)
SELECT 1, id, '400g bag', 'PKG-BAG-400G', JSON_OBJECT('packaging_unit', 'pc'), 0.0500, NULL, 'active'
FROM items WHERE code = 'PKG_STARTER_BAG_400G';
INSERT IGNORE INTO item_variants (store_id, item_id, variant_name, sku, attributes_json, cost, selling_price, status)
SELECT 1, id, 'Bag sticker', 'PKG-STICKER-STARTER', JSON_OBJECT('packaging_unit', 'pc'), 0.0100, NULL, 'active'
FROM items WHERE code = 'PKG_STARTER_STICKER';

INSERT IGNORE INTO packaging_groups (store_id, name, code, description, status)
VALUES (1, 'Starter 10kg carton / 400g bag', 'PKG_GROUP_STARTER_10KG_400G', 'Demo group: carton -> bag -> sticker', 'active');

SELECT @starter_packaging_group_id := id FROM packaging_groups WHERE store_id = 1 AND code = 'PKG_GROUP_STARTER_10KG_400G' LIMIT 1;
SELECT @starter_category_variant_id := id FROM item_variants WHERE sku = 'PKG-CAT-STARTER' LIMIT 1;
SELECT @starter_carton_variant_id := id FROM item_variants WHERE sku = 'PKG-CARTON-10KG' LIMIT 1;
SELECT @starter_bag_variant_id := id FROM item_variants WHERE sku = 'PKG-BAG-400G' LIMIT 1;
SELECT @starter_sticker_variant_id := id FROM item_variants WHERE sku = 'PKG-STICKER-STARTER' LIMIT 1;

INSERT INTO packaging_group_components (
    store_id, packaging_group_id, parent_component_id, level_key, item_variant_id,
    unit_symbol, quantity_per_parent, capacity_kg, sort_order, notes
)
SELECT 1, @starter_packaging_group_id, NULL, 'category', @starter_category_variant_id, 'pc', NULL, NULL, 0, 'Top category node'
WHERE NOT EXISTS (
    SELECT 1 FROM packaging_group_components
    WHERE packaging_group_id = @starter_packaging_group_id
      AND level_key = 'category'
      AND item_variant_id = @starter_category_variant_id
);
SELECT @starter_category_component_id := id
FROM packaging_group_components
WHERE packaging_group_id = @starter_packaging_group_id
  AND level_key = 'category'
  AND item_variant_id = @starter_category_variant_id
LIMIT 1;

INSERT INTO packaging_group_components (
    store_id, packaging_group_id, parent_component_id, level_key, item_variant_id,
    unit_symbol, quantity_per_parent, capacity_kg, sort_order, notes
)
SELECT 1, @starter_packaging_group_id, @starter_category_component_id, 'item', @starter_carton_variant_id, 'pc', 1, 10.0000, 1, '10kg carton'
WHERE NOT EXISTS (
    SELECT 1 FROM packaging_group_components
    WHERE packaging_group_id = @starter_packaging_group_id
      AND parent_component_id = @starter_category_component_id
      AND level_key = 'item'
      AND item_variant_id = @starter_carton_variant_id
);
SELECT @starter_carton_component_id := id
FROM packaging_group_components
WHERE packaging_group_id = @starter_packaging_group_id
  AND parent_component_id = @starter_category_component_id
  AND level_key = 'item'
  AND item_variant_id = @starter_carton_variant_id
LIMIT 1;

INSERT INTO packaging_group_components (
    store_id, packaging_group_id, parent_component_id, level_key, item_variant_id,
    unit_symbol, quantity_per_parent, capacity_kg, sort_order, notes
)
SELECT 1, @starter_packaging_group_id, @starter_carton_component_id, 'sub_item', @starter_bag_variant_id, 'pc', 25, 0.4000, 1, '25 bags per 10kg carton'
WHERE NOT EXISTS (
    SELECT 1 FROM packaging_group_components
    WHERE packaging_group_id = @starter_packaging_group_id
      AND parent_component_id = @starter_carton_component_id
      AND level_key = 'sub_item'
      AND item_variant_id = @starter_bag_variant_id
);
SELECT @starter_bag_component_id := id
FROM packaging_group_components
WHERE packaging_group_id = @starter_packaging_group_id
  AND parent_component_id = @starter_carton_component_id
  AND level_key = 'sub_item'
  AND item_variant_id = @starter_bag_variant_id
LIMIT 1;

INSERT INTO packaging_group_components (
    store_id, packaging_group_id, parent_component_id, level_key, item_variant_id,
    unit_symbol, quantity_per_parent, capacity_kg, sort_order, notes
)
SELECT 1, @starter_packaging_group_id, @starter_bag_component_id, 'sub_sub_item', @starter_sticker_variant_id, 'pc', 1, NULL, 1, 'One sticker per bag'
WHERE NOT EXISTS (
    SELECT 1 FROM packaging_group_components
    WHERE packaging_group_id = @starter_packaging_group_id
      AND parent_component_id = @starter_bag_component_id
      AND level_key = 'sub_sub_item'
      AND item_variant_id = @starter_sticker_variant_id
);

INSERT INTO expense_categories (name, description) VALUES
('Fuel', 'Fuel and vehicle expenses'),
('Maintenance', 'Vehicle or equipment maintenance'),
('Rent', 'Warehouse or office rent'),
('Salaries', 'Staff salaries'),
('Other', 'Other general expenses');

INSERT INTO cash_accounts (account_name, account_type, opening_balance, current_balance) VALUES
('Main Cashbox', 'cash', 0, 0);

INSERT INTO commission_rules (
    name,
    target_period,
    below_target_rate,
    at_target_rate,
    above_target_extra_rate,
    applies_from,
    status
) VALUES (
    'Default Salesman Commission Rule',
    'monthly',
    5.0000,
    10.0000,
    1.0000,
    CURRENT_DATE(),
    'active'
);

UPDATE units SET store_id = 1 WHERE store_id IS NULL;
UPDATE item_categories SET store_id = 1 WHERE store_id IS NULL;
UPDATE expense_categories SET store_id = 1 WHERE store_id IS NULL;
UPDATE cash_accounts SET store_id = 1 WHERE store_id IS NULL;
UPDATE commission_rules SET store_id = 1 WHERE store_id IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF FILE
-- ============================================================
