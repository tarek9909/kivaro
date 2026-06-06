-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jun 06, 2026 at 11:59 PM
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
(1, 1, 'Main Cashbox', 'cash', 0.0000, 0.0000, 'active', '2026-06-06 23:23:21'),
(2, 1, 'Demo Main Cash', 'cash', 1500.0000, 1500.0000, 'active', '2026-06-06 23:31:03'),
(3, 1, 'Demo Bank Account', 'bank', 5000.0000, 5000.0000, 'active', '2026-06-06 23:31:03');

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
(1, 1, 'Default Salesman Commission Rule', 'monthly', 5.0000, 10.0000, 1.0000, '2026-06-07', NULL, 'active', NULL, '2026-06-06 23:23:21', '2026-06-06 23:23:21');

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

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `store_id`, `customer_code`, `name`, `phone`, `secondary_phone`, `location_id`, `sublocation_id`, `assigned_salesman_id`, `address`, `detailed_address`, `notes`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'DEMO-CUST-001', 'Hamra Mini Market', '+96171111001', NULL, 1, 1, 1, 'Hamra main street', 'Hamra main street', 'Prefers 10 kg bags.', 'active', 1, '2026-06-06 23:31:03', NULL),
(2, 1, 'DEMO-CUST-002', 'Achrafieh Grill House', '+96171111002', NULL, 1, 2, 2, 'Sassine area', 'Sassine area', 'Restaurant account.', 'active', 1, '2026-06-06 23:31:03', NULL),
(3, 1, 'DEMO-CUST-003', 'Jounieh Superette', '+96171111003', NULL, 2, 3, 2, 'Old souk road', 'Old souk road', 'Weekly delivery.', 'active', 1, '2026-06-06 23:31:03', NULL);

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

--
-- Dumping data for table `customer_debts`
--

INSERT INTO `customer_debts` (`id`, `store_id`, `customer_id`, `salesman_id`, `dispatch_request_id`, `dispatch_customer_id`, `debt_date`, `subtotal_amount`, `vat_amount`, `original_amount`, `paid_amount`, `remaining_amount`, `status`, `due_date`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 1, 1, '2026-06-07', 60.0000, 0.0000, 20.0000, 0.0000, 20.0000, 'pending', '2026-06-21', 'Demo remaining payment from completed dispatch. Debt id: 1', 1, '2026-06-06 23:31:03', '2026-06-06 23:31:03');

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

--
-- Dumping data for table `customer_payments`
--

INSERT INTO `customer_payments` (`id`, `store_id`, `customer_id`, `customer_debt_id`, `dispatch_request_id`, `payment_date`, `amount`, `payment_method`, `reference_number`, `collected_by_salesman_id`, `received_by_user_id`, `notes`, `created_at`) VALUES
(1, 1, 1, NULL, 1, '2026-06-07', 40.0000, 'cash', 'DEMO-PAY-001', 1, 1, 'Demo partial collection.', '2026-06-06 23:31:03');

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

--
-- Dumping data for table `customer_receipts`
--

INSERT INTO `customer_receipts` (`id`, `store_id`, `receipt_number`, `customer_id`, `dispatch_request_id`, `dispatch_customer_id`, `customer_payment_id`, `receipt_date`, `subtotal_amount`, `vat_amount`, `total_amount`, `paid_amount`, `remaining_amount`, `receipt_type`, `printed_at`, `created_by`, `created_at`) VALUES
(1, 1, 'DEMO-REC-001', 1, 1, 1, 1, '2026-06-07', 60.0000, 0.0000, 60.0000, 40.0000, 20.0000, 'sale', NULL, 1, '2026-06-06 23:31:03');

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

--
-- Dumping data for table `dispatch_customers`
--

INSERT INTO `dispatch_customers` (`id`, `store_id`, `dispatch_request_id`, `customer_id`, `location_id`, `sublocation_id`, `subtotal_amount`, `vat_amount`, `customer_total_amount`, `collected_amount`, `debt_amount`, `payment_status`, `receipt_number`, `notes`, `created_at`) VALUES
(1, 1, 1, 1, 1, 1, 60.0000, 0.0000, 60.0000, 40.0000, 20.0000, 'partial_debt', 'DEMO-REC-001', 'Demo customer paid part of the delivery.', '2026-06-06 23:31:03');

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

--
-- Dumping data for table `dispatch_items`
--

INSERT INTO `dispatch_items` (`id`, `dispatch_customer_id`, `dispatch_request_id`, `item_variant_id`, `packaging_assignment_id`, `quantity`, `unit_price`, `unit_cost`, `subtotal_amount`, `vat_rate`, `vat_amount`, `line_total`, `returned_quantity`, `created_at`) VALUES
(1, 1, 1, 7, NULL, 5.0000, 12.0000, 6.0000, 60.0000, 0.0000, 0.0000, 60.0000, 0.0000, '2026-06-06 23:31:03');

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

--
-- Dumping data for table `dispatch_requests`
--

INSERT INTO `dispatch_requests` (`id`, `store_id`, `dispatch_number`, `salesman_id`, `warehouse_id`, `request_date`, `status`, `total_quantity`, `subtotal_amount`, `vat_amount`, `total_amount`, `total_collected`, `total_debt`, `approved_by`, `approved_at`, `dispatched_by`, `dispatched_at`, `completed_by`, `completed_at`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'DEMO-DISP-001', 1, 1, '2026-06-07', 'completed', 5.0000, 60.0000, 0.0000, 60.0000, 40.0000, 20.0000, 1, '2026-06-07 02:31:03', 1, '2026-06-07 02:31:03', 1, '2026-06-07 02:31:03', 'Demo completed dispatch with partial customer payment.', 1, '2026-06-06 23:31:03', NULL);

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
(1, 1, 'Fuel', 'Fuel and vehicle expenses', 'active', '2026-06-06 23:23:21'),
(2, 1, 'Maintenance', 'Vehicle or equipment maintenance', 'active', '2026-06-06 23:23:21'),
(3, 1, 'Rent', 'Warehouse or office rent', 'active', '2026-06-06 23:23:21'),
(4, 1, 'Salaries', 'Staff salaries', 'active', '2026-06-06 23:23:21'),
(5, 1, 'Other', 'Other general expenses', 'active', '2026-06-06 23:23:21');

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
(1, 1, 2, 4, 'Starter retail packaging category', 'PKG_STARTER_CATEGORY', 'packaging', 'stocked', 'Starter category node for packaging hierarchy demos', 0.0000, NULL, 0.0000, 'active', NULL, '2026-06-06 23:23:21', NULL),
(2, 1, 2, 4, 'Starter 10kg carton', 'PKG_STARTER_CARTON_10KG', 'packaging', 'stocked', 'Demo carton with 10kg capacity', 0.5000, NULL, 0.0000, 'active', NULL, '2026-06-06 23:23:21', NULL),
(3, 1, 2, 4, 'Starter 400g bag', 'PKG_STARTER_BAG_400G', 'packaging', 'stocked', 'Demo bag with 400g capacity', 0.0500, NULL, 0.0000, 'active', NULL, '2026-06-06 23:23:21', NULL),
(4, 1, 2, 4, 'Starter bag sticker', 'PKG_STARTER_STICKER', 'packaging', 'stocked', 'Demo sticker used once per bag', 0.0100, NULL, 0.0000, 'active', NULL, '2026-06-06 23:23:21', NULL),
(5, 1, 4, 1, 'Bulk Hardwood Charcoal', 'DEMO-RAW-CHAR', 'raw_charcoal', 'stocked', 'Bulk raw charcoal tracked by weight.', 1.1000, NULL, 500.0000, 'active', 1, '2026-06-06 23:31:03', NULL),
(6, 1, 5, 1, 'Premium Charcoal Bags', 'DEMO-FIN-CHAR', 'finished_product', 'stocked', 'Packed charcoal variants sold by weight.', 5.5000, 12.0000, 50.0000, 'active', 1, '2026-06-06 23:31:03', NULL),
(7, 1, 6, 4, 'Printed Carton Box', 'DEMO-PKG-CARTON', 'packaging', 'stocked', 'Packaging carton tracked as pieces.', 0.4500, NULL, 100.0000, 'active', 1, '2026-06-06 23:31:03', NULL),
(8, 1, 6, 4, 'Charcoal Retail Bag', 'DEMO-PKG-BAG', 'packaging', 'stocked', 'Retail bag tracked as pieces.', 0.1800, NULL, 200.0000, 'active', 1, '2026-06-06 23:31:03', NULL);

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
(1, 1, NULL, 'Raw Charcoal', 'RAW_CHARCOAL', 'Raw charcoal by size/type', 'active', '2026-06-06 23:23:21', '2026-06-06 23:23:21'),
(2, 1, NULL, 'Packaging Materials', 'PACKAGING', 'Cartons, package bags, stickers, labels', 'active', '2026-06-06 23:23:21', '2026-06-06 23:23:21'),
(3, 1, NULL, 'Finished Products', 'FINISHED_PRODUCTS', 'Ready-to-sell packaged charcoal products', 'active', '2026-06-06 23:23:21', '2026-06-06 23:23:21'),
(4, 1, NULL, 'Raw Charcoal', 'DEMO-RAW', NULL, 'active', '2026-06-06 23:31:03', NULL),
(5, 1, NULL, 'Finished Goods', 'DEMO-FINISHED', NULL, 'active', '2026-06-06 23:31:03', NULL),
(6, 1, NULL, 'Packaging Materials', 'DEMO-PACKAGING', NULL, 'active', '2026-06-06 23:31:03', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `item_stock_adjustments`
--

CREATE TABLE `item_stock_adjustments` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `quantity_change` decimal(18,4) NOT NULL,
  `quantity_before` decimal(18,4) NOT NULL,
  `quantity_after` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `item_stock_balances`
--

CREATE TABLE `item_stock_balances` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `quantity_on_hand` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `quantity_allocated` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ;

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
(1, 1, 1, 'Retail packaging category', 'PKG-CAT-STARTER', '{\"packaging_unit\": \"pc\"}', 0.0000, NULL, 'active', '2026-06-06 23:23:21', NULL),
(2, 1, 2, '10kg carton', 'PKG-CARTON-10KG', '{\"packaging_unit\": \"pc\"}', 0.5000, NULL, 'active', '2026-06-06 23:23:21', NULL),
(3, 1, 3, '400g bag', 'PKG-BAG-400G', '{\"packaging_unit\": \"pc\"}', 0.0500, NULL, 'active', '2026-06-06 23:23:21', NULL),
(4, 1, 4, 'Bag sticker', 'PKG-STICKER-STARTER', '{\"packaging_unit\": \"pc\"}', 0.0100, NULL, 'active', '2026-06-06 23:23:21', NULL),
(5, 1, 5, 'Bulk Raw Charcoal', 'DEMO-RAW-BULK', '{\"unit\": \"kg\"}', 1.1000, NULL, 'active', '2026-06-06 23:31:03', NULL),
(6, 1, 6, 'Premium Charcoal 5 kg Bag', 'DEMO-CHAR-5KG', '{\"packageWeightKg\": 5}', 3.2500, 7.0000, 'active', '2026-06-06 23:31:03', NULL),
(7, 1, 6, 'Premium Charcoal 10 kg Bag', 'DEMO-CHAR-10KG', '{\"packageWeightKg\": 10}', 6.0000, 12.0000, 'active', '2026-06-06 23:31:03', NULL),
(8, 1, 7, '10 kg Printed Carton', 'DEMO-PKG-CARTON-10KG', '{\"fits\": \"10kg bag\", \"unit\": \"pc\"}', 0.4500, NULL, 'active', '2026-06-06 23:31:03', NULL),
(9, 1, 8, '5 kg Retail Bag', 'DEMO-PKG-BAG-5KG', '{\"fits\": \"5kg charcoal\", \"unit\": \"pc\"}', 0.1800, NULL, 'active', '2026-06-06 23:31:03', NULL);

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

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`id`, `store_id`, `name`, `code`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'Beirut', 'DEMO-BEY', NULL, 'active', 1, '2026-06-06 23:31:03', NULL),
(2, 1, 'Mount Lebanon', 'DEMO-ML', NULL, 'active', 1, '2026-06-06 23:31:03', NULL);

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
-- Table structure for table `packaging_batch_movements`
--

CREATE TABLE `packaging_batch_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `store_id` bigint UNSIGNED DEFAULT NULL,
  `packaging_assignment_id` bigint UNSIGNED NOT NULL,
  `warehouse_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED DEFAULT NULL,
  `movement_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'batch_movement',
  `quantity_change` decimal(18,4) NOT NULL,
  `quantity_before` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `quantity_after` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `dispatch_item_id` bigint UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint UNSIGNED DEFAULT NULL,
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
(1, 1, 'Starter 10kg carton / 400g bag', 'PKG_GROUP_STARTER_10KG_400G', NULL, NULL, 'Demo group: carton -> bag -> sticker', 'active', NULL, '2026-06-06 23:23:21', NULL);

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
(1, 1, 1, NULL, 'category', 1, 'pc', NULL, NULL, 0, 'Top category node', '2026-06-06 23:23:21', NULL),
(2, 1, 1, 1, 'item', 2, 'pc', 1.0000, 10.0000, 1, '10kg carton', '2026-06-06 23:23:21', NULL),
(3, 1, 1, 2, 'sub_item', 3, 'pc', 25.0000, 0.4000, 1, '25 bags per 10kg carton', '2026-06-06 23:23:21', NULL),
(4, 1, 1, 3, 'sub_sub_item', 4, 'pc', 1.0000, NULL, 1, 'One sticker per bag', '2026-06-06 23:23:21', NULL);

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
(1, 'dashboard', 'view', 'dashboard.view', 'View dashboard', '2026-06-06 23:23:21'),
(2, 'users', 'view', 'users.view', 'View users', '2026-06-06 23:23:21'),
(3, 'users', 'create', 'users.create', 'Create users', '2026-06-06 23:23:21'),
(4, 'users', 'update', 'users.update', 'Update users', '2026-06-06 23:23:21'),
(5, 'users', 'delete', 'users.delete', 'Delete users', '2026-06-06 23:23:21'),
(6, 'roles', 'manage', 'roles.manage', 'Manage roles and permissions', '2026-06-06 23:23:21'),
(7, 'inventory', 'view', 'inventory.view', 'View inventory', '2026-06-06 23:23:21'),
(8, 'inventory', 'create', 'inventory.create', 'Create inventory records', '2026-06-06 23:23:21'),
(9, 'inventory', 'update', 'inventory.update', 'Update inventory records', '2026-06-06 23:23:21'),
(10, 'inventory', 'delete', 'inventory.delete', 'Delete inventory records', '2026-06-06 23:23:21'),
(11, 'stock', 'adjust', 'stock.adjust', 'Adjust stock', '2026-06-06 23:23:21'),
(12, 'stock', 'movements', 'stock.movements', 'View stock movements', '2026-06-06 23:23:21'),
(13, 'purchase_orders', 'view', 'purchase_orders.view', 'View purchase orders', '2026-06-06 23:23:21'),
(14, 'purchase_orders', 'create', 'purchase_orders.create', 'Create purchase orders', '2026-06-06 23:23:21'),
(15, 'purchase_orders', 'approve', 'purchase_orders.approve', 'Approve purchase orders', '2026-06-06 23:23:21'),
(16, 'purchase_orders', 'receive', 'purchase_orders.receive', 'Receive purchase orders', '2026-06-06 23:23:21'),
(17, 'purchase_orders', 'cancel', 'purchase_orders.cancel', 'Cancel purchase orders', '2026-06-06 23:23:21'),
(18, 'production', 'view', 'production.view', 'View production and packaging', '2026-06-06 23:23:21'),
(19, 'production', 'create', 'production.create', 'Create production batches', '2026-06-06 23:23:21'),
(20, 'production', 'complete', 'production.complete', 'Complete production batches', '2026-06-06 23:23:21'),
(21, 'locations', 'manage', 'locations.manage', 'Manage locations and sublocations', '2026-06-06 23:23:21'),
(22, 'targets', 'manage', 'targets.manage', 'Manage targets', '2026-06-06 23:23:21'),
(23, 'salesmen', 'manage', 'salesmen.manage', 'Manage salesmen', '2026-06-06 23:23:21'),
(24, 'customers', 'view', 'customers.view', 'View customers', '2026-06-06 23:23:21'),
(25, 'customers', 'create', 'customers.create', 'Create customers', '2026-06-06 23:23:21'),
(26, 'customers', 'update', 'customers.update', 'Update customers', '2026-06-06 23:23:21'),
(27, 'customers', 'delete', 'customers.delete', 'Delete customers', '2026-06-06 23:23:21'),
(28, 'dispatch', 'view', 'dispatch.view', 'View dispatch requests', '2026-06-06 23:23:21'),
(29, 'dispatch', 'create', 'dispatch.create', 'Create dispatch requests', '2026-06-06 23:23:21'),
(30, 'dispatch', 'approve', 'dispatch.approve', 'Approve dispatch requests', '2026-06-06 23:23:21'),
(31, 'dispatch', 'settle', 'dispatch.settle', 'Settle dispatch requests', '2026-06-06 23:23:21'),
(32, 'dispatch', 'print', 'dispatch.print', 'Print dispatch documents', '2026-06-06 23:23:21'),
(33, 'accounting', 'view', 'accounting.view', 'View accounting', '2026-06-06 23:23:21'),
(34, 'accounting', 'manage', 'accounting.manage', 'Manage accounting records', '2026-06-06 23:23:21'),
(35, 'debts', 'manage', 'debts.manage', 'Manage customer debts', '2026-06-06 23:23:21'),
(36, 'commissions', 'manage', 'commissions.manage', 'Manage commissions', '2026-06-06 23:23:21'),
(37, 'reports', 'view', 'reports.view', 'View reports', '2026-06-06 23:23:21'),
(38, 'reports', 'export', 'reports.export', 'Export reports', '2026-06-06 23:23:21'),
(39, 'audit_logs', 'view', 'audit_logs.view', 'View audit logs', '2026-06-06 23:23:21'),
(40, 'settings', 'manage', 'settings.manage', 'Manage system settings', '2026-06-06 23:23:21'),
(41, 'vat', 'view', 'vat.view', 'View VAT settings', '2026-06-06 23:23:21'),
(42, 'vat', 'manage', 'vat.manage', 'Manage VAT settings', '2026-06-06 23:23:21'),
(43, 'superadmin', 'manage', 'superadmin.manage', 'Manage stores and module availability', '2026-06-06 23:23:21');

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
) ;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_order_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED DEFAULT NULL,
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
  `item_id` bigint UNSIGNED NOT NULL,
  `item_variant_id` bigint UNSIGNED DEFAULT NULL,
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
(1, 1, 'owner', 'System Owner', 'Full access to the entire system.', 1, 'active', '2026-06-06 23:23:21', NULL),
(2, 1, 'admin', 'Admin', 'Administrative access.', 1, 'active', '2026-06-06 23:23:21', NULL),
(3, 1, 'accountant', 'Accountant', 'Accounting, payments, debts, commissions, settlements.', 1, 'active', '2026-06-06 23:23:21', NULL),
(4, 1, 'inventory_manager', 'Inventory Manager', 'Inventory, purchase receiving, stock movements, production.', 1, 'active', '2026-06-06 23:23:21', NULL),
(5, 1, 'salesman', 'Salesman / Driver', 'Can create dispatch requests and view own customers/targets.', 1, 'active', '2026-06-06 23:23:21', NULL),
(6, 1, 'viewer', 'Viewer', 'Read-only reporting access.', 1, 'active', '2026-06-06 23:23:21', NULL),
(7, NULL, 'superadmin', 'Superadmin', 'Platform-level store and module administration.', 1, 'active', '2026-06-06 23:23:21', NULL);

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
(1, 1, '2026-06-06 23:23:21'),
(1, 2, '2026-06-06 23:23:21'),
(1, 3, '2026-06-06 23:23:21'),
(1, 4, '2026-06-06 23:23:21'),
(1, 5, '2026-06-06 23:23:21'),
(1, 6, '2026-06-06 23:23:21'),
(1, 7, '2026-06-06 23:23:21'),
(1, 8, '2026-06-06 23:23:21'),
(1, 9, '2026-06-06 23:23:21'),
(1, 10, '2026-06-06 23:23:21'),
(1, 11, '2026-06-06 23:23:21'),
(1, 12, '2026-06-06 23:23:21'),
(1, 13, '2026-06-06 23:23:21'),
(1, 14, '2026-06-06 23:23:21'),
(1, 15, '2026-06-06 23:23:21'),
(1, 16, '2026-06-06 23:23:21'),
(1, 17, '2026-06-06 23:23:21'),
(1, 18, '2026-06-06 23:23:21'),
(1, 19, '2026-06-06 23:23:21'),
(1, 20, '2026-06-06 23:23:21'),
(1, 21, '2026-06-06 23:23:21'),
(1, 22, '2026-06-06 23:23:21'),
(1, 23, '2026-06-06 23:23:21'),
(1, 24, '2026-06-06 23:23:21'),
(1, 25, '2026-06-06 23:23:21'),
(1, 26, '2026-06-06 23:23:21'),
(1, 27, '2026-06-06 23:23:21'),
(1, 28, '2026-06-06 23:23:21'),
(1, 29, '2026-06-06 23:23:21'),
(1, 30, '2026-06-06 23:23:21'),
(1, 31, '2026-06-06 23:23:21'),
(1, 32, '2026-06-06 23:23:21'),
(1, 33, '2026-06-06 23:23:21'),
(1, 34, '2026-06-06 23:23:21'),
(1, 35, '2026-06-06 23:23:21'),
(1, 36, '2026-06-06 23:23:21'),
(1, 37, '2026-06-06 23:23:21'),
(1, 38, '2026-06-06 23:23:21'),
(1, 39, '2026-06-06 23:23:21'),
(1, 40, '2026-06-06 23:23:21'),
(1, 41, '2026-06-06 23:23:21'),
(1, 42, '2026-06-06 23:23:21'),
(2, 1, '2026-06-06 23:23:21'),
(2, 2, '2026-06-06 23:23:21'),
(2, 3, '2026-06-06 23:23:21'),
(2, 4, '2026-06-06 23:23:21'),
(2, 5, '2026-06-06 23:23:21'),
(2, 7, '2026-06-06 23:23:21'),
(2, 8, '2026-06-06 23:23:21'),
(2, 9, '2026-06-06 23:23:21'),
(2, 10, '2026-06-06 23:23:21'),
(2, 11, '2026-06-06 23:23:21'),
(2, 12, '2026-06-06 23:23:21'),
(2, 13, '2026-06-06 23:23:21'),
(2, 14, '2026-06-06 23:23:21'),
(2, 15, '2026-06-06 23:23:21'),
(2, 16, '2026-06-06 23:23:21'),
(2, 17, '2026-06-06 23:23:21'),
(2, 18, '2026-06-06 23:23:21'),
(2, 19, '2026-06-06 23:23:21'),
(2, 20, '2026-06-06 23:23:21'),
(2, 21, '2026-06-06 23:23:21'),
(2, 22, '2026-06-06 23:23:21'),
(2, 23, '2026-06-06 23:23:21'),
(2, 24, '2026-06-06 23:23:21'),
(2, 25, '2026-06-06 23:23:21'),
(2, 26, '2026-06-06 23:23:21'),
(2, 27, '2026-06-06 23:23:21'),
(2, 28, '2026-06-06 23:23:21'),
(2, 29, '2026-06-06 23:23:21'),
(2, 30, '2026-06-06 23:23:21'),
(2, 31, '2026-06-06 23:23:21'),
(2, 32, '2026-06-06 23:23:21'),
(2, 33, '2026-06-06 23:23:21'),
(2, 34, '2026-06-06 23:23:21'),
(2, 35, '2026-06-06 23:23:21'),
(2, 36, '2026-06-06 23:23:21'),
(2, 37, '2026-06-06 23:23:21'),
(2, 38, '2026-06-06 23:23:21'),
(2, 39, '2026-06-06 23:23:21'),
(2, 40, '2026-06-06 23:23:21'),
(2, 41, '2026-06-06 23:23:21'),
(2, 42, '2026-06-06 23:23:21'),
(2, 43, '2026-06-06 23:23:21'),
(3, 1, '2026-06-06 23:23:21'),
(3, 24, '2026-06-06 23:23:21'),
(3, 28, '2026-06-06 23:23:21'),
(3, 30, '2026-06-06 23:23:21'),
(3, 31, '2026-06-06 23:23:21'),
(3, 32, '2026-06-06 23:23:21'),
(3, 33, '2026-06-06 23:23:21'),
(3, 34, '2026-06-06 23:23:21'),
(3, 35, '2026-06-06 23:23:21'),
(3, 36, '2026-06-06 23:23:21'),
(3, 37, '2026-06-06 23:23:21'),
(3, 38, '2026-06-06 23:23:21'),
(4, 1, '2026-06-06 23:23:21'),
(4, 7, '2026-06-06 23:23:21'),
(4, 8, '2026-06-06 23:23:21'),
(4, 9, '2026-06-06 23:23:21'),
(4, 11, '2026-06-06 23:23:21'),
(4, 12, '2026-06-06 23:23:21'),
(4, 13, '2026-06-06 23:23:21'),
(4, 14, '2026-06-06 23:23:21'),
(4, 16, '2026-06-06 23:23:21'),
(4, 18, '2026-06-06 23:23:21'),
(4, 19, '2026-06-06 23:23:21'),
(4, 20, '2026-06-06 23:23:21'),
(4, 28, '2026-06-06 23:23:21'),
(4, 32, '2026-06-06 23:23:21'),
(4, 37, '2026-06-06 23:23:21'),
(5, 1, '2026-06-06 23:23:21'),
(5, 24, '2026-06-06 23:23:21'),
(5, 28, '2026-06-06 23:23:21'),
(5, 29, '2026-06-06 23:23:21'),
(5, 32, '2026-06-06 23:23:21'),
(6, 1, '2026-06-06 23:23:21'),
(6, 7, '2026-06-06 23:23:21'),
(6, 24, '2026-06-06 23:23:21'),
(6, 28, '2026-06-06 23:23:21'),
(6, 37, '2026-06-06 23:23:21'),
(7, 43, '2026-06-06 23:23:21');

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
  `active_assignment_key` tinyint GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'active') then 1 else NULL end)) STORED,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesman_sublocations`
--

INSERT INTO `salesman_sublocations` (`id`, `salesman_id`, `sublocation_id`, `assigned_at`, `unassigned_at`, `status`, `created_at`) VALUES
(1, 1, 1, '2026-06-07', NULL, 'active', '2026-06-06 23:31:03'),
(2, 2, 1, '2026-06-07', NULL, 'active', '2026-06-06 23:31:03'),
(3, 2, 3, '2026-06-07', NULL, 'active', '2026-06-06 23:31:03');

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
  `active_target_key` tinyint GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'active') then 1 else NULL end)) STORED,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
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
  `base_salary` decimal(18,4) NOT NULL DEFAULT '0.0000',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `joined_at` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesmen`
--

INSERT INTO `salesmen` (`id`, `store_id`, `user_id`, `full_name`, `phone`, `email`, `vehicle_number`, `national_id`, `base_salary`, `status`, `joined_at`, `created_at`, `updated_at`) VALUES
(1, 1, 4, 'Ali Driver', NULL, 'ali.salesman@kivaro.local', 'TRK-101', NULL, 900.0000, 'active', '2026-06-07', '2026-06-06 23:31:03', NULL),
(2, 1, 5, 'Maya Driver', NULL, 'maya.salesman@kivaro.local', 'TRK-202', NULL, 900.0000, 'active', '2026-06-07', '2026-06-06 23:31:03', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `schema_migrations`
--

CREATE TABLE `schema_migrations` (
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 1, 1, 5, 2500.0000, 0.0000, 1.1000, NULL),
(2, 1, 1, 6, 180.0000, 0.0000, 3.2500, NULL),
(3, 1, 1, 7, 115.0000, 0.0000, 6.0000, NULL),
(4, 1, 1, 8, 500.0000, 0.0000, 0.4500, NULL),
(5, 1, 1, 9, 900.0000, 0.0000, 0.1800, NULL);

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
(1, 1, 1, 5, 'adjustment', 2500.0000, 0.0000, 2500.0000, 0.0000, 0.0000, 0.0000, 1.1000, 'demo_seed', NULL, 'Demo opening stock for bulk charcoal.', 1, '2026-06-06 23:31:03'),
(2, 1, 1, 6, 'adjustment', 180.0000, 0.0000, 180.0000, 0.0000, 0.0000, 0.0000, 3.2500, 'demo_seed', NULL, 'Demo opening stock for 5 kg bags.', 1, '2026-06-06 23:31:03'),
(3, 1, 1, 7, 'adjustment', 120.0000, 0.0000, 120.0000, 0.0000, 0.0000, 0.0000, 6.0000, 'demo_seed', NULL, 'Demo opening stock for 10 kg bags.', 1, '2026-06-06 23:31:03'),
(4, 1, 1, 8, 'adjustment', 500.0000, 0.0000, 500.0000, 0.0000, 0.0000, 0.0000, 0.4500, 'demo_seed', NULL, 'Demo opening stock for carton packaging.', 1, '2026-06-06 23:31:03'),
(5, 1, 1, 9, 'adjustment', 900.0000, 0.0000, 900.0000, 0.0000, 0.0000, 0.0000, 0.1800, 'demo_seed', NULL, 'Demo opening stock for bag packaging.', 1, '2026-06-06 23:31:03'),
(6, 1, 1, 7, 'dispatch_out', -5.0000, 120.0000, 115.0000, 0.0000, 0.0000, 0.0000, 6.0000, 'demo_seed', 1, 'Demo completed dispatch.', 1, '2026-06-06 23:31:03');

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
(1, 'Kivaro Demo Charcoal', 'KIVARO-DEMO', 'kivaro-demo', 'active', 'Demo Owner', '+96170000000', 'demo@kivaro.local', 'Beirut, Lebanon', 'USD', 'Initial store created during setup.', '2026-06-06 23:23:21', '2026-06-06 23:31:03');

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
(1, 'users', 1, NULL);

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

--
-- Dumping data for table `sublocations`
--

INSERT INTO `sublocations` (`id`, `store_id`, `location_id`, `name`, `code`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Hamra', 'DEMO-HAMRA', NULL, 'active', 1, '2026-06-06 23:31:03', NULL),
(2, 1, 1, 'Achrafieh', 'DEMO-ACHRAFIEH', NULL, 'active', 1, '2026-06-06 23:31:03', NULL),
(3, 1, 2, 'Jounieh', 'DEMO-JOUNIEH', NULL, 'active', 1, '2026-06-06 23:31:03', NULL);

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
(1, 1, 'Kilogram', 'kg', 'weight', NULL, 1.00000000, '2026-06-06 23:23:21'),
(2, 1, 'Gram', 'g', 'weight', 1, 0.00100000, '2026-06-06 23:23:21'),
(3, 1, 'Ton', 'ton', 'weight', 1, 1000.00000000, '2026-06-06 23:23:21'),
(4, 1, 'Piece', 'pc', 'quantity', NULL, 1.00000000, '2026-06-06 23:23:21');

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
(1, 1, 1, 'Demo Owner', 'demo_owner', 'demo.owner@kivaro.local', '+96170000001', '$2a$12$2ssYjdhVZWNXh2qRhEa5UOluKSh.ONYdBRvwqJBYRUnBylhxIvFaC', 'active', '2026-06-07 02:31:56', NULL, '2026-06-06 23:31:03', '2026-06-06 23:31:56'),
(2, 1, 3, 'Nour Accountant', 'nour_accountant', 'accountant@kivaro.local', '+96170000002', '$2a$12$2ssYjdhVZWNXh2qRhEa5UOluKSh.ONYdBRvwqJBYRUnBylhxIvFaC', 'active', NULL, NULL, '2026-06-06 23:31:03', NULL),
(3, 1, 4, 'Karim Warehouse', 'karim_warehouse', 'warehouse@kivaro.local', '+96170000003', '$2a$12$2ssYjdhVZWNXh2qRhEa5UOluKSh.ONYdBRvwqJBYRUnBylhxIvFaC', 'active', NULL, NULL, '2026-06-06 23:31:03', NULL),
(4, 1, 5, 'Ali Driver', 'ali_driver', 'ali.salesman@kivaro.local', '+96170000004', '$2a$12$2ssYjdhVZWNXh2qRhEa5UOluKSh.ONYdBRvwqJBYRUnBylhxIvFaC', 'active', NULL, NULL, '2026-06-06 23:31:03', NULL),
(5, 1, 5, 'Maya Driver', 'maya_driver', 'maya.salesman@kivaro.local', '+96170000005', '$2a$12$2ssYjdhVZWNXh2qRhEa5UOluKSh.ONYdBRvwqJBYRUnBylhxIvFaC', 'active', NULL, NULL, '2026-06-06 23:31:03', NULL);

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
(1, 1, 'ac68d069c81cd67dfc93b46beed9622fe6d2c0d6d50f3080168efaa9b781fe78', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-08 02:31:56', NULL, '2026-06-06 23:31:56');

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
,`unit_type` enum('weight','quantity','volume','length','other')
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
,`base_salary` decimal(18,4)
,`location_id` bigint unsigned
,`location_name` varchar(150)
,`period_end` date
,`period_start` date
,`salesman_id` bigint unsigned
,`salesman_name` varchar(150)
,`salesman_target_id` bigint unsigned
,`store_id` bigint unsigned
,`sublocation_id` bigint unsigned
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
(1, 1, 'Main Demo Warehouse', 'DEMO-MAIN-WH', 1, 'Demo warehouse near Beirut port', 'active', '2026-06-06 23:31:03', NULL);

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
  ADD KEY `idx_dispatch_items_packaging_assignment` (`packaging_assignment_id`),
  ADD KEY `idx_dispatch_items_request_variant` (`dispatch_request_id`,`item_variant_id`);

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
  ADD KEY `fk_expenses_voided_by` (`voided_by`),
  ADD KEY `fk_expenses_created_by` (`created_by`),
  ADD KEY `fk_expenses_cash_account` (`cash_account_id`),
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
-- Indexes for table `item_stock_adjustments`
--
ALTER TABLE `item_stock_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_item_stock_adjustments_created_by` (`created_by`),
  ADD KEY `idx_item_stock_adjustments_store_created` (`store_id`,`created_at`),
  ADD KEY `idx_item_stock_adjustments_warehouse` (`warehouse_id`),
  ADD KEY `idx_item_stock_adjustments_item` (`item_id`);

--
-- Indexes for table `item_stock_balances`
--
ALTER TABLE `item_stock_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_stock_warehouse_item` (`warehouse_id`,`item_id`),
  ADD KEY `idx_item_stock_store_item` (`store_id`,`item_id`),
  ADD KEY `fk_item_stock_item` (`item_id`);

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
-- Indexes for table `packaging_batch_movements`
--
ALTER TABLE `packaging_batch_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_batch_movements_assignment` (`packaging_assignment_id`),
  ADD KEY `idx_batch_movements_store_created` (`store_id`,`created_at`),
  ADD KEY `idx_batch_movements_reference` (`reference_type`,`reference_id`),
  ADD KEY `idx_batch_movements_variant` (`item_variant_id`),
  ADD KEY `fk_batch_movements_warehouse` (`warehouse_id`),
  ADD KEY `fk_batch_movements_dispatch_item` (`dispatch_item_id`),
  ADD KEY `fk_batch_movements_created_by` (`created_by`);

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
  ADD KEY `fk_packaging_group_assignments_consumed_by` (`consumed_by`),
  ADD KEY `fk_packaging_group_assignments_created_by` (`created_by`),
  ADD KEY `idx_packaging_group_assignments_store_created` (`store_id`,`created_at`),
  ADD KEY `idx_packaging_group_assignments_status` (`store_id`,`status`),
  ADD KEY `idx_packaging_group_assignments_group` (`packaging_group_id`),
  ADD KEY `idx_packaging_group_assignments_warehouse` (`warehouse_id`),
  ADD KEY `idx_packaging_group_assignments_charcoal_variant` (`charcoal_variant_id`),
  ADD KEY `idx_packaging_group_assignments_output_variant` (`output_item_variant_id`),
  ADD KEY `idx_packaging_group_assignments_production_batch` (`production_batch_id`);

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
  ADD KEY `fk_production_batches_charcoal_variant` (`charcoal_variant_id`),
  ADD KEY `fk_production_batches_output_variant` (`output_item_variant_id`),
  ADD KEY `fk_production_batches_created_by` (`created_by`),
  ADD KEY `fk_production_batches_store` (`store_id`);

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
  ADD KEY `fk_purchase_orders_approved_by` (`approved_by`),
  ADD KEY `idx_purchase_orders_cash_account` (`cash_account_id`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_purchase_order_items_po` (`purchase_order_id`),
  ADD KEY `fk_purchase_order_items_item` (`item_id`),
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
  ADD KEY `fk_purchase_receipt_items_item` (`item_id`),
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
  ADD KEY `idx_salesman_targets_sublocation_target_fk` (`sublocation_target_id`),
  ADD KEY `idx_salesman_targets_salesman_fk` (`salesman_id`),
  ADD KEY `fk_salesman_targets_store` (`store_id`);

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
  ADD UNIQUE KEY `slug` (`slug`);

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `item_stock_adjustments`
--
ALTER TABLE `item_stock_adjustments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `item_stock_balances`
--
ALTER TABLE `item_stock_balances`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `item_variants`
--
ALTER TABLE `item_variants`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
-- AUTO_INCREMENT for table `packaging_batch_movements`
--
ALTER TABLE `packaging_batch_movements`
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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `salesman_balances`
--
ALTER TABLE `salesman_balances`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salesman_sublocations`
--
ALTER TABLE `salesman_sublocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `salesman_targets`
--
ALTER TABLE `salesman_targets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salesmen`
--
ALTER TABLE `salesmen`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `sublocations`
--
ALTER TABLE `sublocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_current_stock`  AS SELECT `sb`.`id` AS `stock_balance_id`, `sb`.`store_id` AS `store_id`, `w`.`id` AS `warehouse_id`, `w`.`name` AS `warehouse_name`, `i`.`id` AS `item_id`, `i`.`name` AS `item_name`, `i`.`item_type` AS `item_type`, `u`.`unit_type` AS `unit_type`, `iv`.`id` AS `item_variant_id`, `iv`.`variant_name` AS `variant_name`, `iv`.`sku` AS `sku`, (case when (`u`.`unit_type` = 'weight') then 'kg' else `u`.`symbol` end) AS `unit_symbol`, `sb`.`quantity_on_hand` AS `quantity_on_hand`, `sb`.`quantity_reserved` AS `quantity_reserved`, (`sb`.`quantity_on_hand` - `sb`.`quantity_reserved`) AS `quantity_available`, `sb`.`average_cost` AS `average_cost`, (`sb`.`quantity_on_hand` * `sb`.`average_cost`) AS `stock_value` FROM ((((`stock_balances` `sb` join `warehouses` `w` on((`w`.`id` = `sb`.`warehouse_id`))) join `item_variants` `iv` on((`iv`.`id` = `sb`.`item_variant_id`))) join `items` `i` on((`i`.`id` = `iv`.`item_id`))) join `units` `u` on((`u`.`id` = `i`.`base_unit_id`))) ;

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

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_salesman_target_progress`  AS SELECT `progress`.`salesman_target_id` AS `salesman_target_id`, `progress`.`store_id` AS `store_id`, `progress`.`salesman_id` AS `salesman_id`, `progress`.`salesman_name` AS `salesman_name`, `progress`.`base_salary` AS `base_salary`, `progress`.`location_id` AS `location_id`, `progress`.`location_name` AS `location_name`, `progress`.`sublocation_id` AS `sublocation_id`, `progress`.`sublocation_name` AS `sublocation_name`, `progress`.`target_period` AS `target_period`, `progress`.`period_start` AS `period_start`, `progress`.`period_end` AS `period_end`, `progress`.`target_amount` AS `target_amount`, `progress`.`achieved_sales_amount` AS `achieved_sales_amount`, (case when (`progress`.`target_amount` = 0) then 0 else round(((`progress`.`achieved_sales_amount` / `progress`.`target_amount`) * 100),2) end) AS `achievement_percentage` FROM (select `st`.`id` AS `salesman_target_id`,`st`.`store_id` AS `store_id`,`s`.`id` AS `salesman_id`,`s`.`full_name` AS `salesman_name`,`s`.`base_salary` AS `base_salary`,`l`.`id` AS `location_id`,`l`.`name` AS `location_name`,`sl`.`id` AS `sublocation_id`,`sl`.`name` AS `sublocation_name`,`lt`.`target_period` AS `target_period`,`lt`.`period_start` AS `period_start`,`lt`.`period_end` AS `period_end`,`st`.`target_amount` AS `target_amount`,coalesce((select sum((case when (`di`.`quantity` > 0) then (`di`.`line_total` - ((`di`.`line_total` * `di`.`returned_quantity`) / `di`.`quantity`)) else `di`.`line_total` end)) from ((`dispatch_items` `di` join `dispatch_customers` `dc` on((`dc`.`id` = `di`.`dispatch_customer_id`))) join `dispatch_requests` `dr` on((`dr`.`id` = `di`.`dispatch_request_id`))) where ((`dr`.`salesman_id` = `st`.`salesman_id`) and (`dr`.`store_id` = `st`.`store_id`) and (`dc`.`sublocation_id` = `subt`.`sublocation_id`) and (`dr`.`status` = 'completed') and (`dr`.`request_date` between `lt`.`period_start` and `lt`.`period_end`))),0) AS `achieved_sales_amount` from (((((`salesman_targets` `st` join `salesmen` `s` on((`s`.`id` = `st`.`salesman_id`))) join `sublocation_targets` `subt` on((`subt`.`id` = `st`.`sublocation_target_id`))) join `location_targets` `lt` on((`lt`.`id` = `subt`.`location_target_id`))) join `sublocations` `sl` on((`sl`.`id` = `subt`.`sublocation_id`))) join `locations` `l` on((`l`.`id` = `sl`.`location_id`))) where (`st`.`status` = 'active')) AS `progress` ;

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
-- Constraints for table `item_stock_adjustments`
--
ALTER TABLE `item_stock_adjustments`
  ADD CONSTRAINT `fk_item_stock_adjustments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_adjustments_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_adjustments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_adjustments_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `item_stock_balances`
--
ALTER TABLE `item_stock_balances`
  ADD CONSTRAINT `fk_item_stock_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_item_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
-- Constraints for table `packaging_batch_movements`
--
ALTER TABLE `packaging_batch_movements`
  ADD CONSTRAINT `fk_batch_movements_assignment` FOREIGN KEY (`packaging_assignment_id`) REFERENCES `packaging_group_assignments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_batch_movements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_batch_movements_dispatch_item` FOREIGN KEY (`dispatch_item_id`) REFERENCES `dispatch_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_batch_movements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_batch_movements_variant` FOREIGN KEY (`item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_batch_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_packaging_group_assignments_charcoal_variant` FOREIGN KEY (`charcoal_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_consumed_by` FOREIGN KEY (`consumed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_group` FOREIGN KEY (`packaging_group_id`) REFERENCES `packaging_groups` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_output_variant` FOREIGN KEY (`output_item_variant_id`) REFERENCES `item_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_production_batch` FOREIGN KEY (`production_batch_id`) REFERENCES `production_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_packaging_group_assignments_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_purchase_order_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
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
  ADD CONSTRAINT `fk_purchase_receipt_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
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
