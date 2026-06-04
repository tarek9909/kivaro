-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jun 04, 2026 at 05:39 AM
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
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `store_id`, `user_id`, `module`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `description`, `created_at`) VALUES
(1, 1, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'POST /api/auth/logout', '2026-05-27 08:04:05'),
(2, 1, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'POST /api/auth/logout', '2026-05-27 08:04:24'),
(3, 1, 1, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-05-27 11:45:58'),
(4, 1, 2, 'superadmin', 'status', 'superadmin', 1, NULL, '{\"body\": {\"status\": \"suspended\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/superadmin/stores/1/status', '2026-05-27 11:46:38'),
(5, 1, 2, 'superadmin', 'status', 'superadmin', 1, NULL, '{\"body\": {\"status\": \"active\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/superadmin/stores/1/status', '2026-05-27 11:46:39'),
(6, 1, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-05-27 11:48:08'),
(7, 1, 1, 'settings', 'vat', 'settings', NULL, NULL, '{\"body\": {\"rate\": 0, \"enabled\": false}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/settings/vat', '2026-05-27 11:53:09'),
(8, 1, 1, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-05-27 15:23:21'),
(9, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-05-27 15:24:31'),
(10, 1, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-05-27 15:24:31'),
(11, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-05-27 15:24:45'),
(12, 1, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-05-27 15:24:45'),
(13, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-05-27 15:24:53'),
(14, 1, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-05-27 15:24:53'),
(15, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-05-27 17:05:58'),
(16, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-05-27 17:05:58'),
(17, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-05-27 17:09:01'),
(18, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-05-27 17:09:01'),
(19, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-05-27 17:50:20'),
(20, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-05-27 17:50:20'),
(21, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-05-27 17:51:48'),
(22, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-05-27 17:51:48'),
(23, NULL, 2, 'superadmin', 'stores', 'superadmin', NULL, NULL, '{\"body\": {\"vat\": {\"rate\": 0, \"enabled\": false}, \"code\": \"asdsa\", \"name\": \"asd\", \"slug\": \"defaultt\", \"email\": \"aswadt12@gmail.com\", \"notes\": null, \"owner\": {\"email\": \"aswadt12@gmail.com\", \"phone\": \"12\", \"password\": \"ChangeMe123!\", \"username\": \"superadmin\", \"full_name\": \"tarek Aswad\"}, \"phone\": \"afasf\", \"status\": \"active\", \"address\": \"Jsnsnwwn\\nNsnsnanan\", \"modules\": {\"roles\": true, \"users\": true, \"reports\": true, \"dispatch\": true, \"payments\": true, \"settings\": true, \"customers\": true, \"dashboard\": true, \"inventory\": true, \"locations\": true, \"purchases\": true, \"accounting\": true, \"audit_logs\": true, \"production\": true, \"commissions\": true, \"settings.vat\": true, \"notifications\": true, \"reports.debts\": true, \"reports.sales\": true, \"payments.debts\": true, \"inventory.items\": true, \"inventory.units\": true, \"purchases.orders\": true, \"commissions.rules\": true, \"dispatch.requests\": true, \"locations.targets\": true, \"payments.receipts\": true, \"reports.purchases\": true, \"inventory.balances\": true, \"inventory.variants\": true, \"locations.salesmen\": true, \"production.batches\": true, \"purchases.payments\": true, \"accounting.expenses\": true, \"inventory.movements\": true, \"locations.locations\": true, \"purchases.suppliers\": true, \"reports.commissions\": true, \"reports.profit-loss\": true, \"inventory.categories\": true, \"inventory.warehouses\": true, \"inventory.adjustments\": true, \"reports.current-stock\": true, \"locations.sublocations\": true, \"production.cost-history\": true, \"reports.stock-movements\": true, \"accounting.cash-accounts\": true, \"commissions.calculations\": true, \"reports.dispatch-summary\": true, \"production.configurations\": true, \"reports.customer-balances\": true, \"payments.customer-payments\": true, \"accounting.salesman-balances\": true, \"accounting.expense-categories\": true, \"reports.salesman-target-progress\": true, \"accounting.financial-transactions\": true}, \"contact_name\": \"asdasd\", \"currency_code\": \"USD\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores', '2026-05-27 17:52:23'),
(24, 2, 2, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 3, \"target_store_id\": 2, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store asdsa as superadmin', '2026-05-27 17:52:29'),
(25, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/2/impersonate', '2026-05-27 17:52:29'),
(26, NULL, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-05-27 17:53:38'),
(27, NULL, 2, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-05-27 17:53:54'),
(28, 1, 1, 'users', 'update', 'users', 1, NULL, '{\"body\": {\"email\": \"owner@example.com\", \"phone\": null, \"status\": \"active\", \"role_id\": 1, \"password\": \"12345678\", \"username\": \"owner\", \"full_name\": \"System Owner\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/users/1', '2026-05-27 17:54:41'),
(29, 1, 1, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-05-27 17:54:46'),
(30, 1, 1, 'users', 'status', 'users', 1, NULL, '{\"body\": {\"status\": \"inactive\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/users/1/status', '2026-05-27 23:56:19'),
(31, 1, 1, 'users', 'status', 'users', 1, NULL, '{\"body\": {\"status\": \"inactive\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/users/1/status', '2026-05-27 23:59:31'),
(32, 1, 1, 'users', 'status', 'users', 1, NULL, '{\"body\": {\"status\": \"inactive\"}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/users/1/status', '2026-05-28 00:00:09');
INSERT INTO `audit_logs` (`id`, `store_id`, `user_id`, `module`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `description`, `created_at`) VALUES
(33, 1, 1, 'upload', 'create', 'upload', NULL, NULL, '{\"body\": {\"content\": \"data:image/jpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf//Z\", \"filename\": \"WhatsApp Image 2026-06-01 at 9.00.46 PM.jpeg\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/upload', '2026-06-03 16:55:33');
INSERT INTO `audit_logs` (`id`, `store_id`, `user_id`, `module`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `description`, `created_at`) VALUES
(34, 1, 1, 'settings', 'update', 'company_profiles', NULL, NULL, '{\"body\": {\"email\": \"aswadt101@gmail.com\", \"phone\": \"70629775\", \"address\": \"saida shammaa highway leen 2 building\", \"logo_url\": \"http://localhost:3000/uploads/1780505733040-WhatsAppImage2026-06-01at90046PM.jpg\", \"company_name\": \"kivaro\", \"currency_code\": \"USD\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/company-profile', '2026-06-03 16:55:34'),
(35, 1, 1, 'settings', 'vat', 'settings', NULL, NULL, '{\"body\": {\"rate\": 11, \"enabled\": true}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/settings/vat', '2026-06-03 16:58:21'),
(36, 1, 1, 'roles', 'create', 'roles', NULL, NULL, '{\"body\": {\"name\": \"test\", \"status\": \"active\", \"description\": \"asda\", \"display_name\": \"testt\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/roles', '2026-06-03 16:59:03'),
(37, 1, 1, 'users', 'create', 'users', NULL, NULL, '{\"body\": {\"email\": \"aswadt12@gmail.com\", \"phone\": \"70629775\", \"status\": \"active\", \"role_id\": 3, \"password\": \"12345678\", \"username\": \"tarek\", \"full_name\": \"tarek Aswad\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/users', '2026-06-03 16:59:35'),
(38, 1, 1, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-06-03 16:59:42'),
(39, 1, 1, 'users', 'update', 'users', 4, NULL, '{\"body\": {\"email\": \"aswadt12@gmail.com\", \"phone\": \"70629775\", \"status\": \"active\", \"role_id\": 3, \"password\": \"123456789\", \"username\": \"tarek\", \"full_name\": \"tarek Aswad\"}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/users/4', '2026-06-03 17:01:05'),
(40, 1, 1, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-06-03 17:01:11'),
(41, 1, 4, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-06-03 17:01:36'),
(42, 1, 1, 'auth', 'logout', 'auth', NULL, NULL, '{\"body\": {}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/auth/logout', '2026-06-03 17:02:38'),
(43, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-06-03 17:03:08'),
(44, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-06-03 17:03:08'),
(45, 2, 2, 'superadmin', 'impersonate_store', 'stores', 2, NULL, '{\"target_user_id\": 3, \"target_store_id\": 2, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store asdsa as superadmin', '2026-06-03 17:03:15'),
(46, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/2/impersonate', '2026-06-03 17:03:15'),
(47, 1, 2, 'superadmin', 'impersonate_store', 'stores', 1, NULL, '{\"target_user_id\": 1, \"target_store_id\": 1, \"impersonated_by_user_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'Superadmin entered store DEFAULT as owner', '2026-06-03 17:03:59'),
(48, NULL, 2, 'superadmin', 'impersonate', 'superadmin', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/superadmin/stores/1/impersonate', '2026-06-03 17:03:59'),
(49, 1, 1, 'item_categories', 'create', 'item_categories', NULL, NULL, '{\"body\": {\"code\": \"1\", \"name\": \"test\", \"status\": \"active\", \"parent_id\": 2, \"description\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-categories', '2026-06-03 17:05:48'),
(50, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"123\", \"name\": \"fa7em\", \"status\": \"active\", \"item_type\": \"raw_charcoal\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 1, \"default_cost\": 0, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 17:07:48'),
(51, 1, 1, 'inventory', 'create', 'units', NULL, NULL, '{\"body\": {\"name\": \"cartoon\", \"symbol\": \"cartoon\", \"unit_type\": \"quantity\", \"base_unit_id\": 4, \"conversion_to_base\": 1}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/units', '2026-06-03 17:26:16'),
(52, 1, 1, 'item_categories', 'delete', 'item_categories', 4, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'DELETE /api/item-categories/4', '2026-06-03 17:26:38'),
(53, 1, 1, 'inventory', 'update', 'items', 1, NULL, '{\"body\": {\"code\": \"123\", \"name\": \"fa7em\", \"status\": \"active\", \"item_type\": \"raw_charcoal\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 1, \"default_cost\": 1, \"reorder_level\": 500, \"tracking_type\": \"stocked\", \"default_selling_price\": 5}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/items/1', '2026-06-03 17:27:05'),
(54, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"1234\", \"name\": \"plastic bags\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0.4, \"reorder_level\": 1000, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 17:27:48'),
(55, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"22\", \"name\": \"outer cartoon\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 17:28:44'),
(56, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"111\", \"name\": \"finished charcoal cartoons\", \"status\": \"active\", \"item_type\": \"finished_product\", \"category_id\": 3, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 17:29:10'),
(57, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"55\", \"cost\": 0, \"status\": \"active\", \"item_id\": 1, \"variant_name\": \"5.5\", \"selling_price\": null, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 17:29:38'),
(58, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"555\", \"cost\": 0, \"status\": \"active\", \"item_id\": 1, \"variant_name\": \"5\", \"selling_price\": null, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 17:30:02'),
(59, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"400\", \"cost\": 0, \"status\": \"active\", \"item_id\": 3, \"variant_name\": \"plastic bag 400\", \"selling_price\": null, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 17:30:23'),
(60, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"sss\", \"cost\": 0, \"status\": \"active\", \"item_id\": 3, \"variant_name\": \"plastic bag 900\", \"selling_price\": null, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 17:30:32'),
(61, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"outer\", \"cost\": 0, \"status\": \"active\", \"item_id\": 4, \"variant_name\": \"outer cartoon\", \"selling_price\": null, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 17:30:49'),
(62, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"asd\", \"cost\": 0, \"status\": \"active\", \"item_id\": 5, \"variant_name\": \"carton of box size 5.5 900g\", \"selling_price\": null, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 17:31:26'),
(63, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"dsa\", \"cost\": 0, \"status\": \"active\", \"item_id\": 5, \"variant_name\": \"carton of box size 5.5 400g\", \"selling_price\": null, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 17:31:36'),
(64, 1, 1, 'inventory', 'create', 'warehouses', NULL, NULL, '{\"body\": {\"code\": \"111\", \"name\": \"main warehouse\", \"status\": \"active\", \"address\": null, \"location_id\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/warehouses', '2026-06-03 17:31:52'),
(65, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 1, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"1000.0000\", \"item_variant_id\": 1, \"quantity_change\": \"1000.0000\", \"stock_movement_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'a', '2026-06-03 17:32:26'),
(66, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"a\", \"unit_cost\": 0.5, \"warehouse_id\": 1, \"item_variant_id\": 1, \"quantity_change\": 1000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 17:32:26'),
(67, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 2, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"500.0000\", \"item_variant_id\": 3, \"quantity_change\": \"500.0000\", \"stock_movement_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'a', '2026-06-03 17:32:43'),
(68, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"a\", \"unit_cost\": 0.45, \"warehouse_id\": 1, \"item_variant_id\": 3, \"quantity_change\": 500}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 17:32:43'),
(69, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 3, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"2000.0000\", \"item_variant_id\": 4, \"quantity_change\": \"2000.0000\", \"stock_movement_id\": 3}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'asd', '2026-06-03 17:33:07'),
(70, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"asd\", \"unit_cost\": 0.05, \"warehouse_id\": 1, \"item_variant_id\": 4, \"quantity_change\": 2000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 17:33:07'),
(71, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 4, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"1000.0000\", \"item_variant_id\": 5, \"quantity_change\": \"1000.0000\", \"stock_movement_id\": 4}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'ddd', '2026-06-03 17:33:24'),
(72, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"ddd\", \"unit_cost\": 0.08, \"warehouse_id\": 1, \"item_variant_id\": 5, \"quantity_change\": 1000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 17:33:24'),
(73, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 5, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"500.0000\", \"item_variant_id\": 6, \"quantity_change\": \"500.0000\", \"stock_movement_id\": 5}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'D', '2026-06-03 17:33:49'),
(74, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"D\", \"unit_cost\": 0.6, \"warehouse_id\": 1, \"item_variant_id\": 6, \"quantity_change\": 500}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 17:33:49'),
(75, 1, 1, 'production', 'create', 'packaging_configurations', NULL, NULL, '{\"body\": {\"notes\": null, \"is_active\": 1, \"config_name\": \"cartoon box 400g bags size 5.5\", \"packaging_type\": \"carton_with_packages\", \"charcoal_unit_id\": 1, \"charcoal_variant_id\": 1, \"packages_per_carton\": 20, \"output_item_variant_id\": 8, \"charcoal_quantity_per_output\": 8}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-configurations', '2026-06-03 17:35:05'),
(76, 1, 1, 'production', 'components', 'packaging_configurations', 1, NULL, '{\"body\": {\"unit_id\": 4, \"component_role\": \"package_bag\", \"waste_percentage\": 0, \"quantity_per_output\": 20, \"component_item_variant_id\": 4}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-configurations/1/components', '2026-06-03 17:36:05'),
(77, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"st\", \"name\": \"sticker\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 18:54:19'),
(78, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"1\", \"cost\": 0, \"status\": \"active\", \"item_id\": 6, \"variant_name\": \"sticker\", \"selling_price\": null, \"attributes_json\": {\"packaging_unit\": \"pc\"}}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 18:54:19'),
(79, 1, 1, 'inventory', 'create', 'packaging_groups', NULL, NULL, '{\"body\": {\"code\": \"1\", \"name\": \"cartoon 400g\", \"status\": \"active\", \"description\": null, \"charcoal_variant_id\": 1, \"default_warehouse_id\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups', '2026-06-03 18:54:54'),
(80, 1, 1, 'inventory', 'update', 'packaging_groups', 1, NULL, '{\"body\": {\"code\": \"1\", \"name\": \"cartoon 400g\", \"status\": \"active\", \"description\": null, \"charcoal_variant_id\": 1, \"default_warehouse_id\": 1}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-groups/1', '2026-06-03 18:55:05'),
(81, 1, 1, 'item_categories', 'create', 'item_categories', NULL, NULL, '{\"body\": {\"code\": \"12222\", \"name\": \"fa7em packings\", \"status\": \"active\", \"parent_id\": 2, \"description\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-categories', '2026-06-03 18:57:10'),
(82, 1, 1, 'inventory', 'components', 'packaging_groups', 1, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"category\", \"sort_order\": 0, \"capacity_kg\": 0, \"unit_symbol\": \"pc\", \"item_variant_id\": 4, \"parent_component_id\": null, \"quantity_per_parent\": null}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/components', '2026-06-03 18:57:46'),
(83, 1, 1, 'item_categories', 'hard', 'item_categories', 8, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 8}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'DELETE /api/item-categories/8/hard', '2026-06-03 19:08:26'),
(84, 1, 1, 'inventory', 'hard', 'packaging_groups', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'DELETE /api/packaging-groups/1/hard', '2026-06-03 19:08:39'),
(85, 1, 1, 'inventory', 'hard', 'item_variants', 9, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 9}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'DELETE /api/item-variants/9/hard', '2026-06-03 19:08:47'),
(86, 1, 1, 'inventory', 'hard', 'item_variants', 7, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 7}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'DELETE /api/item-variants/7/hard', '2026-06-03 19:09:02'),
(87, 1, 1, 'item_categories', 'create', 'item_categories', NULL, NULL, '{\"body\": {\"code\": \"p\", \"name\": \"packaging fa7em\", \"status\": \"active\", \"parent_id\": null, \"description\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-categories', '2026-06-03 19:11:58'),
(88, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"c\", \"name\": \"cartoon 10kg\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 1, \"description\": \"1\", \"base_unit_id\": 1, \"default_cost\": 0.5, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 19:12:42'),
(89, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"123\", \"cost\": 0.5, \"status\": \"active\", \"item_id\": 1, \"variant_name\": \"cartoon_10kg\", \"selling_price\": null, \"attributes_json\": {\"packaging_unit\": \"kg\"}}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 19:12:42'),
(90, 1, 1, 'inventory', 'create', 'packaging_groups', NULL, NULL, '{\"body\": {\"code\": \"322\", \"name\": \"cartoon 10kg 400g\", \"status\": \"active\", \"description\": null, \"charcoal_variant_id\": null, \"default_warehouse_id\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups', '2026-06-03 19:13:34'),
(91, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"333333\", \"name\": \"plastic bag 400g\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0.2, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 19:14:15'),
(92, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"3333\", \"cost\": 0.2, \"status\": \"active\", \"item_id\": 2, \"variant_name\": \"plastic_bag_400\", \"selling_price\": null, \"attributes_json\": {\"packaging_unit\": \"pc\"}}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 19:14:15'),
(93, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"456\", \"name\": \"stickers\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0.1, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 19:14:44'),
(94, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"444\", \"cost\": 0.1, \"status\": \"active\", \"item_id\": 3, \"variant_name\": \"stickers\", \"selling_price\": null, \"attributes_json\": {\"packaging_unit\": \"pc\"}}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 19:14:44'),
(95, 1, 1, 'inventory', 'components', 'packaging_groups', 1, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"category\", \"sort_order\": 0, \"capacity_kg\": 10, \"unit_symbol\": \"kg\", \"item_variant_id\": 1, \"parent_component_id\": null, \"quantity_per_parent\": null}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/components', '2026-06-03 19:15:32'),
(96, 1, 1, 'inventory', 'components', 'packaging_groups', 1, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"item\", \"sort_order\": 0, \"capacity_kg\": 0.4, \"unit_symbol\": \"pc\", \"item_variant_id\": 2, \"parent_component_id\": 1, \"quantity_per_parent\": null}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/components', '2026-06-03 19:15:51'),
(97, 1, 1, 'inventory', 'update', 'packaging_group_components', 1, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"category\", \"sort_order\": 0, \"capacity_kg\": 6, \"unit_symbol\": \"kg\", \"item_variant_id\": 1, \"parent_component_id\": null, \"quantity_per_parent\": null}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-group-components/1', '2026-06-03 19:16:11'),
(98, 1, 1, 'inventory', 'update', 'packaging_group_components', 2, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"item\", \"sort_order\": 0, \"capacity_kg\": 0.4, \"unit_symbol\": \"pc\", \"item_variant_id\": 2, \"parent_component_id\": 1, \"quantity_per_parent\": 11}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-group-components/2', '2026-06-03 19:16:19'),
(99, 1, 1, 'inventory', 'components', 'packaging_groups', 1, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"sub_item\", \"sort_order\": 0, \"capacity_kg\": 0, \"unit_symbol\": \"pc\", \"item_variant_id\": 3, \"parent_component_id\": 2, \"quantity_per_parent\": 0.1}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/components', '2026-06-03 19:16:50'),
(100, 1, 1, 'item_categories', 'create', 'item_categories', NULL, NULL, '{\"body\": {\"code\": \"123\", \"name\": \"fa7em\", \"status\": \"active\", \"parent_id\": null, \"description\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-categories', '2026-06-03 19:17:33'),
(101, 1, 1, 'inventory', 'create', 'items', NULL, NULL, '{\"body\": {\"code\": \"123132\", \"name\": \"fa7em 5.5\", \"status\": \"active\", \"item_type\": \"raw_charcoal\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 1, \"default_cost\": 1, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": 4}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/items', '2026-06-03 19:18:01'),
(102, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"312321\", \"cost\": 1, \"status\": \"active\", \"item_id\": 4, \"variant_name\": \"5.5\", \"selling_price\": 2, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 19:18:41'),
(103, 1, 1, 'inventory', 'create', 'warehouses', NULL, NULL, '{\"body\": {\"code\": \"123\", \"name\": \"main warehouse\", \"status\": \"active\", \"address\": null, \"location_id\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/warehouses', '2026-06-03 19:19:15'),
(104, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 19:19:30'),
(105, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 1, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"20000.0000\", \"item_variant_id\": 2, \"quantity_change\": \"20000.0000\", \"stock_movement_id\": 1}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'asd', '2026-06-03 19:20:06'),
(106, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"asd\", \"unit_cost\": 0.2, \"warehouse_id\": 1, \"item_variant_id\": 2, \"quantity_change\": 20000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 19:20:06'),
(107, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 19:20:35'),
(108, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 6}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 19:23:56'),
(109, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 2, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"10.0000\", \"item_variant_id\": 3, \"quantity_change\": \"10.0000\", \"stock_movement_id\": 2}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'asd', '2026-06-03 19:24:19'),
(110, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"asd\", \"unit_cost\": 0.1, \"warehouse_id\": 1, \"item_variant_id\": 3, \"quantity_change\": 10}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 19:24:19'),
(111, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 3, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"100.0000\", \"item_variant_id\": 1, \"quantity_change\": \"100.0000\", \"stock_movement_id\": 3}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'dsf', '2026-06-03 19:24:32'),
(112, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"dsf\", \"unit_cost\": 0.5, \"warehouse_id\": 1, \"item_variant_id\": 1, \"quantity_change\": 100}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 19:24:32'),
(113, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 6}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 19:24:46'),
(114, 1, 1, 'inventory', 'create', 'packaging_group_assignments', NULL, NULL, '{\"body\": {\"notes\": null, \"warehouse_id\": 1, \"packaging_group_id\": 1, \"charcoal_variant_id\": 4, \"production_batch_id\": null, \"charcoal_quantity_kg\": 6}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments', '2026-06-03 19:25:01'),
(115, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 19:27:57'),
(116, 1, 1, 'inventory', 'update', 'packaging_group_components', 2, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"item\", \"sort_order\": 0, \"capacity_kg\": 0.4, \"unit_symbol\": \"pc\", \"item_variant_id\": 2, \"parent_component_id\": 1, \"quantity_per_parent\": 15}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-group-components/2', '2026-06-03 19:29:15'),
(117, 1, 1, 'inventory', 'update', 'packaging_group_components', 2, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"item\", \"sort_order\": 0, \"capacity_kg\": 0.4, \"unit_symbol\": \"pc\", \"item_variant_id\": 2, \"parent_component_id\": 1, \"quantity_per_parent\": null}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-group-components/2', '2026-06-03 19:29:23'),
(118, 1, 1, 'inventory', 'update', 'packaging_group_components', 1, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"category\", \"sort_order\": 0, \"capacity_kg\": 7, \"unit_symbol\": \"kg\", \"item_variant_id\": 1, \"parent_component_id\": null, \"quantity_per_parent\": null}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-group-components/1', '2026-06-03 19:29:27'),
(119, 1, 1, 'inventory', 'update', 'packaging_group_components', 2, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"item\", \"sort_order\": 0, \"capacity_kg\": 0.4, \"unit_symbol\": \"pc\", \"item_variant_id\": 2, \"parent_component_id\": 1, \"quantity_per_parent\": 15}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-group-components/2', '2026-06-03 19:29:29'),
(120, 1, 1, 'inventory', 'update', 'packaging_group_components', 1, NULL, '{\"body\": {\"notes\": null, \"level_key\": \"category\", \"sort_order\": 0, \"capacity_kg\": 6, \"unit_symbol\": \"kg\", \"item_variant_id\": 1, \"parent_component_id\": null, \"quantity_per_parent\": null}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/packaging-group-components/1', '2026-06-03 19:29:35'),
(121, 1, 1, 'inventory', 'update', 'items', 1, NULL, '{\"body\": {\"code\": \"c\", \"name\": \"cartoon 10kg\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 1, \"description\": \"1\", \"base_unit_id\": 4, \"default_cost\": 0.5, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/items/1', '2026-06-03 19:57:15'),
(122, 1, 1, 'inventory', 'update', 'item_variants', 1, NULL, '{\"body\": {\"sku\": \"123\", \"cost\": 0.5, \"status\": \"active\", \"variant_name\": \"cartoon_10kg\", \"selling_price\": null, \"attributes_json\": {\"capacity_kg\": 10, \"packaging_unit\": \"pc\"}}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/item-variants/1', '2026-06-03 19:57:15'),
(123, 1, 1, 'inventory', 'update', 'items', 2, NULL, '{\"body\": {\"code\": \"333333\", \"name\": \"plastic bag 400g\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0.2, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/items/2', '2026-06-03 19:57:26'),
(124, 1, 1, 'inventory', 'update', 'item_variants', 2, NULL, '{\"body\": {\"sku\": \"3333\", \"cost\": 0.2, \"status\": \"active\", \"variant_name\": \"plastic_bag_400\", \"selling_price\": null, \"attributes_json\": {\"capacity_kg\": 0.4, \"packaging_unit\": \"pc\"}}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/item-variants/2', '2026-06-03 19:57:26'),
(125, 1, 1, 'inventory', 'update', 'items', 3, NULL, '{\"body\": {\"code\": \"456\", \"name\": \"stickers\", \"status\": \"active\", \"item_type\": \"packaging\", \"category_id\": 1, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 0.1, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": null}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/items/3', '2026-06-03 19:57:40'),
(126, 1, 1, 'inventory', 'update', 'item_variants', 3, NULL, '{\"body\": {\"sku\": \"444\", \"cost\": 0.1, \"status\": \"active\", \"variant_name\": \"stickers\", \"selling_price\": null, \"attributes_json\": {\"capacity_kg\": 0, \"packaging_unit\": \"pc\"}}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/item-variants/3', '2026-06-03 19:57:40'),
(127, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 19:58:21'),
(128, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 1, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"30000.0000\", \"item_variant_id\": 2, \"quantity_change\": \"10000.0000\", \"stock_movement_id\": 4}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'yui', '2026-06-03 19:59:02'),
(129, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"yui\", \"unit_cost\": 0.1, \"warehouse_id\": 1, \"item_variant_id\": 2, \"quantity_change\": 10000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 19:59:02'),
(130, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 19:59:19'),
(131, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 2, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"1010.0000\", \"item_variant_id\": 3, \"quantity_change\": \"1000.0000\", \"stock_movement_id\": 5}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', './', '2026-06-03 19:59:51'),
(132, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"./\", \"unit_cost\": null, \"warehouse_id\": 1, \"item_variant_id\": 3, \"quantity_change\": 1000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 19:59:51'),
(133, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 20:00:04'),
(134, 1, 1, 'inventory', 'create', 'packaging_group_assignments', NULL, NULL, '{\"body\": {\"notes\": null, \"warehouse_id\": 1, \"packaging_group_id\": 1, \"charcoal_variant_id\": 4, \"production_batch_id\": null, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments', '2026-06-03 20:00:18'),
(135, 1, 1, 'inventory', 'consume', 'packaging_group_assignments', 2, NULL, '{\"body\": {\"notes\": \"Packaging assignment consumed\"}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments/2/consume', '2026-06-03 20:00:36'),
(136, 1, 1, 'inventory', 'hard', 'packaging_group_assignments', 1, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'DELETE /api/packaging-assignments/1/hard', '2026-06-03 20:00:44'),
(137, 1, 1, 'inventory', 'hard', 'packaging_group_assignments', 2, NULL, '{\"body\": {}, \"query\": {}, \"params\": {\"id\": 2}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'DELETE /api/packaging-assignments/2/hard', '2026-06-03 20:00:47'),
(138, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 900}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 20:01:50'),
(139, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 3, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"10000.0000\", \"item_variant_id\": 1, \"quantity_change\": \"10000.0000\", \"stock_movement_id\": 9}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'lk;', '2026-06-03 20:02:22'),
(140, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"lk;\", \"unit_cost\": null, \"warehouse_id\": 1, \"item_variant_id\": 1, \"quantity_change\": 10000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 20:02:22'),
(141, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 20:02:39'),
(142, 1, 1, 'inventory', 'create', 'packaging_group_assignments', NULL, NULL, '{\"body\": {\"notes\": null, \"warehouse_id\": 1, \"packaging_group_id\": 1, \"charcoal_variant_id\": 4, \"production_batch_id\": null, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments', '2026-06-03 20:02:46'),
(143, 1, 1, 'users', 'create', 'users', NULL, NULL, '{\"body\": {\"email\": \"aswadt101@gmail.com\", \"phone\": \"aswadt11@gmail.com\", \"status\": \"active\", \"role_id\": 5, \"password\": \"12345678\", \"username\": \",.\", \"full_name\": \"tarek Aswad\"}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/users', '2026-06-03 20:04:21'),
(144, 1, 1, 'inventory', 'stock_adjustment', 'stock_balances', 4, NULL, '{\"warehouse_id\": 1, \"quantity_after\": \"1000.0000\", \"item_variant_id\": 4, \"quantity_change\": \"1000.0000\", \"stock_movement_id\": 10}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'yiutg', '2026-06-03 20:17:26'),
(145, 1, 1, 'inventory', 'create', 'stock_movements', NULL, NULL, '{\"body\": {\"reason\": \"yiutg\", \"unit_cost\": null, \"warehouse_id\": 1, \"item_variant_id\": 4, \"quantity_change\": 1000}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/stock-adjustments', '2026-06-03 20:17:26'),
(146, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 20:20:33'),
(147, 1, 1, 'inventory', 'create', 'packaging_group_assignments', NULL, NULL, '{\"body\": {\"notes\": null, \"warehouse_id\": 1, \"packaging_group_id\": 1, \"charcoal_variant_id\": 4, \"production_batch_id\": null, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments', '2026-06-03 20:20:48'),
(148, 1, 1, 'inventory', 'consume', 'packaging_group_assignments', 4, NULL, '{\"body\": {\"notes\": \"Packaging assignment consumed\"}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments/4/consume', '2026-06-03 20:20:52'),
(149, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 20:20:57'),
(150, 1, 1, 'inventory', 'consume', 'packaging_group_assignments', 3, NULL, '{\"body\": {\"notes\": \"Packaging assignment consumed\"}, \"query\": {}, \"params\": {\"id\": 3}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments/3/consume', '2026-06-03 20:24:45'),
(151, 1, 1, 'inventory', 'update', 'items', 4, NULL, '{\"body\": {\"code\": \"123132\", \"name\": \"fa7em 5.5\", \"status\": \"active\", \"item_type\": \"finished_product\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 1, \"default_cost\": 1, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": 4}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/items/4', '2026-06-03 20:38:52');
INSERT INTO `audit_logs` (`id`, `store_id`, `user_id`, `module`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `description`, `created_at`) VALUES
(152, 1, 1, 'inventory', 'update', 'items', 4, NULL, '{\"body\": {\"code\": \"123132\", \"name\": \"fa7em 5.5\", \"status\": \"active\", \"item_type\": \"finished_product\", \"category_id\": 2, \"description\": null, \"base_unit_id\": 4, \"default_cost\": 1, \"reorder_level\": 0, \"tracking_type\": \"stocked\", \"default_selling_price\": 4}, \"query\": {}, \"params\": {\"id\": 4}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'PATCH /api/items/4', '2026-06-03 20:39:13'),
(153, 1, 1, 'inventory', 'create', 'item_variants', NULL, NULL, '{\"body\": {\"sku\": \"12\", \"cost\": 0, \"status\": \"active\", \"item_id\": 4, \"variant_name\": \"asdasdasdasd\", \"selling_price\": 2, \"attributes_json\": null}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/item-variants', '2026-06-03 20:40:21'),
(154, 1, 1, 'inventory', 'calculate', 'packaging_groups', 1, NULL, '{\"body\": {\"warehouse_id\": 1, \"charcoal_quantity_kg\": 600}, \"query\": {}, \"params\": {\"id\": 1}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-groups/1/calculate', '2026-06-03 20:40:36'),
(155, 1, 1, 'inventory', 'create', 'packaging_group_assignments', NULL, NULL, '{\"body\": {\"notes\": null, \"warehouse_id\": 1, \"packaging_group_id\": 1, \"charcoal_variant_id\": 4, \"charcoal_quantity_kg\": 600, \"output_item_variant_id\": 4}, \"query\": {}, \"params\": {}}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'POST /api/packaging-assignments', '2026-06-03 20:40:46');

-- --------------------------------------------------------

--
-- Table structure for table `cash_accounts`
--

CREATE TABLE `cash_accounts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `account_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('cash','bank','wallet','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `opening_balance` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `current_balance` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cash_accounts`
--

INSERT INTO `cash_accounts` (`id`, `store_id`, `account_name`, `account_type`, `opening_balance`, `current_balance`, `status`, `created_at`) VALUES
(1, 1, 'Main Cashbox', 'cash', 0.0000, 0.0000, 'active', '2026-05-27 07:51:19');

-- --------------------------------------------------------

--
-- Table structure for table `commission_calculations`
--

CREATE TABLE `commission_calculations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
) ;

-- --------------------------------------------------------

--
-- Table structure for table `commission_payments`
--

CREATE TABLE `commission_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `commission_calculation_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
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
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
) ;

--
-- Dumping data for table `commission_rules`
--

INSERT INTO `commission_rules` (`id`, `store_id`, `name`, `target_period`, `below_target_rate`, `at_target_rate`, `above_target_extra_rate`, `applies_from`, `applies_to`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'Default Salesman Commission Rule', 'monthly', 5.0000, 10.0000, 1.0000, '2026-05-27', NULL, 'active', NULL, '2026-05-27 07:51:19', '2026-05-27 07:51:19');

-- --------------------------------------------------------

--
-- Table structure for table `company_profiles`
--

CREATE TABLE `company_profiles` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
(1, 1, 'kivaro', '70629775', 'aswadt101@gmail.com', 'saida shammaa highway leen 2 building', 'http://localhost:3000/uploads/1780505733040-WhatsAppImage2026-06-01at90046PM.jpg', 'USD', NULL, '2026-06-03 16:55:34', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `customer_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `assigned_salesman_id` bigint UNSIGNED DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detailed_address` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive','blocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_credits`
--

CREATE TABLE `customer_credits` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `direction` enum('credit','debit') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'credit',
  `amount` decimal(18,4) NOT NULL,
  `source_payment_id` bigint UNSIGNED DEFAULT NULL,
  `customer_debt_id` bigint UNSIGNED DEFAULT NULL,
  `reference_type` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `customer_debts`
--

CREATE TABLE `customer_debts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_request_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_customer_id` bigint UNSIGNED DEFAULT NULL,
  `debt_date` date NOT NULL,
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `original_amount` decimal(18,4) NOT NULL,
  `paid_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `remaining_amount` decimal(18,4) NOT NULL,
  `status` enum('pending','partially_paid','paid','written_off','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `due_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `customer_debt_adjustments`
--

CREATE TABLE `customer_debt_adjustments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `customer_debt_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_request_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_customer_id` bigint UNSIGNED DEFAULT NULL,
  `adjustment_type` enum('write_off','cancel') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `customer_payments`
--

CREATE TABLE `customer_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `customer_debt_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_request_id` bigint UNSIGNED DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collected_by_salesman_id` bigint UNSIGNED DEFAULT NULL,
  `received_by_user_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

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

-- --------------------------------------------------------

--
-- Table structure for table `customer_receipts`
--

CREATE TABLE `customer_receipts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
  `receipt_type` enum('sale','payment','debt','return') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sale',
  `printed_at` datetime DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_customers`
--

CREATE TABLE `dispatch_customers` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `customer_total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `collected_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `debt_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `payment_status` enum('pending','paid','partial_debt','debt','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `receipt_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_items`
--

CREATE TABLE `dispatch_items` (
  `id` bigint UNSIGNED NOT NULL,
  `dispatch_customer_id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `packaging_assignment_id` bigint UNSIGNED DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_price` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_rate` decimal(9,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(18,4) NOT NULL,
  `returned_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_requests`
--

CREATE TABLE `dispatch_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `request_date` date NOT NULL,
  `status` enum('draft','pending_approval','approved','dispatched','partially_settled','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `total_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `subtotal_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `vat_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_collected` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_debt` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `dispatched_by` bigint UNSIGNED DEFAULT NULL,
  `dispatched_at` datetime DEFAULT NULL,
  `completed_by` bigint UNSIGNED DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_returns`
--

CREATE TABLE `dispatch_returns` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `dispatch_item_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `returned_quantity` decimal(18,4) NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_settlements`
--

CREATE TABLE `dispatch_settlements` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `settlement_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settlement_date` date NOT NULL,
  `total_expected` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_collected` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_debt` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_returned_value` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','posted','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `settled_by` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

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
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_signatures`
--

CREATE TABLE `dispatch_signatures` (
  `id` bigint UNSIGNED NOT NULL,
  `dispatch_request_id` bigint UNSIGNED NOT NULL,
  `signer_type` enum('inventory_manager','salesman','accountant','customer') COLLATE utf8mb4_unicode_ci NOT NULL,
  `signer_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `expense_category_id` bigint UNSIGNED NOT NULL,
  `expense_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','voided') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `voided_at` datetime DEFAULT NULL,
  `voided_by` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `store_id`, `name`, `description`, `status`, `created_at`) VALUES
(1, 1, 'Fuel', 'Fuel and vehicle expenses', 'active', '2026-05-27 07:51:19'),
(2, 1, 'Maintenance', 'Vehicle or equipment maintenance', 'active', '2026-05-27 07:51:19'),
(3, 1, 'Rent', 'Warehouse or office rent', 'active', '2026-05-27 07:51:19'),
(4, 1, 'Salaries', 'Staff salaries', 'active', '2026-05-27 07:51:19'),
(5, 1, 'Other', 'Other general expenses', 'active', '2026-05-27 07:51:19');

-- --------------------------------------------------------

--
-- Table structure for table `financial_transactions`
--

CREATE TABLE `financial_transactions` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `cash_account_id` bigint UNSIGNED DEFAULT NULL,
  `transaction_date` datetime NOT NULL,
  `transaction_type` enum('sale_collection','customer_debt_payment','supplier_payment','expense','commission_payment','manual_adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` enum('in','out') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `base_unit_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` enum('raw_charcoal','packaging','finished_product','service','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tracking_type` enum('stocked','non_stocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stocked',
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

INSERT INTO `items` (`id`, `store_id`, `category_id`, `base_unit_id`, `name`, `code`, `item_type`, `tracking_type`, `description`, `default_cost`, `default_selling_price`, `reorder_level`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 4, 'cartoon 10kg', 'c', 'packaging', 'stocked', '1', 0.5000, NULL, 0.0000, 'active', 1, '2026-06-03 19:12:42', '2026-06-03 19:57:15'),
(2, 1, 1, 4, 'plastic bag 400g', '333333', 'packaging', 'stocked', NULL, 0.2000, NULL, 0.0000, 'active', 1, '2026-06-03 19:14:15', NULL),
(3, 1, 1, 4, 'stickers', '456', 'packaging', 'stocked', NULL, 0.1000, NULL, 0.0000, 'active', 1, '2026-06-03 19:14:44', NULL),
(4, 1, 2, 4, 'fa7em 5.5', '123132', 'finished_product', 'stocked', NULL, 1.0000, 4.0000, 0.0000, 'active', 1, '2026-06-03 19:18:01', '2026-06-03 20:39:13');

-- --------------------------------------------------------

--
-- Table structure for table `item_categories`
--

CREATE TABLE `item_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
(1, 1, NULL, 'packaging fa7em', 'p', NULL, 'active', '2026-06-03 19:11:58', NULL),
(2, 1, NULL, 'fa7em', '123', NULL, 'active', '2026-06-03 19:17:33', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `item_variants`
--

CREATE TABLE `item_variants` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `variant_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attributes_json` json DEFAULT NULL,
  `cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `selling_price` decimal(18,4) DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `item_variants`
--

INSERT INTO `item_variants` (`id`, `store_id`, `item_id`, `variant_name`, `sku`, `attributes_json`, `cost`, `selling_price`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'cartoon_10kg', '123', '{\"capacity_kg\": 10, \"packaging_unit\": \"pc\"}', 0.5000, NULL, 'active', '2026-06-03 19:12:42', '2026-06-03 19:57:15'),
(2, 1, 2, 'plastic_bag_400', '3333', '{\"capacity_kg\": 0.4, \"packaging_unit\": \"pc\"}', 0.2000, NULL, 'active', '2026-06-03 19:14:15', '2026-06-03 19:57:26'),
(3, 1, 3, 'stickers', '444', '{\"capacity_kg\": 0, \"packaging_unit\": \"pc\"}', 0.1000, NULL, 'active', '2026-06-03 19:14:44', '2026-06-03 19:57:40'),
(4, 1, 4, '5.5', '312321', NULL, 1.0000, 2.0000, 'active', '2026-06-03 19:18:41', NULL),
(5, 1, 4, 'asdasdasdasd', '12', NULL, 0.0000, 2.0000, 'active', '2026-06-03 20:40:21', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `location_targets`
--

CREATE TABLE `location_targets` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `target_period` enum('daily','weekly','monthly','quarterly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `target_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','active','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

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

-- --------------------------------------------------------

--
-- Table structure for table `packaging_configurations`
--

CREATE TABLE `packaging_configurations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `config_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `output_item_variant_id` bigint UNSIGNED NOT NULL,
  `charcoal_variant_id` bigint UNSIGNED DEFAULT NULL,
  `packaging_type` enum('carton_with_packages','carton_direct','loose_shawl','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `charcoal_quantity_per_output` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `charcoal_unit_id` bigint UNSIGNED DEFAULT NULL,
  `packages_per_carton` int UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `packaging_configuration_components`
--

CREATE TABLE `packaging_configuration_components` (
  `id` bigint UNSIGNED NOT NULL,
  `packaging_configuration_id` bigint UNSIGNED NOT NULL,
  `component_item_variant_id` bigint UNSIGNED NOT NULL,
  `quantity_per_output` decimal(18,4) NOT NULL,
  `unit_id` bigint UNSIGNED NOT NULL,
  `component_role` enum('charcoal','carton','package_bag','sticker','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `waste_percentage` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `packaging_groups`
--

CREATE TABLE `packaging_groups` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `charcoal_variant_id` bigint UNSIGNED DEFAULT NULL,
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

INSERT INTO `packaging_groups` (`id`, `store_id`, `name`, `code`, `charcoal_variant_id`, `default_warehouse_id`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'cartoon 10kg 400g', '322', NULL, NULL, NULL, 'active', 1, '2026-06-03 19:13:34', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `packaging_group_assignments`
--

CREATE TABLE `packaging_group_assignments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `packaging_group_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `charcoal_variant_id` bigint UNSIGNED NOT NULL,
  `output_item_variant_id` bigint UNSIGNED DEFAULT NULL,
  `charcoal_quantity_kg` decimal(18,4) NOT NULL,
  `primary_container_count` int NOT NULL DEFAULT '0',
  `produced_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_packaging_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `cost_per_kg` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('calculated','consumed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'calculated',
  `production_batch_id` bigint UNSIGNED DEFAULT NULL,
  `calculation_json` json DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `consumed_by` bigint UNSIGNED DEFAULT NULL,
  `consumed_movements_json` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `packaging_group_assignments`
--

INSERT INTO `packaging_group_assignments` (`id`, `store_id`, `packaging_group_id`, `warehouse_id`, `charcoal_variant_id`, `output_item_variant_id`, `charcoal_quantity_kg`, `primary_container_count`, `produced_quantity`, `total_packaging_cost`, `cost_per_kg`, `status`, `production_batch_id`, `calculation_json`, `consumed_at`, `consumed_by`, `consumed_movements_json`, `notes`, `created_by`, `created_at`) VALUES
(3, 1, 1, 1, 4, NULL, 600.0000, 100, 0.0000, 365.0000, 0.6083, 'consumed', NULL, '{\"cost_per_kg\": \"0.6083\", \"requirements\": [{\"sku\": \"123\", \"item_name\": \"cartoon 10kg\", \"level_key\": \"category\", \"unit_cost\": \"0.5000\", \"total_cost\": \"50.0000\", \"capacity_kg\": \"6.0000\", \"unit_symbol\": \"kg\", \"component_id\": 1, \"variant_name\": \"cartoon_10kg\", \"item_variant_id\": 1, \"required_quantity\": \"100.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"10000.0000\", \"parent_component_id\": null, \"quantity_per_parent\": null, \"effective_capacity_kg\": \"6.0000\"}, {\"sku\": \"3333\", \"item_name\": \"plastic bag 400g\", \"level_key\": \"item\", \"unit_cost\": \"0.2000\", \"total_cost\": \"300.0000\", \"capacity_kg\": \"0.4000\", \"unit_symbol\": \"pc\", \"component_id\": 2, \"variant_name\": \"plastic_bag_400\", \"item_variant_id\": 2, \"required_quantity\": \"1500.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"28500.0000\", \"parent_component_id\": 1, \"quantity_per_parent\": \"15.0000\", \"effective_capacity_kg\": \"0.4000\"}, {\"sku\": \"444\", \"item_name\": \"stickers\", \"level_key\": \"sub_item\", \"unit_cost\": \"0.1000\", \"total_cost\": \"15.0000\", \"capacity_kg\": null, \"unit_symbol\": \"pc\", \"component_id\": 3, \"variant_name\": \"stickers\", \"item_variant_id\": 3, \"required_quantity\": \"150.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"860.0000\", \"parent_component_id\": 2, \"quantity_per_parent\": \"0.1000\", \"effective_capacity_kg\": \"0.0000\"}], \"packaging_group_id\": 1, \"charcoal_quantity_kg\": \"600.0000\", \"packaging_group_name\": \"cartoon 10kg 400g\", \"total_packaging_cost\": \"365.0000\", \"primary_container_name\": \"cartoon 10kg - cartoon_10kg\", \"primary_container_count\": 100, \"primary_container_capacity_kg\": \"6.0000\", \"primary_container_component_id\": 1}', '2026-06-03 23:24:46', 1, '[{\"component_id\": 1, \"quantity_after\": \"9800.0000\", \"item_variant_id\": 1, \"required_quantity\": \"100.0000\", \"stock_movement_id\": 14}, {\"component_id\": 2, \"quantity_after\": \"25500.0000\", \"item_variant_id\": 2, \"required_quantity\": \"1500.0000\", \"stock_movement_id\": 15}, {\"component_id\": 3, \"quantity_after\": \"560.0000\", \"item_variant_id\": 3, \"required_quantity\": \"150.0000\", \"stock_movement_id\": 16}]', NULL, 1, '2026-06-03 20:02:46'),
(4, 1, 1, 1, 4, NULL, 600.0000, 100, 0.0000, 365.0000, 0.6083, 'consumed', NULL, '{\"cost_per_kg\": \"0.6083\", \"requirements\": [{\"sku\": \"123\", \"item_name\": \"cartoon 10kg\", \"level_key\": \"category\", \"unit_cost\": \"0.5000\", \"total_cost\": \"50.0000\", \"capacity_kg\": \"6.0000\", \"unit_symbol\": \"kg\", \"component_id\": 1, \"variant_name\": \"cartoon_10kg\", \"item_variant_id\": 1, \"required_quantity\": \"100.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"10000.0000\", \"parent_component_id\": null, \"quantity_per_parent\": null, \"effective_capacity_kg\": \"6.0000\"}, {\"sku\": \"3333\", \"item_name\": \"plastic bag 400g\", \"level_key\": \"item\", \"unit_cost\": \"0.2000\", \"total_cost\": \"300.0000\", \"capacity_kg\": \"0.4000\", \"unit_symbol\": \"pc\", \"component_id\": 2, \"variant_name\": \"plastic_bag_400\", \"item_variant_id\": 2, \"required_quantity\": \"1500.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"28500.0000\", \"parent_component_id\": 1, \"quantity_per_parent\": \"15.0000\", \"effective_capacity_kg\": \"0.4000\"}, {\"sku\": \"444\", \"item_name\": \"stickers\", \"level_key\": \"sub_item\", \"unit_cost\": \"0.1000\", \"total_cost\": \"15.0000\", \"capacity_kg\": null, \"unit_symbol\": \"pc\", \"component_id\": 3, \"variant_name\": \"stickers\", \"item_variant_id\": 3, \"required_quantity\": \"150.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"860.0000\", \"parent_component_id\": 2, \"quantity_per_parent\": \"0.1000\", \"effective_capacity_kg\": \"0.0000\"}], \"packaging_group_id\": 1, \"charcoal_quantity_kg\": \"600.0000\", \"packaging_group_name\": \"cartoon 10kg 400g\", \"total_packaging_cost\": \"365.0000\", \"primary_container_name\": \"cartoon 10kg - cartoon_10kg\", \"primary_container_count\": 100, \"primary_container_capacity_kg\": \"6.0000\", \"primary_container_component_id\": 1}', '2026-06-03 23:20:52', 1, '[{\"component_id\": 1, \"quantity_after\": \"9900.0000\", \"item_variant_id\": 1, \"required_quantity\": \"100.0000\", \"stock_movement_id\": 11}, {\"component_id\": 2, \"quantity_after\": \"27000.0000\", \"item_variant_id\": 2, \"required_quantity\": \"1500.0000\", \"stock_movement_id\": 12}, {\"component_id\": 3, \"quantity_after\": \"710.0000\", \"item_variant_id\": 3, \"required_quantity\": \"150.0000\", \"stock_movement_id\": 13}]', NULL, 1, '2026-06-03 20:20:48'),
(5, 1, 1, 1, 4, 4, 600.0000, 100, 0.0000, 365.0000, 0.6083, 'calculated', NULL, '{\"cost_per_kg\": \"0.6083\", \"requirements\": [{\"sku\": \"123\", \"item_name\": \"cartoon 10kg\", \"level_key\": \"category\", \"unit_cost\": \"0.5000\", \"total_cost\": \"50.0000\", \"capacity_kg\": \"6.0000\", \"unit_symbol\": \"kg\", \"component_id\": 1, \"variant_name\": \"cartoon_10kg\", \"item_variant_id\": 1, \"required_quantity\": \"100.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"9800.0000\", \"parent_component_id\": null, \"quantity_per_parent\": null, \"effective_capacity_kg\": \"6.0000\"}, {\"sku\": \"3333\", \"item_name\": \"plastic bag 400g\", \"level_key\": \"item\", \"unit_cost\": \"0.2000\", \"total_cost\": \"300.0000\", \"capacity_kg\": \"0.4000\", \"unit_symbol\": \"pc\", \"component_id\": 2, \"variant_name\": \"plastic_bag_400\", \"item_variant_id\": 2, \"required_quantity\": \"1500.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"25500.0000\", \"parent_component_id\": 1, \"quantity_per_parent\": \"15.0000\", \"effective_capacity_kg\": \"0.4000\"}, {\"sku\": \"444\", \"item_name\": \"stickers\", \"level_key\": \"sub_item\", \"unit_cost\": \"0.1000\", \"total_cost\": \"15.0000\", \"capacity_kg\": null, \"unit_symbol\": \"pc\", \"component_id\": 3, \"variant_name\": \"stickers\", \"item_variant_id\": 3, \"required_quantity\": \"150.0000\", \"shortage_quantity\": \"0.0000\", \"available_quantity\": \"560.0000\", \"parent_component_id\": 2, \"quantity_per_parent\": \"0.1000\", \"effective_capacity_kg\": \"0.0000\"}], \"packaging_group_id\": 1, \"charcoal_quantity_kg\": \"600.0000\", \"packaging_group_name\": \"cartoon 10kg 400g\", \"total_packaging_cost\": \"365.0000\", \"primary_container_name\": \"cartoon 10kg - cartoon_10kg\", \"primary_container_count\": 100, \"primary_container_capacity_kg\": \"6.0000\", \"primary_container_component_id\": 1}', NULL, NULL, NULL, NULL, 1, '2026-06-03 20:40:46');

-- --------------------------------------------------------

--
-- Table structure for table `packaging_group_components`
--

CREATE TABLE `packaging_group_components` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `packaging_group_id` bigint UNSIGNED NOT NULL,
  `parent_component_id` bigint UNSIGNED DEFAULT NULL,
  `level_key` enum('category','item','sub_item','sub_sub_item') COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `unit_symbol` enum('g','kg','ton','pc') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pc',
  `quantity_per_parent` decimal(18,4) DEFAULT NULL,
  `capacity_kg` decimal(18,4) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `packaging_group_components`
--

INSERT INTO `packaging_group_components` (`id`, `store_id`, `packaging_group_id`, `parent_component_id`, `level_key`, `item_variant_id`, `unit_symbol`, `quantity_per_parent`, `capacity_kg`, `sort_order`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NULL, 'category', 1, 'kg', NULL, 6.0000, 0, NULL, '2026-06-03 19:15:32', '2026-06-03 19:29:35'),
(2, 1, 1, 1, 'item', 2, 'pc', 15.0000, 0.4000, 0, NULL, '2026-06-03 19:15:51', '2026-06-03 19:29:15'),
(3, 1, 1, 2, 'sub_item', 3, 'pc', 0.1000, 0.0000, 0, NULL, '2026-06-03 19:16:50', NULL);

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
(1, 'dashboard', 'view', 'dashboard.view', 'View dashboard', '2026-05-27 07:51:19'),
(2, 'users', 'view', 'users.view', 'View users', '2026-05-27 07:51:19'),
(3, 'users', 'create', 'users.create', 'Create users', '2026-05-27 07:51:19'),
(4, 'users', 'update', 'users.update', 'Update users', '2026-05-27 07:51:19'),
(5, 'users', 'delete', 'users.delete', 'Delete users', '2026-05-27 07:51:19'),
(6, 'roles', 'manage', 'roles.manage', 'Manage roles and permissions', '2026-05-27 07:51:19'),
(7, 'inventory', 'view', 'inventory.view', 'View inventory', '2026-05-27 07:51:19'),
(8, 'inventory', 'create', 'inventory.create', 'Create inventory records', '2026-05-27 07:51:19'),
(9, 'inventory', 'update', 'inventory.update', 'Update inventory records', '2026-05-27 07:51:19'),
(10, 'inventory', 'delete', 'inventory.delete', 'Delete inventory records', '2026-05-27 07:51:19'),
(11, 'stock', 'adjust', 'stock.adjust', 'Adjust stock', '2026-05-27 07:51:19'),
(12, 'stock', 'movements', 'stock.movements', 'View stock movements', '2026-05-27 07:51:19'),
(13, 'purchase_orders', 'view', 'purchase_orders.view', 'View purchase orders', '2026-05-27 07:51:19'),
(14, 'purchase_orders', 'create', 'purchase_orders.create', 'Create purchase orders', '2026-05-27 07:51:19'),
(15, 'purchase_orders', 'approve', 'purchase_orders.approve', 'Approve purchase orders', '2026-05-27 07:51:19'),
(16, 'purchase_orders', 'receive', 'purchase_orders.receive', 'Receive purchase orders', '2026-05-27 07:51:19'),
(17, 'purchase_orders', 'cancel', 'purchase_orders.cancel', 'Cancel purchase orders', '2026-05-27 07:51:19'),
(18, 'production', 'view', 'production.view', 'View production and packaging', '2026-05-27 07:51:19'),
(19, 'production', 'create', 'production.create', 'Create production batches', '2026-05-27 07:51:19'),
(20, 'production', 'complete', 'production.complete', 'Complete production batches', '2026-05-27 07:51:19'),
(21, 'locations', 'manage', 'locations.manage', 'Manage locations and sublocations', '2026-05-27 07:51:19'),
(22, 'targets', 'manage', 'targets.manage', 'Manage targets', '2026-05-27 07:51:19'),
(23, 'salesmen', 'manage', 'salesmen.manage', 'Manage salesmen', '2026-05-27 07:51:19'),
(24, 'customers', 'view', 'customers.view', 'View customers', '2026-05-27 07:51:19'),
(25, 'customers', 'create', 'customers.create', 'Create customers', '2026-05-27 07:51:19'),
(26, 'customers', 'update', 'customers.update', 'Update customers', '2026-05-27 07:51:19'),
(27, 'customers', 'delete', 'customers.delete', 'Delete customers', '2026-05-27 07:51:19'),
(28, 'dispatch', 'view', 'dispatch.view', 'View dispatch requests', '2026-05-27 07:51:19'),
(29, 'dispatch', 'create', 'dispatch.create', 'Create dispatch requests', '2026-05-27 07:51:19'),
(30, 'dispatch', 'approve', 'dispatch.approve', 'Approve dispatch requests', '2026-05-27 07:51:19'),
(31, 'dispatch', 'settle', 'dispatch.settle', 'Settle dispatch requests', '2026-05-27 07:51:19'),
(32, 'dispatch', 'print', 'dispatch.print', 'Print dispatch documents', '2026-05-27 07:51:19'),
(33, 'accounting', 'view', 'accounting.view', 'View accounting', '2026-05-27 07:51:19'),
(34, 'accounting', 'manage', 'accounting.manage', 'Manage accounting records', '2026-05-27 07:51:19'),
(35, 'debts', 'manage', 'debts.manage', 'Manage customer debts', '2026-05-27 07:51:19'),
(36, 'commissions', 'manage', 'commissions.manage', 'Manage commissions', '2026-05-27 07:51:19'),
(37, 'reports', 'view', 'reports.view', 'View reports', '2026-05-27 07:51:19'),
(38, 'reports', 'export', 'reports.export', 'Export reports', '2026-05-27 07:51:19'),
(39, 'audit_logs', 'view', 'audit_logs.view', 'View audit logs', '2026-05-27 07:51:19'),
(40, 'settings', 'manage', 'settings.manage', 'Manage system settings', '2026-05-27 07:51:19'),
(41, 'superadmin', 'manage', 'superadmin.manage', 'Manage stores and module availability', '2026-05-27 07:51:19'),
(42, 'vat', 'view', 'vat.view', 'View VAT settings', '2026-05-27 15:29:02'),
(43, 'vat', 'manage', 'vat.manage', 'Manage VAT settings', '2026-05-27 15:29:02');

-- --------------------------------------------------------

--
-- Table structure for table `production_batches`
--

CREATE TABLE `production_batches` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `batch_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `packaging_configuration_id` bigint UNSIGNED DEFAULT NULL,
  `packaging_group_id` bigint UNSIGNED DEFAULT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `charcoal_variant_id` bigint UNSIGNED DEFAULT NULL,
  `output_item_variant_id` bigint UNSIGNED NOT NULL,
  `planned_quantity` decimal(18,4) NOT NULL,
  `produced_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_component_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `cost_per_output` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `production_batch_components`
--

CREATE TABLE `production_batch_components` (
  `id` bigint UNSIGNED NOT NULL,
  `production_batch_id` bigint UNSIGNED NOT NULL,
  `component_item_variant_id` bigint UNSIGNED NOT NULL,
  `planned_quantity` decimal(18,4) NOT NULL,
  `consumed_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `total_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `product_cost_history`
--

CREATE TABLE `product_cost_history` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `packaging_configuration_id` bigint UNSIGNED DEFAULT NULL,
  `calculated_cost` decimal(18,4) NOT NULL,
  `selling_price` decimal(18,4) DEFAULT NULL,
  `profit_amount` decimal(18,4) DEFAULT NULL,
  `profit_margin_percentage` decimal(8,4) DEFAULT NULL,
  `effective_from` datetime NOT NULL,
  `effective_to` datetime DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `po_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` bigint UNSIGNED DEFAULT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
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
) ;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `ordered_quantity` decimal(18,4) NOT NULL,
  `received_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_receipts`
--

CREATE TABLE `purchase_receipts` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `purchase_order_id` bigint UNSIGNED NOT NULL,
  `receipt_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `received_date` date NOT NULL,
  `status` enum('posted','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'posted',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `received_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_receipt_items`
--

CREATE TABLE `purchase_receipt_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_receipt_id` bigint UNSIGNED NOT NULL,
  `purchase_order_item_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `received_quantity` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

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
(1, 1, 'owner', 'System Owner', 'Full access to the entire system.', 1, 'active', '2026-05-27 07:51:19', '2026-05-27 17:49:35'),
(2, 1, 'admin', 'Admin', 'Administrative access.', 1, 'active', '2026-05-27 07:51:19', '2026-05-27 17:49:35'),
(3, 1, 'accountant', 'Accountant', 'Accounting, payments, debts, commissions, settlements.', 1, 'active', '2026-05-27 07:51:19', '2026-05-27 17:49:35'),
(4, 1, 'inventory_manager', 'Inventory Manager', 'Inventory, purchase receiving, stock movements, production.', 1, 'active', '2026-05-27 07:51:19', '2026-05-27 17:49:35'),
(5, 1, 'salesman', 'Salesman / Driver', 'Can create dispatch requests and view own customers/targets.', 1, 'active', '2026-05-27 07:51:19', '2026-05-27 17:49:35'),
(6, 1, 'viewer', 'Viewer', 'Read-only reporting access.', 1, 'active', '2026-05-27 07:51:19', '2026-05-27 17:49:35'),
(7, NULL, 'superadmin', 'Superadmin', 'Platform-level store and module administration.', 1, 'active', '2026-05-27 07:51:19', NULL),
(8, 2, 'owner', 'System Owner', 'Full access to the entire system.', 1, 'active', '2026-05-27 17:52:23', NULL),
(9, 2, 'admin', 'Admin', 'Administrative access.', 1, 'active', '2026-05-27 17:52:23', NULL),
(10, 2, 'accountant', 'Accountant', 'Accounting, payments, debts, commissions, settlements.', 1, 'active', '2026-05-27 17:52:23', NULL),
(11, 2, 'inventory_manager', 'Inventory Manager', 'Inventory, purchase receiving, stock movements, production.', 1, 'active', '2026-05-27 17:52:23', NULL),
(12, 2, 'salesman', 'Salesman / Driver', 'Can create dispatch requests and view own customers/targets.', 1, 'active', '2026-05-27 17:52:23', NULL),
(13, 2, 'viewer', 'Viewer', 'Read-only reporting access.', 1, 'active', '2026-05-27 17:52:23', NULL),
(14, 1, 'test', 'testt', 'asda', 0, 'active', '2026-06-03 16:59:03', NULL);

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
(1, 1, '2026-05-27 07:51:19'),
(1, 2, '2026-05-27 07:51:19'),
(1, 3, '2026-05-27 07:51:19'),
(1, 4, '2026-05-27 07:51:19'),
(1, 5, '2026-05-27 07:51:19'),
(1, 6, '2026-05-27 07:51:19'),
(1, 7, '2026-05-27 07:51:19'),
(1, 8, '2026-05-27 07:51:19'),
(1, 9, '2026-05-27 07:51:19'),
(1, 10, '2026-05-27 07:51:19'),
(1, 11, '2026-05-27 07:51:19'),
(1, 12, '2026-05-27 07:51:19'),
(1, 13, '2026-05-27 07:51:19'),
(1, 14, '2026-05-27 07:51:19'),
(1, 15, '2026-05-27 07:51:19'),
(1, 16, '2026-05-27 07:51:19'),
(1, 17, '2026-05-27 07:51:19'),
(1, 18, '2026-05-27 07:51:19'),
(1, 19, '2026-05-27 07:51:19'),
(1, 20, '2026-05-27 07:51:19'),
(1, 21, '2026-05-27 07:51:19'),
(1, 22, '2026-05-27 07:51:19'),
(1, 23, '2026-05-27 07:51:19'),
(1, 24, '2026-05-27 07:51:19'),
(1, 25, '2026-05-27 07:51:19'),
(1, 26, '2026-05-27 07:51:19'),
(1, 27, '2026-05-27 07:51:19'),
(1, 28, '2026-05-27 07:51:19'),
(1, 29, '2026-05-27 07:51:19'),
(1, 30, '2026-05-27 07:51:19'),
(1, 31, '2026-05-27 07:51:19'),
(1, 32, '2026-05-27 07:51:19'),
(1, 33, '2026-05-27 07:51:19'),
(1, 34, '2026-05-27 07:51:19'),
(1, 35, '2026-05-27 07:51:19'),
(1, 36, '2026-05-27 07:51:19'),
(1, 37, '2026-05-27 07:51:19'),
(1, 38, '2026-05-27 07:51:19'),
(1, 39, '2026-05-27 07:51:19'),
(1, 40, '2026-05-27 07:51:19'),
(1, 42, '2026-05-27 15:29:02'),
(1, 43, '2026-05-27 15:29:02'),
(2, 1, '2026-05-27 07:51:19'),
(2, 2, '2026-05-27 07:51:19'),
(2, 3, '2026-05-27 07:51:19'),
(2, 4, '2026-05-27 07:51:19'),
(2, 5, '2026-05-27 07:51:19'),
(2, 7, '2026-05-27 07:51:19'),
(2, 8, '2026-05-27 07:51:19'),
(2, 9, '2026-05-27 07:51:19'),
(2, 10, '2026-05-27 07:51:19'),
(2, 11, '2026-05-27 07:51:19'),
(2, 12, '2026-05-27 07:51:19'),
(2, 13, '2026-05-27 07:51:19'),
(2, 14, '2026-05-27 07:51:19'),
(2, 15, '2026-05-27 07:51:19'),
(2, 16, '2026-05-27 07:51:19'),
(2, 17, '2026-05-27 07:51:19'),
(2, 18, '2026-05-27 07:51:19'),
(2, 19, '2026-05-27 07:51:19'),
(2, 20, '2026-05-27 07:51:19'),
(2, 21, '2026-05-27 07:51:19'),
(2, 22, '2026-05-27 07:51:19'),
(2, 23, '2026-05-27 07:51:19'),
(2, 24, '2026-05-27 07:51:19'),
(2, 25, '2026-05-27 07:51:19'),
(2, 26, '2026-05-27 07:51:19'),
(2, 27, '2026-05-27 07:51:19'),
(2, 28, '2026-05-27 07:51:19'),
(2, 29, '2026-05-27 07:51:19'),
(2, 30, '2026-05-27 07:51:19'),
(2, 31, '2026-05-27 07:51:19'),
(2, 32, '2026-05-27 07:51:19'),
(2, 33, '2026-05-27 07:51:19'),
(2, 34, '2026-05-27 07:51:19'),
(2, 35, '2026-05-27 07:51:19'),
(2, 36, '2026-05-27 07:51:19'),
(2, 37, '2026-05-27 07:51:19'),
(2, 38, '2026-05-27 07:51:19'),
(2, 39, '2026-05-27 07:51:19'),
(2, 40, '2026-05-27 07:51:19'),
(2, 41, '2026-05-27 07:51:19'),
(2, 42, '2026-05-27 15:29:02'),
(2, 43, '2026-05-27 15:29:02'),
(3, 1, '2026-05-27 07:51:19'),
(3, 24, '2026-05-27 07:51:19'),
(3, 28, '2026-05-27 07:51:19'),
(3, 30, '2026-05-27 07:51:19'),
(3, 31, '2026-05-27 07:51:19'),
(3, 32, '2026-05-27 07:51:19'),
(3, 33, '2026-05-27 07:51:19'),
(3, 34, '2026-05-27 07:51:19'),
(3, 35, '2026-05-27 07:51:19'),
(3, 36, '2026-05-27 07:51:19'),
(3, 37, '2026-05-27 07:51:19'),
(3, 38, '2026-05-27 07:51:19'),
(4, 1, '2026-05-27 07:51:19'),
(4, 7, '2026-05-27 07:51:19'),
(4, 8, '2026-05-27 07:51:19'),
(4, 9, '2026-05-27 07:51:19'),
(4, 11, '2026-05-27 07:51:19'),
(4, 12, '2026-05-27 07:51:19'),
(4, 13, '2026-05-27 07:51:19'),
(4, 14, '2026-05-27 07:51:19'),
(4, 16, '2026-05-27 07:51:19'),
(4, 18, '2026-05-27 07:51:19'),
(4, 19, '2026-05-27 07:51:19'),
(4, 20, '2026-05-27 07:51:19'),
(4, 28, '2026-05-27 07:51:19'),
(4, 32, '2026-05-27 07:51:19'),
(4, 37, '2026-05-27 07:51:19'),
(5, 1, '2026-05-27 07:51:19'),
(5, 24, '2026-05-27 07:51:19'),
(5, 28, '2026-05-27 07:51:19'),
(5, 29, '2026-05-27 07:51:19'),
(5, 32, '2026-05-27 07:51:19'),
(6, 1, '2026-05-27 07:51:19'),
(6, 7, '2026-05-27 07:51:19'),
(6, 24, '2026-05-27 07:51:19'),
(6, 28, '2026-05-27 07:51:19'),
(6, 37, '2026-05-27 07:51:19'),
(7, 41, '2026-05-27 07:51:19'),
(8, 1, '2026-05-27 17:52:23'),
(8, 2, '2026-05-27 17:52:23'),
(8, 3, '2026-05-27 17:52:23'),
(8, 4, '2026-05-27 17:52:23'),
(8, 5, '2026-05-27 17:52:23'),
(8, 6, '2026-05-27 17:52:23'),
(8, 7, '2026-05-27 17:52:23'),
(8, 8, '2026-05-27 17:52:23'),
(8, 9, '2026-05-27 17:52:23'),
(8, 10, '2026-05-27 17:52:23'),
(8, 11, '2026-05-27 17:52:23'),
(8, 12, '2026-05-27 17:52:23'),
(8, 13, '2026-05-27 17:52:23'),
(8, 14, '2026-05-27 17:52:23'),
(8, 15, '2026-05-27 17:52:23'),
(8, 16, '2026-05-27 17:52:23'),
(8, 17, '2026-05-27 17:52:23'),
(8, 18, '2026-05-27 17:52:23'),
(8, 19, '2026-05-27 17:52:23'),
(8, 20, '2026-05-27 17:52:23'),
(8, 21, '2026-05-27 17:52:23'),
(8, 22, '2026-05-27 17:52:23'),
(8, 23, '2026-05-27 17:52:23'),
(8, 24, '2026-05-27 17:52:23'),
(8, 25, '2026-05-27 17:52:23'),
(8, 26, '2026-05-27 17:52:23'),
(8, 27, '2026-05-27 17:52:23'),
(8, 28, '2026-05-27 17:52:23'),
(8, 29, '2026-05-27 17:52:23'),
(8, 30, '2026-05-27 17:52:23'),
(8, 31, '2026-05-27 17:52:23'),
(8, 32, '2026-05-27 17:52:23'),
(8, 33, '2026-05-27 17:52:23'),
(8, 34, '2026-05-27 17:52:23'),
(8, 35, '2026-05-27 17:52:23'),
(8, 36, '2026-05-27 17:52:23'),
(8, 37, '2026-05-27 17:52:23'),
(8, 38, '2026-05-27 17:52:23'),
(8, 39, '2026-05-27 17:52:23'),
(8, 40, '2026-05-27 17:52:23'),
(8, 42, '2026-05-27 17:52:23'),
(8, 43, '2026-05-27 17:52:23'),
(9, 1, '2026-05-27 17:52:23'),
(9, 2, '2026-05-27 17:52:23'),
(9, 3, '2026-05-27 17:52:23'),
(9, 4, '2026-05-27 17:52:23'),
(9, 5, '2026-05-27 17:52:23'),
(9, 7, '2026-05-27 17:52:23'),
(9, 8, '2026-05-27 17:52:23'),
(9, 9, '2026-05-27 17:52:23'),
(9, 10, '2026-05-27 17:52:23'),
(9, 11, '2026-05-27 17:52:23'),
(9, 12, '2026-05-27 17:52:23'),
(9, 13, '2026-05-27 17:52:23'),
(9, 14, '2026-05-27 17:52:23'),
(9, 15, '2026-05-27 17:52:23'),
(9, 16, '2026-05-27 17:52:23'),
(9, 17, '2026-05-27 17:52:23'),
(9, 18, '2026-05-27 17:52:23'),
(9, 19, '2026-05-27 17:52:23'),
(9, 20, '2026-05-27 17:52:23'),
(9, 21, '2026-05-27 17:52:23'),
(9, 22, '2026-05-27 17:52:23'),
(9, 23, '2026-05-27 17:52:23'),
(9, 24, '2026-05-27 17:52:23'),
(9, 25, '2026-05-27 17:52:23'),
(9, 26, '2026-05-27 17:52:23'),
(9, 27, '2026-05-27 17:52:23'),
(9, 28, '2026-05-27 17:52:23'),
(9, 29, '2026-05-27 17:52:23'),
(9, 30, '2026-05-27 17:52:23'),
(9, 31, '2026-05-27 17:52:23'),
(9, 32, '2026-05-27 17:52:23'),
(9, 33, '2026-05-27 17:52:23'),
(9, 34, '2026-05-27 17:52:23'),
(9, 35, '2026-05-27 17:52:23'),
(9, 36, '2026-05-27 17:52:23'),
(9, 37, '2026-05-27 17:52:23'),
(9, 38, '2026-05-27 17:52:23'),
(9, 39, '2026-05-27 17:52:23'),
(9, 40, '2026-05-27 17:52:23'),
(9, 41, '2026-05-27 17:52:23'),
(9, 42, '2026-05-27 17:52:23'),
(9, 43, '2026-05-27 17:52:23'),
(10, 1, '2026-05-27 17:52:23'),
(10, 24, '2026-05-27 17:52:23'),
(10, 28, '2026-05-27 17:52:23'),
(10, 30, '2026-05-27 17:52:23'),
(10, 31, '2026-05-27 17:52:23'),
(10, 32, '2026-05-27 17:52:23'),
(10, 33, '2026-05-27 17:52:23'),
(10, 34, '2026-05-27 17:52:23'),
(10, 35, '2026-05-27 17:52:23'),
(10, 36, '2026-05-27 17:52:23'),
(10, 37, '2026-05-27 17:52:23'),
(10, 38, '2026-05-27 17:52:23'),
(11, 1, '2026-05-27 17:52:23'),
(11, 7, '2026-05-27 17:52:23'),
(11, 8, '2026-05-27 17:52:23'),
(11, 9, '2026-05-27 17:52:23'),
(11, 11, '2026-05-27 17:52:23'),
(11, 12, '2026-05-27 17:52:23'),
(11, 13, '2026-05-27 17:52:23'),
(11, 14, '2026-05-27 17:52:23'),
(11, 16, '2026-05-27 17:52:23'),
(11, 18, '2026-05-27 17:52:23'),
(11, 19, '2026-05-27 17:52:23'),
(11, 20, '2026-05-27 17:52:23'),
(11, 28, '2026-05-27 17:52:23'),
(11, 32, '2026-05-27 17:52:23'),
(11, 37, '2026-05-27 17:52:23'),
(12, 1, '2026-05-27 17:52:23'),
(12, 24, '2026-05-27 17:52:23'),
(12, 28, '2026-05-27 17:52:23'),
(12, 29, '2026-05-27 17:52:23'),
(12, 32, '2026-05-27 17:52:23'),
(13, 1, '2026-05-27 17:52:23'),
(13, 7, '2026-05-27 17:52:23'),
(13, 24, '2026-05-27 17:52:23'),
(13, 28, '2026-05-27 17:52:23'),
(13, 37, '2026-05-27 17:52:23');

-- --------------------------------------------------------

--
-- Table structure for table `salesman_balances`
--

CREATE TABLE `salesman_balances` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
) ;

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
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active_assignment_key` tinyint GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'active') then 1 else NULL end)) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `salesman_targets`
--

CREATE TABLE `salesman_targets` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `sublocation_target_id` bigint UNSIGNED NOT NULL,
  `salesman_id` bigint UNSIGNED NOT NULL,
  `target_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `achieved_sales_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('active','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `active_target_key` tinyint GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'active') then 1 else NULL end)) STORED
) ;

-- --------------------------------------------------------

--
-- Table structure for table `salesmen`
--

CREATE TABLE `salesmen` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `national_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `joined_at` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
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
('001_store_scope_vat_returns.sql', '2026-05-27 15:29:02'),
('002_customer_payment_allocations.sql', '2026-05-27 16:12:45'),
('003_flow_correctness.sql', '2026-05-27 17:07:32'),
('004_flow_correctness_hardening.sql', '2026-05-27 17:49:36'),
('005_store_slugs.sql', '2026-05-27 17:49:37'),
('006_flow_completion.sql', '2026-05-28 00:08:08'),
('007_flow_correctness_audit_hardening.sql', '2026-05-28 01:23:14'),
('008_flow_correctness_live_outstanding.sql', '2026-05-28 01:23:14'),
('009_packaging_hierarchy.sql', '2026-06-03 18:38:53'),
('010_packaging_consumption_reporting.sql', '2026-06-03 18:38:53'),
('011_production_packaging_groups.sql', '2026-06-03 20:21:45'),
('012_assignment_batch_stock.sql', '2026-06-03 20:31:27');

-- --------------------------------------------------------

--
-- Table structure for table `stock_balances`
--

CREATE TABLE `stock_balances` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `quantity_on_hand` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `quantity_reserved` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `average_cost` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `stock_balances`
--

INSERT INTO `stock_balances` (`id`, `store_id`, `warehouse_id`, `item_variant_id`, `quantity_on_hand`, `quantity_reserved`, `average_cost`, `updated_at`) VALUES
(1, 1, 1, 2, 25500.0000, 0.0000, 0.1667, '2026-06-03 20:24:45'),
(2, 1, 1, 3, 560.0000, 0.0000, 0.1000, '2026-06-03 20:24:45'),
(3, 1, 1, 1, 9800.0000, 0.0000, 0.5000, '2026-06-03 20:24:45'),
(4, 1, 1, 4, 1000.0000, 0.0000, 0.0000, '2026-06-03 20:17:26');

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED NOT NULL,
  `movement_type` enum('purchase_receive','production_consume','production_output','dispatch_reserve','dispatch_unreserve','dispatch_out','dispatch_return','sales_settle','damage','adjustment','transfer_in','transfer_out') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_change` decimal(18,4) NOT NULL,
  `quantity_before` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `quantity_after` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reserved_quantity_change` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reserved_quantity_before` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `reserved_quantity_after` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `stock_movements`
--

INSERT INTO `stock_movements` (`id`, `store_id`, `warehouse_id`, `item_variant_id`, `movement_type`, `quantity_change`, `quantity_before`, `quantity_after`, `reserved_quantity_change`, `reserved_quantity_before`, `reserved_quantity_after`, `unit_cost`, `reference_type`, `reference_id`, `notes`, `created_by`, `created_at`) VALUES
(1, 1, 1, 2, 'adjustment', 20000.0000, 0.0000, 20000.0000, 0.0000, 0.0000, 0.0000, 0.2000, 'stock_adjustment', NULL, 'asd', 1, '2026-06-03 19:20:06'),
(2, 1, 1, 3, 'adjustment', 10.0000, 0.0000, 10.0000, 0.0000, 0.0000, 0.0000, 0.1000, 'stock_adjustment', NULL, 'asd', 1, '2026-06-03 19:24:19'),
(3, 1, 1, 1, 'adjustment', 100.0000, 0.0000, 100.0000, 0.0000, 0.0000, 0.0000, 0.5000, 'stock_adjustment', NULL, 'dsf', 1, '2026-06-03 19:24:32'),
(4, 1, 1, 2, 'adjustment', 10000.0000, 20000.0000, 30000.0000, 0.0000, 0.0000, 0.0000, 0.1000, 'stock_adjustment', NULL, 'yui', 1, '2026-06-03 19:59:02'),
(5, 1, 1, 3, 'adjustment', 1000.0000, 10.0000, 1010.0000, 0.0000, 0.0000, 0.0000, NULL, 'stock_adjustment', NULL, './', 1, '2026-06-03 19:59:51'),
(6, 1, 1, 1, 'production_consume', -100.0000, 100.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.5000, 'packaging_assignment', 2, 'Packaging assignment consumed', 1, '2026-06-03 20:00:36'),
(7, 1, 1, 2, 'production_consume', -1500.0000, 30000.0000, 28500.0000, 0.0000, 0.0000, 0.0000, 0.2000, 'packaging_assignment', 2, 'Packaging assignment consumed', 1, '2026-06-03 20:00:36'),
(8, 1, 1, 3, 'production_consume', -150.0000, 1010.0000, 860.0000, 0.0000, 0.0000, 0.0000, 0.1000, 'packaging_assignment', 2, 'Packaging assignment consumed', 1, '2026-06-03 20:00:36'),
(9, 1, 1, 1, 'adjustment', 10000.0000, 0.0000, 10000.0000, 0.0000, 0.0000, 0.0000, NULL, 'stock_adjustment', NULL, 'lk;', 1, '2026-06-03 20:02:22'),
(10, 1, 1, 4, 'adjustment', 1000.0000, 0.0000, 1000.0000, 0.0000, 0.0000, 0.0000, NULL, 'stock_adjustment', NULL, 'yiutg', 1, '2026-06-03 20:17:26'),
(11, 1, 1, 1, 'production_consume', -100.0000, 10000.0000, 9900.0000, 0.0000, 0.0000, 0.0000, 0.5000, 'packaging_assignment', 4, 'Packaging assignment consumed', 1, '2026-06-03 20:20:52'),
(12, 1, 1, 2, 'production_consume', -1500.0000, 28500.0000, 27000.0000, 0.0000, 0.0000, 0.0000, 0.2000, 'packaging_assignment', 4, 'Packaging assignment consumed', 1, '2026-06-03 20:20:52'),
(13, 1, 1, 3, 'production_consume', -150.0000, 860.0000, 710.0000, 0.0000, 0.0000, 0.0000, 0.1000, 'packaging_assignment', 4, 'Packaging assignment consumed', 1, '2026-06-03 20:20:52'),
(14, 1, 1, 1, 'production_consume', -100.0000, 9900.0000, 9800.0000, 0.0000, 0.0000, 0.0000, 0.5000, 'packaging_assignment', 3, 'Packaging assignment consumed', 1, '2026-06-03 20:24:45'),
(15, 1, 1, 2, 'production_consume', -1500.0000, 27000.0000, 25500.0000, 0.0000, 0.0000, 0.0000, 0.2000, 'packaging_assignment', 3, 'Packaging assignment consumed', 1, '2026-06-03 20:24:45'),
(16, 1, 1, 3, 'production_consume', -150.0000, 710.0000, 560.0000, 0.0000, 0.0000, 0.0000, 0.1000, 'packaging_assignment', 3, 'Packaging assignment consumed', 1, '2026-06-03 20:24:45');

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
(1, 'Default Store', 'DEFAULT', 'default', 'active', 'System Owner', NULL, NULL, NULL, 'USD', 'Initial store created during setup.', '2026-05-27 07:51:19', '2026-05-27 17:49:37'),
(2, 'asd', 'asdsa', 'defaultt', 'active', 'asdasd', 'afasf', 'aswadt12@gmail.com', 'Jsnsnwwn\nNsnsnanan', 'USD', NULL, '2026-05-27 17:52:23', NULL);

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
(1, 'inventory.variants', 1, NULL),
(1, 'inventory.warehouses', 1, NULL),
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
(1, 'production', 1, NULL),
(1, 'production.batches', 1, NULL),
(1, 'production.configurations', 1, NULL),
(1, 'production.cost-history', 1, NULL),
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
(1, 'reports.packaging-assignments', 1, NULL),
(1, 'reports.packaging-shortages', 1, NULL),
(1, 'reports.profit-loss', 1, NULL),
(1, 'reports.purchases', 1, NULL),
(1, 'reports.sales', 1, NULL),
(1, 'reports.salesman-target-progress', 1, NULL),
(1, 'reports.stock-movements', 1, NULL),
(1, 'roles', 1, NULL),
(1, 'settings', 1, NULL),
(1, 'settings.vat', 1, NULL),
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
(2, 'inventory.variants', 1, NULL),
(2, 'inventory.warehouses', 1, NULL),
(2, 'locations', 1, NULL),
(2, 'locations.locations', 1, NULL),
(2, 'locations.salesmen', 1, NULL),
(2, 'locations.sublocations', 1, NULL),
(2, 'locations.targets', 1, NULL),
(2, 'notifications', 1, NULL),
(2, 'payments', 1, NULL),
(2, 'payments.customer-payments', 1, NULL),
(2, 'payments.debts', 1, NULL),
(2, 'payments.receipts', 1, NULL),
(2, 'production', 1, NULL),
(2, 'production.batches', 1, NULL),
(2, 'production.configurations', 1, NULL),
(2, 'production.cost-history', 1, NULL),
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
(2, 'reports.packaging-assignments', 1, NULL),
(2, 'reports.packaging-shortages', 1, NULL),
(2, 'reports.profit-loss', 1, NULL),
(2, 'reports.purchases', 1, NULL),
(2, 'reports.sales', 1, NULL),
(2, 'reports.salesman-target-progress', 1, NULL),
(2, 'reports.stock-movements', 1, NULL),
(2, 'roles', 1, NULL),
(2, 'settings', 1, NULL),
(2, 'settings.vat', 1, NULL),
(2, 'users', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sublocations`
--

CREATE TABLE `sublocations` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `location_id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sublocation_targets`
--

CREATE TABLE `sublocation_targets` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `location_target_id` bigint UNSIGNED NOT NULL,
  `sublocation_id` bigint UNSIGNED NOT NULL,
  `target_amount` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('draft','active','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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

-- --------------------------------------------------------

--
-- Table structure for table `supplier_payments`
--

CREATE TABLE `supplier_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `supplier_id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

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
(1, 1, 'sales.vat.enabled', 'true', 'boolean', 'Enable VAT on new customer sale lines', 1, '2026-05-27 11:53:09', '2026-06-03 16:58:21'),
(2, 1, 'sales.vat.rate', '11', 'number', 'VAT percentage applied to new customer sale lines', 1, '2026-05-27 11:53:09', '2026-06-03 16:58:21'),
(5, 2, 'sales.vat.enabled', 'false', 'boolean', 'Enable VAT on new customer sale lines', NULL, '2026-05-27 17:52:23', NULL),
(6, 2, 'sales.vat.rate', '0', 'number', 'VAT percentage applied to new customer sale lines', NULL, '2026-05-27 17:52:23', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
(1, 1, 'Kilogram', 'kg', 'weight', NULL, 1.00000000, '2026-05-27 07:51:19'),
(2, 1, 'Gram', 'g', 'weight', 1, 0.00100000, '2026-05-27 07:51:19'),
(3, 1, 'Ton', 'ton', 'weight', 1, 1000.00000000, '2026-05-27 07:51:19'),
(4, 1, 'Piece', 'pc', 'quantity', NULL, 1.00000000, '2026-05-27 07:51:19'),
(5, 1, 'Carton', 'carton', 'quantity', NULL, 1.00000000, '2026-05-27 07:51:19'),
(6, 1, 'Bag', 'bag', 'quantity', NULL, 1.00000000, '2026-05-27 07:51:19'),
(7, 1, 'cartoon', 'cartoon', 'quantity', 4, 1.00000000, '2026-06-03 17:26:16');

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
(1, 1, 1, 'System Owner', 'owner', 'owner@example.com', NULL, '$2a$12$DoCHH03oy8x/1EjW0pZZe.aFuP8wgfDDDUE5XPlYtVJ7/hHkUdavS', 'active', '2026-06-03 21:15:30', NULL, '2026-05-27 07:51:34', '2026-06-03 18:15:30'),
(2, NULL, 7, 'Platform Superadmin', 'superadmin', 'superadmin@example.com', NULL, '$2a$12$DoCHH03oy8x/1EjW0pZZe.aFuP8wgfDDDUE5XPlYtVJ7/hHkUdavS', 'active', '2026-06-03 20:03:52', NULL, '2026-05-27 07:51:34', '2026-06-03 17:03:52'),
(3, 2, 8, 'tarek Aswad', 'superadmin', 'aswadt12@gmail.com', '12', '$2a$12$uNB7e0UA9stFlgjRsp/7hOc9HJJZrOEALmKnZB7CBoJP/mQek86lO', 'active', NULL, NULL, '2026-05-27 17:52:23', NULL),
(4, 1, 3, 'tarek Aswad', 'tarek', 'aswadt12@gmail.com', '70629775', '$2a$12$5AvYTt669sOeCE9a41EvRuD38XJ9BerhTUoDB0/jgL5y2ViiLS4QS', 'active', '2026-06-03 20:01:18', NULL, '2026-06-03 16:59:35', '2026-06-03 17:01:18'),
(8, 1, 5, 'tarek Aswad', ',.', 'aswadt101@gmail.com', 'aswadt11@gmail.com', '$2a$12$TaxcJszhcOpQ4Pki5UgT6eiZvVQv5sgntilcfeyHJCph9Y4H6X5ii', 'active', NULL, NULL, '2026-06-03 20:04:21', NULL);

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
(1, 2, '66c9c1d70d4dcc576d58cc611873afb6ef71fd8123707e1c37c267c75e47ca6c', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', '2026-05-28 10:55:22', '2026-05-27 11:04:05', '2026-05-27 07:55:22'),
(2, 2, 'be49415d3fbbfb627f3d63259f023db5767079800731c941aa6a5a2424b3c56f', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', '2026-05-28 11:04:20', '2026-05-27 11:04:24', '2026-05-27 08:04:20'),
(3, 1, '1325936d0399ba2d0f871a3ee5103591c4cd16eca7b6258d3e0fea88e409f2ed', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', '2026-05-28 11:05:11', '2026-05-27 14:45:58', '2026-05-27 08:05:11'),
(4, 2, '677c3e336ce1f94dd4f9afebb97795a4b5db15a80b1d5c2c7eab32e650159de9', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 14:46:00', '2026-05-27 14:48:08', '2026-05-27 11:46:00'),
(5, 1, 'ff5c9a5ed9f29653c2e01ffe018baff4427102a3b3d0c91c13dada2556939a89', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 14:48:32', '2026-05-27 18:23:21', '2026-05-27 11:48:32'),
(6, 2, 'f1d3db88ea683e9abd660e87366e5739dd3c021711472fc5a06ebe9ce95b7bb3', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 18:23:25', NULL, '2026-05-27 15:23:25'),
(7, 1, '9ffe8cafa7851b5f5fec4dea3becb5f4d83b3b26735e121fa41745eebf666371', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 18:24:31', NULL, '2026-05-27 15:24:31'),
(8, 1, '3ca47cfa2eb89211818bd6da71b0c6a4d084e55f1be857966b1a13dc4648b77b', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 18:24:45', NULL, '2026-05-27 15:24:45'),
(9, 1, 'dd85e240908e8813fddb3a5cef1ffd64962fb8278269526fe3ecc4f2cb504d31', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 18:24:53', NULL, '2026-05-27 15:24:53'),
(10, 1, 'bc5c0020c112971513f5073b65607ae69a857d51527a67b40fa23f9024f46ad7', '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8457', '2026-05-28 18:29:51', NULL, '2026-05-27 15:29:51'),
(11, 2, 'c47752df09604c9912a08db4bc9fa708d883f378d208ef044100b8f6d577af95', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:04:15', NULL, '2026-05-27 17:04:15'),
(12, 1, 'c6d7b8e13fade74b315930ac816c37fce97ec8f55f1d2967c1666ee4aa2103bb', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:05:58', NULL, '2026-05-27 17:05:58'),
(13, 1, '18a7c37bba36d3f7a50fb94506f060651ce1d2546355e6a828457afcf43f4b32', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:09:01', NULL, '2026-05-27 17:09:01'),
(14, 2, 'fc8e12833b1b58f9a7a50f80d6ab0d9b9220bc2e152c24da063076f9a0699025', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:49:59', '2026-05-27 20:53:38', '2026-05-27 17:49:59'),
(15, 1, 'afec44f7164d39dd45de217ca914ff098b55cb5d979e1ae50ba41c5a74f2fb27', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:50:20', NULL, '2026-05-27 17:50:20'),
(16, 1, '7878df054548b4a5cfe754b6e885b4fd4de558b41273e957e372cd315afb4ac1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:51:48', NULL, '2026-05-27 17:51:48'),
(17, 3, 'cc43f1cf50be011541ddf2956eed57ba708d71630b4b4a48e46231443ea459e2', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:52:28', NULL, '2026-05-27 17:52:29'),
(18, 2, '39f7aec29d233095c29d8bbf595028edae0327c3fea4409e639fed0efbe61ab9', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:53:50', '2026-05-27 20:53:54', '2026-05-27 17:53:50'),
(19, 1, 'dae8f686fed10f73306f7e2d91821d1c5d3ee415f4dc1ce9b94f8ce6a4d1c858', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:54:23', '2026-05-27 20:54:46', '2026-05-27 17:54:23'),
(20, 1, 'c2913cf3c880e3019fed6912ea06ae1660fabdfd6a207d5a35946eb06bd881ee', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 20:54:53', NULL, '2026-05-27 17:54:53'),
(21, 1, '87e18a55b5dbf137385c2dacae27cd1de2f7f8b82d857c494e62b0d61cff0751', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-29 02:57:20', NULL, '2026-05-27 23:57:20'),
(22, 1, '36a9e16ee039663a809c7617c12e6ba755b7f650a4733a9c6bd5ba2dfa24be01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 19:45:38', '2026-06-03 19:59:42', '2026-06-03 16:45:38'),
(23, 1, 'e9154c928222d59240bc39561b7b7f0b491cc7a0b25caac5fb9f927874730dcf', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:00:12', '2026-06-03 20:01:11', '2026-06-03 17:00:12'),
(24, 4, '96aefb26a06326dfdec5b3739d84d46117657827f15cade6e8def0008e813477', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:01:18', '2026-06-03 20:01:36', '2026-06-03 17:01:18'),
(25, 1, '2d478db21784f4099aea603bc13fb3e47013f4afaf10112b587144dca152f392', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:01:44', '2026-06-03 20:02:38', '2026-06-03 17:01:44'),
(26, 2, 'a2dbad95cd864e944140a6ba97b09080fc477e4c8769061a443e82c36b08d792', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:02:57', NULL, '2026-06-03 17:02:57'),
(27, 1, '5f2db9d22c5ad0365d820d3077580b39468550e4b932663f47b10c553ebe2bf3', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:03:08', NULL, '2026-06-03 17:03:08'),
(28, 3, 'b1aa669d7a699abfd3202753089012dec9b9f57f6c90d1e715c0751a5e6b87d6', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:03:15', NULL, '2026-06-03 17:03:15'),
(29, 2, '73781c9454e7410c0a68954018d95390f37ca436506f3bf2c95551625065d5e8', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:03:52', NULL, '2026-06-03 17:03:52'),
(30, 1, '5dc11babf67c6429700fe55f0180e1ae20ffe573474102df7c5bfe27cf582758', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 20:03:59', NULL, '2026-06-03 17:03:59'),
(31, 1, 'f29fc099cd02d8c8fd15526b3676265eb77a12368ecba8a3e49757212d9cbba7', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 21:15:30', NULL, '2026-06-03 18:15:30');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_current_stock`
-- (See below for the actual view)
--
CREATE TABLE `v_current_stock` (
`average_cost` decimal(18,4)
,`item_id` bigint unsigned
,`item_name` varchar(150)
,`item_type` enum('raw_charcoal','packaging','finished_product','service','other')
,`item_variant_id` bigint unsigned
,`quantity_available` decimal(19,4)
,`quantity_on_hand` decimal(18,4)
,`quantity_reserved` decimal(18,4)
,`sku` varchar(100)
,`stock_balance_id` bigint unsigned
,`stock_value` decimal(36,8)
,`store_id` bigint unsigned
,`unit_symbol` varchar(30)
,`variant_name` varchar(150)
,`warehouse_id` bigint unsigned
,`warehouse_name` varchar(150)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_customer_balances`
-- (See below for the actual view)
--
CREATE TABLE `v_customer_balances` (
`available_credit` decimal(40,4)
,`customer_id` bigint unsigned
,`customer_name` varchar(150)
,`location_name` varchar(150)
,`net_customer_balance` decimal(41,4)
,`store_id` bigint unsigned
,`sublocation_name` varchar(150)
,`total_debt_created` decimal(40,4)
,`total_debt_paid` decimal(40,4)
,`total_debt_subtotal` decimal(40,4)
,`total_debt_vat` decimal(40,4)
,`total_remaining_debt` decimal(40,4)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_dispatch_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_dispatch_summary` (
`customers_count` bigint
,`debt_adjustment_amount` decimal(40,4)
,`dispatch_number` varchar(100)
,`dispatch_request_id` bigint unsigned
,`net_subtotal_amount` decimal(65,12)
,`net_total_amount` decimal(65,12)
,`net_vat_amount` decimal(65,12)
,`outstanding_debt_amount` decimal(40,4)
,`request_date` date
,`returned_subtotal_amount` decimal(65,12)
,`returned_total_amount` decimal(65,12)
,`returned_vat_amount` decimal(65,12)
,`salesman_name` varchar(150)
,`status` enum('draft','pending_approval','approved','dispatched','partially_settled','completed','cancelled')
,`store_id` bigint unsigned
,`subtotal_amount` decimal(18,4)
,`total_amount` decimal(18,4)
,`total_collected` decimal(18,4)
,`total_debt` decimal(18,4)
,`total_quantity` decimal(18,4)
,`vat_amount` decimal(18,4)
,`warehouse_name` varchar(150)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_salesman_target_progress`
-- (See below for the actual view)
--
CREATE TABLE `v_salesman_target_progress` (
`achieved_sales_amount` decimal(65,12)
,`achievement_percentage` decimal(52,2)
,`location_name` varchar(150)
,`period_end` date
,`period_start` date
,`salesman_id` bigint unsigned
,`salesman_name` varchar(150)
,`salesman_target_id` bigint unsigned
,`store_id` bigint unsigned
,`sublocation_name` varchar(150)
,`target_amount` decimal(18,4)
,`target_period` enum('daily','weekly','monthly','quarterly','yearly')
);

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
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
(1, 1, 'main warehouse', '123', NULL, NULL, 'active', '2026-06-03 19:19:15', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_module_action` (`module`,`action`),
  ADD KEY `idx_audit_table_record` (`table_name`,`record_id`),
  ADD KEY `fk_audit_logs_user` (`user_id`),
  ADD KEY `fk_audit_logs_store` (`store_id`);

--
-- Indexes for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_name` (`account_name`),
  ADD KEY `fk_cash_accounts_store` (`store_id`);

--
-- Indexes for table `commission_calculations`
--
ALTER TABLE `commission_calculations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_commission_calculations_rule` (`commission_rule_id`),
  ADD KEY `fk_commission_calculations_salesman` (`salesman_id`),
  ADD KEY `fk_commission_calculations_sublocation` (`sublocation_id`),
  ADD KEY `fk_commission_calculations_approved_by` (`approved_by`),
  ADD KEY `fk_commission_calculations_store` (`store_id`),
  ADD KEY `idx_commission_calculations_target_status` (`salesman_target_id`,`status`);

--
-- Indexes for table `commission_payments`
--
ALTER TABLE `commission_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_commission_payments_salesman` (`salesman_id`),
  ADD KEY `fk_commission_payments_paid_by` (`paid_by`),
  ADD KEY `fk_commission_payments_store` (`store_id`),
  ADD KEY `idx_commission_payments_calculation` (`commission_calculation_id`);

--
-- Indexes for table `commission_rules`
--
ALTER TABLE `commission_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_commission_rules_created_by` (`created_by`),
  ADD KEY `fk_commission_rules_store` (`store_id`);

--
-- Indexes for table `company_profiles`
--
ALTER TABLE `company_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_company_profiles_store` (`store_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customers_store_code` (`store_id`,`customer_code`),
  ADD KEY `fk_customers_location` (`location_id`),
  ADD KEY `fk_customers_sublocation` (`sublocation_id`),
  ADD KEY `fk_customers_salesman` (`assigned_salesman_id`),
  ADD KEY `fk_customers_created_by` (`created_by`);

--
-- Indexes for table `customer_credits`
--
ALTER TABLE `customer_credits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_credits_customer` (`store_id`,`customer_id`,`created_at`),
  ADD KEY `fk_customer_credits_customer` (`customer_id`),
  ADD KEY `fk_customer_credits_payment` (`source_payment_id`),
  ADD KEY `fk_customer_credits_debt` (`customer_debt_id`),
  ADD KEY `fk_customer_credits_created_by` (`created_by`);

--
-- Indexes for table `customer_debts`
--
ALTER TABLE `customer_debts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_customer_debts_customer` (`customer_id`),
  ADD KEY `fk_customer_debts_salesman` (`salesman_id`),
  ADD KEY `fk_customer_debts_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_customer_debts_created_by` (`created_by`),
  ADD KEY `idx_customer_debts_status_balance` (`store_id`,`customer_id`,`status`,`remaining_amount`),
  ADD KEY `idx_customer_debts_dispatch_balance` (`dispatch_request_id`,`dispatch_customer_id`,`salesman_id`,`status`,`remaining_amount`);

--
-- Indexes for table `customer_debt_adjustments`
--
ALTER TABLE `customer_debt_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_debt_adjustments_debt` (`customer_debt_id`),
  ADD KEY `idx_debt_adjustments_dispatch` (`dispatch_request_id`,`dispatch_customer_id`),
  ADD KEY `idx_debt_adjustments_store_customer` (`store_id`,`customer_id`),
  ADD KEY `fk_debt_adjustments_customer` (`customer_id`),
  ADD KEY `fk_debt_adjustments_salesman` (`salesman_id`),
  ADD KEY `fk_debt_adjustments_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_debt_adjustments_created_by` (`created_by`);

--
-- Indexes for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_customer_payments_customer` (`customer_id`),
  ADD KEY `fk_customer_payments_debt` (`customer_debt_id`),
  ADD KEY `fk_customer_payments_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_customer_payments_collected_by_salesman` (`collected_by_salesman_id`),
  ADD KEY `fk_customer_payments_received_by_user` (`received_by_user_id`),
  ADD KEY `fk_customer_payments_store` (`store_id`);

--
-- Indexes for table `customer_payment_allocations`
--
ALTER TABLE `customer_payment_allocations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_customer_payment_allocations_payment` (`customer_payment_id`),
  ADD KEY `idx_payment_allocations_debt` (`customer_debt_id`);

--
-- Indexes for table `customer_receipts`
--
ALTER TABLE `customer_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_receipts_store_number` (`store_id`,`receipt_number`),
  ADD KEY `fk_customer_receipts_customer` (`customer_id`),
  ADD KEY `fk_customer_receipts_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_customer_receipts_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_customer_receipts_payment` (`customer_payment_id`),
  ADD KEY `fk_customer_receipts_created_by` (`created_by`);

--
-- Indexes for table `dispatch_customers`
--
ALTER TABLE `dispatch_customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dispatch_customer` (`dispatch_request_id`,`customer_id`),
  ADD UNIQUE KEY `uq_dispatch_customers_store_receipt` (`store_id`,`receipt_number`),
  ADD KEY `fk_dispatch_customers_customer` (`customer_id`),
  ADD KEY `fk_dispatch_customers_location` (`location_id`),
  ADD KEY `fk_dispatch_customers_sublocation` (`sublocation_id`);

--
-- Indexes for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_dispatch_items_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_dispatch_items_variant` (`item_variant_id`),
  ADD KEY `idx_dispatch_items_request_variant` (`dispatch_request_id`,`item_variant_id`),
  ADD KEY `idx_dispatch_items_packaging_assignment` (`packaging_assignment_id`);

--
-- Indexes for table `dispatch_requests`
--
ALTER TABLE `dispatch_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dispatch_requests_store_number` (`store_id`,`dispatch_number`),
  ADD KEY `fk_dispatch_requests_salesman` (`salesman_id`),
  ADD KEY `fk_dispatch_requests_warehouse` (`warehouse_id`),
  ADD KEY `fk_dispatch_requests_approved_by` (`approved_by`),
  ADD KEY `fk_dispatch_requests_dispatched_by` (`dispatched_by`),
  ADD KEY `fk_dispatch_requests_completed_by` (`completed_by`),
  ADD KEY `fk_dispatch_requests_created_by` (`created_by`);

--
-- Indexes for table `dispatch_returns`
--
ALTER TABLE `dispatch_returns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_dispatch_returns_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_dispatch_returns_dispatch_item` (`dispatch_item_id`),
  ADD KEY `fk_dispatch_returns_variant` (`item_variant_id`),
  ADD KEY `fk_dispatch_returns_created_by` (`created_by`),
  ADD KEY `fk_dispatch_returns_store` (`store_id`);

--
-- Indexes for table `dispatch_settlements`
--
ALTER TABLE `dispatch_settlements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dispatch_settlements_store_number` (`store_id`,`settlement_number`),
  ADD KEY `fk_dispatch_settlements_settled_by` (`settled_by`),
  ADD KEY `idx_dispatch_settlements_dispatch_status` (`dispatch_request_id`,`status`);

--
-- Indexes for table `dispatch_settlement_customers`
--
ALTER TABLE `dispatch_settlement_customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_settlement_customer` (`dispatch_settlement_id`,`dispatch_customer_id`),
  ADD KEY `fk_settlement_customers_dispatch_customer` (`dispatch_customer_id`),
  ADD KEY `fk_settlement_customers_customer` (`customer_id`),
  ADD KEY `idx_settlement_customers_settlement` (`dispatch_settlement_id`,`dispatch_customer_id`);

--
-- Indexes for table `dispatch_signatures`
--
ALTER TABLE `dispatch_signatures`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_dispatch_signatures_dispatch` (`dispatch_request_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_expenses_category` (`expense_category_id`),
  ADD KEY `fk_expenses_created_by` (`created_by`),
  ADD KEY `fk_expenses_store` (`store_id`);

--
-- Indexes for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `fk_expense_categories_store` (`store_id`);

--
-- Indexes for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_financial_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_financial_transactions_cash_account` (`cash_account_id`),
  ADD KEY `fk_financial_transactions_created_by` (`created_by`),
  ADD KEY `fk_financial_transactions_store` (`store_id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_items_store_code` (`store_id`,`code`),
  ADD KEY `fk_items_category` (`category_id`),
  ADD KEY `fk_items_base_unit` (`base_unit_id`),
  ADD KEY `fk_items_created_by` (`created_by`);

--
-- Indexes for table `item_categories`
--
ALTER TABLE `item_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_categories_store_code` (`store_id`,`code`),
  ADD KEY `fk_item_categories_parent` (`parent_id`);

--
-- Indexes for table `item_variants`
--
ALTER TABLE `item_variants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_variants_store_sku` (`store_id`,`sku`),
  ADD KEY `fk_item_variants_item` (`item_id`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_locations_store_code` (`store_id`,`code`),
  ADD KEY `fk_locations_created_by` (`created_by`);

--
-- Indexes for table `location_targets`
--
ALTER TABLE `location_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_location_target_period` (`location_id`,`period_start`,`period_end`),
  ADD KEY `fk_location_targets_created_by` (`created_by`),
  ADD KEY `fk_location_targets_store` (`store_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_notifications_user` (`user_id`),
  ADD KEY `fk_notifications_store` (`store_id`);

--
-- Indexes for table `packaging_configurations`
--
ALTER TABLE `packaging_configurations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_packaging_config_output_variant` (`output_item_variant_id`),
  ADD KEY `fk_packaging_config_charcoal_variant` (`charcoal_variant_id`),
  ADD KEY `fk_packaging_config_charcoal_unit` (`charcoal_unit_id`),
  ADD KEY `fk_packaging_config_created_by` (`created_by`),
  ADD KEY `fk_packaging_configurations_store` (`store_id`);

--
-- Indexes for table `packaging_configuration_components`
--
ALTER TABLE `packaging_configuration_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_packaging_components_config` (`packaging_configuration_id`),
  ADD KEY `fk_packaging_components_variant` (`component_item_variant_id`),
  ADD KEY `fk_packaging_components_unit` (`unit_id`);

--
-- Indexes for table `packaging_groups`
--
ALTER TABLE `packaging_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_packaging_groups_store_code` (`store_id`,`code`),
  ADD KEY `fk_packaging_groups_default_warehouse` (`default_warehouse_id`),
  ADD KEY `fk_packaging_groups_created_by` (`created_by`),
  ADD KEY `idx_packaging_groups_store_status` (`store_id`,`status`),
  ADD KEY `idx_packaging_groups_charcoal_variant` (`charcoal_variant_id`);

--
-- Indexes for table `packaging_group_assignments`
--
ALTER TABLE `packaging_group_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_packaging_assignments_created_by` (`created_by`),
  ADD KEY `idx_packaging_assignments_store_created` (`store_id`,`created_at`),
  ADD KEY `idx_packaging_assignments_group` (`packaging_group_id`),
  ADD KEY `idx_packaging_assignments_warehouse` (`warehouse_id`),
  ADD KEY `idx_packaging_assignments_charcoal_variant` (`charcoal_variant_id`),
  ADD KEY `fk_packaging_assignments_consumed_by` (`consumed_by`),
  ADD KEY `idx_packaging_assignments_status` (`store_id`,`status`),
  ADD KEY `idx_packaging_assignments_production_batch` (`production_batch_id`),
  ADD KEY `idx_packaging_group_assignments_output_variant` (`output_item_variant_id`);

--
-- Indexes for table `packaging_group_components`
--
ALTER TABLE `packaging_group_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_packaging_group_components_store` (`store_id`),
  ADD KEY `idx_packaging_group_components_group_level` (`packaging_group_id`,`level_key`,`sort_order`),
  ADD KEY `idx_packaging_group_components_parent` (`parent_component_id`),
  ADD KEY `idx_packaging_group_components_variant` (`item_variant_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permission_key` (`permission_key`);

--
-- Indexes for table `production_batches`
--
ALTER TABLE `production_batches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `batch_number` (`batch_number`),
  ADD KEY `fk_production_batches_config` (`packaging_configuration_id`),
  ADD KEY `fk_production_batches_warehouse` (`warehouse_id`),
  ADD KEY `fk_production_batches_output_variant` (`output_item_variant_id`),
  ADD KEY `fk_production_batches_created_by` (`created_by`),
  ADD KEY `fk_production_batches_store` (`store_id`),
  ADD KEY `fk_production_batches_charcoal_variant` (`charcoal_variant_id`),
  ADD KEY `idx_production_batches_packaging_group` (`packaging_group_id`);

--
-- Indexes for table `production_batch_components`
--
ALTER TABLE `production_batch_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_production_components_batch` (`production_batch_id`),
  ADD KEY `fk_production_components_variant` (`component_item_variant_id`);

--
-- Indexes for table `product_cost_history`
--
ALTER TABLE `product_cost_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_product_cost_history_variant` (`item_variant_id`),
  ADD KEY `fk_product_cost_history_config` (`packaging_configuration_id`),
  ADD KEY `fk_product_cost_history_created_by` (`created_by`),
  ADD KEY `fk_product_cost_history_store` (`store_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_purchase_orders_store_number` (`store_id`,`po_number`),
  ADD KEY `fk_purchase_orders_supplier` (`supplier_id`),
  ADD KEY `fk_purchase_orders_warehouse` (`warehouse_id`),
  ADD KEY `fk_purchase_orders_created_by` (`created_by`),
  ADD KEY `fk_purchase_orders_approved_by` (`approved_by`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_purchase_order_items_po` (`purchase_order_id`),
  ADD KEY `fk_purchase_order_items_variant` (`item_variant_id`);

--
-- Indexes for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_purchase_receipts_store_number` (`store_id`,`receipt_number`),
  ADD KEY `fk_purchase_receipts_po` (`purchase_order_id`),
  ADD KEY `fk_purchase_receipts_received_by` (`received_by`);

--
-- Indexes for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_purchase_receipt_items_receipt` (`purchase_receipt_id`),
  ADD KEY `fk_purchase_receipt_items_po_item` (`purchase_order_item_id`),
  ADD KEY `fk_purchase_receipt_items_variant` (`item_variant_id`);

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
  ADD KEY `fk_salesman_balances_salesman` (`salesman_id`),
  ADD KEY `fk_salesman_balances_dispatch` (`dispatch_request_id`),
  ADD KEY `fk_salesman_balances_closed_by` (`closed_by`),
  ADD KEY `idx_salesman_balances_status` (`store_id`,`salesman_id`,`status`);

--
-- Indexes for table `salesman_sublocations`
--
ALTER TABLE `salesman_sublocations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salesman_active_sublocation` (`salesman_id`,`sublocation_id`,`active_assignment_key`),
  ADD KEY `idx_salesman_sublocations_salesman_fk` (`salesman_id`),
  ADD KEY `idx_salesman_sublocations_sublocation_fk` (`sublocation_id`);

--
-- Indexes for table `salesman_targets`
--
ALTER TABLE `salesman_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salesman_target_sublocation_target` (`sublocation_target_id`,`salesman_id`,`active_target_key`),
  ADD KEY `fk_salesman_targets_store` (`store_id`),
  ADD KEY `idx_salesman_targets_sublocation_target_fk` (`sublocation_target_id`),
  ADD KEY `idx_salesman_targets_salesman_fk` (`salesman_id`);

--
-- Indexes for table `salesmen`
--
ALTER TABLE `salesmen`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `fk_salesmen_store` (`store_id`);

--
-- Indexes for table `schema_migrations`
--
ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`migration_name`);

--
-- Indexes for table `stock_balances`
--
ALTER TABLE `stock_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_stock_warehouse_variant` (`warehouse_id`,`item_variant_id`),
  ADD KEY `fk_stock_balances_variant` (`item_variant_id`),
  ADD KEY `idx_stock_balances_store_variant` (`store_id`,`item_variant_id`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stock_movements_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_stock_movements_warehouse` (`warehouse_id`),
  ADD KEY `fk_stock_movements_variant` (`item_variant_id`),
  ADD KEY `fk_stock_movements_created_by` (`created_by`),
  ADD KEY `fk_stock_movements_store` (`store_id`);

--
-- Indexes for table `stores`
--
ALTER TABLE `stores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
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
  ADD UNIQUE KEY `uq_sublocation_location_name` (`location_id`,`name`),
  ADD KEY `fk_sublocations_created_by` (`created_by`),
  ADD KEY `fk_sublocations_store` (`store_id`);

--
-- Indexes for table `sublocation_targets`
--
ALTER TABLE `sublocation_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sublocation_target_period` (`location_target_id`,`sublocation_id`),
  ADD KEY `fk_sublocation_targets_sublocation` (`sublocation_id`),
  ADD KEY `fk_sublocation_targets_store` (`store_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_suppliers_created_by` (`created_by`),
  ADD KEY `fk_suppliers_store` (`store_id`);

--
-- Indexes for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_supplier_payments_supplier` (`supplier_id`),
  ADD KEY `fk_supplier_payments_created_by` (`created_by`),
  ADD KEY `fk_supplier_payments_store` (`store_id`),
  ADD KEY `idx_supplier_payments_po` (`purchase_order_id`,`payment_date`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_system_settings_store_key` (`store_id`,`setting_key`),
  ADD KEY `fk_system_settings_updated_by` (`updated_by`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_units_store_symbol` (`store_id`,`symbol`),
  ADD KEY `fk_units_base_unit` (`base_unit_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_store_username` (`store_id`,`username`),
  ADD UNIQUE KEY `uq_users_store_email` (`store_id`,`email`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user_sessions_user` (`user_id`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_warehouses_store_code` (`store_id`,`code`),
  ADD KEY `fk_warehouses_location` (`location_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=156;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_profiles`
--
ALTER TABLE `company_profiles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_customers`
--
ALTER TABLE `dispatch_customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_requests`
--
ALTER TABLE `dispatch_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_returns`
--
ALTER TABLE `dispatch_returns`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_settlements`
--
ALTER TABLE `dispatch_settlements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_settlement_customers`
--
ALTER TABLE `dispatch_settlement_customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_signatures`
--
ALTER TABLE `dispatch_signatures`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
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
-- AUTO_INCREMENT for table `item_variants`
--
ALTER TABLE `item_variants`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `location_targets`
--
ALTER TABLE `location_targets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `packaging_configurations`
--
ALTER TABLE `packaging_configurations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `packaging_configuration_components`
--
ALTER TABLE `packaging_configuration_components`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `packaging_groups`
--
ALTER TABLE `packaging_groups`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `packaging_group_assignments`
--
ALTER TABLE `packaging_group_assignments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `packaging_group_components`
--
ALTER TABLE `packaging_group_components`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `production_batches`
--
ALTER TABLE `production_batches`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `production_batch_components`
--
ALTER TABLE `production_batch_components`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_cost_history`
--
ALTER TABLE `product_cost_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `salesman_balances`
--
ALTER TABLE `salesman_balances`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salesman_sublocations`
--
ALTER TABLE `salesman_sublocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salesman_targets`
--
ALTER TABLE `salesman_targets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salesmen`
--
ALTER TABLE `salesmen`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_balances`
--
ALTER TABLE `stock_balances`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sublocation_targets`
--
ALTER TABLE `sublocation_targets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

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

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_current_stock`  AS SELECT `sb`.`id` AS `stock_balance_id`, `sb`.`store_id` AS `store_id`, `w`.`id` AS `warehouse_id`, `w`.`name` AS `warehouse_name`, `i`.`id` AS `item_id`, `i`.`name` AS `item_name`, `i`.`item_type` AS `item_type`, `iv`.`id` AS `item_variant_id`, `iv`.`variant_name` AS `variant_name`, `iv`.`sku` AS `sku`, `u`.`symbol` AS `unit_symbol`, `sb`.`quantity_on_hand` AS `quantity_on_hand`, `sb`.`quantity_reserved` AS `quantity_reserved`, (`sb`.`quantity_on_hand` - `sb`.`quantity_reserved`) AS `quantity_available`, `sb`.`average_cost` AS `average_cost`, (`sb`.`quantity_on_hand` * `sb`.`average_cost`) AS `stock_value` FROM ((((`stock_balances` `sb` join `warehouses` `w` on((`w`.`id` = `sb`.`warehouse_id`))) join `item_variants` `iv` on((`iv`.`id` = `sb`.`item_variant_id`))) join `items` `i` on((`i`.`id` = `iv`.`item_id`))) join `units` `u` on((`u`.`id` = `i`.`base_unit_id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_customer_balances`
--
DROP TABLE IF EXISTS `v_customer_balances`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_customer_balances`  AS SELECT `c`.`id` AS `customer_id`, `c`.`store_id` AS `store_id`, `c`.`name` AS `customer_name`, `l`.`name` AS `location_name`, `sl`.`name` AS `sublocation_name`, coalesce(sum(`cd`.`subtotal_amount`),0) AS `total_debt_subtotal`, coalesce(sum(`cd`.`vat_amount`),0) AS `total_debt_vat`, coalesce(sum(`cd`.`original_amount`),0) AS `total_debt_created`, coalesce(sum(`cd`.`paid_amount`),0) AS `total_debt_paid`, coalesce(sum(`cd`.`remaining_amount`),0) AS `total_remaining_debt`, coalesce(`credits`.`available_credit`,0) AS `available_credit`, greatest((coalesce(sum(`cd`.`remaining_amount`),0) - coalesce(`credits`.`available_credit`,0)),0) AS `net_customer_balance` FROM ((((`customers` `c` join `locations` `l` on((`l`.`id` = `c`.`location_id`))) join `sublocations` `sl` on((`sl`.`id` = `c`.`sublocation_id`))) left join `customer_debts` `cd` on(((`cd`.`customer_id` = `c`.`id`) and (`cd`.`status` in ('pending','partially_paid'))))) left join (select `customer_credits`.`customer_id` AS `customer_id`,`customer_credits`.`store_id` AS `store_id`,coalesce(sum((case when (`customer_credits`.`direction` = 'credit') then `customer_credits`.`amount` else -(`customer_credits`.`amount`) end)),0) AS `available_credit` from `customer_credits` group by `customer_credits`.`customer_id`,`customer_credits`.`store_id`) `credits` on(((`credits`.`customer_id` = `c`.`id`) and (`credits`.`store_id` = `c`.`store_id`)))) GROUP BY `c`.`id`, `c`.`store_id`, `c`.`name`, `l`.`name`, `sl`.`name`, `credits`.`available_credit` ;

-- --------------------------------------------------------

--
-- Structure for view `v_dispatch_summary`
--
DROP TABLE IF EXISTS `v_dispatch_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_dispatch_summary`  AS SELECT `dr`.`id` AS `dispatch_request_id`, `dr`.`store_id` AS `store_id`, `dr`.`dispatch_number` AS `dispatch_number`, `dr`.`request_date` AS `request_date`, `dr`.`status` AS `status`, `s`.`full_name` AS `salesman_name`, `w`.`name` AS `warehouse_name`, coalesce(`customers`.`customers_count`,0) AS `customers_count`, `dr`.`total_quantity` AS `total_quantity`, `dr`.`subtotal_amount` AS `subtotal_amount`, `dr`.`vat_amount` AS `vat_amount`, `dr`.`total_amount` AS `total_amount`, coalesce(`items`.`returned_subtotal_amount`,0) AS `returned_subtotal_amount`, coalesce(`items`.`returned_vat_amount`,0) AS `returned_vat_amount`, coalesce(`items`.`returned_total_amount`,0) AS `returned_total_amount`, greatest((`dr`.`subtotal_amount` - coalesce(`items`.`returned_subtotal_amount`,0)),0) AS `net_subtotal_amount`, greatest((`dr`.`vat_amount` - coalesce(`items`.`returned_vat_amount`,0)),0) AS `net_vat_amount`, greatest((`dr`.`total_amount` - coalesce(`items`.`returned_total_amount`,0)),0) AS `net_total_amount`, `dr`.`total_collected` AS `total_collected`, `dr`.`total_debt` AS `total_debt`, coalesce(`adjustments`.`debt_adjustment_amount`,0) AS `debt_adjustment_amount`, coalesce(`debts`.`outstanding_debt_amount`,0) AS `outstanding_debt_amount` FROM ((((((`dispatch_requests` `dr` join `salesmen` `s` on((`s`.`id` = `dr`.`salesman_id`))) join `warehouses` `w` on((`w`.`id` = `dr`.`warehouse_id`))) left join (select `dispatch_customers`.`dispatch_request_id` AS `dispatch_request_id`,count(distinct `dispatch_customers`.`customer_id`) AS `customers_count` from `dispatch_customers` group by `dispatch_customers`.`dispatch_request_id`) `customers` on((`customers`.`dispatch_request_id` = `dr`.`id`))) left join (select `dispatch_items`.`dispatch_request_id` AS `dispatch_request_id`,coalesce(sum((case when (`dispatch_items`.`quantity` > 0) then ((`dispatch_items`.`subtotal_amount` * `dispatch_items`.`returned_quantity`) / `dispatch_items`.`quantity`) else 0 end)),0) AS `returned_subtotal_amount`,coalesce(sum((case when (`dispatch_items`.`quantity` > 0) then ((`dispatch_items`.`vat_amount` * `dispatch_items`.`returned_quantity`) / `dispatch_items`.`quantity`) else 0 end)),0) AS `returned_vat_amount`,coalesce(sum((case when (`dispatch_items`.`quantity` > 0) then ((`dispatch_items`.`line_total` * `dispatch_items`.`returned_quantity`) / `dispatch_items`.`quantity`) else 0 end)),0) AS `returned_total_amount` from `dispatch_items` group by `dispatch_items`.`dispatch_request_id`) `items` on((`items`.`dispatch_request_id` = `dr`.`id`))) left join (select `customer_debt_adjustments`.`dispatch_request_id` AS `dispatch_request_id`,coalesce(sum(`customer_debt_adjustments`.`amount`),0) AS `debt_adjustment_amount` from `customer_debt_adjustments` group by `customer_debt_adjustments`.`dispatch_request_id`) `adjustments` on((`adjustments`.`dispatch_request_id` = `dr`.`id`))) left join (select `customer_debts`.`dispatch_request_id` AS `dispatch_request_id`,coalesce(sum(`customer_debts`.`remaining_amount`),0) AS `outstanding_debt_amount` from `customer_debts` where (`customer_debts`.`status` in ('pending','partially_paid')) group by `customer_debts`.`dispatch_request_id`) `debts` on((`debts`.`dispatch_request_id` = `dr`.`id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_salesman_target_progress`
--
DROP TABLE IF EXISTS `v_salesman_target_progress`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_salesman_target_progress`  AS SELECT `progress`.`salesman_target_id` AS `salesman_target_id`, `progress`.`store_id` AS `store_id`, `progress`.`salesman_id` AS `salesman_id`, `progress`.`salesman_name` AS `salesman_name`, `progress`.`location_name` AS `location_name`, `progress`.`sublocation_name` AS `sublocation_name`, `progress`.`target_period` AS `target_period`, `progress`.`period_start` AS `period_start`, `progress`.`period_end` AS `period_end`, `progress`.`target_amount` AS `target_amount`, `progress`.`achieved_sales_amount` AS `achieved_sales_amount`, (case when (`progress`.`target_amount` = 0) then 0 else round(((`progress`.`achieved_sales_amount` / `progress`.`target_amount`) * 100),2) end) AS `achievement_percentage` FROM (select `st`.`id` AS `salesman_target_id`,`st`.`store_id` AS `store_id`,`s`.`id` AS `salesman_id`,`s`.`full_name` AS `salesman_name`,`l`.`name` AS `location_name`,`sl`.`name` AS `sublocation_name`,`lt`.`target_period` AS `target_period`,`lt`.`period_start` AS `period_start`,`lt`.`period_end` AS `period_end`,`st`.`target_amount` AS `target_amount`,coalesce((select sum((case when (`di`.`quantity` > 0) then (`di`.`line_total` - ((`di`.`line_total` * `di`.`returned_quantity`) / `di`.`quantity`)) else `di`.`line_total` end)) from ((`dispatch_items` `di` join `dispatch_customers` `dc` on((`dc`.`id` = `di`.`dispatch_customer_id`))) join `dispatch_requests` `dr` on((`dr`.`id` = `di`.`dispatch_request_id`))) where ((`dr`.`salesman_id` = `st`.`salesman_id`) and (`dr`.`store_id` = `st`.`store_id`) and (`dc`.`sublocation_id` = `subt`.`sublocation_id`) and (`dr`.`status` = 'completed') and (`dr`.`request_date` between `lt`.`period_start` and `lt`.`period_end`))),0) AS `achieved_sales_amount` from (((((`salesman_targets` `st` join `salesmen` `s` on((`s`.`id` = `st`.`salesman_id`))) join `sublocation_targets` `subt` on((`subt`.`id` = `st`.`sublocation_target_id`))) join `location_targets` `lt` on((`lt`.`id` = `subt`.`location_target_id`))) join `sublocations` `sl` on((`sl`.`id` = `subt`.`sublocation_id`))) join `locations` `l` on((`l`.`id` = `sl`.`location_id`))) where (`st`.`status` = 'active')) AS `progress` ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_commission_calculations_salesman_target` FOREIGN KEY (`salesman_target_id`) REFERENCES `salesman_targets` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_calculations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_calculations_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `commission_payments`
--
ALTER TABLE `commission_payments`
  ADD CONSTRAINT `fk_commission_payments_calculation` FOREIGN KEY (`commission_calculation_id`) REFERENCES `commission_calculations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_commission_payments_paid_by` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
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
  ADD CONSTRAINT `fk_customer_credits_debt` FOREIGN KEY (`customer_debt_id`) REFERENCES `customer_debts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_credits_payment` FOREIGN KEY (`source_payment_id`) REFERENCES `customer_payments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_credits_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `customer_debts`
--
ALTER TABLE `customer_debts`
  ADD CONSTRAINT `fk_customer_debts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_debts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `customer_debt_adjustments`
--
ALTER TABLE `customer_debt_adjustments`
  ADD CONSTRAINT `fk_debt_adjustments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_debt_adjustments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_debt_adjustments_debt` FOREIGN KEY (`customer_debt_id`) REFERENCES `customer_debts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_debt_adjustments_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_debt_adjustments_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_debt_adjustments_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_debt_adjustments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD CONSTRAINT `fk_customer_payments_collected_by_salesman` FOREIGN KEY (`collected_by_salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_debt` FOREIGN KEY (`customer_debt_id`) REFERENCES `customer_debts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_customer_payments_received_by_user` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
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
-- Constraints for table `dispatch_customers`
--
ALTER TABLE `dispatch_customers`
  ADD CONSTRAINT `fk_dispatch_customers_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_customers_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD CONSTRAINT `fk_dispatch_items_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_dispatch_request` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_packaging_assignment` FOREIGN KEY (`packaging_assignment_id`) REFERENCES `packaging_group_assignments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_items_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_requests`
--
ALTER TABLE `dispatch_requests`
  ADD CONSTRAINT `fk_dispatch_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_dispatched_by` FOREIGN KEY (`dispatched_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_requests_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_returns`
--
ALTER TABLE `dispatch_returns`
  ADD CONSTRAINT `fk_dispatch_returns_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_returns_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_returns_dispatch_item` FOREIGN KEY (`dispatch_item_id`) REFERENCES `dispatch_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_returns_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_returns_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_settlements`
--
ALTER TABLE `dispatch_settlements`
  ADD CONSTRAINT `fk_dispatch_settlements_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_settlements_settled_by` FOREIGN KEY (`settled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dispatch_settlements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_settlement_customers`
--
ALTER TABLE `dispatch_settlement_customers`
  ADD CONSTRAINT `fk_settlement_customers_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_settlement_customers_dispatch_customer` FOREIGN KEY (`dispatch_customer_id`) REFERENCES `dispatch_customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_settlement_customers_settlement` FOREIGN KEY (`dispatch_settlement_id`) REFERENCES `dispatch_settlements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dispatch_signatures`
--
ALTER TABLE `dispatch_signatures`
  ADD CONSTRAINT `fk_dispatch_signatures_dispatch` FOREIGN KEY (`dispatch_request_id`) REFERENCES `dispatch_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `fk_expenses_category` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
-- Constraints for table `item_variants`
--
ALTER TABLE `item_variants`
  ADD CONSTRAINT `fk_item_variants_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_variants_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_notifications_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `packaging_configurations`
--
ALTER TABLE `packaging_configurations`
  ADD CONSTRAINT `fk_packaging_config_charcoal_unit` FOREIGN KEY (`charcoal_unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_config_charcoal_variant` FOREIGN KEY (`charcoal_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_config_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_config_output_variant` FOREIGN KEY (`output_item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_configurations_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `packaging_configuration_components`
--
ALTER TABLE `packaging_configuration_components`
  ADD CONSTRAINT `fk_packaging_components_config` FOREIGN KEY (`packaging_configuration_id`) REFERENCES `packaging_configurations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_components_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_components_variant` FOREIGN KEY (`component_item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `packaging_groups`
--
ALTER TABLE `packaging_groups`
  ADD CONSTRAINT `fk_packaging_groups_charcoal_variant` FOREIGN KEY (`charcoal_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_groups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_groups_default_warehouse` FOREIGN KEY (`default_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_groups_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `packaging_group_assignments`
--
ALTER TABLE `packaging_group_assignments`
  ADD CONSTRAINT `fk_packaging_assignments_charcoal_variant` FOREIGN KEY (`charcoal_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_assignments_consumed_by` FOREIGN KEY (`consumed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_assignments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_assignments_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_assignments_production_batch` FOREIGN KEY (`production_batch_id`) REFERENCES `production_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_assignments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_assignments_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_output_variant` FOREIGN KEY (`output_item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `packaging_group_components`
--
ALTER TABLE `packaging_group_components`
  ADD CONSTRAINT `fk_packaging_group_components_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_components_parent` FOREIGN KEY (`parent_component_id`) REFERENCES `packaging_group_components` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_components_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_components_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `production_batches`
--
ALTER TABLE `production_batches`
  ADD CONSTRAINT `fk_production_batches_charcoal_variant` FOREIGN KEY (`charcoal_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_production_batches_config` FOREIGN KEY (`packaging_configuration_id`) REFERENCES `packaging_configurations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_production_batches_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_production_batches_output_variant` FOREIGN KEY (`output_item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_production_batches_packaging_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_production_batches_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_production_batches_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `production_batch_components`
--
ALTER TABLE `production_batch_components`
  ADD CONSTRAINT `fk_production_components_batch` FOREIGN KEY (`production_batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_production_components_variant` FOREIGN KEY (`component_item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `product_cost_history`
--
ALTER TABLE `product_cost_history`
  ADD CONSTRAINT `fk_product_cost_history_config` FOREIGN KEY (`packaging_configuration_id`) REFERENCES `packaging_configurations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_cost_history_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_cost_history_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_cost_history_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_purchase_orders_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `fk_purchase_order_items_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_order_items_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  ADD CONSTRAINT `fk_purchase_receipts_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipts_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  ADD CONSTRAINT `fk_purchase_receipt_items_po_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipt_items_receipt` FOREIGN KEY (`purchase_receipt_id`) REFERENCES `purchase_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_receipt_items_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
-- Constraints for table `salesman_sublocations`
--
ALTER TABLE `salesman_sublocations`
  ADD CONSTRAINT `fk_salesman_sublocations_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_sublocations_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `salesman_targets`
--
ALTER TABLE `salesman_targets`
  ADD CONSTRAINT `fk_salesman_targets_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_targets_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesman_targets_sublocation_target` FOREIGN KEY (`sublocation_target_id`) REFERENCES `sublocation_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `salesmen`
--
ALTER TABLE `salesmen`
  ADD CONSTRAINT `fk_salesmen_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salesmen_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `stock_balances`
--
ALTER TABLE `stock_balances`
  ADD CONSTRAINT `fk_stock_balances_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stock_balances_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stock_balances_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_stock_movements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stock_movements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stock_movements_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stock_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_sublocation_targets_location_target` FOREIGN KEY (`location_target_id`) REFERENCES `location_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sublocation_targets_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sublocation_targets_sublocation` FOREIGN KEY (`sublocation_id`) REFERENCES `sublocations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_users_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
