-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Aug 08, 2026 at 12:44 AM
-- Server version: 8.0.45
-- PHP Version: 8.2.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `charcoal_erp`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `module` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` bigint UNSIGNED DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `request_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `store_id`, `user_id`, `module`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `request_path`, `description`, `created_at`) VALUES
(1, NULL, 1, 'superadmin', 'update', 'superadmin', 1, NULL, '{\"body\": {\"vat\": {\"rate\": 0, \"enabled\": false}, \"code\": \"KIVARO-TEMPLATE\", \"name\": \"Kivaro Template Store\", \"slug\": \"kivaro-template\", \"email\": \"kivaro@gmail.com\", \"notes\": \"Template store used to clone system roles, modules, and standard units.\", \"phone\": null, \"status\": \"active\", \"address\": null, \"modules\": {\"pos\": true, \"roles\": true, \"users\": true, \"reports\": true, \"dispatch\": true, \"invoices\": true, \"payments\": true, \"settings\": true, \"customers\": true, \"dashboard\": true, \"inventory\": true, \"locations\": true, \"purchases\": true, \"accounting\": true, \"audit_logs\": true, \"commissions\": true, \"notifications\": true, \"reports.debts\": true, \"reports.gifts\": true, \"reports.sales\": true, \"payments.debts\": true, \"inventory.items\": true, \"inventory.units\": true, \"purchases.orders\": true, \"reports.invoices\": true, \"commissions.rules\": true, \"dispatch.requests\": true, \"locations.targets\": true, \"payments.receipts\": true, \"reports.purchases\": true, \"inventory.balances\": true, \"locations.salesmen\": true, \"purchases.payments\": true, \"reports.pos-orders\": true, \"salesman_workspace\": true, \"accounting.expenses\": true, \"inventory.movements\": true, \"inventory.packaging\": true, \"locations.locations\": true, \"purchases.suppliers\": true, \"reports.commissions\": true, \"reports.profit-loss\": true, \"reports.ready-stock\": true, \"inventory.categories\": true, \"inventory.warehouses\": true, \"reports.normal-stock\": true, \"inventory.adjustments\": true, \"reports.current-stock\": true, \"locations.sublocations\": true, \"reports.packaging-stock\": true, \"reports.stock-movements\": true, \"accounting.cash-accounts\": true, \"commissions.calculations\": true, \"reports.dispatch-summary\": true, \"payments.customer-credits\": true, \"reports.customer-balances\": true, \"payments.customer-payments\": true, \"reports.packaging-shortages\": true, \"accounting.salesman-balances\": true, \"reports.packaging-operations\": true, \"reports.salesman-performance\": true, \"accounting.expense-categories\": true, \"reports.salesman-target-progress\": true, \"accounting.financial-transactions\": true}, \"contact_name\": null, \"currency_code\": \"USD\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'PATCH /api/superadmin/stores/1', '2026-07-31 19:38:25'),
(2, NULL, 1, 'superadmin', 'stores', 'superadmin', NULL, NULL, '{\"body\": {\"vat\": {\"rate\": 0, \"enabled\": false}, \"code\": \"test\", \"name\": \"test\", \"slug\": \"test\", \"email\": \"test@gmail.com\", \"notes\": null, \"owner\": {\"email\": null, \"phone\": null, \"password\": \"12345678\", \"username\": \"test@example.com\", \"full_name\": \"test\"}, \"phone\": \"123\", \"status\": \"active\", \"address\": null, \"modules\": {\"pos\": true, \"roles\": true, \"users\": true, \"reports\": true, \"dispatch\": true, \"invoices\": true, \"payments\": true, \"settings\": true, \"customers\": true, \"dashboard\": true, \"inventory\": true, \"locations\": true, \"purchases\": true, \"accounting\": true, \"audit_logs\": true, \"commissions\": true, \"notifications\": true, \"reports.debts\": true, \"reports.gifts\": true, \"reports.sales\": true, \"payments.debts\": true, \"inventory.items\": true, \"inventory.units\": true, \"purchases.orders\": true, \"reports.invoices\": true, \"commissions.rules\": true, \"dispatch.requests\": true, \"locations.targets\": true, \"payments.receipts\": true, \"reports.purchases\": true, \"inventory.balances\": true, \"locations.salesmen\": true, \"purchases.payments\": true, \"reports.pos-orders\": true, \"salesman_workspace\": true, \"accounting.expenses\": true, \"inventory.movements\": true, \"inventory.packaging\": true, \"locations.locations\": true, \"purchases.suppliers\": true, \"reports.commissions\": true, \"reports.profit-loss\": true, \"reports.ready-stock\": true, \"inventory.categories\": true, \"inventory.warehouses\": true, \"reports.normal-stock\": true, \"inventory.adjustments\": true, \"reports.current-stock\": true, \"locations.sublocations\": true, \"reports.packaging-stock\": true, \"reports.stock-movements\": true, \"accounting.cash-accounts\": true, \"commissions.calculations\": true, \"reports.dispatch-summary\": true, \"payments.customer-credits\": true, \"reports.customer-balances\": true, \"payments.customer-payments\": true, \"reports.packaging-shortages\": true, \"accounting.salesman-balances\": true, \"reports.packaging-operations\": true, \"reports.salesman-performance\": true, \"accounting.expense-categories\": true, \"reports.salesman-target-progress\": true, \"accounting.financial-transactions\": true}, \"contact_name\": \"test\", \"currency_code\": \"USD\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/superadmin/stores', '2026-07-31 19:39:11'),
(3, 2, 1, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 2, \"target_store_id\": 2, \"impersonated_by_user_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'Superadmin entered store test as test@example.com', '2026-07-31 19:39:14'),
(4, NULL, 1, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/superadmin/stores/2/impersonate', '2026-07-31 19:39:14'),
(5, 2, 2, 'item_categories', 'create', 'item_categories', NULL, NULL, '{\"body\": {\"code\": null, \"name\": \"fahme\", \"status\": \"active\", \"parent_id\": null, \"description\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/item-categories', '2026-07-31 19:39:39'),
(6, 2, 2, 'inventory', 'create', 'warehouses', NULL, NULL, '{\"body\": {\"code\": \"1\", \"name\": \"jadra\", \"status\": \"active\", \"address\": null, \"location_id\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/warehouses', '2026-07-31 19:39:51'),
(7, 2, 2, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"1\", \"name\": \"fahem 5.5\", \"status\": \"active\", \"item_kind\": \"normal\", \"stock_mode\": \"carton\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 6, \"default_cost\": 1, \"warehouse_id\": 1, \"kg_per_carton\": 10, \"reorder_level\": 98, \"initial_cartons\": 100, \"default_selling_price\": null, \"initial_cost_per_carton\": 0.5}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/items', '2026-07-31 19:56:11'),
(8, 2, 2, 'inventory', 'stock_adjustment', 'item_stock_balances', 2, NULL, '{\"item_id\": 2, \"warehouse_id\": 1, \"quantity_after\": \"115.0000\", \"stock_movement_id\": 2, \"quantity_reserved_after\": \"0.0000\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'asd', '2026-07-31 20:05:37'),
(9, 2, 2, 'inventory', 'create', 'item_stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"asd\", \"item_id\": 2, \"warehouse_id\": 1, \"carton_count_change\": 15}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/stock-adjustments', '2026-07-31 20:05:37'),
(10, 2, 2, 'item_categories', 'create', 'item_categories', NULL, NULL, '{\"body\": {\"code\": null, \"name\": \"package\", \"status\": \"active\", \"parent_id\": null, \"description\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/item-categories', '2026-07-31 20:05:50'),
(11, 2, 2, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"12\", \"name\": \"cartoon 10kg\", \"status\": \"active\", \"item_kind\": \"packaging\", \"stock_mode\": \"piece\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 6, \"default_cost\": 0, \"reorder_level\": 0, \"default_selling_price\": null, \"max_content_weight_kg\": 6}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/items', '2026-07-31 20:06:31'),
(12, 2, 2, 'inventory', 'stock_adjustment', 'item_stock_balances', 3, NULL, '{\"item_id\": 4, \"warehouse_id\": 1, \"quantity_after\": \"1000.0000\", \"stock_movement_id\": 3, \"quantity_reserved_after\": \"0.0000\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'ads', '2026-07-31 20:06:42'),
(13, 2, 2, 'inventory', 'create', 'item_stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"ads\", \"item_id\": 4, \"warehouse_id\": 1, \"quantity_change\": 1000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/stock-adjustments', '2026-07-31 20:06:42'),
(14, 2, 2, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"123\", \"name\": \"bag 400g\", \"status\": \"active\", \"item_kind\": \"packaging\", \"stock_mode\": \"piece\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 6, \"default_cost\": 0, \"warehouse_id\": 1, \"reorder_level\": 0, \"initial_quantity\": 1000, \"initial_unit_cost\": 0, \"default_selling_price\": null, \"max_content_weight_kg\": 0.4}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/items', '2026-07-31 20:07:02'),
(15, 2, 2, 'inventory', 'create', 'packaging_groups', NULL, NULL, '{\"body\": {\"code\": \"321\", \"name\": \"carton 6kg 400g\", \"status\": \"active\", \"components\": [{\"notes\": null, \"item_id\": 4, \"sort_order\": 0, \"component_role\": \"outer_sellable\", \"quantity_per_outer\": 1}, {\"notes\": null, \"item_id\": 5, \"sort_order\": 1, \"component_role\": \"inner_sellable\", \"quantity_per_outer\": 15}], \"description\": null, \"input_item_id\": 2, \"default_warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/packaging-groups', '2026-07-31 20:10:40'),
(16, 2, 2, 'inventory', 'preview', 'packaging_groups', 3, NULL, '{\"body\": {\"output_carton_count\": 30}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/packaging-groups/3/preview', '2026-07-31 20:11:21'),
(17, 2, 2, 'inventory', 'preview', 'packaging_groups', 3, NULL, '{\"body\": {\"output_carton_count\": 31}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/packaging-groups/3/preview', '2026-07-31 20:11:50'),
(18, 2, 2, 'inventory', 'preview', 'packaging_groups', 3, NULL, '{\"body\": {\"output_carton_count\": 30}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/packaging-groups/3/preview', '2026-07-31 20:12:03'),
(19, 2, 2, 'inventory', 'preview', 'packaging_groups', 3, NULL, '{\"body\": {\"output_carton_count\": 31}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/packaging-groups/3/preview', '2026-07-31 20:12:07'),
(20, 2, 2, 'inventory', 'preview', 'packaging_groups', 3, NULL, '{\"body\": {\"warehouse_id\": 1, \"output_carton_count\": 31}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/packaging-groups/3/preview', '2026-07-31 20:19:05'),
(21, 2, 2, 'inventory', 'complete', 'packaging_groups', 3, NULL, '{\"body\": {\"warehouse_id\": 1, \"output_carton_count\": 31}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/packaging-groups/3/complete', '2026-07-31 20:22:12'),
(22, 2, 2, 'inventory', 'create', 'sale_catalog_entries', NULL, NULL, '{\"body\": {\"status\": \"active\", \"item_id\": 2, \"entry_type\": \"normal_carton\", \"default_price\": 15, \"is_pos_active\": true, \"packaging_group_id\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/sale-catalog', '2026-07-31 20:25:28'),
(23, 2, 2, 'inventory', 'create', 'sale_catalog_entries', NULL, NULL, '{\"body\": {\"status\": \"active\", \"item_id\": null, \"entry_type\": \"ready_inner_unit\", \"default_price\": 0, \"is_pos_active\": false, \"packaging_group_id\": 3}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/sale-catalog', '2026-07-31 20:27:16'),
(24, 2, 2, 'inventory', 'update', 'sale_catalog_entries', 2, NULL, '{\"body\": {\"status\": \"active\", \"item_id\": null, \"vat_rate\": 0, \"entry_type\": \"ready_inner_unit\", \"unit_label\": \"bag\", \"display_name\": \"carton 6kg 400g — Ready bag\", \"default_price\": 0, \"is_pos_active\": true, \"packaging_group_id\": 3}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'PATCH /api/sale-catalog/2', '2026-07-31 20:27:22'),
(25, 2, 2, 'inventory', 'create', 'sale_catalog_entries', NULL, NULL, '{\"body\": {\"status\": \"active\", \"item_id\": null, \"entry_type\": \"ready_outer_carton\", \"default_price\": 17, \"is_pos_active\": true, \"packaging_group_id\": 3}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/sale-catalog', '2026-07-31 20:27:33'),
(26, 2, 2, 'users', 'create', 'users', NULL, NULL, '{\"body\": {\"email\": \"sales@gmail.com\", \"phone\": \"123\", \"status\": \"active\", \"role_id\": 12, \"password\": \"12345678\", \"username\": \"sales\", \"full_name\": \"test sales\", \"create_real_salesman\": true}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/users', '2026-07-31 20:41:45'),
(27, 2, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/auth/logout', '2026-07-31 20:41:51'),
(28, 2, 3, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/auth/logout', '2026-07-31 20:45:32'),
(29, 2, 1, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 2, \"target_store_id\": 2, \"impersonated_by_user_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'Superadmin entered store test as test@example.com', '2026-07-31 20:45:46'),
(30, NULL, 1, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/superadmin/stores/2/impersonate', '2026-07-31 20:45:46'),
(31, 2, 2, 'locations', 'create', 'locations', NULL, NULL, '{\"body\": {\"code\": \"123444\", \"name\": \"beirut\", \"status\": \"active\", \"description\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/locations', '2026-07-31 20:45:56'),
(32, 2, 2, 'locations', 'create', 'sublocations', NULL, NULL, '{\"body\": {\"code\": \"12313123\", \"name\": \"hamra\", \"status\": \"active\", \"description\": null, \"location_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/sublocations', '2026-07-31 20:46:05'),
(33, 2, 2, 'salesmen', 'sublocations', 'salesmen', 1, NULL, '{\"body\": {\"assigned_at\": \"2026-07-31\", \"sublocation_ids\": [1]}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'PUT /api/salesmen/1/sublocations', '2026-07-31 20:46:10'),
(34, 2, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/auth/logout', '2026-07-31 20:46:16'),
(35, 2, 3, 'pos', 'customers', 'pos_orders', NULL, NULL, '{\"body\": {\"name\": \"test\", \"notes\": null, \"phone\": \"12312312\", \"address\": null, \"location_id\": 1, \"customer_code\": \"12321\", \"sublocation_id\": 1, \"secondary_phone\": \"123123\", \"detailed_address\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/customers', '2026-07-31 20:46:32'),
(36, 2, 3, 'pos', 'orders', 'pos_orders', NULL, NULL, '{\"body\": {\"lines\": [{\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}], \"notes\": null, \"order_date\": \"2026-07-31\", \"customer_id\": 1, \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/orders', '2026-07-31 20:46:47'),
(37, 2, 3, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/auth/logout', '2026-07-31 20:46:54'),
(38, 2, 1, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 2, \"target_store_id\": 2, \"impersonated_by_user_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'Superadmin entered store test as test@example.com', '2026-07-31 20:47:03'),
(39, NULL, 1, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/superadmin/stores/2/impersonate', '2026-07-31 20:47:03'),
(40, 2, 2, 'pos', 'prepare_dispatch', 'pos_orders', NULL, NULL, '{\"body\": {\"pos_order_ids\": [1]}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/review/prepare-dispatch', '2026-07-31 20:47:08'),
(41, 2, 2, 'dispatch', 'from_pos', 'dispatch_requests', NULL, NULL, '{\"body\": {\"pos_order_ids\": [1]}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/from-pos', '2026-07-31 20:47:13'),
(42, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/1/submit', '2026-08-01 15:32:04'),
(43, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/1/approve', '2026-08-01 15:39:55'),
(44, 2, 2, 'pos', 'orders', 'pos_orders', NULL, NULL, '{\"body\": {\"lines\": [{\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}], \"notes\": null, \"order_date\": \"2026-08-01\", \"customer_id\": 1, \"salesman_id\": 1, \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/orders', '2026-08-01 15:42:44'),
(45, 2, 2, 'dispatch', 'dispatch', 'dispatch_requests', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/1/dispatch', '2026-08-01 16:13:55'),
(46, 2, 2, 'dispatch', 'closeout', 'dispatch_requests', 1, NULL, '{\"body\": {\"notes\": null, \"customers\": [{\"collected_amount\": 12, \"dispatch_customer_id\": 1}], \"settlement_date\": \"2026-08-01\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/1/closeout', '2026-08-01 16:19:44'),
(47, 2, 2, 'accounting', 'create', 'cash_accounts', NULL, NULL, '{\"body\": {\"status\": \"active\", \"account_name\": \"test\", \"account_type\": \"cash\", \"opening_balance\": 0, \"cash_flow_permission\": \"both\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/cash-accounts', '2026-08-01 16:20:41'),
(48, 2, 2, 'dispatch', 'post', 'dispatch_settlements', 1, NULL, '{\"body\": {\"cash_account_id\": 1, \"settlement_date\": \"2026-07-31\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-settlements/1/post', '2026-08-01 16:24:09'),
(49, 2, 2, 'pos', 'orders', 'pos_orders', NULL, NULL, '{\"body\": {\"lines\": [{\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}, {\"notes\": null, \"quantity\": 2, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}], \"notes\": null, \"order_date\": \"2026-08-01\", \"customer_id\": 1, \"salesman_id\": 1, \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/orders', '2026-08-01 16:26:54'),
(50, 2, 2, 'pos', 'prepare_dispatch', 'pos_orders', NULL, NULL, '{\"body\": {\"pos_order_ids\": [2, 3]}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/review/prepare-dispatch', '2026-08-01 16:27:10'),
(51, 2, 2, 'dispatch', 'from_pos', 'dispatch_requests', NULL, NULL, '{\"body\": {\"pos_order_ids\": [2, 3]}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/from-pos', '2026-08-01 16:27:12'),
(52, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/2/submit', '2026-08-01 16:27:26'),
(53, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/2/approve', '2026-08-01 16:27:36'),
(54, 2, 2, 'dispatch', 'dispatch', 'dispatch_requests', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/2/dispatch', '2026-08-01 16:27:38'),
(55, 2, 2, 'dispatch', 'closeout', 'dispatch_requests', 2, NULL, '{\"body\": {\"notes\": null, \"customers\": [{\"collected_amount\": 60, \"dispatch_customer_id\": 2}], \"settlement_date\": \"2026-08-01\"}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/2/closeout', '2026-08-01 16:27:44'),
(56, 2, 2, 'dispatch', 'post', 'dispatch_settlements', 2, NULL, '{\"body\": {\"cash_account_id\": 1, \"settlement_date\": \"2026-07-31\"}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-settlements/2/post', '2026-08-01 16:27:46'),
(57, 2, 2, 'pos', 'draft_orders', 'pos_orders', NULL, NULL, '{\"body\": {\"lines\": [{\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}], \"notes\": null, \"order_date\": \"2026-08-01\", \"customer_id\": 1, \"salesman_id\": 1, \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/draft-orders', '2026-08-01 16:51:47'),
(58, 2, 2, 'pos', 'draft_orders', 'pos_orders', NULL, NULL, '{\"body\": {\"lines\": [{\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}], \"notes\": null, \"order_date\": \"2026-08-01\", \"customer_id\": 1, \"salesman_id\": 1, \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/draft-orders', '2026-08-01 17:05:54'),
(59, 2, 2, 'pos', 'orders', 'pos_orders', NULL, NULL, '{\"body\": {\"lines\": [{\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}, {\"notes\": null, \"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}], \"notes\": null, \"order_date\": \"2026-08-01\", \"customer_id\": 1, \"salesman_id\": 1, \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/orders', '2026-08-01 17:07:33'),
(60, 2, 2, 'salesmen', 'sublocations', 'salesmen', 1, NULL, '{\"body\": {\"assigned_at\": \"2026-08-01\", \"sublocation_ids\": [1]}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'PUT /api/salesmen/1/sublocations', '2026-08-01 17:08:00'),
(61, 2, 2, 'pos', 'prepare_dispatch', 'pos_orders', NULL, NULL, '{\"body\": {\"pos_order_ids\": [4]}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/review/prepare-dispatch', '2026-08-01 17:08:12'),
(62, 2, 2, 'dispatch', 'from_pos', 'dispatch_requests', NULL, NULL, '{\"body\": {\"pos_order_ids\": [4]}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/from-pos', '2026-08-01 17:08:14'),
(63, 2, 2, 'pos', 'draft_orders', 'pos_orders', NULL, NULL, '{\"body\": {\"notes\": \"\", \"customers\": [{\"lines\": [{\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}], \"customer_id\": 1}], \"salesman_id\": 1, \"request_date\": \"2026-08-01\", \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/draft-orders', '2026-08-01 17:16:52'),
(64, 2, 2, 'pos', 'customers', 'pos_orders', NULL, NULL, '{\"body\": {\"name\": \"1231dasdfsdg\", \"notes\": \"3123\", \"phone\": \"12312312\", \"address\": \"123\", \"location_id\": 1, \"salesman_id\": 1, \"customer_code\": null, \"sublocation_id\": 1, \"secondary_phone\": \"123123\", \"detailed_address\": \"12312\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/customers', '2026-08-01 17:17:12'),
(65, 2, 2, 'pos', 'draft_orders', 'pos_orders', NULL, NULL, '{\"body\": {\"notes\": \"\", \"customers\": [{\"lines\": [{\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}], \"customer_id\": 1}, {\"lines\": [{\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}], \"customer_id\": 2}], \"salesman_id\": 1, \"request_date\": \"2026-08-01\", \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/draft-orders', '2026-08-01 17:17:18'),
(66, 2, 1, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 2, \"target_store_id\": 2, \"impersonated_by_user_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'Superadmin entered store test as test@example.com', '2026-08-03 21:57:09'),
(67, NULL, 1, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/superadmin/stores/2/impersonate', '2026-08-03 21:57:09'),
(68, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 7, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 7}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/7/submit', '2026-08-03 21:57:33'),
(69, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 7, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 7}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/7/approve', '2026-08-03 21:58:26'),
(70, 2, 2, 'pos', 'draft_orders', 'pos_orders', NULL, NULL, '{\"body\": {\"notes\": \"\", \"customers\": [{\"lines\": [{\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 2}], \"customer_id\": 2}], \"salesman_id\": 1, \"request_date\": \"2026-08-03\", \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/draft-orders', '2026-08-03 22:00:25'),
(71, 2, 2, 'notifications', 'read', 'notifications', 5, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 5}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'PATCH /api/notifications/5/read', '2026-08-03 22:05:07'),
(72, 2, 2, 'dispatch', 'dispatch', 'dispatch_requests', 7, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 7}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/7/dispatch', '2026-08-03 22:05:51'),
(73, 2, 2, 'pos', 'draft_orders', 'pos_orders', NULL, NULL, '{\"body\": {\"notes\": \"\", \"customers\": [{\"lines\": [{\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 1}, {\"quantity\": 1, \"line_type\": \"sale\", \"sale_catalog_entry_id\": 3}], \"customer_id\": 2}], \"salesman_id\": 1, \"request_date\": \"2026-08-03\", \"warehouse_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/pos/draft-orders', '2026-08-03 22:09:26'),
(74, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 9, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 9}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/9/submit', '2026-08-03 22:26:31'),
(75, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 9, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 9}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/9/approve', '2026-08-03 22:26:40'),
(76, 2, 2, 'dispatch', 'rework', 'dispatch_requests', 9, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 9}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/9/rework', '2026-08-03 22:28:56'),
(77, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 9, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 9}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/9/submit', '2026-08-03 22:32:06'),
(78, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 9, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 9}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/9/approve', '2026-08-03 22:32:10'),
(79, 2, 2, 'dispatch', 'dispatch', 'dispatch_requests', 9, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 9}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/9/dispatch', '2026-08-03 22:32:16'),
(80, 2, 2, 'debts', 'payments', 'customer_debts', 31, NULL, '{\"body\": {\"notes\": null, \"amount\": 2, \"cash_account_id\": 1}, \"query\": {}, \"params\": {\"id\": 31}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/customer-debts/31/payments', '2026-08-03 22:49:32'),
(81, 2, 2, 'users', 'status', 'users', 3, NULL, '{\"body\": {\"status\": \"inactive\"}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'PATCH /api/users/3/status', '2026-08-03 22:53:15'),
(82, 2, 2, 'users', 'status', 'users', 3, NULL, '{\"body\": {\"status\": \"active\"}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'PATCH /api/users/3/status', '2026-08-03 22:53:17'),
(83, 2, 2, 'purchases', 'create', 'suppliers', NULL, NULL, '{\"body\": {\"name\": \"tarek Aswad\", \"email\": \"aswadt12@gmail.com\", \"phone\": \"70629775\", \"status\": \"active\", \"address\": null, \"contact_person\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/suppliers', '2026-08-03 23:10:45'),
(84, 2, 2, 'purchases', 'create_purchase_order', 'purchase_orders', 1, NULL, '{\"po_number\": \"PO-20260804021104368-H3XU\", \"total_amount\": \"1000.0000\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, NULL, '2026-08-03 23:11:04'),
(85, 2, 2, 'purchases', 'create', 'purchase_orders', NULL, NULL, '{\"body\": {\"items\": [{\"notes\": null, \"item_id\": 5, \"quantity\": 1000, \"unit_cost\": 1}], \"notes\": null, \"order_date\": \"2026-08-04\", \"tax_amount\": 0, \"supplier_id\": 1, \"warehouse_id\": 1, \"expected_date\": null, \"payment_method\": \"cash\", \"cash_account_id\": 1, \"discount_amount\": 0}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/purchase-orders', '2026-08-03 23:11:04'),
(86, 2, 2, 'purchases', 'submit', 'purchase_orders', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/purchase-orders/1/submit', '2026-08-03 23:11:10'),
(87, 2, 2, 'purchases', 'approve', 'purchase_orders', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/purchase-orders/1/approve', '2026-08-03 23:11:14'),
(88, 2, 2, 'purchases', 'receive_purchase_order', 'purchase_receipts', 1, NULL, '{\"receipt_number\": \"PR-20260804021126267-LZTU\", \"purchase_order_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, NULL, '2026-08-03 23:11:26'),
(89, 2, 2, 'purchases', 'receipts', 'purchase_orders', 1, NULL, '{\"body\": {\"items\": [{\"quantity\": 100, \"unit_cost\": 1, \"purchase_order_item_id\": 1}], \"notes\": null, \"received_date\": \"2026-08-04\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/purchase-orders/1/receipts', '2026-08-03 23:11:26'),
(90, 2, 2, 'supplier_payments', 'create', 'supplier_payments', NULL, NULL, '{\"body\": {\"notes\": null, \"amount\": 1000, \"supplier_id\": 1, \"payment_date\": \"2026-08-04\", \"payment_method\": \"cash\", \"cash_account_id\": 1, \"reference_number\": null, \"purchase_order_id\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/supplier-payments', '2026-08-03 23:11:42'),
(91, 2, 2, 'location_targets', 'create', 'location_targets', NULL, NULL, '{\"body\": {\"status\": \"draft\", \"period_end\": \"2026-09-03\", \"location_id\": 1, \"period_start\": \"2026-08-04\", \"target_amount\": 1000, \"target_period\": \"monthly\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/location-targets', '2026-08-04 17:31:23'),
(92, 2, 2, 'location_targets', 'sublocation_targets', 'location_targets', 1, NULL, '{\"body\": {\"status\": \"draft\", \"target_amount\": 200, \"sublocation_id\": 1}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/location-targets/1/sublocation-targets', '2026-08-04 17:31:31'),
(93, 2, 2, 'location_targets', 'bundle', 'location_targets', NULL, NULL, '{\"body\": {\"location_id\": 1, \"period_start\": \"2026-08-04\", \"target_amount\": 1000, \"target_period\": \"monthly\", \"sublocation_targets\": [{\"salesman_ids\": [1], \"target_amount\": 1000, \"sublocation_id\": 1}]}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', NULL, 'POST /api/location-targets/bundle', '2026-08-04 18:30:31'),
(94, 2, 1, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 2, \"target_store_id\": 2, \"impersonated_by_user_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'Superadmin entered store test as test@example.com', '2026-08-06 17:40:12'),
(95, NULL, 1, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/superadmin/stores/2/impersonate', '2026-08-06 17:40:12'),
(96, 2, 2, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"122222\", \"name\": \"test\", \"status\": \"active\", \"item_kind\": \"normal\", \"stock_mode\": \"carton\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 6, \"default_cost\": 0.5, \"warehouse_id\": 1, \"kg_per_carton\": 10, \"reorder_level\": 100, \"initial_cartons\": 100, \"default_selling_price\": null, \"initial_cost_per_carton\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/items', '2026-08-06 17:41:40'),
(97, 2, 2, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"12344444\", \"name\": \"dokmaa\", \"status\": \"active\", \"item_kind\": \"normal\", \"stock_mode\": \"carton\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 6, \"default_cost\": 0.5, \"warehouse_id\": 1, \"kg_per_carton\": 10, \"reorder_level\": 100, \"initial_cartons\": 100, \"default_selling_price\": null, \"initial_cost_per_carton\": 0.5}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/items', '2026-08-06 17:44:59'),
(98, 2, 2, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"400hg\", \"name\": \"bags400g\", \"status\": \"active\", \"item_kind\": \"packaging\", \"stock_mode\": \"piece\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 6, \"default_cost\": 0.1, \"warehouse_id\": 1, \"reorder_level\": 1000, \"initial_quantity\": 7000, \"initial_unit_cost\": 0.1, \"default_selling_price\": null, \"max_content_weight_kg\": 0.4}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/items', '2026-08-06 17:47:16'),
(99, 2, 2, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"c6k\", \"name\": \"cartoons 6kg\", \"status\": \"active\", \"item_kind\": \"packaging\", \"stock_mode\": \"piece\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 6, \"default_cost\": 0.3, \"warehouse_id\": 1, \"reorder_level\": 200, \"initial_quantity\": 2500, \"initial_unit_cost\": 0.3, \"default_selling_price\": null, \"max_content_weight_kg\": 6}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/items', '2026-08-06 17:48:37'),
(100, 2, 2, 'inventory', 'stock_adjustment', 'item_stock_balances', 8, NULL, '{\"item_id\": 10, \"warehouse_id\": 1, \"quantity_after\": \"3000.0000\", \"stock_movement_id\": 35, \"quantity_reserved_after\": \"0.0000\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'gf', '2026-08-06 17:50:07'),
(101, 2, 2, 'inventory', 'create', 'item_stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"gf\", \"item_id\": 10, \"warehouse_id\": 1, \"quantity_change\": 500}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/stock-adjustments', '2026-08-06 17:50:07'),
(102, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 8, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 8}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/8/submit', '2026-08-06 17:55:27'),
(103, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 8, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 8}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/8/approve', '2026-08-06 17:55:40'),
(104, 2, 2, 'dispatch', 'dispatch', 'dispatch_requests', 8, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 8}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/8/dispatch', '2026-08-06 17:56:04'),
(105, 2, 2, 'dispatch', 'closeout', 'dispatch_requests', 8, NULL, '{\"body\": {\"notes\": null, \"customers\": [{\"collected_amount\": 17, \"dispatch_customer_id\": 9}], \"settlement_date\": \"2026-08-06\"}, \"query\": {}, \"params\": {\"id\": 8}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/8/closeout', '2026-08-06 17:59:38'),
(106, 2, 2, 'dispatch', 'post', 'dispatch_settlements', 3, NULL, '{\"body\": {\"cash_account_id\": 1, \"settlement_date\": \"2026-08-05\"}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-settlements/3/post', '2026-08-06 17:59:51'),
(107, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 4, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/4/submit', '2026-08-06 18:00:33'),
(108, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 4, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/4/approve', '2026-08-06 18:00:42'),
(109, 2, 2, 'dispatch', 'rework', 'dispatch_requests', 4, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/4/rework', '2026-08-06 18:01:55'),
(110, 2, 2, 'dispatch', 'submit', 'dispatch_requests', 5, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 5}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/5/submit', '2026-08-06 18:02:19'),
(111, 2, 2, 'dispatch', 'approve', 'dispatch_requests', 5, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 5}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/5/approve', '2026-08-06 18:02:26');
INSERT INTO `audit_logs` (`id`, `store_id`, `user_id`, `module`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `request_path`, `description`, `created_at`) VALUES
(112, 2, 2, 'dispatch', 'dispatch', 'dispatch_requests', 5, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 5}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/5/dispatch', '2026-08-06 18:02:44'),
(113, 2, 2, 'dispatch', 'closeout', 'dispatch_requests', 5, NULL, '{\"body\": {\"notes\": null, \"customers\": [{\"collected_amount\": 32, \"dispatch_customer_id\": 5}], \"settlement_date\": \"2026-08-06\"}, \"query\": {}, \"params\": {\"id\": 5}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-requests/5/closeout', '2026-08-06 18:03:33'),
(114, 2, 2, 'dispatch', 'post', 'dispatch_settlements', 4, NULL, '{\"body\": {\"cash_account_id\": 1, \"settlement_date\": \"2026-08-05\"}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/dispatch-settlements/4/post', '2026-08-06 18:03:43'),
(115, 2, 2, 'commissions', 'create', 'commission_rules', NULL, NULL, '{\"body\": {\"name\": \"bilal commussion\", \"status\": \"active\", \"applies_to\": null, \"applies_from\": \"2026-08-06\", \"target_period\": \"monthly\", \"at_target_rate\": 1, \"below_target_rate\": 0.5, \"above_target_extra_rate\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/commission-rules', '2026-08-06 18:07:43'),
(116, 2, 2, 'salesmen', 'create', 'salesmen', NULL, NULL, '{\"body\": {\"email\": \"bial@gmail.com\", \"phone\": \"34534524\", \"status\": \"active\", \"password\": \"12345678\", \"full_name\": \"bilal saleh\", \"joined_at\": null, \"base_salary\": 0, \"national_id\": null, \"vehicle_number\": null, \"create_login_user\": true, \"commission_rule_id\": 1, \"employment_end_date\": null, \"salary_effective_from\": \"2026-08-06\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/salesmen', '2026-08-06 18:09:26'),
(117, 2, 2, 'users', 'update', 'users', 4, NULL, '{\"body\": {\"email\": \"bial@gmail.com\", \"phone\": \"34534524\", \"status\": \"active\", \"role_id\": 12, \"username\": \"bilal\", \"full_name\": \"bilal saleh\"}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'PATCH /api/users/4', '2026-08-06 18:10:07'),
(118, 2, 2, 'roles', 'permissions', 'roles', 12, NULL, '{\"body\": {\"permission_ids\": [26, 25, 1, 49, 53, 50, 51]}, \"query\": {}, \"params\": {\"id\": 12}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'PUT /api/roles/12/permissions', '2026-08-06 18:11:46'),
(119, 2, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/auth/logout', '2026-08-06 18:11:58'),
(120, 2, 4, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/auth/logout', '2026-08-06 18:13:18'),
(121, 2, 1, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 2, \"target_store_id\": 2, \"impersonated_by_user_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'Superadmin entered store test as test@example.com', '2026-08-06 18:13:31'),
(122, NULL, 1, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/superadmin/stores/2/impersonate', '2026-08-06 18:13:31'),
(123, 2, 2, 'inventory', 'stock_adjustment', 'item_stock_balances', 4, NULL, '{\"item_id\": 5, \"warehouse_id\": 1, \"quantity_after\": \"1635.0000\", \"stock_movement_id\": 40, \"quantity_reserved_after\": \"0.0000\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'ede', '2026-08-06 18:16:23'),
(124, 2, 2, 'inventory', 'create', 'item_stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"ede\", \"item_id\": 5, \"unit_cost\": 0.5, \"warehouse_id\": 1, \"quantity_change\": 1000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', NULL, 'POST /api/stock-adjustments', '2026-08-06 18:16:23');

-- --------------------------------------------------------

--
-- Table structure for table `carton_stock_lots`
--

CREATE TABLE `carton_stock_lots` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `received_cartons` int UNSIGNED NOT NULL,
  `remaining_cartons` int UNSIGNED NOT NULL,
  `kg_per_carton` decimal(18,4) NOT NULL,
  `unit_cost_per_carton` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `source_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_id` bigint UNSIGNED DEFAULT NULL,
  `received_at` datetime NOT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `carton_stock_lots`
--

INSERT INTO `carton_stock_lots` (`id`, `store_id`, `warehouse_id`, `item_id`, `received_cartons`, `remaining_cartons`, `kg_per_carton`, `unit_cost_per_carton`, `source_type`, `source_id`, `received_at`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 2, 100, 75, 10.0000, 0.5000, 'item_opening_balance', 2, '2026-07-31 22:56:11', 2, '2026-07-31 19:56:11', '2026-08-06 18:02:44'),
(2, 2, 1, 2, 15, 15, 10.0000, 1.0000, 'stock_adjustment', NULL, '2026-07-31 23:05:37', 2, '2026-07-31 20:05:37', NULL),
(3, 2, 1, 7, 100, 100, 10.0000, 1.0000, 'item_opening_balance', 7, '2026-08-06 20:41:40', 2, '2026-08-06 17:41:40', NULL),
(4, 2, 1, 8, 100, 100, 10.0000, 0.5000, 'item_opening_balance', 8, '2026-08-06 20:44:59', 2, '2026-08-06 17:44:59', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `cash_accounts`
--

CREATE TABLE `cash_accounts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `account_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('cash','bank','wallet','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `cash_flow_permission` enum('incoming','outgoing','both') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'both',
  `opening_balance` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `current_balance` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cash_accounts`
--

INSERT INTO `cash_accounts` (`id`, `store_id`, `account_name`, `account_type`, `cash_flow_permission`, `opening_balance`, `current_balance`, `status`, `created_at`) VALUES
(1, 2, 'test', 'cash', 'both', 0.0000, -877.0000, 'active', '2026-08-01 16:20:41');

-- --------------------------------------------------------

--
-- Table structure for table `commission_calculations`
--

CREATE TABLE `commission_calculations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `commission_rule_id` bigint UNSIGNED NOT NULL,
  `salesman_target_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `target_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `sales_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `below_target_commission` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `target_commission` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `above_target_commission` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_commission` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','approved','paid','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `commission_payments`
--

CREATE TABLE `commission_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `commission_calculation_id` bigint UNSIGNED NOT NULL,
  `payroll_payment_id` bigint UNSIGNED DEFAULT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_by` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `commission_rules`
--

CREATE TABLE `commission_rules` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_period` enum('daily','weekly','monthly','quarterly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `below_target_rate` decimal(8,4) NOT NULL DEFAULT '5.0000',
  `at_target_rate` decimal(8,4) NOT NULL DEFAULT '10.0000',
  `above_target_extra_rate` decimal(8,4) NOT NULL DEFAULT '1.0000',
  `applies_from` date NOT NULL,
  `applies_to` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `commission_rules`
--

INSERT INTO `commission_rules` (`id`, `store_id`, `name`, `target_period`, `below_target_rate`, `at_target_rate`, `above_target_extra_rate`, `applies_from`, `applies_to`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 'bilal commussion', 'monthly', 0.5000, 1.0000, 1.0000, '2026-08-06', NULL, 'active', 2, '2026-08-06 18:07:43', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `company_profiles`
--

CREATE TABLE `company_profiles` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `company_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `tax_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company_profiles`
--

INSERT INTO `company_profiles` (`id`, `store_id`, `company_name`, `phone`, `email`, `address`, `logo_url`, `currency_code`, `tax_number`, `created_at`, `updated_at`) VALUES
(1, 1, 'Kivaro Template Store', NULL, NULL, NULL, NULL, 'USD', NULL, '2026-07-23 20:59:24', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `customer_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `assigned_salesman_id` bigint UNSIGNED DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detailed_address` text COLLATE utf8mb4_unicode_ci,
  `credit_limit` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `store_id`, `customer_code`, `name`, `phone`, `secondary_phone`, `location_id`, `sublocation_id`, `assigned_salesman_id`, `address`, `detailed_address`, `credit_limit`, `status`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, '12321', 'test', '12312312', '123123', 1, 1, 1, NULL, NULL, 0.0000, 'active', NULL, 3, '2026-07-31 20:46:32', NULL),
(2, 2, NULL, '1231dasdfsdg', '12312312', '123123', 1, 1, 1, '123', '12312', 0.0000, 'active', '3123', 2, '2026-08-01 17:17:12', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customer_credits`
--

CREATE TABLE `customer_credits` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `credit_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_date` date NOT NULL,
  `original_amount` decimal(18,4) NOT NULL,
  `used_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `remaining_amount` decimal(18,4) NOT NULL,
  `status` enum('available','partially_used','used','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_debts`
--

CREATE TABLE `customer_debts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_customer_id` bigint UNSIGNED DEFAULT NULL,
  `debt_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `debt_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `original_amount` decimal(18,4) NOT NULL,
  `paid_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `remaining_amount` decimal(18,4) NOT NULL,
  `status` enum('pending','partially_paid','paid','written_off','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `customer_debts`
--

INSERT INTO `customer_debts` (`id`, `store_id`, `customer_id`, `dispatch_request_id`, `dispatch_customer_id`, `debt_number`, `debt_date`, `due_date`, `subtotal_amount`, `vat_amount`, `original_amount`, `paid_amount`, `remaining_amount`, `status`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(30, 2, 1, 1, 1, 'DEBT-20260801192409169-MHD4', '2026-07-31', NULL, 5.0000, 0.0000, 5.0000, 0.0000, 5.0000, 'partially_paid', 'Debt created from settlement SET-20260801191944126-M2K1', 2, '2026-08-01 16:24:09', NULL),
(31, 2, 1, 2, 2, 'DEBT-20260801192746863-PJ2Y', '2026-07-31', NULL, 4.0000, 0.0000, 4.0000, 2.0000, 2.0000, 'partially_paid', 'Debt created from settlement SET-20260801192744425-LRE0', 2, '2026-08-01 16:27:46', '2026-08-03 22:49:32');

-- --------------------------------------------------------

--
-- Table structure for table `customer_debt_adjustments`
--

CREATE TABLE `customer_debt_adjustments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `customer_debt_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED DEFAULT NULL,
  `adjustment_date` date NOT NULL,
  `adjustment_type` enum('increase','decrease','write_off') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `customer_payments`
--

CREATE TABLE `customer_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `collected_by_salesman_id` bigint UNSIGNED DEFAULT NULL,
  `payment_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `customer_payments`
--

INSERT INTO `customer_payments` (`id`, `store_id`, `customer_id`, `cash_account_id`, `collected_by_salesman_id`, `payment_number`, `payment_date`, `amount`, `payment_method`, `reference_number`, `notes`, `created_by`, `created_at`) VALUES
(1, 2, 1, 1, 1, 'PAY-20260801192746855-F098', '2026-07-31', 60.0000, 'cash', 'SET-20260801192744425-LRE0', 'Collection from delivery DISP-20260801192712514-IVQ4', 2, '2026-08-01 16:27:46'),
(2, 2, 1, 1, 1, 'PAY-20260804014932826-U5BE', '2026-08-03', 2.0000, 'cash', NULL, NULL, 2, '2026-08-03 22:49:32'),
(3, 2, 2, 1, 1, 'PAY-20260806205951273-K1WN', '2026-08-05', 17.0000, 'cash', 'SET-20260806205938532-31W5', 'Collection from delivery DISP-20260804010025858-IZBZ', 2, '2026-08-06 17:59:51'),
(4, 2, 1, 1, 1, 'PAY-20260806210343855-1Q7R', '2026-08-05', 32.0000, 'cash', 'SET-20260806210333394-EO1S', 'Collection from delivery DISP-20260801200814174-SRX7', 2, '2026-08-06 18:03:43');

-- --------------------------------------------------------

--
-- Table structure for table `customer_payment_allocations`
--

CREATE TABLE `customer_payment_allocations` (
  `id` bigint UNSIGNED NOT NULL,
  `customer_payment_id` bigint UNSIGNED NOT NULL,
  `customer_debt_id` bigint UNSIGNED NOT NULL,
  `allocated_amount` decimal(18,4) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `customer_payment_allocations`
--

INSERT INTO `customer_payment_allocations` (`id`, `customer_payment_id`, `customer_debt_id`, `allocated_amount`, `created_at`) VALUES
(1, 2, 31, 2.0000, '2026-08-03 22:49:32');

-- --------------------------------------------------------

--
-- Table structure for table `customer_receipts`
--

CREATE TABLE `customer_receipts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `receipt_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_customer_id` bigint UNSIGNED DEFAULT NULL,
  `customer_payment_id` bigint UNSIGNED DEFAULT NULL,
  `receipt_date` date NOT NULL,
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `paid_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `remaining_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `receipt_type` enum('sale','payment','credit','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sale',
  `printed_at` datetime DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_receipts`
--

INSERT INTO `customer_receipts` (`id`, `store_id`, `receipt_number`, `customer_id`, `dispatch_request_id`, `dispatch_customer_id`, `customer_payment_id`, `receipt_date`, `subtotal_amount`, `vat_amount`, `total_amount`, `paid_amount`, `remaining_amount`, `receipt_type`, `printed_at`, `created_by`, `created_at`) VALUES
(1, 2, 'RCP-20260801192746857-PUQV', 1, 2, 2, 1, '2026-07-31', 64.0000, 0.0000, 64.0000, 60.0000, 4.0000, 'sale', '2026-08-01 19:54:36', 2, '2026-08-01 16:27:46'),
(2, 2, 'RCP-20260804014932831-6M6N', 1, 2, 2, 2, '2026-08-03', 4.0000, 0.0000, 4.0000, 2.0000, 2.0000, 'payment', '2026-08-04 01:51:36', 2, '2026-08-03 22:49:32'),
(3, 2, 'RCP-20260806205951276-67A4', 2, 8, 9, 3, '2026-08-05', 17.0000, 0.0000, 17.0000, 17.0000, 0.0000, 'sale', NULL, 2, '2026-08-06 17:59:51'),
(4, 2, 'RCP-20260806210343856-SN0M', 1, 5, 5, 4, '2026-08-05', 32.0000, 0.0000, 32.0000, 32.0000, 0.0000, 'sale', NULL, 2, '2026-08-06 18:03:43');

-- --------------------------------------------------------

--
-- Table structure for table `delivery_target_credits`
--

CREATE TABLE `delivery_target_credits` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED DEFAULT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `eligible_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reference_date` date DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `status` enum('pending','earned','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `delivery_target_credits`
--

INSERT INTO `delivery_target_credits` (`id`, `store_id`, `dispatch_request_id`, `dispatch_customer_id`, `salesman_id`, `customer_id`, `eligible_amount`, `reference_date`, `delivery_date`, `status`, `created_at`, `updated_at`) VALUES
(30, 2, 1, 1, 1, 1, 17.0000, '2026-07-31', '2026-08-01', 'pending', '2026-08-01 16:24:09', NULL),
(31, 2, 2, 2, 1, 1, 64.0000, '2026-07-31', '2026-08-01', 'pending', '2026-08-01 16:27:46', NULL),
(32, 2, 8, 9, 1, 2, 17.0000, '2026-08-05', '2026-08-06', 'earned', '2026-08-06 17:59:51', NULL),
(33, 2, 5, 5, 1, 1, 32.0000, '2026-08-05', '2026-08-06', 'earned', '2026-08-06 18:03:43', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_customers`
--

CREATE TABLE `dispatch_customers` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `discount_type` enum('percent','fixed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_value` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `discount_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `customer_total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `collected_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `debt_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `payment_status` enum('pending','paid','partial_debt','debt','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `fulfillment_status` enum('pending','released','out_for_delivery','delivered','partial','returned','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `receipt_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dispatch_customers`
--

INSERT INTO `dispatch_customers` (`id`, `store_id`, `dispatch_request_id`, `customer_id`, `location_id`, `sublocation_id`, `discount_type`, `discount_value`, `discount_amount`, `subtotal_amount`, `vat_amount`, `customer_total_amount`, `collected_amount`, `debt_amount`, `payment_status`, `fulfillment_status`, `receipt_number`, `notes`, `created_at`) VALUES
(1, 2, 1, 1, 1, 1, NULL, 0.0000, 0.0000, 17.0000, 0.0000, 17.0000, 12.0000, 5.0000, 'partial_debt', 'delivered', NULL, 'Created from POS orders: 1', '2026-07-31 20:47:13'),
(2, 2, 2, 1, 1, 1, NULL, 0.0000, 0.0000, 64.0000, 0.0000, 64.0000, 60.0000, 4.0000, 'partial_debt', 'delivered', NULL, 'Created from POS orders: 2, 3', '2026-08-01 16:27:12'),
(3, 2, 3, 1, 1, 1, NULL, 0.0000, 0.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, 'pending', 'pending', NULL, NULL, '2026-08-01 16:51:47'),
(4, 2, 4, 1, 1, 1, NULL, 0.0000, 0.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, 'pending', 'pending', NULL, NULL, '2026-08-01 17:05:54'),
(5, 2, 5, 1, 1, 1, NULL, 0.0000, 0.0000, 32.0000, 0.0000, 32.0000, 32.0000, 0.0000, 'paid', 'delivered', NULL, 'Created from POS orders: 4', '2026-08-01 17:08:14'),
(6, 2, 6, 1, 1, 1, NULL, 0.0000, 0.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, 'pending', 'pending', NULL, NULL, '2026-08-01 17:16:52'),
(7, 2, 7, 1, 1, 1, NULL, 0.0000, 0.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, 'pending', 'out_for_delivery', NULL, NULL, '2026-08-01 17:17:18'),
(8, 2, 7, 2, 1, 1, NULL, 0.0000, 0.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, 'pending', 'out_for_delivery', NULL, NULL, '2026-08-01 17:17:18'),
(9, 2, 8, 2, 1, 1, NULL, 0.0000, 0.0000, 17.0000, 0.0000, 17.0000, 17.0000, 0.0000, 'paid', 'delivered', NULL, NULL, '2026-08-03 22:00:25'),
(10, 2, 9, 2, 1, 1, NULL, 0.0000, 0.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, 'pending', 'out_for_delivery', NULL, NULL, '2026-08-03 22:09:26');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_document_generations`
--

CREATE TABLE `dispatch_document_generations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED DEFAULT NULL,
  `invoice_id` bigint UNSIGNED DEFAULT NULL,
  `document_type` enum('customer_table','quantity_table','invoice','customer_receipt','customer_acceptance_consent') COLLATE utf8mb4_unicode_ci NOT NULL,
  `revision` int UNSIGNED NOT NULL,
  `generated_by` bigint UNSIGNED DEFAULT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dispatch_document_generations`
--

INSERT INTO `dispatch_document_generations` (`id`, `store_id`, `dispatch_request_id`, `dispatch_customer_id`, `invoice_id`, `document_type`, `revision`, `generated_by`, `generated_at`, `file_name`) VALUES
(1, 2, 1, NULL, NULL, 'customer_table', 1, 2, '2026-08-01 18:32:07', 'dispatch-DISP-20260731234713635-HZMZ-customer_table.pdf'),
(2, 2, 1, NULL, NULL, 'quantity_table', 1, 2, '2026-08-01 18:32:09', 'dispatch-DISP-20260731234713635-HZMZ-quantity_table.pdf'),
(3, 2, 1, 1, 3, 'invoice', 1, 2, '2026-08-01 18:32:40', 'invoice-INV-20260801183204087-6FCS.pdf'),
(4, 2, 1, 1, NULL, 'customer_receipt', 1, 1, '2026-08-01 18:37:37', 'receipt-1.pdf'),
(5, 2, 1, 1, NULL, 'customer_acceptance_consent', 1, 2, '2026-08-01 19:13:24', 'acceptance-consent-1.pdf'),
(6, 2, 2, NULL, NULL, 'customer_table', 1, 2, '2026-08-01 19:27:29', 'dispatch-DISP-20260801192712514-IVQ4-customer_table.pdf'),
(7, 2, 2, 2, NULL, 'customer_receipt', 1, 2, '2026-08-01 19:27:30', 'receipt-2.pdf'),
(8, 2, 2, 2, NULL, 'customer_acceptance_consent', 1, 2, '2026-08-01 19:27:30', 'acceptance-consent-2.pdf'),
(9, 2, 7, NULL, NULL, 'customer_table', 1, 2, '2026-08-04 00:57:41', 'dispatch-DISP-20260801201718645-7LPP-customer_table.pdf'),
(10, 2, 7, 7, NULL, 'customer_receipt', 1, 2, '2026-08-04 00:58:22', 'receipt-7.pdf'),
(11, 2, 7, 7, NULL, 'customer_acceptance_consent', 1, 2, '2026-08-04 00:58:23', 'acceptance-consent-7.pdf'),
(12, 2, 7, 8, NULL, 'customer_receipt', 1, 2, '2026-08-04 00:58:23', 'receipt-8.pdf'),
(13, 2, 7, 8, NULL, 'customer_acceptance_consent', 1, 2, '2026-08-04 00:58:24', 'acceptance-consent-8.pdf'),
(14, 2, 9, NULL, NULL, 'customer_table', 2, 2, '2026-08-04 01:32:13', 'dispatch-DISP-20260804010926958-ULX0-customer_table.pdf'),
(15, 2, 9, 10, NULL, 'customer_receipt', 2, 2, '2026-08-04 01:32:21', 'receipt-10.pdf'),
(16, 2, 8, NULL, NULL, 'customer_table', 1, 2, '2026-08-06 20:55:49', 'dispatch-DISP-20260804010025858-IZBZ-customer_table.pdf'),
(17, 2, 8, 9, NULL, 'customer_receipt', 1, 2, '2026-08-06 20:56:08', 'delivery-document-9.pdf'),
(18, 2, 8, 9, NULL, 'customer_acceptance_consent', 1, 2, '2026-08-06 20:56:08', 'delivery-document-9.pdf'),
(19, 2, 4, NULL, NULL, 'customer_table', 1, 2, '2026-08-06 21:00:57', 'dispatch-DISP-20260801200554855-N1RW-customer_table.pdf'),
(20, 2, 5, NULL, NULL, 'customer_table', 1, 2, '2026-08-06 21:02:40', 'dispatch-DISP-20260801200814174-SRX7-customer_table.pdf'),
(21, 2, 5, 5, NULL, 'customer_receipt', 1, 2, '2026-08-06 21:02:57', 'delivery-document-5.pdf'),
(22, 2, 5, 5, NULL, 'customer_acceptance_consent', 1, 2, '2026-08-06 21:02:57', 'delivery-document-5.pdf');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_items`
--

CREATE TABLE `dispatch_items` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `sale_catalog_entry_id` bigint UNSIGNED DEFAULT NULL,
  `item_id` bigint UNSIGNED DEFAULT NULL,
  `packaging_group_id` bigint UNSIGNED DEFAULT NULL,
  `line_type` enum('sale','free_gift') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sale',
  `fulfillment_type` enum('normal_carton','normal_weight','normal_piece','ready_outer_carton','ready_inner_unit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_rate` decimal(9,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `returned_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `item_name_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_label_snapshot` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `dispatch_items`
--

INSERT INTO `dispatch_items` (`id`, `store_id`, `dispatch_customer_id`, `dispatch_request_id`, `sale_catalog_entry_id`, `item_id`, `packaging_group_id`, `line_type`, `fulfillment_type`, `quantity`, `unit_price`, `unit_cost`, `subtotal_amount`, `vat_rate`, `vat_amount`, `line_total`, `returned_quantity`, `item_name_snapshot`, `unit_label_snapshot`, `created_at`) VALUES
(1, 2, 1, 1, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-07-31 20:47:13'),
(2, 2, 2, 2, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0231, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 16:27:12'),
(3, 2, 2, 2, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 16:27:12'),
(4, 2, 2, 2, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0231, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 16:27:12'),
(5, 2, 2, 2, 1, 2, NULL, 'sale', 'normal_carton', 2.0000, 15.0000, 0.5652, 30.0000, 0.0000, 0.0000, 30.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-01 16:27:12'),
(6, 2, 2, 2, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 16:27:12'),
(7, 2, 3, 3, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 16:51:47'),
(8, 2, 3, 3, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 16:51:47'),
(9, 2, 3, 3, 1, 2, NULL, 'sale', 'normal_carton', 1.0000, 15.0000, 0.0000, 15.0000, 0.0000, 0.0000, 15.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-01 16:51:47'),
(10, 2, 4, 4, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0231, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 17:05:54'),
(11, 2, 4, 4, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 17:05:54'),
(12, 2, 4, 4, 1, 2, NULL, 'sale', 'normal_carton', 1.0000, 15.0000, 0.5652, 15.0000, 0.0000, 0.0000, 15.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-01 17:05:54'),
(13, 2, 5, 5, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0231, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 17:08:14'),
(14, 2, 5, 5, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 17:08:14'),
(15, 2, 5, 5, 1, 2, NULL, 'sale', 'normal_carton', 1.0000, 15.0000, 0.5652, 15.0000, 0.0000, 0.0000, 15.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-01 17:08:14'),
(16, 2, 6, 6, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 17:16:52'),
(17, 2, 6, 6, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 17:16:52'),
(18, 2, 6, 6, 1, 2, NULL, 'sale', 'normal_carton', 1.0000, 15.0000, 0.0000, 15.0000, 0.0000, 0.0000, 15.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-01 17:16:52'),
(19, 2, 7, 7, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0231, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 17:17:18'),
(20, 2, 7, 7, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 17:17:18'),
(21, 2, 7, 7, 1, 2, NULL, 'sale', 'normal_carton', 1.0000, 15.0000, 0.5652, 15.0000, 0.0000, 0.0000, 15.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-01 17:17:18'),
(22, 2, 8, 7, 1, 2, NULL, 'sale', 'normal_carton', 1.0000, 15.0000, 0.5652, 15.0000, 0.0000, 0.0000, 15.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-01 17:17:18'),
(23, 2, 8, 7, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-01 17:17:18'),
(24, 2, 8, 7, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0231, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-01 17:17:18'),
(25, 2, 9, 8, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-03 22:00:25'),
(26, 2, 9, 8, 2, NULL, 3, 'sale', 'ready_inner_unit', 1.0000, 0.0000, 0.0231, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'carton 6kg 400g — Ready bag', 'bag', '2026-08-03 22:00:25'),
(27, 2, 10, 9, 1, 2, NULL, 'sale', 'normal_carton', 1.0000, 15.0000, 0.5652, 15.0000, 0.0000, 0.0000, 15.0000, 0.0000, 'fahem 5.5 — Carton', 'carton', '2026-08-03 22:09:26'),
(28, 2, 10, 9, 3, NULL, 3, 'sale', 'ready_outer_carton', 1.0000, 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, 0.0000, 'carton 6kg 400g — Ready carton', 'carton', '2026-08-03 22:09:26');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_line_allocations`
--

CREATE TABLE `dispatch_line_allocations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_item_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED DEFAULT NULL,
  `carton_stock_lot_id` bigint UNSIGNED DEFAULT NULL,
  `ready_stock_container_id` bigint UNSIGNED DEFAULT NULL,
  `ready_shelf_stock_id` bigint UNSIGNED DEFAULT NULL,
  `allocation_type` enum('item_balance','carton_lot','ready_stock_container','ready_shelf_stock') COLLATE utf8mb4_unicode_ci NOT NULL,
  `allocated_quantity` decimal(18,4) NOT NULL,
  `inventory_quantity` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('reserved','dispatched','returned','released') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reserved',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `dispatch_line_allocations`
--

INSERT INTO `dispatch_line_allocations` (`id`, `store_id`, `dispatch_item_id`, `warehouse_id`, `item_id`, `carton_stock_lot_id`, `ready_stock_container_id`, `ready_shelf_stock_id`, `allocation_type`, `allocated_quantity`, `inventory_quantity`, `unit_cost`, `total_cost`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 1, NULL, NULL, 1, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-01 15:39:55', '2026-08-01 16:13:55'),
(2, 2, 2, 1, NULL, NULL, 2, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.0231, 0.0231, 'dispatched', '2026-08-01 16:27:36', '2026-08-01 16:27:38'),
(3, 2, 3, 1, NULL, NULL, 3, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-01 16:27:36', '2026-08-01 16:27:38'),
(4, 2, 4, 1, NULL, NULL, 2, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.0231, 0.0231, 'dispatched', '2026-08-01 16:27:36', '2026-08-01 16:27:38'),
(5, 2, 5, 1, 2, 1, NULL, NULL, 'carton_lot', 2.0000, 2.0000, 0.5652, 1.1304, 'dispatched', '2026-08-01 16:27:36', '2026-08-01 16:27:38'),
(6, 2, 6, 1, NULL, NULL, 4, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-01 16:27:36', '2026-08-01 16:27:38'),
(7, 2, 19, 1, NULL, NULL, 2, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.0231, 0.0231, 'dispatched', '2026-08-03 21:58:26', '2026-08-03 22:05:51'),
(8, 2, 20, 1, NULL, NULL, 5, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-03 21:58:26', '2026-08-03 22:05:51'),
(9, 2, 21, 1, 2, 1, NULL, NULL, 'carton_lot', 1.0000, 1.0000, 0.5652, 0.5652, 'dispatched', '2026-08-03 21:58:26', '2026-08-03 22:05:51'),
(10, 2, 22, 1, 2, 1, NULL, NULL, 'carton_lot', 1.0000, 1.0000, 0.5652, 0.5652, 'dispatched', '2026-08-03 21:58:26', '2026-08-03 22:05:51'),
(11, 2, 23, 1, NULL, NULL, 6, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-03 21:58:26', '2026-08-03 22:05:51'),
(12, 2, 24, 1, NULL, NULL, 2, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.0231, 0.0231, 'dispatched', '2026-08-03 21:58:26', '2026-08-03 22:05:51'),
(13, 2, 27, 1, 2, 1, NULL, NULL, 'carton_lot', 1.0000, 1.0000, 0.5652, 0.5652, 'released', '2026-08-03 22:26:40', '2026-08-03 22:28:56'),
(14, 2, 28, 1, NULL, NULL, 7, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'released', '2026-08-03 22:26:40', '2026-08-03 22:28:56'),
(15, 2, 27, 1, 2, 1, NULL, NULL, 'carton_lot', 1.0000, 1.0000, 0.5652, 0.5652, 'dispatched', '2026-08-03 22:32:10', '2026-08-03 22:32:16'),
(16, 2, 28, 1, NULL, NULL, 7, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-03 22:32:10', '2026-08-03 22:32:16'),
(17, 2, 25, 1, NULL, NULL, 8, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-06 17:55:40', '2026-08-06 17:56:04'),
(18, 2, 26, 1, NULL, NULL, 2, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.0231, 0.0231, 'dispatched', '2026-08-06 17:55:40', '2026-08-06 17:56:04'),
(19, 2, 10, 1, NULL, NULL, 2, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.0231, 0.0231, 'released', '2026-08-06 18:00:42', '2026-08-06 18:01:55'),
(20, 2, 11, 1, NULL, NULL, 9, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'released', '2026-08-06 18:00:42', '2026-08-06 18:01:55'),
(21, 2, 12, 1, 2, 1, NULL, NULL, 'carton_lot', 1.0000, 1.0000, 0.5652, 0.5652, 'released', '2026-08-06 18:00:42', '2026-08-06 18:01:55'),
(22, 2, 13, 1, NULL, NULL, 2, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.0231, 0.0231, 'dispatched', '2026-08-06 18:02:26', '2026-08-06 18:02:44'),
(23, 2, 14, 1, NULL, NULL, 9, NULL, 'ready_stock_container', 1.0000, 1.0000, 0.3464, 0.3464, 'dispatched', '2026-08-06 18:02:26', '2026-08-06 18:02:44'),
(24, 2, 15, 1, 2, 1, NULL, NULL, 'carton_lot', 1.0000, 1.0000, 0.5652, 0.5652, 'dispatched', '2026-08-06 18:02:26', '2026-08-06 18:02:44');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_requests`
--

CREATE TABLE `dispatch_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `origin` enum('direct','pos_requests') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'direct',
  `dispatch_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `request_date` date NOT NULL,
  `status` enum('draft','pending_approval','approved','delivery','partially_settled','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `lifecycle_status` enum('pending','released','out_for_delivery','closeout_pending','settled','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `revision` int UNSIGNED NOT NULL DEFAULT '1',
  `total_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_collected` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_debt` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `submitted_by` bigint UNSIGNED DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `dispatched_by` bigint UNSIGNED DEFAULT NULL,
  `dispatched_at` datetime DEFAULT NULL,
  `completed_by` bigint UNSIGNED DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_by` bigint UNSIGNED DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dispatch_requests`
--

INSERT INTO `dispatch_requests` (`id`, `store_id`, `origin`, `dispatch_number`, `salesman_id`, `warehouse_id`, `request_date`, `status`, `lifecycle_status`, `revision`, `total_quantity`, `subtotal_amount`, `vat_amount`, `total_amount`, `total_collected`, `total_debt`, `submitted_by`, `submitted_at`, `approved_by`, `approved_at`, `dispatched_by`, `dispatched_at`, `completed_by`, `completed_at`, `cancelled_by`, `cancelled_at`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 'pos_requests', 'DISP-20260731234713635-HZMZ', 1, 1, '2026-07-31', 'completed', 'settled', 1, 1.0000, 17.0000, 0.0000, 17.0000, 12.0000, 5.0000, 2, '2026-08-01 18:32:04', 2, '2026-08-01 18:39:55', 2, '2026-08-01 19:13:55', 2, '2026-08-01 19:24:09', NULL, NULL, NULL, 2, '2026-07-31 20:47:13', '2026-08-01 16:24:09'),
(2, 2, 'pos_requests', 'DISP-20260801192712514-IVQ4', 1, 1, '2026-08-01', 'completed', 'settled', 1, 6.0000, 64.0000, 0.0000, 64.0000, 60.0000, 4.0000, 2, '2026-08-01 19:27:27', 2, '2026-08-01 19:27:36', 2, '2026-08-01 19:27:38', 2, '2026-08-01 19:27:47', NULL, NULL, NULL, 2, '2026-08-01 16:27:12', '2026-08-01 16:27:46'),
(3, 2, 'direct', 'DISP-20260801195147234-HFFQ', 1, 1, '2026-08-01', 'draft', 'pending', 1, 3.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-01 16:51:47', '2026-08-01 16:51:47'),
(4, 2, 'direct', 'DISP-20260801200554855-N1RW', 1, 1, '2026-08-01', 'draft', 'released', 2, 3.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-01 17:05:54', '2026-08-06 18:01:55'),
(5, 2, 'pos_requests', 'DISP-20260801200814174-SRX7', 1, 1, '2026-08-01', 'completed', 'settled', 1, 3.0000, 32.0000, 0.0000, 32.0000, 32.0000, 0.0000, 2, '2026-08-06 21:02:20', 2, '2026-08-06 21:02:27', 2, '2026-08-06 21:02:44', 2, '2026-08-06 21:03:44', NULL, NULL, NULL, 2, '2026-08-01 17:08:14', '2026-08-06 18:03:43'),
(6, 2, 'direct', 'DISP-20260801201652759-FTFN', 1, 1, '2026-08-01', 'draft', 'pending', 1, 3.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-01 17:16:52', '2026-08-01 17:16:52'),
(7, 2, 'direct', 'DISP-20260801201718645-7LPP', 1, 1, '2026-08-01', 'delivery', 'out_for_delivery', 1, 6.0000, 64.0000, 0.0000, 64.0000, 0.0000, 0.0000, 2, '2026-08-04 00:57:33', 2, '2026-08-04 00:58:26', 2, '2026-08-04 01:05:52', NULL, NULL, NULL, NULL, NULL, 2, '2026-08-01 17:17:18', '2026-08-03 22:05:51'),
(8, 2, 'direct', 'DISP-20260804010025858-IZBZ', 1, 1, '2026-08-03', 'completed', 'settled', 1, 2.0000, 17.0000, 0.0000, 17.0000, 17.0000, 0.0000, 2, '2026-08-06 20:55:28', 2, '2026-08-06 20:55:40', 2, '2026-08-06 20:56:05', 2, '2026-08-06 20:59:51', NULL, NULL, NULL, 2, '2026-08-03 22:00:25', '2026-08-06 17:59:51'),
(9, 2, 'direct', 'DISP-20260804010926958-ULX0', 1, 1, '2026-08-03', 'delivery', 'out_for_delivery', 2, 2.0000, 32.0000, 0.0000, 32.0000, 0.0000, 0.0000, 2, '2026-08-04 01:32:07', 2, '2026-08-04 01:32:11', 2, '2026-08-04 01:32:16', NULL, NULL, NULL, NULL, NULL, 2, '2026-08-03 22:09:26', '2026-08-03 22:32:16');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_returns`
--

CREATE TABLE `dispatch_returns` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `dispatch_item_id` bigint UNSIGNED NOT NULL,
  `returned_quantity` decimal(18,4) NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_return_credit_notes`
--

CREATE TABLE `dispatch_return_credit_notes` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_return_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED NOT NULL,
  `invoice_id` bigint UNSIGNED DEFAULT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `credit_note_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_note_date` date NOT NULL,
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_settlements`
--

CREATE TABLE `dispatch_settlements` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `settlement_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settlement_date` date NOT NULL,
  `total_expected` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_collected` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_debt` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_returned_value` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','posted','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `settled_by` bigint UNSIGNED DEFAULT NULL,
  `posted_at` datetime DEFAULT NULL,
  `posted_at_is_estimated` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dispatch_settlements`
--

INSERT INTO `dispatch_settlements` (`id`, `store_id`, `dispatch_request_id`, `cash_account_id`, `settlement_number`, `settlement_date`, `total_expected`, `total_collected`, `total_debt`, `total_returned_value`, `status`, `settled_by`, `posted_at`, `posted_at_is_estimated`, `notes`, `created_at`) VALUES
(1, 2, 1, 1, 'SET-20260801191944126-M2K1', '2026-08-01', 17.0000, 12.0000, 5.0000, 0.0000, 'posted', 2, '2026-08-01 19:19:44', 1, NULL, '2026-08-01 16:19:44'),
(2, 2, 2, 1, 'SET-20260801192744425-LRE0', '2026-08-01', 64.0000, 60.0000, 4.0000, 0.0000, 'posted', 2, '2026-08-01 19:27:44', 1, NULL, '2026-08-01 16:27:44'),
(3, 2, 8, 1, 'SET-20260806205938532-31W5', '2026-08-06', 17.0000, 17.0000, 0.0000, 0.0000, 'posted', 2, '2026-08-06 20:59:51', 0, NULL, '2026-08-06 17:59:38'),
(4, 2, 5, 1, 'SET-20260806210333394-EO1S', '2026-08-06', 32.0000, 32.0000, 0.0000, 0.0000, 'posted', 2, '2026-08-06 21:03:43', 0, NULL, '2026-08-06 18:03:33');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_settlement_customers`
--

CREATE TABLE `dispatch_settlement_customers` (
  `id` bigint UNSIGNED NOT NULL,
  `dispatch_settlement_id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `expected_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `collected_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `debt_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `settlement_status` enum('paid','partial_debt','debt','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dispatch_settlement_customers`
--

INSERT INTO `dispatch_settlement_customers` (`id`, `dispatch_settlement_id`, `dispatch_customer_id`, `customer_id`, `expected_amount`, `collected_amount`, `debt_amount`, `settlement_status`, `notes`, `created_at`) VALUES
(1, 1, 1, 1, 17.0000, 12.0000, 5.0000, 'partial_debt', NULL, '2026-08-01 16:19:44'),
(2, 2, 2, 1, 64.0000, 60.0000, 4.0000, 'partial_debt', NULL, '2026-08-01 16:27:44'),
(3, 3, 9, 2, 17.0000, 17.0000, 0.0000, 'paid', NULL, '2026-08-06 17:59:38'),
(4, 4, 5, 1, 32.0000, 32.0000, 0.0000, 'paid', NULL, '2026-08-06 18:03:33');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `expense_category_id` bigint UNSIGNED NOT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `expense_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','voided') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `voided_by` bigint UNSIGNED DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financial_transactions`
--

CREATE TABLE `financial_transactions` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `transaction_date` datetime NOT NULL,
  `transaction_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` enum('in','out') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `financial_transactions`
--

INSERT INTO `financial_transactions` (`id`, `store_id`, `cash_account_id`, `transaction_date`, `transaction_type`, `direction`, `amount`, `reference_type`, `reference_id`, `description`, `created_by`, `created_at`) VALUES
(30, 2, 1, '2026-07-31 00:00:00', 'dispatch_settlement', 'in', 12.0000, 'dispatch_settlement', 1, 'Settlement for DISP-20260731234713635-HZMZ', 2, '2026-08-01 16:24:09'),
(31, 2, 1, '2026-07-31 00:00:00', 'dispatch_settlement', 'in', 60.0000, 'dispatch_settlement', 2, 'Settlement for DISP-20260801192712514-IVQ4', 2, '2026-08-01 16:27:46'),
(32, 2, 1, '2026-08-04 01:49:33', 'customer_debt_payment', 'in', 2.0000, 'customer_payment', 2, NULL, 2, '2026-08-03 22:49:32'),
(33, 2, 1, '2026-08-04 02:11:42', 'supplier_payment', 'out', 1000.0000, 'supplier_payment', 1, NULL, 2, '2026-08-03 23:11:42'),
(34, 2, 1, '2026-08-05 00:00:00', 'dispatch_settlement', 'in', 17.0000, 'dispatch_settlement', 3, 'Settlement for DISP-20260804010025858-IZBZ', 2, '2026-08-06 17:59:51'),
(35, 2, 1, '2026-08-05 00:00:00', 'dispatch_settlement', 'in', 32.0000, 'dispatch_settlement', 4, 'Settlement for DISP-20260801200814174-SRX7', 2, '2026-08-06 18:03:43');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED NOT NULL,
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `revision` int UNSIGNED NOT NULL,
  `status` enum('issued','voided','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'issued',
  `invoice_date` date NOT NULL,
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `voided_by` bigint UNSIGNED DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `store_id`, `dispatch_request_id`, `dispatch_customer_id`, `invoice_number`, `revision`, `status`, `invoice_date`, `subtotal_amount`, `vat_amount`, `total_amount`, `voided_by`, `voided_at`, `void_reason`, `created_by`, `created_at`, `updated_at`) VALUES
(3, 2, 1, 1, 'INV-20260801183204087-6FCS', 1, 'issued', '2026-08-01', 17.0000, 0.0000, 17.0000, NULL, NULL, NULL, 2, '2026-08-01 15:32:04', NULL),
(4, 2, 2, 2, 'INV-20260801192726858-A5MD', 1, 'issued', '2026-08-01', 64.0000, 0.0000, 64.0000, NULL, NULL, NULL, 2, '2026-08-01 16:27:26', NULL),
(5, 2, 7, 7, 'INV-20260804005732974-N6BI', 1, 'issued', '2026-08-04', 32.0000, 0.0000, 32.0000, NULL, NULL, NULL, 2, '2026-08-03 21:57:32', NULL),
(6, 2, 7, 8, 'INV-20260804005732980-F76S', 1, 'issued', '2026-08-04', 32.0000, 0.0000, 32.0000, NULL, NULL, NULL, 2, '2026-08-03 21:57:32', NULL),
(7, 2, 9, 10, 'INV-20260804012631820-FAPS', 1, 'voided', '2026-08-04', 32.0000, 0.0000, 32.0000, 2, '2026-08-04 01:28:56', 'Dispatch returned to draft for correction', 2, '2026-08-03 22:26:31', '2026-08-03 22:28:56'),
(8, 2, 9, 10, 'INV-20260804013206776-LK2N', 2, 'issued', '2026-08-04', 32.0000, 0.0000, 32.0000, NULL, NULL, NULL, 2, '2026-08-03 22:32:06', NULL),
(9, 2, 8, 9, 'INV-20260806205527761-TN2J', 1, 'issued', '2026-08-06', 17.0000, 0.0000, 17.0000, NULL, NULL, NULL, 2, '2026-08-06 17:55:27', NULL),
(10, 2, 4, 4, 'INV-20260806210033395-DM55', 1, 'voided', '2026-08-06', 32.0000, 0.0000, 32.0000, 2, '2026-08-06 21:01:55', 'Dispatch returned to draft for correction', 2, '2026-08-06 18:00:33', '2026-08-06 18:01:55'),
(11, 2, 5, 5, 'INV-20260806210219914-DICM', 1, 'issued', '2026-08-06', 32.0000, 0.0000, 32.0000, NULL, NULL, NULL, 2, '2026-08-06 18:02:19', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `invoice_lines`
--

CREATE TABLE `invoice_lines` (
  `id` bigint UNSIGNED NOT NULL,
  `invoice_id` bigint UNSIGNED NOT NULL,
  `dispatch_item_id` bigint UNSIGNED DEFAULT NULL,
  `line_type` enum('sale','free_gift') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_rate` decimal(9,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `invoice_lines`
--

INSERT INTO `invoice_lines` (`id`, `invoice_id`, `dispatch_item_id`, `line_type`, `description`, `quantity`, `unit_label`, `unit_price`, `unit_cost`, `subtotal_amount`, `vat_rate`, `vat_amount`, `line_total`, `created_at`) VALUES
(3, 3, 1, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-01 15:32:04'),
(4, 4, 2, 'sale', 'carton 6kg 400g — Ready bag', 1.0000, 'bag', 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, '2026-08-01 16:27:26'),
(5, 4, 3, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-01 16:27:26'),
(6, 4, 4, 'sale', 'carton 6kg 400g — Ready bag', 1.0000, 'bag', 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, '2026-08-01 16:27:26'),
(7, 4, 5, 'sale', 'fahem 5.5 — Carton', 2.0000, 'carton', 15.0000, 0.0000, 30.0000, 0.0000, 0.0000, 30.0000, '2026-08-01 16:27:26'),
(8, 4, 6, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-01 16:27:26'),
(9, 5, 19, 'sale', 'carton 6kg 400g — Ready bag', 1.0000, 'bag', 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, '2026-08-03 21:57:32'),
(10, 5, 20, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-03 21:57:32'),
(11, 5, 21, 'sale', 'fahem 5.5 — Carton', 1.0000, 'carton', 15.0000, 0.0000, 15.0000, 0.0000, 0.0000, 15.0000, '2026-08-03 21:57:32'),
(12, 6, 22, 'sale', 'fahem 5.5 — Carton', 1.0000, 'carton', 15.0000, 0.0000, 15.0000, 0.0000, 0.0000, 15.0000, '2026-08-03 21:57:32'),
(13, 6, 23, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-03 21:57:32'),
(14, 6, 24, 'sale', 'carton 6kg 400g — Ready bag', 1.0000, 'bag', 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, '2026-08-03 21:57:32'),
(15, 7, 27, 'sale', 'fahem 5.5 — Carton', 1.0000, 'carton', 15.0000, 0.0000, 15.0000, 0.0000, 0.0000, 15.0000, '2026-08-03 22:26:31'),
(16, 7, 28, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-03 22:26:31'),
(17, 8, 27, 'sale', 'fahem 5.5 — Carton', 1.0000, 'carton', 15.0000, 0.5652, 15.0000, 0.0000, 0.0000, 15.0000, '2026-08-03 22:32:06'),
(18, 8, 28, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.3464, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-03 22:32:06'),
(19, 9, 25, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-06 17:55:27'),
(20, 9, 26, 'sale', 'carton 6kg 400g — Ready bag', 1.0000, 'bag', 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, '2026-08-06 17:55:27'),
(21, 10, 10, 'sale', 'carton 6kg 400g — Ready bag', 1.0000, 'bag', 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, '2026-08-06 18:00:33'),
(22, 10, 11, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-06 18:00:33'),
(23, 10, 12, 'sale', 'fahem 5.5 — Carton', 1.0000, 'carton', 15.0000, 0.0000, 15.0000, 0.0000, 0.0000, 15.0000, '2026-08-06 18:00:33'),
(24, 11, 13, 'sale', 'carton 6kg 400g — Ready bag', 1.0000, 'bag', 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, '2026-08-06 18:02:19'),
(25, 11, 14, 'sale', 'carton 6kg 400g — Ready carton', 1.0000, 'carton', 17.0000, 0.0000, 17.0000, 0.0000, 0.0000, 17.0000, '2026-08-06 18:02:19'),
(26, 11, 15, 'sale', 'fahem 5.5 — Carton', 1.0000, 'carton', 15.0000, 0.0000, 15.0000, 0.0000, 0.0000, 15.0000, '2026-08-06 18:02:19');

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `base_unit_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_kind` enum('normal','packaging') COLLATE utf8mb4_unicode_ci NOT NULL,
  `stock_mode` enum('carton','weight','piece') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kg_per_carton` decimal(18,4) DEFAULT NULL,
  `max_content_weight_kg` decimal(18,4) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `default_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `default_selling_price` decimal(18,4) DEFAULT NULL,
  `reorder_level` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `store_id`, `category_id`, `base_unit_id`, `name`, `code`, `item_kind`, `stock_mode`, `kg_per_carton`, `max_content_weight_kg`, `description`, `default_cost`, `default_selling_price`, `reorder_level`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(2, 2, 1, 6, 'fahem 5.5', '1', 'normal', 'carton', 10.0000, NULL, NULL, 1.0000, NULL, 98.0000, 'active', 2, '2026-07-31 19:56:11', NULL),
(4, 2, 2, 6, 'cartoon 10kg', '12', 'packaging', 'piece', NULL, 6.0000, NULL, 0.0000, NULL, 0.0000, 'active', 2, '2026-07-31 20:06:31', NULL),
(5, 2, 2, 6, 'bag 400g', '123', 'packaging', 'piece', NULL, 0.4000, NULL, 0.0000, NULL, 0.0000, 'active', 2, '2026-07-31 20:07:02', NULL),
(7, 2, 1, 6, 'test', '122222', 'normal', 'carton', 10.0000, NULL, NULL, 0.5000, NULL, 100.0000, 'active', 2, '2026-08-06 17:41:40', NULL),
(8, 2, 1, 6, 'dokmaa', '12344444', 'normal', 'carton', 10.0000, NULL, NULL, 0.5000, NULL, 100.0000, 'active', 2, '2026-08-06 17:44:59', NULL),
(9, 2, 2, 6, 'bags400g', '400hg', 'packaging', 'piece', NULL, 0.4000, NULL, 0.1000, NULL, 1000.0000, 'active', 2, '2026-08-06 17:47:16', NULL),
(10, 2, 2, 6, 'cartoons 6kg', 'c6k', 'packaging', 'piece', NULL, 6.0000, NULL, 0.3000, NULL, 200.0000, 'active', 2, '2026-08-06 17:48:37', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `item_categories`
--

CREATE TABLE `item_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `parent_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `item_categories`
--

INSERT INTO `item_categories` (`id`, `store_id`, `parent_id`, `name`, `code`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, NULL, 'fahme', NULL, NULL, 'active', '2026-07-31 19:39:39', NULL),
(2, 2, NULL, 'package', NULL, NULL, 'active', '2026-07-31 20:05:50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `item_stock_balances`
--

CREATE TABLE `item_stock_balances` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `quantity_on_hand` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `quantity_reserved` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `average_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `stock_value` decimal(36,8) GENERATED ALWAYS AS ((`quantity_on_hand` * `average_cost`)) STORED,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `item_stock_balances`
--

INSERT INTO `item_stock_balances` (`id`, `store_id`, `warehouse_id`, `item_id`, `quantity_on_hand`, `quantity_reserved`, `average_cost`, `updated_at`) VALUES
(2, 2, 1, 2, 90.0000, 0.0000, 0.5652, '2026-08-06 18:02:44'),
(3, 2, 1, 4, 969.0000, 0.0000, 0.0000, '2026-07-31 20:22:12'),
(4, 2, 1, 5, 1635.0000, 0.0000, 0.3670, '2026-08-06 18:16:23'),
(5, 2, 1, 7, 100.0000, 0.0000, 1.0000, '2026-08-06 17:41:40'),
(6, 2, 1, 8, 100.0000, 0.0000, 0.5000, '2026-08-06 17:44:59'),
(7, 2, 1, 9, 7000.0000, 0.0000, 0.1000, '2026-08-06 17:47:16'),
(8, 2, 1, 10, 3000.0000, 0.0000, 0.3000, '2026-08-06 17:50:07');

-- --------------------------------------------------------

--
-- Table structure for table `item_stock_movements`
--

CREATE TABLE `item_stock_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `movement_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_change` decimal(18,4) NOT NULL,
  `quantity_before` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `quantity_after` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reserved_quantity_change` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reserved_quantity_before` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reserved_quantity_after` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `total_cost` decimal(18,4) DEFAULT NULL,
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `carton_stock_lot_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `item_stock_movements`
--

INSERT INTO `item_stock_movements` (`id`, `store_id`, `warehouse_id`, `item_id`, `movement_type`, `quantity_change`, `quantity_before`, `quantity_after`, `reserved_quantity_change`, `reserved_quantity_before`, `reserved_quantity_after`, `unit_cost`, `total_cost`, `reference_type`, `reference_id`, `carton_stock_lot_id`, `notes`, `created_by`, `created_at`) VALUES
(1, 2, 1, 2, 'opening_balance', 100.0000, 0.0000, 100.0000, 0.0000, 0.0000, 0.0000, 0.5000, 50.0000, 'item_opening_balance', 2, 1, 'Opening carton balance', 2, '2026-07-31 19:56:11'),
(2, 2, 1, 2, 'stock_adjustment', 15.0000, 100.0000, 115.0000, 0.0000, 0.0000, 0.0000, 1.0000, 15.0000, 'stock_adjustment', NULL, 2, 'asd', 2, '2026-07-31 20:05:37'),
(3, 2, 1, 4, 'stock_adjustment', 1000.0000, 0.0000, 1000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'stock_adjustment', NULL, NULL, 'ads', 2, '2026-07-31 20:06:42'),
(4, 2, 1, 5, 'opening_balance', 1000.0000, 0.0000, 1000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'item_opening_balance', 5, NULL, 'Opening item balance', 2, '2026-07-31 20:07:02'),
(17, 2, 1, 2, 'packaging_consume', -19.0000, 115.0000, 96.0000, 0.0000, 0.0000, 0.0000, 0.5652, 10.7388, 'packaging_operation', 5, 1, 'Packaging operation 5', 2, '2026-07-31 20:22:12'),
(18, 2, 1, 4, 'packaging_consume', -31.0000, 1000.0000, 969.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'packaging_operation', 5, NULL, 'Packaging operation 5', 2, '2026-07-31 20:22:12'),
(19, 2, 1, 5, 'packaging_consume', -465.0000, 1000.0000, 535.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 'packaging_operation', 5, NULL, 'Packaging operation 5', 2, '2026-07-31 20:22:12'),
(20, 2, 1, 2, 'dispatch_reserve', 0.0000, 96.0000, 96.0000, 2.0000, 0.0000, 2.0000, 0.5652, 0.0000, 'dispatch_request', 2, NULL, 'Reserve sealed cartons for dispatch', 2, '2026-08-01 16:27:36'),
(21, 2, 1, 2, 'dispatch_out', -2.0000, 96.0000, 94.0000, -2.0000, 2.0000, 0.0000, 0.5652, 1.1304, 'dispatch_request', 2, 1, 'Dispatch DISP-20260801192712514-IVQ4', 2, '2026-08-01 16:27:38'),
(22, 2, 1, 2, 'dispatch_reserve', 0.0000, 94.0000, 94.0000, 1.0000, 0.0000, 1.0000, 0.5652, 0.0000, 'dispatch_request', 7, NULL, 'Reserve sealed cartons for dispatch', 2, '2026-08-03 21:58:26'),
(23, 2, 1, 2, 'dispatch_reserve', 0.0000, 94.0000, 94.0000, 1.0000, 1.0000, 2.0000, 0.5652, 0.0000, 'dispatch_request', 7, NULL, 'Reserve sealed cartons for dispatch', 2, '2026-08-03 21:58:26'),
(24, 2, 1, 2, 'dispatch_out', -1.0000, 94.0000, 93.0000, -1.0000, 2.0000, 1.0000, 0.5652, 0.5652, 'dispatch_request', 7, 1, 'Dispatch DISP-20260801201718645-7LPP', 2, '2026-08-03 22:05:51'),
(25, 2, 1, 2, 'dispatch_out', -1.0000, 93.0000, 92.0000, -1.0000, 1.0000, 0.0000, 0.5652, 0.5652, 'dispatch_request', 7, 1, 'Dispatch DISP-20260801201718645-7LPP', 2, '2026-08-03 22:05:51'),
(26, 2, 1, 2, 'dispatch_reserve', 0.0000, 92.0000, 92.0000, 1.0000, 0.0000, 1.0000, 0.5652, 0.0000, 'dispatch_request', 9, NULL, 'Reserve sealed cartons for dispatch', 2, '2026-08-03 22:26:40'),
(27, 2, 1, 2, 'dispatch_unreserve', 0.0000, 92.0000, 92.0000, -1.0000, 1.0000, 0.0000, 0.5652, 0.0000, 'dispatch_request', 9, NULL, 'Release reservation for dispatch rework', 2, '2026-08-03 22:28:56'),
(28, 2, 1, 2, 'dispatch_reserve', 0.0000, 92.0000, 92.0000, 1.0000, 0.0000, 1.0000, 0.5652, 0.0000, 'dispatch_request', 9, NULL, 'Reserve sealed cartons for dispatch', 2, '2026-08-03 22:32:10'),
(29, 2, 1, 2, 'dispatch_out', -1.0000, 92.0000, 91.0000, -1.0000, 1.0000, 0.0000, 0.5652, 0.5652, 'dispatch_request', 9, 1, 'Dispatch DISP-20260804010926958-ULX0', 2, '2026-08-03 22:32:16'),
(30, 2, 1, 5, 'purchase_receive', 100.0000, 535.0000, 635.0000, 0.0000, 0.0000, 0.0000, 1.0000, 100.0000, 'purchase_receipt', 1, NULL, NULL, 2, '2026-08-03 23:11:26'),
(31, 2, 1, 7, 'opening_balance', 100.0000, 0.0000, 100.0000, 0.0000, 0.0000, 0.0000, 1.0000, 100.0000, 'item_opening_balance', 7, 3, 'Opening carton balance', 2, '2026-08-06 17:41:40'),
(32, 2, 1, 8, 'opening_balance', 100.0000, 0.0000, 100.0000, 0.0000, 0.0000, 0.0000, 0.5000, 50.0000, 'item_opening_balance', 8, 4, 'Opening carton balance', 2, '2026-08-06 17:44:59'),
(33, 2, 1, 9, 'opening_balance', 7000.0000, 0.0000, 7000.0000, 0.0000, 0.0000, 0.0000, 0.1000, 700.0000, 'item_opening_balance', 9, NULL, 'Opening item balance', 2, '2026-08-06 17:47:16'),
(34, 2, 1, 10, 'opening_balance', 2500.0000, 0.0000, 2500.0000, 0.0000, 0.0000, 0.0000, 0.3000, 750.0000, 'item_opening_balance', 10, NULL, 'Opening item balance', 2, '2026-08-06 17:48:37'),
(35, 2, 1, 10, 'stock_adjustment', 500.0000, 2500.0000, 3000.0000, 0.0000, 0.0000, 0.0000, 0.3000, 150.0000, 'stock_adjustment', NULL, NULL, 'gf', 2, '2026-08-06 17:50:07'),
(36, 2, 1, 2, 'dispatch_reserve', 0.0000, 91.0000, 91.0000, 1.0000, 0.0000, 1.0000, 0.5652, 0.0000, 'dispatch_request', 4, NULL, 'Reserve sealed cartons for dispatch', 2, '2026-08-06 18:00:42'),
(37, 2, 1, 2, 'dispatch_unreserve', 0.0000, 91.0000, 91.0000, -1.0000, 1.0000, 0.0000, 0.5652, 0.0000, 'dispatch_request', 4, NULL, 'Release reservation for dispatch rework', 2, '2026-08-06 18:01:55'),
(38, 2, 1, 2, 'dispatch_reserve', 0.0000, 91.0000, 91.0000, 1.0000, 0.0000, 1.0000, 0.5652, 0.0000, 'dispatch_request', 5, NULL, 'Reserve sealed cartons for dispatch', 2, '2026-08-06 18:02:26'),
(39, 2, 1, 2, 'dispatch_out', -1.0000, 91.0000, 90.0000, -1.0000, 1.0000, 0.0000, 0.5652, 0.5652, 'dispatch_request', 5, 1, 'Dispatch DISP-20260801200814174-SRX7', 2, '2026-08-06 18:02:44'),
(40, 2, 1, 5, 'stock_adjustment', 1000.0000, 635.0000, 1635.0000, 0.0000, 0.0000, 0.0000, 0.5000, 500.0000, 'stock_adjustment', NULL, NULL, 'ede', 2, '2026-08-06 18:16:23');

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`id`, `store_id`, `name`, `code`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 'beirut', '123444', NULL, 'active', 2, '2026-07-31 20:45:56', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `location_targets`
--

CREATE TABLE `location_targets` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `target_period` enum('daily','weekly','monthly','quarterly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `target_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','active','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `location_targets`
--

INSERT INTO `location_targets` (`id`, `store_id`, `location_id`, `target_period`, `period_start`, `period_end`, `target_amount`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 'monthly', '2026-08-04', '2026-09-03', 1000.0000, 'draft', 2, '2026-08-04 17:31:23', NULL),
(2, 2, 1, 'monthly', '2026-08-04', '2026-09-03', 1000.0000, 'active', 2, '2026-08-04 18:30:31', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type` enum('info','warning','danger','success') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `store_id`, `user_id`, `title`, `message`, `notification_type`, `reference_type`, `reference_id`, `read_at`, `created_at`) VALUES
(5, 2, 2, 'Low stock: fahem 5.5', 'Available stock is 96.0000 (reorder level 98.0000) in warehouse #1.', 'warning', 'item_stock_balance', 2, '2026-08-04 01:05:07', '2026-07-31 20:22:12'),
(6, 2, 3, 'Target assigned', 'A target assignment relevant to your territory was updated.', 'info', 'location_target', 2, NULL, '2026-08-04 18:30:31'),
(7, 2, 2, 'Target assigned', 'A target assignment relevant to your territory was updated.', 'info', 'location_target', 2, NULL, '2026-08-04 18:30:31');

-- --------------------------------------------------------

--
-- Table structure for table `packaging_groups`
--

CREATE TABLE `packaging_groups` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_item_id` bigint UNSIGNED NOT NULL,
  `default_warehouse_id` bigint UNSIGNED DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `packaging_groups`
--

INSERT INTO `packaging_groups` (`id`, `store_id`, `name`, `code`, `input_item_id`, `default_warehouse_id`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(3, 2, 'carton 6kg 400g', '321', 2, 1, NULL, 'active', 2, '2026-07-31 20:10:40', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `packaging_group_components`
--

CREATE TABLE `packaging_group_components` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `packaging_group_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `component_role` enum('outer_sellable','inner_sellable','consumable') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_per_outer` decimal(18,4) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `packaging_group_components`
--

INSERT INTO `packaging_group_components` (`id`, `store_id`, `packaging_group_id`, `item_id`, `component_role`, `quantity_per_outer`, `sort_order`, `notes`, `created_at`, `updated_at`) VALUES
(1, 2, 3, 4, 'outer_sellable', 1.0000, 0, NULL, '2026-07-31 20:10:40', NULL),
(2, 2, 3, 5, 'inner_sellable', 15.0000, 1, NULL, '2026-07-31 20:10:40', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `packaging_operations`
--

CREATE TABLE `packaging_operations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `operation_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `packaging_group_id` bigint UNSIGNED NOT NULL,
  `input_item_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `output_carton_count` int UNSIGNED NOT NULL,
  `raw_quantity_kg` decimal(18,4) NOT NULL,
  `raw_unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `packaging_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `cost_per_outer` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `cost_per_inner` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `group_snapshot_json` json NOT NULL,
  `input_snapshot_json` json NOT NULL,
  `status` enum('completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `completed_by` bigint UNSIGNED DEFAULT NULL,
  `completed_at` datetime NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `packaging_operations`
--

INSERT INTO `packaging_operations` (`id`, `store_id`, `operation_number`, `packaging_group_id`, `input_item_id`, `warehouse_id`, `output_carton_count`, `raw_quantity_kg`, `raw_unit_cost`, `packaging_cost`, `total_cost`, `cost_per_outer`, `cost_per_inner`, `group_snapshot_json`, `input_snapshot_json`, `status`, `completed_by`, `completed_at`, `notes`, `created_at`) VALUES
(5, 2, 'PKG-20260731232212049-AWXP', 3, 2, 1, 31, 190.0000, 0.5652, 0.0000, 10.7388, 0.3464, 0.0231, '{\"id\": 3, \"code\": \"321\", \"name\": \"carton 6kg 400g\", \"inner\": {\"name\": \"bag 400g\", \"item_id\": 5, \"quantity_per_outer\": \"15.0000\", \"max_content_weight_kg\": \"0.4000\"}, \"outer\": {\"name\": \"cartoon 10kg\", \"item_id\": 4, \"quantity_per_outer\": \"1.0000\", \"max_content_weight_kg\": \"6.0000\"}, \"components\": [{\"item_id\": 4, \"item_name\": \"cartoon 10kg\", \"component_role\": \"outer_sellable\", \"quantity_per_outer\": \"1.0000\", \"max_content_weight_kg\": \"6.0000\"}, {\"item_id\": 5, \"item_name\": \"bag 400g\", \"component_role\": \"inner_sellable\", \"quantity_per_outer\": \"15.0000\", \"max_content_weight_kg\": \"0.4000\"}], \"capacity_kg\": \"6.0000\"}', '{\"item_id\": 2, \"item_name\": \"fahem 5.5\", \"unit_cost\": \"0.5652\", \"stock_mode\": \"carton\", \"kg_per_carton\": \"10.0000\", \"raw_quantity_kg\": \"190.0000\", \"cartons_consumed\": \"19.0000\"}', 'completed', 2, '2026-07-31 23:22:12', NULL, '2026-07-31 20:22:12');

-- --------------------------------------------------------

--
-- Table structure for table `packaging_operation_components`
--

CREATE TABLE `packaging_operation_components` (
  `id` bigint UNSIGNED NOT NULL,
  `packaging_operation_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `component_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_per_outer` decimal(18,4) DEFAULT NULL,
  `required_quantity` decimal(18,4) NOT NULL,
  `consumed_quantity` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `component_snapshot_json` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `packaging_operation_components`
--

INSERT INTO `packaging_operation_components` (`id`, `packaging_operation_id`, `item_id`, `component_role`, `quantity_per_outer`, `required_quantity`, `consumed_quantity`, `unit_cost`, `total_cost`, `component_snapshot_json`, `created_at`) VALUES
(13, 5, 2, 'raw_input', 6.1290, 190.0000, 190.0000, 0.5652, 10.7388, '{\"item_id\": 2, \"item_name\": \"fahem 5.5\", \"unit_cost\": \"0.5652\", \"stock_mode\": \"carton\", \"kg_per_carton\": \"10.0000\", \"raw_quantity_kg\": \"190.0000\", \"cartons_consumed\": \"19.0000\"}', '2026-07-31 20:22:12'),
(14, 5, 4, 'outer_sellable', 1.0000, 31.0000, 31.0000, 0.0000, 0.0000, '{\"item_id\": 4, \"item_code\": \"12\", \"item_name\": \"cartoon 10kg\", \"unit_cost\": \"0.0000\", \"component_role\": \"outer_sellable\", \"quantity_per_outer\": \"1.0000\"}', '2026-07-31 20:22:12'),
(15, 5, 5, 'inner_sellable', 15.0000, 465.0000, 465.0000, 0.0000, 0.0000, '{\"item_id\": 5, \"item_code\": \"123\", \"item_name\": \"bag 400g\", \"unit_cost\": \"0.0000\", \"component_role\": \"inner_sellable\", \"quantity_per_outer\": \"15.0000\"}', '2026-07-31 20:22:12');

-- --------------------------------------------------------

--
-- Table structure for table `packaging_shelf_remainders`
--

CREATE TABLE `packaging_shelf_remainders` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `packaging_operation_id` bigint UNSIGNED NOT NULL,
  `packaging_group_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `input_item_id` bigint UNSIGNED NOT NULL,
  `remaining_kg` decimal(18,4) NOT NULL,
  `remaining_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint UNSIGNED NOT NULL,
  `module` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_key` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `module`, `action`, `permission_key`, `description`, `created_at`) VALUES
(1, 'dashboard', 'view', 'dashboard.view', 'View dashboard', '2026-07-23 20:59:24'),
(2, 'users', 'view', 'users.view', 'View users', '2026-07-23 20:59:24'),
(3, 'users', 'create', 'users.create', 'Create users', '2026-07-23 20:59:24'),
(4, 'users', 'update', 'users.update', 'Update users', '2026-07-23 20:59:24'),
(5, 'users', 'delete', 'users.delete', 'Delete users', '2026-07-23 20:59:24'),
(6, 'roles', 'manage', 'roles.manage', 'Manage roles and permissions', '2026-07-23 20:59:24'),
(7, 'inventory', 'view', 'inventory.view', 'View inventory', '2026-07-23 20:59:24'),
(8, 'inventory', 'create', 'inventory.create', 'Create inventory records', '2026-07-23 20:59:24'),
(9, 'inventory', 'update', 'inventory.update', 'Update inventory records', '2026-07-23 20:59:24'),
(10, 'inventory', 'delete', 'inventory.delete', 'Delete inventory records', '2026-07-23 20:59:24'),
(11, 'stock', 'adjust', 'stock.adjust', 'Adjust stock', '2026-07-23 20:59:24'),
(12, 'stock', 'movements', 'stock.movements', 'View stock movements', '2026-07-23 20:59:24'),
(13, 'purchase_orders', 'view', 'purchase_orders.view', 'View purchase orders', '2026-07-23 20:59:24'),
(14, 'purchase_orders', 'create', 'purchase_orders.create', 'Create purchase orders', '2026-07-23 20:59:24'),
(15, 'purchase_orders', 'approve', 'purchase_orders.approve', 'Approve purchase orders', '2026-07-23 20:59:24'),
(16, 'purchase_orders', 'receive', 'purchase_orders.receive', 'Receive purchase orders', '2026-07-23 20:59:24'),
(17, 'purchase_orders', 'cancel', 'purchase_orders.cancel', 'Cancel purchase orders', '2026-07-23 20:59:24'),
(22, 'locations', 'manage', 'locations.manage', 'Manage locations and sublocations', '2026-07-23 20:59:24'),
(23, 'targets', 'manage', 'targets.manage', 'Manage targets', '2026-07-23 20:59:24'),
(24, 'salesmen', 'manage', 'salesmen.manage', 'Manage salesmen', '2026-07-23 20:59:24'),
(25, 'customers', 'view', 'customers.view', 'View customers', '2026-07-23 20:59:24'),
(26, 'customers', 'create', 'customers.create', 'Create customers', '2026-07-23 20:59:24'),
(27, 'customers', 'update', 'customers.update', 'Update customers', '2026-07-23 20:59:24'),
(28, 'customers', 'delete', 'customers.delete', 'Delete customers', '2026-07-23 20:59:24'),
(29, 'dispatch', 'view', 'dispatch.view', 'View dispatch requests', '2026-07-23 20:59:24'),
(30, 'dispatch', 'create', 'dispatch.create', 'Create dispatch requests', '2026-07-23 20:59:24'),
(31, 'dispatch', 'approve', 'dispatch.approve', 'Approve dispatch requests', '2026-07-23 20:59:24'),
(32, 'dispatch', 'settle', 'dispatch.settle', 'Settle dispatch requests', '2026-07-23 20:59:24'),
(33, 'dispatch', 'print', 'dispatch.print', 'Generate dispatch documents', '2026-07-23 20:59:24'),
(34, 'dispatch', 'gift_approve', 'dispatch.gifts.approve', 'Approve requested free gifts', '2026-07-23 20:59:24'),
(35, 'invoices', 'view', 'invoices.view', 'View invoices', '2026-07-23 20:59:24'),
(36, 'invoices', 'print', 'invoices.print', 'Generate invoice PDFs', '2026-07-23 20:59:24'),
(37, 'accounting', 'view', 'accounting.view', 'View accounting', '2026-07-23 20:59:24'),
(38, 'accounting', 'manage', 'accounting.manage', 'Manage accounting records', '2026-07-23 20:59:24'),
(39, 'debts', 'manage', 'debts.manage', 'Manage customer debts', '2026-07-23 20:59:24'),
(40, 'commissions', 'manage', 'commissions.manage', 'Manage commissions', '2026-07-23 20:59:24'),
(41, 'reports', 'view', 'reports.view', 'View reports', '2026-07-23 20:59:24'),
(42, 'reports', 'export', 'reports.export', 'Export reports', '2026-07-23 20:59:24'),
(43, 'audit_logs', 'view', 'audit_logs.view', 'View audit logs', '2026-07-23 20:59:24'),
(44, 'settings', 'manage', 'settings.manage', 'Manage system settings', '2026-07-23 20:59:24'),
(45, 'superadmin', 'manage', 'superadmin.manage', 'Manage stores and module availability', '2026-07-23 20:59:24'),
(49, 'pos', 'create_customers', 'pos.create_customers', 'Create POS customers in assigned territories', '2026-07-23 20:59:24'),
(50, 'pos', 'request_gifts', 'pos.request_gifts', 'Request free gifts in POS', '2026-07-23 20:59:24'),
(51, 'salesman_workspace', 'view', 'salesman_workspace.view', 'View own salesman workspace', '2026-07-23 20:59:24'),
(53, 'pos', 'create_own', 'pos.create_own', 'Create, edit, and cancel own pending customer requests', '2026-08-01 15:31:41'),
(54, 'pos', 'create_for_salesman', 'pos.create_for_salesman', 'Create customer request or batch assigned to another salesman', '2026-08-01 15:31:41'),
(56, 'dispatch', 'release', 'delivery.release', 'Release a pending delivery batch and lock edits', '2026-08-01 15:31:41'),
(57, 'dispatch', 'dispatch', 'delivery.dispatch', 'Execute stock-consuming delivery transition', '2026-08-01 15:31:41'),
(58, 'dispatch', 'record_returns', 'delivery.record_returns', 'Record customer and line delivery returns', '2026-08-01 15:31:41'),
(59, 'dispatch', 'settle_deliveries', 'finance.settle_deliveries', 'Perform delivery settlement, payment, refund, and debt closeout', '2026-08-01 15:31:41'),
(60, 'dispatch', 'closeout', 'delivery.closeout', 'Submit a delivery closeout for collection, debt, and review', '2026-08-01 16:15:55');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `po_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` bigint UNSIGNED DEFAULT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `order_date` date NOT NULL,
  `expected_date` date DEFAULT NULL,
  `status` enum('draft','pending','approved','partially_received','received','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `subtotal` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `discount_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `tax_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `amount_paid` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `store_id`, `po_number`, `supplier_id`, `warehouse_id`, `cash_account_id`, `payment_method`, `order_date`, `expected_date`, `status`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `amount_paid`, `notes`, `created_by`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 2, 'PO-20260804021104368-H3XU', 1, 1, 1, 'cash', '2026-08-04', NULL, 'partially_received', 1000.0000, 0.0000, 0.0000, 1000.0000, 1000.0000, NULL, 2, 2, '2026-08-04 02:11:14', '2026-08-03 23:11:04', '2026-08-03 23:11:42');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `ordered_quantity` decimal(18,4) NOT NULL,
  `received_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_order_items`
--

INSERT INTO `purchase_order_items` (`id`, `purchase_order_id`, `item_id`, `ordered_quantity`, `received_quantity`, `unit_cost`, `line_total`, `notes`, `created_at`) VALUES
(1, 1, 5, 1000.0000, 100.0000, 1.0000, 1000.0000, NULL, '2026-08-03 23:11:04');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_receipts`
--

CREATE TABLE `purchase_receipts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED NOT NULL,
  `receipt_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `received_date` date NOT NULL,
  `status` enum('posted','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'posted',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `received_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_receipts`
--

INSERT INTO `purchase_receipts` (`id`, `store_id`, `purchase_order_id`, `receipt_number`, `received_date`, `status`, `notes`, `received_by`, `created_at`) VALUES
(1, 2, 1, 'PR-20260804021126267-LZTU', '2026-08-04', 'posted', NULL, 2, '2026-08-03 23:11:26');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_receipt_items`
--

CREATE TABLE `purchase_receipt_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_receipt_id` bigint UNSIGNED NOT NULL,
  `purchase_order_item_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `received_quantity` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_receipt_items`
--

INSERT INTO `purchase_receipt_items` (`id`, `purchase_receipt_id`, `purchase_order_item_id`, `item_id`, `received_quantity`, `unit_cost`, `created_at`) VALUES
(1, 1, 1, 5, 100.0000, 1.0000, '2026-08-03 23:11:26');

-- --------------------------------------------------------

--
-- Table structure for table `ready_shelf_stocks`
--

CREATE TABLE `ready_shelf_stocks` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `packaging_operation_id` bigint UNSIGNED NOT NULL,
  `packaging_group_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `input_item_id` bigint UNSIGNED NOT NULL,
  `packaging_item_id` bigint UNSIGNED NOT NULL,
  `unit_weight_kg` decimal(18,4) NOT NULL,
  `quantity` int UNSIGNED NOT NULL,
  `reserved_quantity` int UNSIGNED NOT NULL DEFAULT '0',
  `total_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `remaining_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `state` enum('reusable','gift') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reusable',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `ready_shelf_stocks`
--

INSERT INTO `ready_shelf_stocks` (`id`, `store_id`, `packaging_operation_id`, `packaging_group_id`, `warehouse_id`, `input_item_id`, `packaging_item_id`, `unit_weight_kg`, `quantity`, `reserved_quantity`, `total_cost`, `remaining_cost`, `state`, `created_at`, `updated_at`) VALUES
(5, 2, 5, 3, 1, 2, 5, 0.4000, 10, 0, 0.2261, 0.2261, 'reusable', '2026-07-31 20:22:12', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ready_shelf_stock_movements`
--

CREATE TABLE `ready_shelf_stock_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `ready_shelf_stock_id` bigint UNSIGNED NOT NULL,
  `movement_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_change` int NOT NULL,
  `quantity_before` int NOT NULL,
  `quantity_after` int NOT NULL,
  `state_before` enum('reusable','gift') COLLATE utf8mb4_unicode_ci NOT NULL,
  `state_after` enum('reusable','gift') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ready_shelf_stock_movements`
--

INSERT INTO `ready_shelf_stock_movements` (`id`, `store_id`, `warehouse_id`, `ready_shelf_stock_id`, `movement_type`, `quantity_change`, `quantity_before`, `quantity_after`, `state_before`, `state_after`, `reference_type`, `reference_id`, `notes`, `created_by`, `created_at`) VALUES
(1, 2, 1, 5, 'production', 10, 0, 10, 'reusable', 'reusable', 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12');

-- --------------------------------------------------------

--
-- Table structure for table `ready_stock_containers`
--

CREATE TABLE `ready_stock_containers` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `packaging_operation_id` bigint UNSIGNED NOT NULL,
  `packaging_group_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `outer_item_id` bigint UNSIGNED NOT NULL,
  `inner_item_id` bigint UNSIGNED NOT NULL,
  `outer_name_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inner_name_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `initial_inner_quantity` int UNSIGNED NOT NULL,
  `remaining_inner_quantity` int UNSIGNED NOT NULL,
  `reserved_inner_quantity` int UNSIGNED NOT NULL DEFAULT '0',
  `capacity_kg` decimal(18,4) NOT NULL,
  `total_cost` decimal(18,4) NOT NULL,
  `remaining_cost` decimal(18,4) NOT NULL,
  `status` enum('full','partial','depleted','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'full',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `ready_stock_containers`
--

INSERT INTO `ready_stock_containers` (`id`, `store_id`, `packaging_operation_id`, `packaging_group_id`, `warehouse_id`, `outer_item_id`, `inner_item_id`, `outer_name_snapshot`, `inner_name_snapshot`, `initial_inner_quantity`, `remaining_inner_quantity`, `reserved_inner_quantity`, `capacity_kg`, `total_cost`, `remaining_cost`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-01 16:13:55'),
(2, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 9, 0, 6.0000, 0.3464, 0.2078, 'partial', '2026-07-31 20:22:12', '2026-08-06 18:02:44'),
(3, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-01 16:27:38'),
(4, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-01 16:27:38'),
(5, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-03 22:05:51'),
(6, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-03 22:05:51'),
(7, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-03 22:32:16'),
(8, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-06 17:56:04'),
(9, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 0, 0, 6.0000, 0.3464, 0.0000, 'depleted', '2026-07-31 20:22:12', '2026-08-06 18:02:44'),
(10, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(11, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(12, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(13, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(14, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(15, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(16, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(17, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(18, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(19, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(20, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(21, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(22, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(23, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(24, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(25, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(26, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(27, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(28, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(29, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(30, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL),
(31, 2, 5, 3, 1, 4, 5, 'cartoon 10kg', 'bag 400g', 15, 15, 0, 6.0000, 0.3464, 0.3464, 'full', '2026-07-31 20:22:12', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ready_stock_movements`
--

CREATE TABLE `ready_stock_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `ready_stock_container_id` bigint UNSIGNED NOT NULL,
  `movement_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inner_quantity_change` decimal(18,4) NOT NULL,
  `inner_quantity_before` decimal(18,4) NOT NULL,
  `inner_quantity_after` decimal(18,4) NOT NULL,
  `cost_change` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `cost_before` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `cost_after` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ready_stock_movements`
--

INSERT INTO `ready_stock_movements` (`id`, `store_id`, `warehouse_id`, `ready_stock_container_id`, `movement_type`, `inner_quantity_change`, `inner_quantity_before`, `inner_quantity_after`, `cost_change`, `cost_before`, `cost_after`, `reference_type`, `reference_id`, `notes`, `created_by`, `created_at`) VALUES
(1, 2, 1, 1, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(2, 2, 1, 2, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(3, 2, 1, 3, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(4, 2, 1, 4, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(5, 2, 1, 5, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(6, 2, 1, 6, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(7, 2, 1, 7, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(8, 2, 1, 8, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(9, 2, 1, 9, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(10, 2, 1, 10, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(11, 2, 1, 11, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(12, 2, 1, 12, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(13, 2, 1, 13, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(14, 2, 1, 14, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(15, 2, 1, 15, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(16, 2, 1, 16, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(17, 2, 1, 17, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(18, 2, 1, 18, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(19, 2, 1, 19, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(20, 2, 1, 20, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(21, 2, 1, 21, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(22, 2, 1, 22, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(23, 2, 1, 23, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(24, 2, 1, 24, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(25, 2, 1, 25, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(26, 2, 1, 26, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(27, 2, 1, 27, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(28, 2, 1, 28, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(29, 2, 1, 29, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(30, 2, 1, 30, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(31, 2, 1, 31, 'packaging_complete', 15.0000, 0.0000, 15.0000, 0.3464, 0.0000, 0.3464, 'packaging_operation', 5, NULL, 2, '2026-07-31 20:22:12'),
(32, 2, 1, 1, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 1, 'Dispatch ready carton', 2, '2026-08-01 16:13:55'),
(33, 2, 1, 2, 'dispatch_out', -1.0000, 15.0000, 14.0000, -0.0231, 0.3464, 0.3233, 'dispatch_item', 2, 'Dispatch ready inner bags', 2, '2026-08-01 16:27:38'),
(34, 2, 1, 3, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 3, 'Dispatch ready carton', 2, '2026-08-01 16:27:38'),
(35, 2, 1, 2, 'dispatch_out', -1.0000, 14.0000, 13.0000, -0.0231, 0.3233, 0.3002, 'dispatch_item', 4, 'Dispatch ready inner bags', 2, '2026-08-01 16:27:38'),
(36, 2, 1, 4, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 6, 'Dispatch ready carton', 2, '2026-08-01 16:27:38'),
(37, 2, 1, 2, 'dispatch_out', -1.0000, 13.0000, 12.0000, -0.0231, 0.3002, 0.2771, 'dispatch_item', 19, 'Dispatch ready inner bags', 2, '2026-08-03 22:05:51'),
(38, 2, 1, 5, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 20, 'Dispatch ready carton', 2, '2026-08-03 22:05:51'),
(39, 2, 1, 6, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 23, 'Dispatch ready carton', 2, '2026-08-03 22:05:51'),
(40, 2, 1, 2, 'dispatch_out', -1.0000, 12.0000, 11.0000, -0.0231, 0.2771, 0.2540, 'dispatch_item', 24, 'Dispatch ready inner bags', 2, '2026-08-03 22:05:51'),
(41, 2, 1, 7, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 28, 'Dispatch ready carton', 2, '2026-08-03 22:32:16'),
(42, 2, 1, 8, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 25, 'Dispatch ready carton', 2, '2026-08-06 17:56:04'),
(43, 2, 1, 2, 'dispatch_out', -1.0000, 11.0000, 10.0000, -0.0231, 0.2540, 0.2309, 'dispatch_item', 26, 'Dispatch ready inner bags', 2, '2026-08-06 17:56:04'),
(44, 2, 1, 2, 'dispatch_out', -1.0000, 10.0000, 9.0000, -0.0231, 0.2309, 0.2078, 'dispatch_item', 13, 'Dispatch ready inner bags', 2, '2026-08-06 18:02:44'),
(45, 2, 1, 9, 'dispatch_out', -15.0000, 15.0000, 0.0000, -0.3464, 0.3464, 0.0000, 'dispatch_item', 14, 'Dispatch ready carton', 2, '2026-08-06 18:02:44');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_system_role` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `store_id`, `name`, `display_name`, `description`, `is_system_role`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'owner', 'System Owner', 'Full access to the entire store system.', 1, 'active', '2026-07-23 20:59:24', NULL),
(2, 1, 'admin', 'Admin', 'Administrative access.', 1, 'active', '2026-07-23 20:59:24', NULL),
(3, 1, 'accountant', 'Accountant', 'Accounting, payments, debts, commissions, settlements.', 1, 'active', '2026-07-23 20:59:24', NULL),
(4, 1, 'inventory_manager', 'Inventory Manager', 'Items, purchasing, carton stock, packaging, and ready stock.', 1, 'active', '2026-07-23 20:59:24', NULL),
(5, 1, 'salesman', 'Salesman / Driver', 'Own POS and delivery workspace access.', 1, 'active', '2026-07-23 20:59:24', NULL),
(6, 1, 'viewer', 'Viewer', 'Read-only reporting access.', 1, 'active', '2026-07-23 20:59:24', NULL),
(7, NULL, 'superadmin', 'Superadmin', 'Platform-level store and module administration.', 1, 'active', '2026-07-23 20:59:24', NULL),
(8, 2, 'owner', 'System Owner', 'Full access to the entire store system.', 1, 'active', '2026-07-31 19:39:10', NULL),
(9, 2, 'admin', 'Admin', 'Administrative access.', 1, 'active', '2026-07-31 19:39:10', NULL),
(10, 2, 'accountant', 'Accountant', 'Accounting, payments, debts, commissions, settlements.', 1, 'active', '2026-07-31 19:39:10', NULL),
(11, 2, 'inventory_manager', 'Inventory Manager', 'Items, purchasing, carton stock, packaging, and ready stock.', 1, 'active', '2026-07-31 19:39:10', NULL),
(12, 2, 'salesman', 'Salesman / Driver', 'Own POS and delivery workspace access.', 1, 'active', '2026-07-31 19:39:10', NULL),
(13, 2, 'viewer', 'Viewer', 'Read-only reporting access.', 1, 'active', '2026-07-31 19:39:10', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint UNSIGNED NOT NULL,
  `permission_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES
(1, 1, '2026-07-23 20:59:24'),
(1, 2, '2026-07-23 20:59:24'),
(1, 3, '2026-07-23 20:59:24'),
(1, 4, '2026-07-23 20:59:24'),
(1, 5, '2026-07-23 20:59:24'),
(1, 6, '2026-07-23 20:59:24'),
(1, 7, '2026-07-23 20:59:24'),
(1, 8, '2026-07-23 20:59:24'),
(1, 9, '2026-07-23 20:59:24'),
(1, 10, '2026-07-23 20:59:24'),
(1, 11, '2026-07-23 20:59:24'),
(1, 12, '2026-07-23 20:59:24'),
(1, 13, '2026-07-23 20:59:24'),
(1, 14, '2026-07-23 20:59:24'),
(1, 15, '2026-07-23 20:59:24'),
(1, 16, '2026-07-23 20:59:24'),
(1, 17, '2026-07-23 20:59:24'),
(1, 22, '2026-07-23 20:59:24'),
(1, 23, '2026-07-23 20:59:24'),
(1, 24, '2026-07-23 20:59:24'),
(1, 25, '2026-07-23 20:59:24'),
(1, 26, '2026-07-23 20:59:24'),
(1, 27, '2026-07-23 20:59:24'),
(1, 28, '2026-07-23 20:59:24'),
(1, 29, '2026-07-23 20:59:24'),
(1, 30, '2026-07-23 20:59:24'),
(1, 31, '2026-07-23 20:59:24'),
(1, 32, '2026-07-23 20:59:24'),
(1, 33, '2026-07-23 20:59:24'),
(1, 34, '2026-07-23 20:59:24'),
(1, 35, '2026-07-23 20:59:24'),
(1, 36, '2026-07-23 20:59:24'),
(1, 37, '2026-07-23 20:59:24'),
(1, 38, '2026-07-23 20:59:24'),
(1, 39, '2026-07-23 20:59:24'),
(1, 40, '2026-07-23 20:59:24'),
(1, 41, '2026-07-23 20:59:24'),
(1, 42, '2026-07-23 20:59:24'),
(1, 43, '2026-07-23 20:59:24'),
(1, 44, '2026-07-23 20:59:24'),
(1, 49, '2026-07-23 20:59:24'),
(1, 50, '2026-07-23 20:59:24'),
(1, 53, '2026-08-01 15:31:41'),
(1, 54, '2026-08-01 15:31:41'),
(1, 56, '2026-08-01 15:31:41'),
(1, 57, '2026-08-01 15:31:41'),
(1, 58, '2026-08-01 15:31:41'),
(1, 59, '2026-08-01 15:31:41'),
(1, 60, '2026-08-01 16:15:55'),
(2, 1, '2026-07-23 20:59:24'),
(2, 2, '2026-07-23 20:59:24'),
(2, 3, '2026-07-23 20:59:24'),
(2, 4, '2026-07-23 20:59:24'),
(2, 5, '2026-07-23 20:59:24'),
(2, 6, '2026-07-23 20:59:24'),
(2, 7, '2026-07-23 20:59:24'),
(2, 8, '2026-07-23 20:59:24'),
(2, 9, '2026-07-23 20:59:24'),
(2, 10, '2026-07-23 20:59:24'),
(2, 11, '2026-07-23 20:59:24'),
(2, 12, '2026-07-23 20:59:24'),
(2, 13, '2026-07-23 20:59:24'),
(2, 14, '2026-07-23 20:59:24'),
(2, 15, '2026-07-23 20:59:24'),
(2, 16, '2026-07-23 20:59:24'),
(2, 17, '2026-07-23 20:59:24'),
(2, 22, '2026-07-23 20:59:24'),
(2, 23, '2026-07-23 20:59:24'),
(2, 24, '2026-07-23 20:59:24'),
(2, 25, '2026-07-23 20:59:24'),
(2, 26, '2026-07-23 20:59:24'),
(2, 27, '2026-07-23 20:59:24'),
(2, 28, '2026-07-23 20:59:24'),
(2, 29, '2026-07-23 20:59:24'),
(2, 30, '2026-07-23 20:59:24'),
(2, 31, '2026-07-23 20:59:24'),
(2, 32, '2026-07-23 20:59:24'),
(2, 33, '2026-07-23 20:59:24'),
(2, 34, '2026-07-23 20:59:24'),
(2, 35, '2026-07-23 20:59:24'),
(2, 36, '2026-07-23 20:59:24'),
(2, 37, '2026-07-23 20:59:24'),
(2, 38, '2026-07-23 20:59:24'),
(2, 39, '2026-07-23 20:59:24'),
(2, 40, '2026-07-23 20:59:24'),
(2, 41, '2026-07-23 20:59:24'),
(2, 42, '2026-07-23 20:59:24'),
(2, 43, '2026-07-23 20:59:24'),
(2, 44, '2026-07-23 20:59:24'),
(2, 49, '2026-07-23 20:59:24'),
(2, 50, '2026-07-23 20:59:24'),
(2, 51, '2026-07-23 20:59:24'),
(2, 53, '2026-08-01 15:31:41'),
(2, 54, '2026-08-01 15:31:41'),
(2, 56, '2026-08-01 15:31:41'),
(2, 57, '2026-08-01 15:31:41'),
(2, 58, '2026-08-01 15:31:41'),
(2, 59, '2026-08-01 15:31:41'),
(2, 60, '2026-08-01 16:15:55'),
(3, 1, '2026-07-23 20:59:24'),
(3, 25, '2026-07-23 20:59:24'),
(3, 29, '2026-07-23 20:59:24'),
(3, 31, '2026-07-23 20:59:24'),
(3, 32, '2026-07-23 20:59:24'),
(3, 33, '2026-07-23 20:59:24'),
(3, 35, '2026-07-23 20:59:24'),
(3, 36, '2026-07-23 20:59:24'),
(3, 37, '2026-07-23 20:59:24'),
(3, 38, '2026-07-23 20:59:24'),
(3, 39, '2026-07-23 20:59:24'),
(3, 40, '2026-07-23 20:59:24'),
(3, 41, '2026-07-23 20:59:24'),
(3, 42, '2026-07-23 20:59:24'),
(3, 51, '2026-07-23 20:59:24'),
(3, 58, '2026-08-01 15:31:41'),
(3, 59, '2026-08-01 15:31:41'),
(4, 1, '2026-07-23 20:59:24'),
(4, 7, '2026-07-23 20:59:24'),
(4, 8, '2026-07-23 20:59:24'),
(4, 9, '2026-07-23 20:59:24'),
(4, 11, '2026-07-23 20:59:24'),
(4, 12, '2026-07-23 20:59:24'),
(4, 13, '2026-07-23 20:59:24'),
(4, 14, '2026-07-23 20:59:24'),
(4, 15, '2026-07-23 20:59:24'),
(4, 16, '2026-07-23 20:59:24'),
(4, 29, '2026-07-23 20:59:24'),
(4, 33, '2026-07-23 20:59:24'),
(4, 41, '2026-07-23 20:59:24'),
(4, 42, '2026-07-23 20:59:24'),
(5, 1, '2026-07-23 20:59:24'),
(5, 25, '2026-07-23 20:59:24'),
(5, 26, '2026-07-23 20:59:24'),
(5, 49, '2026-07-23 20:59:24'),
(5, 50, '2026-07-23 20:59:24'),
(5, 51, '2026-07-23 20:59:24'),
(5, 53, '2026-08-01 15:31:41'),
(6, 1, '2026-07-23 20:59:24'),
(6, 7, '2026-07-23 20:59:24'),
(6, 25, '2026-07-23 20:59:24'),
(6, 29, '2026-07-23 20:59:24'),
(6, 35, '2026-07-23 20:59:24'),
(6, 41, '2026-07-23 20:59:24'),
(6, 51, '2026-07-23 20:59:24'),
(7, 45, '2026-07-23 20:59:24'),
(8, 1, '2026-07-31 19:39:10'),
(8, 2, '2026-07-31 19:39:10'),
(8, 3, '2026-07-31 19:39:10'),
(8, 4, '2026-07-31 19:39:10'),
(8, 5, '2026-07-31 19:39:10'),
(8, 6, '2026-07-31 19:39:10'),
(8, 7, '2026-07-31 19:39:10'),
(8, 8, '2026-07-31 19:39:10'),
(8, 9, '2026-07-31 19:39:10'),
(8, 10, '2026-07-31 19:39:10'),
(8, 11, '2026-07-31 19:39:10'),
(8, 12, '2026-07-31 19:39:10'),
(8, 13, '2026-07-31 19:39:10'),
(8, 14, '2026-07-31 19:39:10'),
(8, 15, '2026-07-31 19:39:10'),
(8, 16, '2026-07-31 19:39:10'),
(8, 17, '2026-07-31 19:39:10'),
(8, 22, '2026-07-31 19:39:10'),
(8, 23, '2026-07-31 19:39:10'),
(8, 24, '2026-07-31 19:39:10'),
(8, 25, '2026-07-31 19:39:10'),
(8, 26, '2026-07-31 19:39:10'),
(8, 27, '2026-07-31 19:39:10'),
(8, 28, '2026-07-31 19:39:10'),
(8, 29, '2026-07-31 19:39:10'),
(8, 30, '2026-07-31 19:39:10'),
(8, 31, '2026-07-31 19:39:10'),
(8, 32, '2026-07-31 19:39:10'),
(8, 33, '2026-07-31 19:39:10'),
(8, 34, '2026-07-31 19:39:10'),
(8, 35, '2026-07-31 19:39:10'),
(8, 36, '2026-07-31 19:39:10'),
(8, 37, '2026-07-31 19:39:10'),
(8, 38, '2026-07-31 19:39:10'),
(8, 39, '2026-07-31 19:39:10'),
(8, 40, '2026-07-31 19:39:10'),
(8, 41, '2026-07-31 19:39:10'),
(8, 42, '2026-07-31 19:39:10'),
(8, 43, '2026-07-31 19:39:10'),
(8, 44, '2026-07-31 19:39:10'),
(8, 49, '2026-07-31 19:39:10'),
(8, 50, '2026-07-31 19:39:10'),
(8, 53, '2026-08-01 15:31:41'),
(8, 54, '2026-08-01 15:31:41'),
(8, 56, '2026-08-01 15:31:41'),
(8, 57, '2026-08-01 15:31:41'),
(8, 58, '2026-08-01 15:31:41'),
(8, 59, '2026-08-01 15:31:41'),
(8, 60, '2026-08-01 16:15:55'),
(9, 1, '2026-07-31 19:39:10'),
(9, 2, '2026-07-31 19:39:10'),
(9, 3, '2026-07-31 19:39:10'),
(9, 4, '2026-07-31 19:39:10'),
(9, 5, '2026-07-31 19:39:10'),
(9, 6, '2026-07-31 19:39:10'),
(9, 7, '2026-07-31 19:39:10'),
(9, 8, '2026-07-31 19:39:10'),
(9, 9, '2026-07-31 19:39:10'),
(9, 10, '2026-07-31 19:39:10'),
(9, 11, '2026-07-31 19:39:10'),
(9, 12, '2026-07-31 19:39:10'),
(9, 13, '2026-07-31 19:39:10'),
(9, 14, '2026-07-31 19:39:10'),
(9, 15, '2026-07-31 19:39:10'),
(9, 16, '2026-07-31 19:39:10'),
(9, 17, '2026-07-31 19:39:10'),
(9, 22, '2026-07-31 19:39:10'),
(9, 23, '2026-07-31 19:39:10'),
(9, 24, '2026-07-31 19:39:10'),
(9, 25, '2026-07-31 19:39:10'),
(9, 26, '2026-07-31 19:39:10'),
(9, 27, '2026-07-31 19:39:10'),
(9, 28, '2026-07-31 19:39:10'),
(9, 29, '2026-07-31 19:39:10'),
(9, 30, '2026-07-31 19:39:10'),
(9, 31, '2026-07-31 19:39:10'),
(9, 32, '2026-07-31 19:39:10'),
(9, 33, '2026-07-31 19:39:10'),
(9, 34, '2026-07-31 19:39:10'),
(9, 35, '2026-07-31 19:39:10'),
(9, 36, '2026-07-31 19:39:10'),
(9, 37, '2026-07-31 19:39:10'),
(9, 38, '2026-07-31 19:39:10'),
(9, 39, '2026-07-31 19:39:10'),
(9, 40, '2026-07-31 19:39:10'),
(9, 41, '2026-07-31 19:39:10'),
(9, 42, '2026-07-31 19:39:10'),
(9, 43, '2026-07-31 19:39:10'),
(9, 44, '2026-07-31 19:39:10'),
(9, 49, '2026-07-31 19:39:10'),
(9, 50, '2026-07-31 19:39:10'),
(9, 51, '2026-07-31 19:39:10'),
(9, 53, '2026-08-01 15:31:41'),
(9, 54, '2026-08-01 15:31:41'),
(9, 56, '2026-08-01 15:31:41'),
(9, 57, '2026-08-01 15:31:41'),
(9, 58, '2026-08-01 15:31:41'),
(9, 59, '2026-08-01 15:31:41'),
(9, 60, '2026-08-01 16:15:55'),
(10, 1, '2026-07-31 19:39:10'),
(10, 25, '2026-07-31 19:39:10'),
(10, 29, '2026-07-31 19:39:10'),
(10, 31, '2026-07-31 19:39:10'),
(10, 32, '2026-07-31 19:39:10'),
(10, 33, '2026-07-31 19:39:10'),
(10, 35, '2026-07-31 19:39:10'),
(10, 36, '2026-07-31 19:39:10'),
(10, 37, '2026-07-31 19:39:10'),
(10, 38, '2026-07-31 19:39:10'),
(10, 39, '2026-07-31 19:39:10'),
(10, 40, '2026-07-31 19:39:10'),
(10, 41, '2026-07-31 19:39:10'),
(10, 42, '2026-07-31 19:39:10'),
(10, 51, '2026-07-31 19:39:10'),
(10, 58, '2026-08-01 15:31:41'),
(10, 59, '2026-08-01 15:31:41'),
(11, 1, '2026-07-31 19:39:10'),
(11, 7, '2026-07-31 19:39:10'),
(11, 8, '2026-07-31 19:39:10'),
(11, 9, '2026-07-31 19:39:10'),
(11, 11, '2026-07-31 19:39:10'),
(11, 12, '2026-07-31 19:39:10'),
(11, 13, '2026-07-31 19:39:10'),
(11, 14, '2026-07-31 19:39:10'),
(11, 15, '2026-07-31 19:39:10'),
(11, 16, '2026-07-31 19:39:10'),
(11, 29, '2026-07-31 19:39:10'),
(11, 33, '2026-07-31 19:39:10'),
(11, 41, '2026-07-31 19:39:10'),
(11, 42, '2026-07-31 19:39:10'),
(12, 1, '2026-08-06 18:11:46'),
(12, 25, '2026-08-06 18:11:46'),
(12, 26, '2026-08-06 18:11:46'),
(12, 49, '2026-08-06 18:11:46'),
(12, 50, '2026-08-06 18:11:46'),
(12, 51, '2026-08-06 18:11:46'),
(12, 53, '2026-08-06 18:11:46'),
(13, 1, '2026-07-31 19:39:10'),
(13, 7, '2026-07-31 19:39:10'),
(13, 25, '2026-07-31 19:39:10'),
(13, 29, '2026-07-31 19:39:10'),
(13, 35, '2026-07-31 19:39:10'),
(13, 41, '2026-07-31 19:39:10'),
(13, 51, '2026-07-31 19:39:10');

-- --------------------------------------------------------

--
-- Table structure for table `salesman_balances`
--

CREATE TABLE `salesman_balances` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED DEFAULT NULL,
  `balance_date` date NOT NULL,
  `expected_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `collected_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `debt_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `returned_stock_value` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('open','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `closed_by` bigint UNSIGNED DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesman_balances`
--

INSERT INTO `salesman_balances` (`id`, `store_id`, `salesman_id`, `dispatch_request_id`, `balance_date`, `expected_amount`, `collected_amount`, `debt_amount`, `returned_stock_value`, `status`, `closed_by`, `closed_at`, `notes`, `created_at`) VALUES
(1, 2, 1, 1, '2026-07-31', 17.0000, 12.0000, 5.0000, 0.0000, 'open', NULL, NULL, NULL, '2026-08-01 16:24:09'),
(2, 2, 1, 2, '2026-07-31', 64.0000, 60.0000, 4.0000, 0.0000, 'open', NULL, NULL, NULL, '2026-08-01 16:27:46'),
(3, 2, 1, 8, '2026-08-05', 17.0000, 17.0000, 0.0000, 0.0000, 'open', NULL, NULL, NULL, '2026-08-06 17:59:51'),
(4, 2, 1, 5, '2026-08-05', 32.0000, 32.0000, 0.0000, 0.0000, 'open', NULL, NULL, NULL, '2026-08-06 18:03:43');

-- --------------------------------------------------------

--
-- Table structure for table `salesman_payroll_payments`
--

CREATE TABLE `salesman_payroll_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `period_month` date NOT NULL,
  `payout_sequence` int UNSIGNED NOT NULL DEFAULT '1',
  `payout_kind` enum('regular','commission_top_up') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regular',
  `base_salary_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `salary_proration_days` int UNSIGNED NOT NULL DEFAULT '0',
  `salary_proration_period_days` int UNSIGNED NOT NULL DEFAULT '0',
  `salary_proration_policy` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'calendar_days',
  `commission_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_amount` decimal(18,4) NOT NULL,
  `cash_account_id` bigint UNSIGNED NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_by` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `salesman_salary_rates`
--

CREATE TABLE `salesman_salary_rates` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `monthly_salary` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `effective_from` date NOT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `salesman_salary_rates`
--

INSERT INTO `salesman_salary_rates` (`id`, `store_id`, `salesman_id`, `monthly_salary`, `effective_from`, `created_by`, `created_at`) VALUES
(1, 2, 1, 0.0000, '1900-01-01', NULL, '2026-08-04 19:11:30'),
(3, 2, 2, 0.0000, '2026-08-06', 2, '2026-08-06 18:09:26');

-- --------------------------------------------------------

--
-- Table structure for table `salesman_sublocations`
--

CREATE TABLE `salesman_sublocations` (
  `id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `assigned_at` date NOT NULL,
  `unassigned_at` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `active_assignment_key` tinyint GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'active') then 1 else NULL end)) STORED,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesman_sublocations`
--

INSERT INTO `salesman_sublocations` (`id`, `salesman_id`, `sublocation_id`, `assigned_at`, `unassigned_at`, `status`, `created_at`) VALUES
(1, 1, 1, '2026-07-31', NULL, 'active', '2026-07-31 20:46:10');

-- --------------------------------------------------------

--
-- Table structure for table `salesman_targets`
--

CREATE TABLE `salesman_targets` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `sublocation_target_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `target_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `achieved_sales_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('active','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `active_target_key` tinyint GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'active') then 1 else NULL end)) STORED,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesman_targets`
--

INSERT INTO `salesman_targets` (`id`, `store_id`, `sublocation_target_id`, `salesman_id`, `target_amount`, `achieved_sales_amount`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 2, 1, 1000.0000, 0.0000, 'active', '2026-08-04 18:30:31', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `salesman_target_commission_snapshots`
--

CREATE TABLE `salesman_target_commission_snapshots` (
  `id` bigint UNSIGNED NOT NULL,
  `salesman_target_id` bigint UNSIGNED NOT NULL,
  `commission_rule_id` bigint UNSIGNED DEFAULT NULL,
  `rule_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `below_target_rate` decimal(9,4) NOT NULL DEFAULT '0.0000',
  `at_target_rate` decimal(9,4) NOT NULL DEFAULT '0.0000',
  `above_target_extra_rate` decimal(9,4) NOT NULL DEFAULT '0.0000',
  `captured_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `historical_backfill` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesman_target_commission_snapshots`
--

INSERT INTO `salesman_target_commission_snapshots` (`id`, `salesman_target_id`, `commission_rule_id`, `rule_name`, `below_target_rate`, `at_target_rate`, `above_target_extra_rate`, `captured_at`, `historical_backfill`) VALUES
(1, 1, NULL, 'Historical rule unavailable', 0.0000, 0.0000, 0.0000, '2026-08-04 19:27:48', 1);

-- --------------------------------------------------------

--
-- Table structure for table `salesmen`
--

CREATE TABLE `salesmen` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `national_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_salary` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `commission_rule_id` bigint UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `joined_at` date DEFAULT NULL,
  `employment_end_date` date DEFAULT NULL,
  `employment_end_date_is_estimated` tinyint(1) NOT NULL DEFAULT '0',
  `deactivated_at` datetime DEFAULT NULL,
  `deactivated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesmen`
--

INSERT INTO `salesmen` (`id`, `store_id`, `user_id`, `full_name`, `phone`, `email`, `vehicle_number`, `national_id`, `base_salary`, `commission_rule_id`, `status`, `joined_at`, `employment_end_date`, `employment_end_date_is_estimated`, `deactivated_at`, `deactivated_by`, `created_at`, `updated_at`) VALUES
(1, 2, 3, 'test sales', '123', 'sales@gmail.com', NULL, NULL, 0.0000, NULL, 'active', NULL, NULL, 0, NULL, NULL, '2026-07-31 20:41:45', NULL),
(2, 2, 4, 'bilal saleh', '34534524', 'bial@gmail.com', NULL, NULL, 0.0000, 1, 'active', NULL, NULL, 0, NULL, NULL, '2026-08-06 18:09:26', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sale_catalog_entries`
--

CREATE TABLE `sale_catalog_entries` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `entry_type` enum('normal_carton','normal_weight','normal_piece','ready_outer_carton','ready_inner_unit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_id` bigint UNSIGNED DEFAULT NULL,
  `packaging_group_id` bigint UNSIGNED DEFAULT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_price` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_rate` decimal(9,4) NOT NULL DEFAULT '0.0000',
  `is_pos_active` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `sale_catalog_entries`
--

INSERT INTO `sale_catalog_entries` (`id`, `store_id`, `entry_type`, `item_id`, `packaging_group_id`, `display_name`, `unit_label`, `default_price`, `vat_rate`, `is_pos_active`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 'normal_carton', 2, NULL, 'fahem 5.5 — Carton', 'carton', 15.0000, 0.0000, 1, 'active', 2, '2026-07-31 20:25:28', NULL),
(2, 2, 'ready_inner_unit', NULL, 3, 'carton 6kg 400g — Ready bag', 'bag', 0.0000, 0.0000, 1, 'active', 2, '2026-07-31 20:27:16', '2026-07-31 20:27:22'),
(3, 2, 'ready_outer_carton', NULL, 3, 'carton 6kg 400g — Ready carton', 'carton', 17.0000, 0.0000, 1, 'active', 2, '2026-07-31 20:27:33', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `scheduler_heartbeats`
--

CREATE TABLE `scheduler_heartbeats` (
  `scheduler_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_started_at` datetime NOT NULL,
  `last_succeeded_at` datetime DEFAULT NULL,
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `details` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schema_migrations`
--

CREATE TABLE `schema_migrations` (
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schema_migrations`
--

INSERT INTO `schema_migrations` (`migration_name`, `applied_at`) VALUES
('025_item_based_rebuild.sql', '2026-07-23 20:59:24'),
('026_restrict_owner_platform_permission.sql', '2026-07-23 20:59:24'),
('027_restrict_owner_salesman_workspace.sql', '2026-07-23 20:59:24'),
('028_add_pos_view_permission.sql', '2026-07-23 20:59:24'),
('029_whole_carton_shelf_stock.sql', '2026-07-23 20:59:24'),
('030_pos_delivery_batch_foundation.sql', '2026-08-01 15:31:41'),
('031_delivery_target_credit_ledger.sql', '2026-08-01 15:31:41'),
('032_add_customer_receipt_document_type.sql', '2026-08-01 15:37:37'),
('033_add_customer_acceptance_consent_document_type.sql', '2026-08-01 16:13:14'),
('034_add_delivery_closeout_permission.sql', '2026-08-01 16:15:55'),
('035_rename_dispatched_status_to_delivery.sql', '2026-08-01 16:17:59'),
('036_salesman_commission_rule.sql', '2026-08-01 16:54:40'),
('037_add_dispatch_customer_discounts.sql', '2026-08-03 22:37:43'),
('038_settlement_post_timestamp.sql', '2026-08-04 06:21:39'),
('039_remove_legacy_pending_pos.sql', '2026-08-04 06:45:35'),
('040_target_collection_workflow.sql', '2026-08-04 18:30:05'),
('041_salesman_monthly_payroll.sql', '2026-08-04 18:46:24'),
('042_payroll_integrity_and_salary_history.sql', '2026-08-04 19:12:12'),
('043_finance_commission_resilience.sql', '2026-08-04 19:27:48'),
('044_salesman_lifecycle_and_return_credit_notes.sql', '2026-08-04 19:44:15'),
('045_payroll_proration_metadata.sql', '2026-08-04 19:58:35');

-- --------------------------------------------------------

--
-- Table structure for table `schema_migration_runs`
--

CREATE TABLE `schema_migration_runs` (
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('running','completed','failed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `started_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schema_migration_runs`
--

INSERT INTO `schema_migration_runs` (`migration_name`, `status`, `started_at`, `completed_at`, `error_message`) VALUES
('043_finance_commission_resilience.sql', 'completed', '2026-08-04 22:27:48', '2026-08-04 22:27:48', NULL),
('044_salesman_lifecycle_and_return_credit_notes.sql', 'completed', '2026-08-04 22:44:14', '2026-08-04 22:44:15', NULL),
('045_payroll_proration_metadata.sql', 'completed', '2026-08-04 22:58:35', '2026-08-04 22:58:35', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `stores`
--

CREATE TABLE `stores` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `contact_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `currency_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stores`
--

INSERT INTO `stores` (`id`, `name`, `code`, `slug`, `status`, `contact_name`, `phone`, `email`, `address`, `currency_code`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'Kivaro Template Store', 'KIVARO-TEMPLATE', 'kivaro-template', 'active', NULL, NULL, 'kivaro@gmail.com', NULL, 'USD', 'Template store used to clone system roles, modules, and standard units.', '2026-07-23 20:59:24', '2026-07-31 19:38:25'),
(2, 'test', 'test', 'test', 'active', 'test', '123', 'test@gmail.com', NULL, 'USD', NULL, '2026-07-31 19:39:10', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `store_modules`
--

CREATE TABLE `store_modules` (
  `store_id` bigint UNSIGNED NOT NULL,
  `module_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `store_modules`
--

INSERT INTO `store_modules` (`store_id`, `module_key`, `enabled`, `updated_at`) VALUES
(1, 'accounting', 1, NULL),
(1, 'accounting.cash-accounts', 1, NULL),
(1, 'accounting.expense-categories', 1, NULL),
(1, 'accounting.expenses', 1, NULL),
(1, 'accounting.financial-transactions', 1, NULL),
(1, 'accounting.salesman-balances', 1, NULL),
(1, 'audit_logs', 1, NULL),
(1, 'commissions', 1, NULL),
(1, 'commissions.calculations', 1, NULL),
(1, 'commissions.payroll', 1, NULL),
(1, 'commissions.rules', 1, NULL),
(1, 'customers', 1, NULL),
(1, 'dashboard', 1, NULL),
(1, 'dispatch', 1, NULL),
(1, 'dispatch.requests', 1, NULL),
(1, 'inventory', 1, NULL),
(1, 'inventory.adjustments', 1, NULL),
(1, 'inventory.balances', 1, NULL),
(1, 'inventory.categories', 1, NULL),
(1, 'inventory.items', 1, NULL),
(1, 'inventory.movements', 1, NULL),
(1, 'inventory.packaging', 1, NULL),
(1, 'inventory.units', 1, NULL),
(1, 'inventory.warehouses', 1, NULL),
(1, 'invoices', 1, NULL),
(1, 'locations', 1, NULL),
(1, 'locations.locations', 1, NULL),
(1, 'locations.salesmen', 1, NULL),
(1, 'locations.sublocations', 1, NULL),
(1, 'locations.targets', 1, NULL),
(1, 'notifications', 1, NULL),
(1, 'payments', 1, NULL),
(1, 'payments.customer-credits', 1, NULL),
(1, 'payments.customer-payments', 1, NULL),
(1, 'payments.debts', 1, NULL),
(1, 'payments.receipts', 1, NULL),
(1, 'pos', 1, NULL),
(1, 'purchases', 1, NULL),
(1, 'purchases.orders', 1, NULL),
(1, 'purchases.payments', 1, NULL),
(1, 'purchases.suppliers', 1, NULL),
(1, 'reports', 1, NULL),
(1, 'reports.commissions', 1, NULL),
(1, 'reports.current-stock', 1, NULL),
(1, 'reports.customer-balances', 1, NULL),
(1, 'reports.debts', 1, NULL),
(1, 'reports.dispatch-summary', 1, NULL),
(1, 'reports.gifts', 1, NULL),
(1, 'reports.invoices', 1, NULL),
(1, 'reports.normal-stock', 1, NULL),
(1, 'reports.packaging-operations', 1, NULL),
(1, 'reports.packaging-shortages', 1, NULL),
(1, 'reports.packaging-stock', 1, NULL),
(1, 'reports.pos-orders', 1, NULL),
(1, 'reports.profit-loss', 1, NULL),
(1, 'reports.purchases', 1, NULL),
(1, 'reports.ready-stock', 1, NULL),
(1, 'reports.sales', 1, NULL),
(1, 'reports.salesman-performance', 1, NULL),
(1, 'reports.salesman-target-progress', 1, NULL),
(1, 'reports.stock-movements', 1, NULL),
(1, 'roles', 1, NULL),
(1, 'salesman_workspace', 1, NULL),
(1, 'settings', 1, NULL),
(1, 'users', 1, NULL),
(2, 'accounting', 1, NULL),
(2, 'accounting.cash-accounts', 1, NULL),
(2, 'accounting.expense-categories', 1, NULL),
(2, 'accounting.expenses', 1, NULL),
(2, 'accounting.financial-transactions', 1, NULL),
(2, 'accounting.salesman-balances', 1, NULL),
(2, 'audit_logs', 1, NULL),
(2, 'commissions', 1, NULL),
(2, 'commissions.calculations', 1, NULL),
(2, 'commissions.payroll', 1, NULL),
(2, 'commissions.rules', 1, NULL),
(2, 'customers', 1, NULL),
(2, 'dashboard', 1, NULL),
(2, 'dispatch', 1, NULL),
(2, 'dispatch.requests', 1, NULL),
(2, 'inventory', 1, NULL),
(2, 'inventory.adjustments', 1, NULL),
(2, 'inventory.balances', 1, NULL),
(2, 'inventory.categories', 1, NULL),
(2, 'inventory.items', 1, NULL),
(2, 'inventory.movements', 1, NULL),
(2, 'inventory.packaging', 1, NULL),
(2, 'inventory.units', 1, NULL),
(2, 'inventory.warehouses', 1, NULL),
(2, 'invoices', 1, NULL),
(2, 'locations', 1, NULL),
(2, 'locations.locations', 1, NULL),
(2, 'locations.salesmen', 1, NULL),
(2, 'locations.sublocations', 1, NULL),
(2, 'locations.targets', 1, NULL),
(2, 'notifications', 1, NULL),
(2, 'payments', 1, NULL),
(2, 'payments.customer-credits', 1, NULL),
(2, 'payments.customer-payments', 1, NULL),
(2, 'payments.debts', 1, NULL),
(2, 'payments.receipts', 1, NULL),
(2, 'pos', 1, NULL),
(2, 'purchases', 1, NULL),
(2, 'purchases.orders', 1, NULL),
(2, 'purchases.payments', 1, NULL),
(2, 'purchases.suppliers', 1, NULL),
(2, 'reports', 1, NULL),
(2, 'reports.commissions', 1, NULL),
(2, 'reports.current-stock', 1, NULL),
(2, 'reports.customer-balances', 1, NULL),
(2, 'reports.debts', 1, NULL),
(2, 'reports.dispatch-summary', 1, NULL),
(2, 'reports.gifts', 1, NULL),
(2, 'reports.invoices', 1, NULL),
(2, 'reports.normal-stock', 1, NULL),
(2, 'reports.packaging-operations', 1, NULL),
(2, 'reports.packaging-shortages', 1, NULL),
(2, 'reports.packaging-stock', 1, NULL),
(2, 'reports.pos-orders', 1, NULL),
(2, 'reports.profit-loss', 1, NULL),
(2, 'reports.purchases', 1, NULL),
(2, 'reports.ready-stock', 1, NULL),
(2, 'reports.sales', 1, NULL),
(2, 'reports.salesman-performance', 1, NULL),
(2, 'reports.salesman-target-progress', 1, NULL),
(2, 'reports.stock-movements', 1, NULL),
(2, 'roles', 1, NULL),
(2, 'salesman_workspace', 1, NULL),
(2, 'settings', 1, NULL),
(2, 'users', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sublocations`
--

CREATE TABLE `sublocations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sublocations`
--

INSERT INTO `sublocations` (`id`, `store_id`, `location_id`, `name`, `code`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 'hamra', '12313123', NULL, 'active', 2, '2026-07-31 20:46:05', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sublocation_targets`
--

CREATE TABLE `sublocation_targets` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `location_target_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `target_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','active','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sublocation_targets`
--

INSERT INTO `sublocation_targets` (`id`, `store_id`, `location_target_id`, `sublocation_id`, `target_amount`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 1, 200.0000, 'draft', '2026-08-04 17:31:31', NULL),
(2, 2, 2, 1, 1000.0000, 'active', '2026-08-04 18:30:31', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `contact_person` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `store_id`, `name`, `phone`, `email`, `address`, `contact_person`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 'tarek Aswad', '70629775', 'aswadt12@gmail.com', NULL, NULL, 'active', 2, '2026-08-03 23:10:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `supplier_payments`
--

CREATE TABLE `supplier_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `supplier_id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED DEFAULT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `supplier_payments`
--

INSERT INTO `supplier_payments` (`id`, `store_id`, `supplier_id`, `purchase_order_id`, `cash_account_id`, `payment_date`, `amount`, `payment_method`, `reference_number`, `notes`, `created_by`, `created_at`) VALUES
(1, 2, 1, 1, 1, '2026-08-04', 1000.0000, 'cash', NULL, NULL, 2, '2026-08-03 23:11:42');

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `setting_key` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `value_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `description` text COLLATE utf8mb4_unicode_ci,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `store_id`, `setting_key`, `setting_value`, `value_type`, `description`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, NULL, 'platform.store_url_prefix', 'store', 'string', 'Global URL prefix for store workspaces', NULL, '2026-07-23 20:59:24', NULL),
(2, 1, 'sales.vat.enabled', 'false', 'boolean', 'Enable VAT on new customer sale lines', NULL, '2026-07-23 20:59:24', NULL),
(3, 1, 'sales.vat.rate', '0', 'number', 'VAT percentage applied to new customer sale lines', NULL, '2026-07-23 20:59:24', NULL),
(4, 2, 'sales.vat.enabled', 'false', 'boolean', 'Enable VAT on new customer sale lines', NULL, '2026-07-31 19:39:10', NULL),
(5, 2, 'sales.vat.rate', '0', 'number', 'VAT percentage applied to new customer sale lines', NULL, '2026-07-31 19:39:10', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `target_collection_credits`
--

CREATE TABLE `target_collection_credits` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `salesman_target_id` bigint UNSIGNED DEFAULT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED DEFAULT NULL,
  `source_type` enum('settlement_customer','payment_allocation','return_adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_id` bigint UNSIGNED NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `collection_date` date NOT NULL,
  `original_collection_date` date DEFAULT NULL,
  `is_late_exception` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `target_collection_credits`
--

INSERT INTO `target_collection_credits` (`id`, `store_id`, `salesman_target_id`, `salesman_id`, `sublocation_id`, `dispatch_customer_id`, `source_type`, `source_id`, `amount`, `collection_date`, `original_collection_date`, `is_late_exception`, `notes`, `created_at`) VALUES
(1, 2, 1, 1, 1, 9, 'settlement_customer', 3, 17.0000, '2026-08-05', NULL, 0, 'Delivery settlement SET-20260806205938532-31W5', '2026-08-06 17:59:51'),
(2, 2, 1, 1, 1, 5, 'settlement_customer', 4, 32.0000, '2026-08-05', NULL, 0, 'Delivery settlement SET-20260806210333394-EO1S', '2026-08-06 18:03:43');

-- --------------------------------------------------------

--
-- Table structure for table `target_events`
--

CREATE TABLE `target_events` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `location_target_id` bigint UNSIGNED NOT NULL,
  `salesman_target_id` bigint UNSIGNED DEFAULT NULL,
  `event_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` json DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `target_events`
--

INSERT INTO `target_events` (`id`, `store_id`, `location_target_id`, `salesman_target_id`, `event_type`, `description`, `payload`, `created_by`, `created_at`) VALUES
(1, 2, 2, NULL, 'created', 'Active target bundle created', '{\"sublocation_targets\": [{\"salesman_ids\": [1], \"target_amount\": 1000, \"sublocation_id\": 1}]}', 2, '2026-08-04 18:30:31');

-- --------------------------------------------------------

--
-- Table structure for table `target_notification_events`
--

CREATE TABLE `target_notification_events` (
  `id` bigint UNSIGNED NOT NULL,
  `salesman_target_id` bigint UNSIGNED NOT NULL,
  `milestone` enum('assigned','50','100','above') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `symbol` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_type` enum('weight','quantity','volume','length','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'quantity',
  `base_unit_id` bigint UNSIGNED DEFAULT NULL,
  `conversion_to_base` decimal(18,8) NOT NULL DEFAULT '1.00000000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`id`, `store_id`, `name`, `symbol`, `unit_type`, `base_unit_id`, `conversion_to_base`, `created_at`) VALUES
(1, 1, 'Kilogram', 'kg', 'weight', NULL, 1.00000000, '2026-07-23 20:59:24'),
(2, 1, 'Piece', 'pc', 'quantity', NULL, 1.00000000, '2026-07-23 20:59:24'),
(3, 1, 'Gram', 'g', 'weight', 1, 0.00100000, '2026-07-23 20:59:24'),
(4, 1, 'Ton', 'ton', 'weight', 1, 1000.00000000, '2026-07-23 20:59:24'),
(5, 2, 'Kilogram', 'kg', 'weight', NULL, 1.00000000, '2026-07-31 19:39:10'),
(6, 2, 'Piece', 'pc', 'quantity', NULL, 1.00000000, '2026-07-31 19:39:10'),
(7, 2, 'Gram', 'g', 'weight', 5, 0.00100000, '2026-07-31 19:39:10'),
(8, 2, 'Ton', 'ton', 'weight', 5, 1000.00000000, '2026-07-31 19:39:10');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `store_id`, `role_id`, `full_name`, `username`, `email`, `phone`, `password_hash`, `status`, `last_login_at`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, NULL, 7, 'Super Admin', 'superadmin', 'superadmin@example.com', NULL, '$2a$12$7joJ6GBeg/q8aPhk0HqW0edS0SqAVOvDpcNQzZsbdOuBy/0Offj3S', 'active', '2026-08-06 21:13:21', NULL, '2026-07-24 01:21:02', '2026-08-06 18:13:21'),
(2, 2, 8, 'test', 'test@example.com', NULL, NULL, '$2a$12$/ZhSeoVAbPraIyA5MX71p.xf6qWkWV83zCX64jc/tmIvUcbCx1sNm', 'active', NULL, NULL, '2026-07-31 19:39:11', NULL),
(3, 2, 12, 'test sales', 'sales', 'sales@gmail.com', '123', '$2a$12$MAoLDEh9ALYYx/7yynALcOMcCFkLzZ7rC54lf5b5Jyxnoa1XzNgJG', 'active', '2026-07-31 23:46:19', NULL, '2026-07-31 20:41:45', '2026-08-03 22:53:17'),
(4, 2, 12, 'bilal saleh', 'bilal', 'bial@gmail.com', '34534524', '$2a$12$lkZJ/FWUeNZyofOWxxCuG.YdXVNQMcCT8a2AfvpoQ0xZumcdjs55W', 'active', '2026-08-06 21:12:14', NULL, '2026-08-06 18:09:26', '2026-08-06 18:12:14');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_sessions`
--

INSERT INTO `user_sessions` (`id`, `user_id`, `token_hash`, `ip_address`, `user_agent`, `expires_at`, `revoked_at`, `created_at`) VALUES
(1, 1, '60576dbaff2118865900bd83bcaf39b4df7a7c0be84283c81e91233d06f1ca6d', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 22:38:02', NULL, '2026-07-31 19:38:02'),
(2, 2, '14a6637ae47cc76609b54e09a262a37635c92af7e87f494f30c174c9f823ea1d', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 22:39:14', '2026-07-31 23:41:51', '2026-07-31 19:39:14'),
(3, 3, '683cc7fe0e078b2951c705885af18f9118039557a700b90d351d14484221b2aa', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 23:41:53', '2026-07-31 23:45:32', '2026-07-31 20:41:53'),
(4, 1, '660315849b392c2b4616c04121b015c9d7f4f38e5f2f09e1702a21203208a26b', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 23:45:41', NULL, '2026-07-31 20:45:41'),
(5, 2, '6745555210b9d2952722ec01e7cb674d590d118f07404e447e9a5671ee338150', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 23:45:46', '2026-07-31 23:46:16', '2026-07-31 20:45:46'),
(6, 3, '999bb9777ae96507a458d2dbc329c494e8d67b98d8c00509752c3c6b53e5ceae', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 23:46:19', '2026-07-31 23:46:54', '2026-07-31 20:46:19'),
(7, 1, '8be59531fa5bd00769fe49e0c03c110393695cef0b0406f79f5c3eca4aab5a7b', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 23:46:59', NULL, '2026-07-31 20:46:59'),
(8, 2, 'f68e4e6673fbe8b83cb57cdf0ca65c3e56350005a1e00c331b31ec851381a737', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-01 23:47:03', NULL, '2026-07-31 20:47:03'),
(9, 1, 'c1005970a39cd2d38ffdab37584fdcce24601bdfa8122ddd28476a66dab5822c', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-05 00:56:59', NULL, '2026-08-03 21:56:59'),
(10, 2, '07dc796391dc374d399f062f740621e2386ef549aa631e73798f84116e8ec9ef', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-05 00:57:09', NULL, '2026-08-03 21:57:09'),
(11, 1, '1b3ab900b48466b6901c9607064e51df376c17544cd37eae363b20cef127a566', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-07 20:40:05', NULL, '2026-08-06 17:40:05'),
(12, 2, 'f38b0497221c4c3a20794523b1096ce534d74bc28458ba74d18d0797079bfd7e', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-07 20:40:12', '2026-08-06 21:11:58', '2026-08-06 17:40:12'),
(13, 4, '43dd2d1b64ed260ca51d07971c718d77e065d4248b462ca131a5504aebf339ee', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-07 21:12:14', '2026-08-06 21:13:18', '2026-08-06 18:12:14'),
(14, 1, '87afaf4317c0e717159def1309a07b50ac73601aa9dcd0f55dbe78cb39a5f074', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-07 21:13:21', NULL, '2026-08-06 18:13:21'),
(15, 2, '50d421a4df4ef3222352caf84b82f775826d15d8e5ab61c3192f86f1b1cb4690', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-07 21:13:31', NULL, '2026-08-06 18:13:31');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_current_stock`
-- (See below for the actual view)
--
CREATE TABLE `v_current_stock` (
`stock_balance_id` bigint unsigned
,`store_id` bigint unsigned
,`warehouse_id` bigint unsigned
,`warehouse_name` varchar(150)
,`item_id` bigint unsigned
,`item_name` varchar(150)
,`item_kind` enum('normal','packaging')
,`stock_mode` enum('carton','weight','piece')
,`unit_symbol` varchar(30)
,`quantity_on_hand` decimal(18,4)
,`quantity_reserved` decimal(18,4)
,`quantity_available` decimal(19,4)
,`average_cost` decimal(18,4)
,`stock_value` decimal(36,8)
,`stock_health` varchar(7)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_customer_balances`
-- (See below for the actual view)
--
CREATE TABLE `v_customer_balances` (
`customer_id` bigint unsigned
,`store_id` bigint unsigned
,`customer_name` varchar(150)
,`location_name` varchar(150)
,`sublocation_name` varchar(150)
,`total_debt_subtotal` decimal(40,4)
,`total_debt_vat` decimal(40,4)
,`total_debt_created` decimal(40,4)
,`total_debt_paid` decimal(40,4)
,`total_remaining_debt` decimal(40,4)
,`available_credit` decimal(40,4)
,`net_customer_balance` decimal(41,4)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_dispatch_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_dispatch_summary` (
`dispatch_request_id` bigint unsigned
,`store_id` bigint unsigned
,`dispatch_number` varchar(100)
,`request_date` date
,`status` enum('draft','pending_approval','approved','delivery','partially_settled','completed','cancelled')
,`revision` int unsigned
,`salesman_name` varchar(150)
,`warehouse_name` varchar(150)
,`customers_count` bigint
,`total_quantity` decimal(18,4)
,`subtotal_amount` decimal(18,4)
,`vat_amount` decimal(18,4)
,`total_amount` decimal(18,4)
,`total_collected` decimal(18,4)
,`total_debt` decimal(18,4)
,`gift_cogs` decimal(40,4)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_ready_stock`
-- (See below for the actual view)
--
CREATE TABLE `v_ready_stock` (
`ready_stock_container_id` bigint unsigned
,`store_id` bigint unsigned
,`warehouse_id` bigint unsigned
,`packaging_group_id` bigint unsigned
,`packaging_group_name` varchar(150)
,`outer_item_id` bigint unsigned
,`inner_item_id` bigint unsigned
,`outer_name_snapshot` varchar(255)
,`inner_name_snapshot` varchar(255)
,`initial_inner_quantity` int unsigned
,`remaining_inner_quantity` int unsigned
,`reserved_inner_quantity` int unsigned
,`available_inner_quantity` bigint unsigned
,`capacity_kg` decimal(18,4)
,`remaining_cost` decimal(18,4)
,`status` enum('full','partial','depleted','cancelled')
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_salesman_target_progress`
-- (See below for the actual view)
--
CREATE TABLE `v_salesman_target_progress` (
`salesman_target_id` bigint unsigned
,`store_id` bigint unsigned
,`salesman_id` bigint unsigned
,`salesman_name` varchar(150)
,`base_salary` decimal(18,4)
,`location_id` bigint unsigned
,`location_name` varchar(150)
,`sublocation_id` bigint unsigned
,`sublocation_name` varchar(150)
,`target_period` enum('daily','weekly','monthly','quarterly','yearly')
,`period_start` date
,`period_end` date
,`target_amount` decimal(18,4)
,`achieved_sales_amount` decimal(40,4)
,`achievement_percentage` decimal(46,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` bigint UNSIGNED DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `store_id`, `name`, `code`, `location_id`, `address`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 'jadra', '1', NULL, NULL, 'active', '2026-07-31 19:39:51', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_store_created` (`store_id`,`created_at`),
  ADD KEY `idx_audit_logs_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_audit_logs_record` (`table_name`,`record_id`);

--
-- Indexes for table `carton_stock_lots`
--
ALTER TABLE `carton_stock_lots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_carton_stock_lots_fifo` (`warehouse_id`,`item_id`,`received_at`,`id`),
  ADD KEY `idx_carton_stock_lots_store_item` (`store_id`,`item_id`),
  ADD KEY `fk_carton_stock_lots_item` (`item_id`),
  ADD KEY `fk_carton_stock_lots_created_by` (`created_by`);

--
-- Indexes for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cash_accounts_store_name` (`store_id`,`account_name`),
  ADD KEY `idx_cash_accounts_store_status` (`store_id`,`status`);

--
-- Indexes for table `commission_calculations`
--
ALTER TABLE `commission_calculations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_commission_calculations_target_status` (`salesman_target_id`,`status`),
  ADD KEY `fk_commission_calculations_store` (`store_id`),
  ADD KEY `fk_commission_calculations_rule` (`commission_rule_id`),
  ADD KEY `fk_commission_calculations_salesman` (`salesman_id`),
  ADD KEY `fk_commission_calculations_sublocation` (`sublocation_id`),
  ADD KEY `fk_commission_calculations_approved_by` (`approved_by`);

--
-- Indexes for table `commission_payments`
--
ALTER TABLE `commission_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_commission_payments_calculation` (`commission_calculation_id`),
  ADD KEY `idx_commission_payments_cash_account` (`cash_account_id`),
  ADD KEY `fk_commission_payments_store` (`store_id`),
  ADD KEY `fk_commission_payments_salesman` (`salesman_id`),
  ADD KEY `fk_commission_payments_paid_by` (`paid_by`),
  ADD KEY `idx_commission_payments_payroll` (`payroll_payment_id`);

--
-- Indexes for table `commission_rules`
--
ALTER TABLE `commission_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_commission_rules_store_status` (`store_id`,`status`),
  ADD KEY `fk_commission_rules_created_by` (`created_by`);

--
-- Indexes for table `company_profiles`
--
ALTER TABLE `company_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_company_profiles_store` (`store_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customers_store_code` (`store_id`,`customer_code`),
  ADD KEY `idx_customers_store_salesman` (`store_id`,`assigned_salesman_id`),
  ADD KEY `idx_customers_location` (`location_id`,`sublocation_id`),
  ADD KEY `fk_customers_sublocation` (`sublocation_id`),
  ADD KEY `fk_customers_salesman` (`assigned_salesman_id`),
  ADD KEY `fk_customers_created_by` (`created_by`);

--
-- Indexes for table `customer_credits`
--
ALTER TABLE `customer_credits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_credits_store_number` (`store_id`,`credit_number`),
  ADD KEY `idx_customer_credits_customer_status` (`customer_id`,`status`),
  ADD KEY `fk_customer_credits_created_by` (`created_by`);

--
-- Indexes for table `customer_debts`
--
ALTER TABLE `customer_debts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_debts_store_number` (`store_id`,`debt_number`),
  ADD KEY `idx_customer_debts_status_balance` (`store_id`,`customer_id`,`status`,`remaining_amount`),
  ADD KEY `fk_customer_debts_customer` (`customer_id`),
  ADD KEY `fk_customer_debts_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_customer_debts_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_customer_debts_created_by` (`created_by`);

--
-- Indexes for table `customer_debt_adjustments`
--
ALTER TABLE `customer_debt_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_debt_adjustments_debt` (`customer_debt_id`),
  ADD KEY `fk_customer_debt_adjustments_store` (`store_id`),
  ADD KEY `fk_customer_debt_adjustments_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_customer_debt_adjustments_created_by` (`created_by`);

--
-- Indexes for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_payments_store_number` (`store_id`,`payment_number`),
  ADD KEY `idx_customer_payments_customer_date` (`customer_id`,`payment_date`),
  ADD KEY `idx_customer_payments_cash_account` (`cash_account_id`),
  ADD KEY `idx_customer_payments_collector` (`collected_by_salesman_id`,`payment_date`),
  ADD KEY `fk_customer_payments_created_by` (`created_by`);

--
-- Indexes for table `customer_payment_allocations`
--
ALTER TABLE `customer_payment_allocations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_payment_allocations_pair` (`customer_payment_id`,`customer_debt_id`),
  ADD KEY `idx_customer_payment_allocations_debt` (`customer_debt_id`);

--
-- Indexes for table `customer_receipts`
--
ALTER TABLE `customer_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_receipts_store_number` (`store_id`,`receipt_number`),
  ADD KEY `idx_customer_receipts_customer_date` (`customer_id`,`receipt_date`),
  ADD KEY `fk_customer_receipts_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_customer_receipts_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_customer_receipts_payment` (`customer_payment_id`),
  ADD KEY `fk_customer_receipts_created_by` (`created_by`);

--
-- Indexes for table `delivery_target_credits`
--
ALTER TABLE `delivery_target_credits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_delivery_target_credits_salesman_date` (`store_id`,`salesman_id`,`status`,`reference_date`),
  ADD KEY `idx_delivery_target_credits_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_delivery_target_credits_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_delivery_target_credits_salesman` (`salesman_id`),
  ADD KEY `fk_delivery_target_credits_customer` (`customer_id`);

--
-- Indexes for table `dispatch_customers`
--
ALTER TABLE `dispatch_customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dispatch_customers_dispatch_customer` (`dispatch_request_id`,`customer_id`),
  ADD KEY `idx_dispatch_customers_store_customer` (`store_id`,`customer_id`),
  ADD KEY `fk_dispatch_customers_customer` (`customer_id`),
  ADD KEY `fk_dispatch_customers_location` (`location_id`),
  ADD KEY `fk_dispatch_customers_sublocation` (`sublocation_id`),
  ADD KEY `idx_dispatch_customers_fulfillment` (`store_id`,`fulfillment_status`);

--
-- Indexes for table `dispatch_document_generations`
--
ALTER TABLE `dispatch_document_generations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dispatch_document_generations_gate` (`dispatch_request_id`,`revision`,`document_type`),
  ADD KEY `idx_dispatch_document_generations_invoice` (`invoice_id`),
  ADD KEY `fk_dispatch_document_generations_store` (`store_id`),
  ADD KEY `fk_dispatch_document_generations_customer` (`dispatch_customer_id`),
  ADD KEY `fk_dispatch_document_generations_generated_by` (`generated_by`);

--
-- Indexes for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dispatch_items_request` (`dispatch_request_id`),
  ADD KEY `idx_dispatch_items_catalog` (`sale_catalog_entry_id`),
  ADD KEY `idx_dispatch_items_item` (`item_id`),
  ADD KEY `idx_dispatch_items_group` (`packaging_group_id`),
  ADD KEY `fk_dispatch_items_store` (`store_id`),
  ADD KEY `fk_dispatch_items_customer` (`dispatch_customer_id`);

--
-- Indexes for table `dispatch_line_allocations`
--
ALTER TABLE `dispatch_line_allocations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dispatch_line_allocations_line` (`dispatch_item_id`,`status`),
  ADD KEY `idx_dispatch_line_allocations_lot` (`carton_stock_lot_id`),
  ADD KEY `idx_dispatch_line_allocations_container` (`ready_stock_container_id`),
  ADD KEY `idx_dispatch_line_allocations_ready_shelf` (`ready_shelf_stock_id`),
  ADD KEY `fk_dispatch_line_allocations_store` (`store_id`),
  ADD KEY `fk_dispatch_line_allocations_warehouse` (`warehouse_id`),
  ADD KEY `fk_dispatch_line_allocations_catalog_item` (`item_id`);

--
-- Indexes for table `dispatch_requests`
--
ALTER TABLE `dispatch_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dispatch_requests_store_number` (`store_id`,`dispatch_number`),
  ADD KEY `idx_dispatch_requests_store_status_date` (`store_id`,`status`,`request_date`),
  ADD KEY `idx_dispatch_requests_salesman` (`salesman_id`),
  ADD KEY `fk_dispatch_requests_warehouse` (`warehouse_id`),
  ADD KEY `fk_dispatch_requests_submitted_by` (`submitted_by`),
  ADD KEY `fk_dispatch_requests_approved_by` (`approved_by`),
  ADD KEY `fk_dispatch_requests_dispatched_by` (`dispatched_by`),
  ADD KEY `fk_dispatch_requests_completed_by` (`completed_by`),
  ADD KEY `fk_dispatch_requests_cancelled_by` (`cancelled_by`),
  ADD KEY `idx_dispatch_requests_origin` (`store_id`,`origin`),
  ADD KEY `idx_dispatch_requests_lifecycle` (`store_id`,`lifecycle_status`);

--
-- Indexes for table `dispatch_returns`
--
ALTER TABLE `dispatch_returns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dispatch_returns_dispatch_item` (`dispatch_item_id`),
  ADD KEY `fk_dispatch_returns_store` (`store_id`),
  ADD KEY `fk_dispatch_returns_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_dispatch_returns_created_by` (`created_by`);

--
-- Indexes for table `dispatch_return_credit_notes`
--
ALTER TABLE `dispatch_return_credit_notes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_return_credit_note_return` (`dispatch_return_id`),
  ADD UNIQUE KEY `uq_return_credit_note_number` (`store_id`,`credit_note_number`),
  ADD KEY `idx_return_credit_note_date` (`store_id`,`credit_note_date`),
  ADD KEY `fk_return_credit_note_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_return_credit_note_customer_line` (`dispatch_customer_id`),
  ADD KEY `fk_return_credit_note_invoice` (`invoice_id`),
  ADD KEY `fk_return_credit_note_customer` (`customer_id`),
  ADD KEY `fk_return_credit_note_created_by` (`created_by`);

--
-- Indexes for table `dispatch_settlements`
--
ALTER TABLE `dispatch_settlements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dispatch_settlements_store_number` (`store_id`,`settlement_number`),
  ADD KEY `idx_dispatch_settlements_dispatch_status` (`dispatch_request_id`,`status`),
  ADD KEY `idx_dispatch_settlements_cash_account` (`cash_account_id`),
  ADD KEY `fk_dispatch_settlements_settled_by` (`settled_by`);

--
-- Indexes for table `dispatch_settlement_customers`
--
ALTER TABLE `dispatch_settlement_customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dispatch_settlement_customers_customer` (`dispatch_settlement_id`,`dispatch_customer_id`),
  ADD KEY `idx_dispatch_settlement_customers_customer` (`customer_id`),
  ADD KEY `fk_dispatch_settlement_customers_dispatch_customer` (`dispatch_customer_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_expenses_store_date` (`store_id`,`expense_date`),
  ADD KEY `idx_expenses_store_status` (`store_id`,`status`),
  ADD KEY `idx_expenses_cash_account` (`cash_account_id`),
  ADD KEY `fk_expenses_category` (`expense_category_id`),
  ADD KEY `fk_expenses_voided_by` (`voided_by`),
  ADD KEY `fk_expenses_created_by` (`created_by`);

--
-- Indexes for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_expense_categories_store_name` (`store_id`,`name`);

--
-- Indexes for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_financial_transactions_store_date` (`store_id`,`transaction_date`),
  ADD KEY `idx_financial_transactions_cash_account` (`cash_account_id`),
  ADD KEY `idx_financial_transactions_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_financial_transactions_created_by` (`created_by`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_invoices_store_number` (`store_id`,`invoice_number`),
  ADD UNIQUE KEY `uq_invoices_customer_revision` (`dispatch_customer_id`,`revision`),
  ADD KEY `idx_invoices_dispatch_status` (`dispatch_request_id`,`status`),
  ADD KEY `fk_invoices_voided_by` (`voided_by`),
  ADD KEY `fk_invoices_created_by` (`created_by`);

--
-- Indexes for table `invoice_lines`
--
ALTER TABLE `invoice_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoice_lines_dispatch_item` (`dispatch_item_id`),
  ADD KEY `fk_invoice_lines_invoice` (`invoice_id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_items_store_code` (`store_id`,`code`),
  ADD KEY `idx_items_store_kind_status` (`store_id`,`item_kind`,`status`),
  ADD KEY `idx_items_category` (`category_id`),
  ADD KEY `idx_items_base_unit` (`base_unit_id`),
  ADD KEY `fk_items_created_by` (`created_by`);

--
-- Indexes for table `item_categories`
--
ALTER TABLE `item_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_categories_store_code` (`store_id`,`code`),
  ADD KEY `idx_item_categories_parent` (`parent_id`);

--
-- Indexes for table `item_stock_balances`
--
ALTER TABLE `item_stock_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_stock_warehouse_item` (`warehouse_id`,`item_id`),
  ADD KEY `idx_item_stock_store_item` (`store_id`,`item_id`),
  ADD KEY `fk_item_stock_item` (`item_id`);

--
-- Indexes for table `item_stock_movements`
--
ALTER TABLE `item_stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_item_stock_movements_store_created` (`store_id`,`created_at`),
  ADD KEY `idx_item_stock_movements_item_created` (`item_id`,`created_at`),
  ADD KEY `idx_item_stock_movements_reference` (`reference_type`,`reference_id`),
  ADD KEY `idx_item_stock_movements_lot` (`carton_stock_lot_id`),
  ADD KEY `fk_item_stock_movements_warehouse` (`warehouse_id`),
  ADD KEY `fk_item_stock_movements_created_by` (`created_by`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_locations_store_code` (`store_id`,`code`),
  ADD KEY `idx_locations_store_status` (`store_id`,`status`),
  ADD KEY `fk_locations_created_by` (`created_by`);

--
-- Indexes for table `location_targets`
--
ALTER TABLE `location_targets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_location_targets_store_period` (`store_id`,`period_start`,`period_end`),
  ADD KEY `fk_location_targets_location` (`location_id`),
  ADD KEY `fk_location_targets_created_by` (`created_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_store_user_created` (`store_id`,`user_id`,`created_at`),
  ADD KEY `fk_notifications_user` (`user_id`);

--
-- Indexes for table `packaging_groups`
--
ALTER TABLE `packaging_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_packaging_groups_store_code` (`store_id`,`code`),
  ADD KEY `idx_packaging_groups_store_status` (`store_id`,`status`),
  ADD KEY `idx_packaging_groups_input_item` (`input_item_id`),
  ADD KEY `fk_packaging_groups_default_warehouse` (`default_warehouse_id`),
  ADD KEY `fk_packaging_groups_created_by` (`created_by`);

--
-- Indexes for table `packaging_group_components`
--
ALTER TABLE `packaging_group_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_packaging_group_components_group_role` (`packaging_group_id`,`component_role`,`sort_order`),
  ADD KEY `idx_packaging_group_components_item` (`item_id`),
  ADD KEY `fk_packaging_group_components_store` (`store_id`);

--
-- Indexes for table `packaging_operations`
--
ALTER TABLE `packaging_operations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_packaging_operations_store_number` (`store_id`,`operation_number`),
  ADD KEY `idx_packaging_operations_group_created` (`packaging_group_id`,`created_at`),
  ADD KEY `idx_packaging_operations_warehouse_created` (`warehouse_id`,`created_at`),
  ADD KEY `fk_packaging_operations_input_item` (`input_item_id`),
  ADD KEY `fk_packaging_operations_completed_by` (`completed_by`);

--
-- Indexes for table `packaging_operation_components`
--
ALTER TABLE `packaging_operation_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_packaging_operation_components_operation` (`packaging_operation_id`),
  ADD KEY `idx_packaging_operation_components_item` (`item_id`);

--
-- Indexes for table `packaging_shelf_remainders`
--
ALTER TABLE `packaging_shelf_remainders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_packaging_shelf_remainders_available` (`warehouse_id`,`packaging_group_id`,`input_item_id`,`created_at`),
  ADD KEY `fk_packaging_shelf_remainders_store` (`store_id`),
  ADD KEY `fk_packaging_shelf_remainders_operation` (`packaging_operation_id`),
  ADD KEY `fk_packaging_shelf_remainders_group` (`packaging_group_id`),
  ADD KEY `fk_packaging_shelf_remainders_input` (`input_item_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_permissions_key` (`permission_key`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_purchase_orders_store_number` (`store_id`,`po_number`),
  ADD KEY `idx_purchase_orders_supplier` (`supplier_id`),
  ADD KEY `idx_purchase_orders_warehouse` (`warehouse_id`),
  ADD KEY `idx_purchase_orders_cash_account` (`cash_account_id`),
  ADD KEY `fk_purchase_orders_created_by` (`created_by`),
  ADD KEY `fk_purchase_orders_approved_by` (`approved_by`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_purchase_order_items_item` (`item_id`),
  ADD KEY `fk_purchase_order_items_order` (`purchase_order_id`);

--
-- Indexes for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_purchase_receipts_store_number` (`store_id`,`receipt_number`),
  ADD KEY `idx_purchase_receipts_order` (`purchase_order_id`),
  ADD KEY `fk_purchase_receipts_received_by` (`received_by`);

--
-- Indexes for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_purchase_receipt_items_item` (`item_id`),
  ADD KEY `fk_purchase_receipt_items_receipt` (`purchase_receipt_id`),
  ADD KEY `fk_purchase_receipt_items_order_item` (`purchase_order_item_id`);

--
-- Indexes for table `ready_shelf_stocks`
--
ALTER TABLE `ready_shelf_stocks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ready_shelf_stocks_available` (`warehouse_id`,`packaging_group_id`,`input_item_id`,`packaging_item_id`,`state`),
  ADD KEY `fk_ready_shelf_stocks_store` (`store_id`),
  ADD KEY `fk_ready_shelf_stocks_operation` (`packaging_operation_id`),
  ADD KEY `fk_ready_shelf_stocks_group` (`packaging_group_id`),
  ADD KEY `fk_ready_shelf_stocks_input` (`input_item_id`),
  ADD KEY `fk_ready_shelf_stocks_packaging` (`packaging_item_id`);

--
-- Indexes for table `ready_shelf_stock_movements`
--
ALTER TABLE `ready_shelf_stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ready_shelf_stock_movements_stock_created` (`ready_shelf_stock_id`,`created_at`),
  ADD KEY `fk_ready_shelf_stock_movements_store` (`store_id`),
  ADD KEY `fk_ready_shelf_stock_movements_warehouse` (`warehouse_id`),
  ADD KEY `fk_ready_shelf_stock_movements_user` (`created_by`);

--
-- Indexes for table `ready_stock_containers`
--
ALTER TABLE `ready_stock_containers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ready_stock_containers_available` (`warehouse_id`,`packaging_group_id`,`status`,`created_at`),
  ADD KEY `idx_ready_stock_containers_operation` (`packaging_operation_id`),
  ADD KEY `fk_ready_stock_containers_store` (`store_id`),
  ADD KEY `fk_ready_stock_containers_group` (`packaging_group_id`),
  ADD KEY `fk_ready_stock_containers_outer_item` (`outer_item_id`),
  ADD KEY `fk_ready_stock_containers_inner_item` (`inner_item_id`);

--
-- Indexes for table `ready_stock_movements`
--
ALTER TABLE `ready_stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ready_stock_movements_container_created` (`ready_stock_container_id`,`created_at`),
  ADD KEY `idx_ready_stock_movements_store_created` (`store_id`,`created_at`),
  ADD KEY `idx_ready_stock_movements_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_ready_stock_movements_warehouse` (`warehouse_id`),
  ADD KEY `fk_ready_stock_movements_created_by` (`created_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_roles_store_name` (`store_id`,`name`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_role_permissions_permission` (`permission_id`);

--
-- Indexes for table `salesman_balances`
--
ALTER TABLE `salesman_balances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_salesman_balances_status` (`store_id`,`salesman_id`,`status`),
  ADD KEY `fk_salesman_balances_salesman` (`salesman_id`),
  ADD KEY `fk_salesman_balances_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_salesman_balances_closed_by` (`closed_by`);

--
-- Indexes for table `salesman_payroll_payments`
--
ALTER TABLE `salesman_payroll_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salesman_payroll_payout` (`salesman_id`,`period_month`,`payout_sequence`),
  ADD KEY `idx_salesman_payroll_store_month` (`store_id`,`period_month`),
  ADD KEY `fk_salesman_payroll_cash_account` (`cash_account_id`),
  ADD KEY `fk_salesman_payroll_paid_by` (`paid_by`),
  ADD KEY `idx_salesman_payroll_salesman` (`salesman_id`),
  ADD KEY `idx_salesman_payroll_kind` (`store_id`,`period_month`,`payout_kind`);

--
-- Indexes for table `salesman_salary_rates`
--
ALTER TABLE `salesman_salary_rates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salesman_salary_rate_effective` (`salesman_id`,`effective_from`),
  ADD KEY `idx_salesman_salary_rate_lookup` (`store_id`,`salesman_id`,`effective_from`),
  ADD KEY `fk_salary_rate_created_by` (`created_by`);

--
-- Indexes for table `salesman_sublocations`
--
ALTER TABLE `salesman_sublocations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salesman_sublocation_active` (`salesman_id`,`sublocation_id`,`active_assignment_key`),
  ADD KEY `idx_salesman_sublocations_sublocation` (`sublocation_id`);

--
-- Indexes for table `salesman_targets`
--
ALTER TABLE `salesman_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salesman_targets_active` (`sublocation_target_id`,`salesman_id`,`active_target_key`),
  ADD KEY `idx_salesman_targets_salesman` (`salesman_id`),
  ADD KEY `fk_salesman_targets_store` (`store_id`);

--
-- Indexes for table `salesman_target_commission_snapshots`
--
ALTER TABLE `salesman_target_commission_snapshots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_target_commission_snapshot` (`salesman_target_id`),
  ADD KEY `idx_target_commission_snapshot_rule` (`commission_rule_id`);

--
-- Indexes for table `salesmen`
--
ALTER TABLE `salesmen`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salesmen_user` (`user_id`),
  ADD KEY `idx_salesmen_store_status` (`store_id`,`status`),
  ADD KEY `idx_salesmen_commission_rule` (`commission_rule_id`),
  ADD KEY `fk_salesmen_deactivated_by` (`deactivated_by`);

--
-- Indexes for table `sale_catalog_entries`
--
ALTER TABLE `sale_catalog_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sale_catalog_entries_store_pos` (`store_id`,`is_pos_active`,`status`),
  ADD KEY `idx_sale_catalog_entries_item` (`item_id`),
  ADD KEY `idx_sale_catalog_entries_group` (`packaging_group_id`),
  ADD KEY `fk_sale_catalog_entries_created_by` (`created_by`);

--
-- Indexes for table `scheduler_heartbeats`
--
ALTER TABLE `scheduler_heartbeats`
  ADD PRIMARY KEY (`scheduler_name`);

--
-- Indexes for table `schema_migrations`
--
ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`migration_name`);

--
-- Indexes for table `schema_migration_runs`
--
ALTER TABLE `schema_migration_runs`
  ADD PRIMARY KEY (`migration_name`);

--
-- Indexes for table `stores`
--
ALTER TABLE `stores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_stores_code` (`code`),
  ADD UNIQUE KEY `uq_stores_slug` (`slug`);

--
-- Indexes for table `store_modules`
--
ALTER TABLE `store_modules`
  ADD PRIMARY KEY (`store_id`,`module_key`);

--
-- Indexes for table `sublocations`
--
ALTER TABLE `sublocations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sublocations_store_code` (`store_id`,`code`),
  ADD KEY `idx_sublocations_location` (`location_id`),
  ADD KEY `fk_sublocations_created_by` (`created_by`);

--
-- Indexes for table `sublocation_targets`
--
ALTER TABLE `sublocation_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sublocation_targets_target_sublocation` (`location_target_id`,`sublocation_id`),
  ADD KEY `fk_sublocation_targets_store` (`store_id`),
  ADD KEY `fk_sublocation_targets_sublocation` (`sublocation_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_suppliers_store_status` (`store_id`,`status`),
  ADD KEY `fk_suppliers_created_by` (`created_by`);

--
-- Indexes for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_supplier_payments_po` (`purchase_order_id`,`payment_date`),
  ADD KEY `idx_supplier_payments_cash_account` (`cash_account_id`),
  ADD KEY `fk_supplier_payments_store` (`store_id`),
  ADD KEY `fk_supplier_payments_supplier` (`supplier_id`),
  ADD KEY `fk_supplier_payments_created_by` (`created_by`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_system_settings_store_key` (`store_id`,`setting_key`),
  ADD KEY `idx_system_settings_updated_by` (`updated_by`);

--
-- Indexes for table `target_collection_credits`
--
ALTER TABLE `target_collection_credits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_target_collection_source` (`source_type`,`source_id`),
  ADD KEY `idx_target_collection_target_date` (`salesman_target_id`,`collection_date`),
  ADD KEY `idx_target_collection_salesman_date` (`store_id`,`salesman_id`,`sublocation_id`,`collection_date`),
  ADD KEY `fk_target_collection_salesman` (`salesman_id`),
  ADD KEY `fk_target_collection_sublocation` (`sublocation_id`),
  ADD KEY `fk_target_collection_dispatch_customer` (`dispatch_customer_id`);

--
-- Indexes for table `target_events`
--
ALTER TABLE `target_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_target_events_target_created` (`location_target_id`,`created_at`),
  ADD KEY `fk_target_events_store` (`store_id`),
  ADD KEY `fk_target_events_salesman_target` (`salesman_target_id`),
  ADD KEY `fk_target_events_user` (`created_by`);

--
-- Indexes for table `target_notification_events`
--
ALTER TABLE `target_notification_events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_target_notification_milestone` (`salesman_target_id`,`milestone`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_units_store_symbol` (`store_id`,`symbol`),
  ADD KEY `idx_units_base_unit` (`base_unit_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_store_username` (`store_id`,`username`),
  ADD UNIQUE KEY `uq_users_store_email` (`store_id`,`email`),
  ADD KEY `idx_users_role` (`role_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_sessions_user_expiry` (`user_id`,`expires_at`),
  ADD KEY `idx_user_sessions_token_hash` (`token_hash`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_warehouses_store_code` (`store_id`,`code`),
  ADD KEY `idx_warehouses_location` (`location_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=125;

--
-- AUTO_INCREMENT for table `carton_stock_lots`
--
ALTER TABLE `carton_stock_lots`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `commission_calculations`
--
ALTER TABLE `commission_calculations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `commission_payments`
--
ALTER TABLE `commission_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `commission_rules`
--
ALTER TABLE `commission_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `company_profiles`
--
ALTER TABLE `company_profiles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `customer_credits`
--
ALTER TABLE `customer_credits`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_debts`
--
ALTER TABLE `customer_debts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_debt_adjustments`
--
ALTER TABLE `customer_debt_adjustments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_payments`
--
ALTER TABLE `customer_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_payment_allocations`
--
ALTER TABLE `customer_payment_allocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_receipts`
--
ALTER TABLE `customer_receipts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `delivery_target_credits`
--
ALTER TABLE `delivery_target_credits`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `dispatch_customers`
--
ALTER TABLE `dispatch_customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `dispatch_document_generations`
--
ALTER TABLE `dispatch_document_generations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_line_allocations`
--
ALTER TABLE `dispatch_line_allocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_requests`
--
ALTER TABLE `dispatch_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `dispatch_returns`
--
ALTER TABLE `dispatch_returns`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_return_credit_notes`
--
ALTER TABLE `dispatch_return_credit_notes`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_settlements`
--
ALTER TABLE `dispatch_settlements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `dispatch_settlement_customers`
--
ALTER TABLE `dispatch_settlement_customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `invoice_lines`
--
ALTER TABLE `invoice_lines`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `item_categories`
--
ALTER TABLE `item_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `item_stock_balances`
--
ALTER TABLE `item_stock_balances`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `item_stock_movements`
--
ALTER TABLE `item_stock_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `location_targets`
--
ALTER TABLE `location_targets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `packaging_groups`
--
ALTER TABLE `packaging_groups`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `packaging_group_components`
--
ALTER TABLE `packaging_group_components`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `packaging_operations`
--
ALTER TABLE `packaging_operations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `packaging_operation_components`
--
ALTER TABLE `packaging_operation_components`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `packaging_shelf_remainders`
--
ALTER TABLE `packaging_shelf_remainders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `ready_shelf_stocks`
--
ALTER TABLE `ready_shelf_stocks`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ready_shelf_stock_movements`
--
ALTER TABLE `ready_shelf_stock_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `ready_stock_containers`
--
ALTER TABLE `ready_stock_containers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ready_stock_movements`
--
ALTER TABLE `ready_stock_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `salesman_balances`
--
ALTER TABLE `salesman_balances`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `salesman_payroll_payments`
--
ALTER TABLE `salesman_payroll_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salesman_salary_rates`
--
ALTER TABLE `salesman_salary_rates`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salesman_sublocations`
--
ALTER TABLE `salesman_sublocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `salesman_targets`
--
ALTER TABLE `salesman_targets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `salesman_target_commission_snapshots`
--
ALTER TABLE `salesman_target_commission_snapshots`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `salesmen`
--
ALTER TABLE `salesmen`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sale_catalog_entries`
--
ALTER TABLE `sale_catalog_entries`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stores`
--
ALTER TABLE `stores`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sublocations`
--
ALTER TABLE `sublocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `sublocation_targets`
--
ALTER TABLE `sublocation_targets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `target_collection_credits`
--
ALTER TABLE `target_collection_credits`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `target_events`
--
ALTER TABLE `target_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `target_notification_events`
--
ALTER TABLE `target_notification_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

-- --------------------------------------------------------

--
-- Structure for view `v_current_stock`
--
DROP TABLE IF EXISTS `v_current_stock`;

CREATE ALGORITHM=UNDEFINED DEFINER=`kivaro_user`@`localhost` SQL SECURITY DEFINER VIEW `v_current_stock`  AS SELECT `b`.`id` AS `stock_balance_id`, `b`.`store_id` AS `store_id`, `b`.`warehouse_id` AS `warehouse_id`, `w`.`name` AS `warehouse_name`, `b`.`item_id` AS `item_id`, `i`.`name` AS `item_name`, `i`.`item_kind` AS `item_kind`, `i`.`stock_mode` AS `stock_mode`, `u`.`symbol` AS `unit_symbol`, `b`.`quantity_on_hand` AS `quantity_on_hand`, `b`.`quantity_reserved` AS `quantity_reserved`, (`b`.`quantity_on_hand` - `b`.`quantity_reserved`) AS `quantity_available`, `b`.`average_cost` AS `average_cost`, `b`.`stock_value` AS `stock_value`, (case when ((`i`.`reorder_level` > 0) and ((`b`.`quantity_on_hand` - `b`.`quantity_reserved`) <= `i`.`reorder_level`)) then 'low' else 'healthy' end) AS `stock_health` FROM (((`item_stock_balances` `b` join `warehouses` `w` on((`w`.`id` = `b`.`warehouse_id`))) join `items` `i` on((`i`.`id` = `b`.`item_id`))) join `units` `u` on((`u`.`id` = `i`.`base_unit_id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_customer_balances`
--
DROP TABLE IF EXISTS `v_customer_balances`;

CREATE ALGORITHM=UNDEFINED DEFINER=`kivaro_user`@`localhost` SQL SECURITY DEFINER VIEW `v_customer_balances`  AS SELECT `c`.`id` AS `customer_id`, `c`.`store_id` AS `store_id`, `c`.`name` AS `customer_name`, `l`.`name` AS `location_name`, `sl`.`name` AS `sublocation_name`, coalesce(`debt_totals`.`total_debt_subtotal`,0) AS `total_debt_subtotal`, coalesce(`debt_totals`.`total_debt_vat`,0) AS `total_debt_vat`, coalesce(`debt_totals`.`total_debt_created`,0) AS `total_debt_created`, coalesce(`debt_totals`.`total_debt_paid`,0) AS `total_debt_paid`, coalesce(`debt_totals`.`total_remaining_debt`,0) AS `total_remaining_debt`, coalesce(`credit_totals`.`available_credit`,0) AS `available_credit`, (coalesce(`debt_totals`.`total_remaining_debt`,0) - coalesce(`credit_totals`.`available_credit`,0)) AS `net_customer_balance` FROM ((((`customers` `c` join `locations` `l` on((`l`.`id` = `c`.`location_id`))) join `sublocations` `sl` on((`sl`.`id` = `c`.`sublocation_id`))) left join (select `customer_debts`.`customer_id` AS `customer_id`,sum(`customer_debts`.`subtotal_amount`) AS `total_debt_subtotal`,sum(`customer_debts`.`vat_amount`) AS `total_debt_vat`,sum(`customer_debts`.`original_amount`) AS `total_debt_created`,sum(`customer_debts`.`paid_amount`) AS `total_debt_paid`,sum(`customer_debts`.`remaining_amount`) AS `total_remaining_debt` from `customer_debts` where (`customer_debts`.`status` in ('pending','partially_paid')) group by `customer_debts`.`customer_id`) `debt_totals` on((`debt_totals`.`customer_id` = `c`.`id`))) left join (select `customer_credits`.`customer_id` AS `customer_id`,sum(`customer_credits`.`remaining_amount`) AS `available_credit` from `customer_credits` where (`customer_credits`.`status` in ('available','partially_used')) group by `customer_credits`.`customer_id`) `credit_totals` on((`credit_totals`.`customer_id` = `c`.`id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_dispatch_summary`
--
DROP TABLE IF EXISTS `v_dispatch_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`kivaro_user`@`localhost` SQL SECURITY DEFINER VIEW `v_dispatch_summary`  AS SELECT `dr`.`id` AS `dispatch_request_id`, `dr`.`store_id` AS `store_id`, `dr`.`dispatch_number` AS `dispatch_number`, `dr`.`request_date` AS `request_date`, `dr`.`status` AS `status`, `dr`.`revision` AS `revision`, `s`.`full_name` AS `salesman_name`, `w`.`name` AS `warehouse_name`, count(distinct `dc`.`customer_id`) AS `customers_count`, `dr`.`total_quantity` AS `total_quantity`, `dr`.`subtotal_amount` AS `subtotal_amount`, `dr`.`vat_amount` AS `vat_amount`, `dr`.`total_amount` AS `total_amount`, `dr`.`total_collected` AS `total_collected`, `dr`.`total_debt` AS `total_debt`, coalesce(`line_costs`.`gift_cogs`,0) AS `gift_cogs` FROM ((((`dispatch_requests` `dr` join `salesmen` `s` on((`s`.`id` = `dr`.`salesman_id`))) join `warehouses` `w` on((`w`.`id` = `dr`.`warehouse_id`))) left join `dispatch_customers` `dc` on((`dc`.`dispatch_request_id` = `dr`.`id`))) left join (select `di`.`dispatch_request_id` AS `dispatch_request_id`,sum((case when ((`di`.`line_type` = 'free_gift') and (`dla`.`status` = 'dispatched')) then `dla`.`total_cost` else 0 end)) AS `gift_cogs` from (`dispatch_line_allocations` `dla` join `dispatch_items` `di` on((`di`.`id` = `dla`.`dispatch_item_id`))) group by `di`.`dispatch_request_id`) `line_costs` on((`line_costs`.`dispatch_request_id` = `dr`.`id`))) GROUP BY `dr`.`id`, `dr`.`store_id`, `dr`.`dispatch_number`, `dr`.`request_date`, `dr`.`status`, `dr`.`revision`, `s`.`full_name`, `w`.`name`, `dr`.`total_quantity`, `dr`.`subtotal_amount`, `dr`.`vat_amount`, `dr`.`total_amount`, `dr`.`total_collected`, `dr`.`total_debt`, `line_costs`.`gift_cogs` ;

-- --------------------------------------------------------

--
-- Structure for view `v_ready_stock`
--
DROP TABLE IF EXISTS `v_ready_stock`;

CREATE ALGORITHM=UNDEFINED DEFINER=`kivaro_user`@`localhost` SQL SECURITY DEFINER VIEW `v_ready_stock`  AS SELECT `c`.`id` AS `ready_stock_container_id`, `c`.`store_id` AS `store_id`, `c`.`warehouse_id` AS `warehouse_id`, `c`.`packaging_group_id` AS `packaging_group_id`, `g`.`name` AS `packaging_group_name`, `c`.`outer_item_id` AS `outer_item_id`, `c`.`inner_item_id` AS `inner_item_id`, `c`.`outer_name_snapshot` AS `outer_name_snapshot`, `c`.`inner_name_snapshot` AS `inner_name_snapshot`, `c`.`initial_inner_quantity` AS `initial_inner_quantity`, `c`.`remaining_inner_quantity` AS `remaining_inner_quantity`, `c`.`reserved_inner_quantity` AS `reserved_inner_quantity`, (`c`.`remaining_inner_quantity` - `c`.`reserved_inner_quantity`) AS `available_inner_quantity`, `c`.`capacity_kg` AS `capacity_kg`, `c`.`remaining_cost` AS `remaining_cost`, `c`.`status` AS `status`, `c`.`created_at` AS `created_at` FROM (`ready_stock_containers` `c` join `packaging_groups` `g` on((`g`.`id` = `c`.`packaging_group_id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_salesman_target_progress`
--
DROP TABLE IF EXISTS `v_salesman_target_progress`;

CREATE ALGORITHM=UNDEFINED DEFINER=`kivaro_user`@`localhost` SQL SECURITY DEFINER VIEW `v_salesman_target_progress`  AS SELECT `st`.`id` AS `salesman_target_id`, `st`.`store_id` AS `store_id`, `s`.`id` AS `salesman_id`, `s`.`full_name` AS `salesman_name`, `s`.`base_salary` AS `base_salary`, `l`.`id` AS `location_id`, `l`.`name` AS `location_name`, `sl`.`id` AS `sublocation_id`, `sl`.`name` AS `sublocation_name`, `lt`.`target_period` AS `target_period`, `lt`.`period_start` AS `period_start`, `lt`.`period_end` AS `period_end`, `st`.`target_amount` AS `target_amount`, coalesce(sum(`tcc`.`amount`),0) AS `achieved_sales_amount`, (case when (`st`.`target_amount` = 0) then 0 else round(((coalesce(sum(`tcc`.`amount`),0) / `st`.`target_amount`) * 100),2) end) AS `achievement_percentage` FROM ((((((`salesman_targets` `st` join `salesmen` `s` on((`s`.`id` = `st`.`salesman_id`))) join `sublocation_targets` `slt` on((`slt`.`id` = `st`.`sublocation_target_id`))) join `location_targets` `lt` on((`lt`.`id` = `slt`.`location_target_id`))) join `sublocations` `sl` on((`sl`.`id` = `slt`.`sublocation_id`))) join `locations` `l` on((`l`.`id` = `sl`.`location_id`))) left join `target_collection_credits` `tcc` on((`tcc`.`salesman_target_id` = `st`.`id`))) WHERE (`st`.`status` in ('active','closed')) GROUP BY `st`.`id`, `st`.`store_id`, `s`.`id`, `s`.`full_name`, `s`.`base_salary`, `l`.`id`, `l`.`name`, `sl`.`id`, `sl`.`name`, `lt`.`target_period`, `lt`.`period_start`, `lt`.`period_end`, `st`.`target_amount` ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `carton_stock_lots`
--
ALTER TABLE `carton_stock_lots`
  ADD CONSTRAINT `fk_carton_stock_lots_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_carton_stock_lots_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_carton_stock_lots_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_carton_stock_lots_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  ADD CONSTRAINT `fk_cash_accounts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `commission_calculations`
--
ALTER TABLE `commission_calculations`
  ADD CONSTRAINT `fk_commission_calculations_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_calculations_rule` FOREIGN KEY (`commission_rule_id`) REFERENCES `commission_rules` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_calculations_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_calculations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_calculations_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_calculations_target` FOREIGN KEY (`salesman_target_id`) REFERENCES `salesman_targets` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `commission_payments`
--
ALTER TABLE `commission_payments`
  ADD CONSTRAINT `fk_commission_payments_calculation` FOREIGN KEY (`commission_calculation_id`) REFERENCES `commission_calculations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_payments_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_payments_paid_by` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_payments_payroll` FOREIGN KEY (`payroll_payment_id`) REFERENCES `salesman_payroll_payments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_payments_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_payments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `commission_rules`
--
ALTER TABLE `commission_rules`
  ADD CONSTRAINT `fk_commission_rules_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_rules_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `company_profiles`
--
ALTER TABLE `company_profiles`
  ADD CONSTRAINT `fk_company_profiles_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customers_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customers_salesman` FOREIGN KEY (`assigned_salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customers_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customers_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `customer_credits`
--
ALTER TABLE `customer_credits`
  ADD CONSTRAINT `fk_customer_credits_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_credits_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_credits_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `customer_debts`
--
ALTER TABLE `customer_debts`
  ADD CONSTRAINT `fk_customer_debts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `customer_debt_adjustments`
--
ALTER TABLE `customer_debt_adjustments`
  ADD CONSTRAINT `fk_customer_debt_adjustments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debt_adjustments_debt` FOREIGN KEY (`customer_debt_id`) REFERENCES `customer_debts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debt_adjustments_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debt_adjustments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD CONSTRAINT `fk_customer_payments_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_collector` FOREIGN KEY (`collected_by_salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `customer_payment_allocations`
--
ALTER TABLE `customer_payment_allocations`
  ADD CONSTRAINT `fk_customer_payment_allocations_debt` FOREIGN KEY (`customer_debt_id`) REFERENCES `customer_debts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payment_allocations_payment` FOREIGN KEY (`customer_payment_id`) REFERENCES `customer_payments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `customer_receipts`
--
ALTER TABLE `customer_receipts`
  ADD CONSTRAINT `fk_customer_receipts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_receipts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_receipts_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_receipts_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_receipts_payment` FOREIGN KEY (`customer_payment_id`) REFERENCES `customer_payments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_receipts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `delivery_target_credits`
--
ALTER TABLE `delivery_target_credits`
  ADD CONSTRAINT `fk_delivery_target_credits_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_delivery_target_credits_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_delivery_target_credits_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_delivery_target_credits_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_delivery_target_credits_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_customers`
--
ALTER TABLE `dispatch_customers`
  ADD CONSTRAINT `fk_dispatch_customers_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_document_generations`
--
ALTER TABLE `dispatch_document_generations`
  ADD CONSTRAINT `fk_dispatch_document_generations_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_document_generations_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_document_generations_generated_by` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_document_generations_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_document_generations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD CONSTRAINT `fk_dispatch_items_catalog` FOREIGN KEY (`sale_catalog_entry_id`) REFERENCES `sale_catalog_entries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_line_allocations`
--
ALTER TABLE `dispatch_line_allocations`
  ADD CONSTRAINT `fk_dispatch_line_allocations_catalog_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_line_allocations_container` FOREIGN KEY (`ready_stock_container_id`) REFERENCES `ready_stock_containers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_line_allocations_item` FOREIGN KEY (`dispatch_item_id`) REFERENCES `dispatch_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_line_allocations_lot` FOREIGN KEY (`carton_stock_lot_id`) REFERENCES `carton_stock_lots` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_line_allocations_ready_shelf` FOREIGN KEY (`ready_shelf_stock_id`) REFERENCES `ready_shelf_stocks` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_line_allocations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_line_allocations_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_requests`
--
ALTER TABLE `dispatch_requests`
  ADD CONSTRAINT `fk_dispatch_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_dispatched_by` FOREIGN KEY (`dispatched_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_returns`
--
ALTER TABLE `dispatch_returns`
  ADD CONSTRAINT `fk_dispatch_returns_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_returns_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_returns_item` FOREIGN KEY (`dispatch_item_id`) REFERENCES `dispatch_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_returns_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_return_credit_notes`
--
ALTER TABLE `dispatch_return_credit_notes`
  ADD CONSTRAINT `fk_return_credit_note_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_credit_note_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_credit_note_customer_line` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_credit_note_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_credit_note_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_credit_note_return` FOREIGN KEY (`dispatch_return_id`) REFERENCES `dispatch_returns` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_credit_note_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_settlements`
--
ALTER TABLE `dispatch_settlements`
  ADD CONSTRAINT `fk_dispatch_settlements_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_settlements_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_settlements_settled_by` FOREIGN KEY (`settled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_settlements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_settlement_customers`
--
ALTER TABLE `dispatch_settlement_customers`
  ADD CONSTRAINT `fk_dispatch_settlement_customers_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_settlement_customers_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_settlement_customers_settlement` FOREIGN KEY (`dispatch_settlement_id`) REFERENCES `dispatch_settlements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `fk_expenses_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_category` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_voided_by` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD CONSTRAINT `fk_expense_categories_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD CONSTRAINT `fk_financial_transactions_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_financial_transactions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_financial_transactions_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoices_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoices_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoices_voided_by` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `invoice_lines`
--
ALTER TABLE `invoice_lines`
  ADD CONSTRAINT `fk_invoice_lines_dispatch_item` FOREIGN KEY (`dispatch_item_id`) REFERENCES `dispatch_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoice_lines_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `fk_items_base_unit` FOREIGN KEY (`base_unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `item_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `item_categories`
--
ALTER TABLE `item_categories`
  ADD CONSTRAINT `fk_item_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `item_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_categories_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `item_stock_balances`
--
ALTER TABLE `item_stock_balances`
  ADD CONSTRAINT `fk_item_stock_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `item_stock_movements`
--
ALTER TABLE `item_stock_movements`
  ADD CONSTRAINT `fk_item_stock_movements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_movements_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_movements_lot` FOREIGN KEY (`carton_stock_lot_id`) REFERENCES `carton_stock_lots` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_movements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `fk_locations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_locations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `location_targets`
--
ALTER TABLE `location_targets`
  ADD CONSTRAINT `fk_location_targets_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_location_targets_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_location_targets_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `packaging_groups`
--
ALTER TABLE `packaging_groups`
  ADD CONSTRAINT `fk_packaging_groups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_groups_default_warehouse` FOREIGN KEY (`default_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_groups_input_item` FOREIGN KEY (`input_item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_groups_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `packaging_group_components`
--
ALTER TABLE `packaging_group_components`
  ADD CONSTRAINT `fk_packaging_group_components_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_components_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_components_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `packaging_operations`
--
ALTER TABLE `packaging_operations`
  ADD CONSTRAINT `fk_packaging_operations_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_operations_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_operations_input_item` FOREIGN KEY (`input_item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_operations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_operations_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `packaging_operation_components`
--
ALTER TABLE `packaging_operation_components`
  ADD CONSTRAINT `fk_packaging_operation_components_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_operation_components_operation` FOREIGN KEY (`packaging_operation_id`) REFERENCES `packaging_operations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `packaging_shelf_remainders`
--
ALTER TABLE `packaging_shelf_remainders`
  ADD CONSTRAINT `fk_packaging_shelf_remainders_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_shelf_remainders_input` FOREIGN KEY (`input_item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_shelf_remainders_operation` FOREIGN KEY (`packaging_operation_id`) REFERENCES `packaging_operations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_shelf_remainders_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_shelf_remainders_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_purchase_orders_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `fk_purchase_order_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_order_items_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  ADD CONSTRAINT `fk_purchase_receipts_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipts_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  ADD CONSTRAINT `fk_purchase_receipt_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipt_items_order_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipt_items_receipt` FOREIGN KEY (`purchase_receipt_id`) REFERENCES `purchase_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ready_shelf_stocks`
--
ALTER TABLE `ready_shelf_stocks`
  ADD CONSTRAINT `fk_ready_shelf_stocks_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stocks_input` FOREIGN KEY (`input_item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stocks_operation` FOREIGN KEY (`packaging_operation_id`) REFERENCES `packaging_operations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stocks_packaging` FOREIGN KEY (`packaging_item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stocks_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stocks_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ready_shelf_stock_movements`
--
ALTER TABLE `ready_shelf_stock_movements`
  ADD CONSTRAINT `fk_ready_shelf_stock_movements_stock` FOREIGN KEY (`ready_shelf_stock_id`) REFERENCES `ready_shelf_stocks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stock_movements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stock_movements_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_shelf_stock_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ready_stock_containers`
--
ALTER TABLE `ready_stock_containers`
  ADD CONSTRAINT `fk_ready_stock_containers_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_containers_inner_item` FOREIGN KEY (`inner_item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_containers_operation` FOREIGN KEY (`packaging_operation_id`) REFERENCES `packaging_operations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_containers_outer_item` FOREIGN KEY (`outer_item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_containers_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_containers_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ready_stock_movements`
--
ALTER TABLE `ready_stock_movements`
  ADD CONSTRAINT `fk_ready_stock_movements_container` FOREIGN KEY (`ready_stock_container_id`) REFERENCES `ready_stock_containers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_movements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_movements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ready_stock_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_roles_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `salesman_balances`
--
ALTER TABLE `salesman_balances`
  ADD CONSTRAINT `fk_salesman_balances_closed_by` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_balances_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_balances_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_balances_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `salesman_payroll_payments`
--
ALTER TABLE `salesman_payroll_payments`
  ADD CONSTRAINT `fk_salesman_payroll_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_payroll_paid_by` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_payroll_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_payroll_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `salesman_salary_rates`
--
ALTER TABLE `salesman_salary_rates`
  ADD CONSTRAINT `fk_salary_rate_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salary_rate_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salary_rate_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `salesman_sublocations`
--
ALTER TABLE `salesman_sublocations`
  ADD CONSTRAINT `fk_salesman_sublocations_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_sublocations_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `salesman_targets`
--
ALTER TABLE `salesman_targets`
  ADD CONSTRAINT `fk_salesman_targets_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_targets_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_targets_sublocation_target` FOREIGN KEY (`sublocation_target_id`) REFERENCES `sublocation_targets` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `salesman_target_commission_snapshots`
--
ALTER TABLE `salesman_target_commission_snapshots`
  ADD CONSTRAINT `fk_target_commission_snapshot_rule` FOREIGN KEY (`commission_rule_id`) REFERENCES `commission_rules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_commission_snapshot_target` FOREIGN KEY (`salesman_target_id`) REFERENCES `salesman_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `salesmen`
--
ALTER TABLE `salesmen`
  ADD CONSTRAINT `fk_salesmen_commission_rule` FOREIGN KEY (`commission_rule_id`) REFERENCES `commission_rules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesmen_deactivated_by` FOREIGN KEY (`deactivated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesmen_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesmen_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `sale_catalog_entries`
--
ALTER TABLE `sale_catalog_entries`
  ADD CONSTRAINT `fk_sale_catalog_entries_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sale_catalog_entries_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_sale_catalog_entries_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_sale_catalog_entries_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `store_modules`
--
ALTER TABLE `store_modules`
  ADD CONSTRAINT `fk_store_modules_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sublocations`
--
ALTER TABLE `sublocations`
  ADD CONSTRAINT `fk_sublocations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sublocations_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sublocations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sublocation_targets`
--
ALTER TABLE `sublocation_targets`
  ADD CONSTRAINT `fk_sublocation_targets_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sublocation_targets_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sublocation_targets_target` FOREIGN KEY (`location_target_id`) REFERENCES `location_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `fk_suppliers_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_suppliers_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  ADD CONSTRAINT `fk_supplier_payments_cash_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_supplier_payments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_supplier_payments_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_supplier_payments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_supplier_payments_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_system_settings_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `target_collection_credits`
--
ALTER TABLE `target_collection_credits`
  ADD CONSTRAINT `fk_target_collection_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_collection_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_collection_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_collection_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_collection_target` FOREIGN KEY (`salesman_target_id`) REFERENCES `salesman_targets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `target_events`
--
ALTER TABLE `target_events`
  ADD CONSTRAINT `fk_target_events_location_target` FOREIGN KEY (`location_target_id`) REFERENCES `location_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_events_salesman_target` FOREIGN KEY (`salesman_target_id`) REFERENCES `salesman_targets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_events_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_target_events_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `target_notification_events`
--
ALTER TABLE `target_notification_events`
  ADD CONSTRAINT `fk_target_notification_target` FOREIGN KEY (`salesman_target_id`) REFERENCES `salesman_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `fk_units_base_unit` FOREIGN KEY (`base_unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_units_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_users_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD CONSTRAINT `fk_warehouses_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_warehouses_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
