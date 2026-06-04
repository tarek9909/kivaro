Below is a **full dedicated explanation + backend implementation plan** that you can send to Codex together with the SQL file.

Use it like this:

1. Upload/send Codex the SQL file:
   [Download SQL file again](sandbox:/mnt/data/charcoal_erp_full_mysql_schema.sql)

2. Then send Codex this full explanation/prompt.

---

# Full Prompt to Send to Codex

```text
You are working on a backend system for a small charcoal distribution company.

The project is a small-scale ERP system that manages:

- Inventory
- Raw charcoal stock
- Packaging materials
- Product packaging configurations
- Purchase orders
- Partial stock receiving
- Stock movements
- Production / packaging batches
- Customers
- Locations and sublocations
- Salesmen / drivers
- Dispatch requests
- Daily settlements
- Customer debts
- Payments and receipts
- Accounting
- Salesman commissions
- Targets
- Roles and permissions
- Audit logs
- Reports

I will provide you with a MySQL schema file. Analyze the schema carefully before coding.

The business is not a normal online store. It is a charcoal company that buys raw charcoal, packaging materials, creates finished products, sends stock with salesmen/drivers to customers, collects cash, records debt, and calculates commissions based on targets.

The backend should be implemented in clean phases. Do not start coding randomly. First understand the database, then implement modules one by one.
```

---

# 1. Business Explanation

The application is for a startup/company that sells charcoal.

The company buys charcoal in bulk, for example 10 tons. This purchase is created as a purchase order. The purchase order may not be received all at once. It can be received partially many times.

Example:

```text
Purchase Order: 10 tons charcoal

First receive: 3 tons
Second receive: 4 tons
Third receive: 3 tons

Final status: received
```

After receiving, the charcoal becomes available in stock.

The company also has packaging materials:

```text
Cartons
Package bags
Stickers
Other packaging items
```

These packaging materials are also inventory items. They can be purchased, received, stocked, consumed, and tracked.

The company creates finished products from raw charcoal and packaging materials.

Example:

```text
Finished Product: Carton 400g x 20

Components:
- 8kg charcoal
- 20 package bags
- 20 stickers
- 1 carton
```

The system must calculate the cost of the finished product from its components.

After products are ready, salesmen/drivers create dispatch requests for specific customers. The request is approved by accountant/inventory manager. Stock goes out. Receipts are printed. At the end of the day, the salesman returns with collected money. If a customer did not pay, the missing amount becomes customer debt.

The system also calculates salesman commissions based on location/sublocation targets.

This project is based on the uploaded requirements describing inventory, packaging hierarchy, purchase orders, locations, salesmen, commissions, customers, dispatch, accounting, permissions, audit logs, and reports. The original requirement says the app must track stock, profit, loss, revenue, drivers, commissions, locations, categories, items, stock movements, purchase orders, customer payments, and full reporting. 

````

---

# 2. Main Backend Goal

The backend must expose REST APIs for all main modules.

Recommended stack:

```text
Node.js
Express.js
MySQL
mysql2/promise
JWT authentication
Role-based permissions
Zod/Joi validation or express-validator
Multer if file upload is needed later
PDF generation for receipts later
````

Use layered architecture:

```text
src/
  config/
    db.js
    env.js

  middleware/
    auth.middleware.js
    permission.middleware.js
    error.middleware.js
    audit.middleware.js

  modules/
    auth/
    users/
    roles/
    permissions/
    inventory/
    purchases/
    packaging/
    production/
    locations/
    salesmen/
    customers/
    dispatch/
    settlements/
    debts/
    payments/
    accounting/
    commissions/
    reports/
    auditLogs/

  utils/
    ApiError.js
    asyncHandler.js
    pagination.js
    stock.js
    commission.js
    money.js

  routes/
    index.js

  app.js
  server.js
```

Do not put all logic inside route files. Use:

```text
routes → controllers → services → repositories/database queries
```

---

# 3. Database Structure Overview

The SQL file is divided into these major groups:

```text
1. Authentication, users, roles, permissions
2. Company profile and system settings
3. Locations, sublocations, salesmen, targets
4. Inventory items, variants, warehouses, stock balances
5. Purchase orders and partial receiving
6. Packaging configurations and production batches
7. Customers
8. Dispatch requests and daily settlements
9. Customer debts, payments, and receipts
10. Accounting and financial transactions
11. Commissions
12. Audit logs
13. Notifications
14. Reporting views
```

The schema is designed to keep every important business operation traceable.

Important principle:

```text
Do not directly update stock without creating stock_movements.
Do not complete dispatch without settlement.
Do not record missing payment without customer_debts.
Do not calculate commission globally only; calculate per salesman target/sublocation.
Do not allow critical actions without permissions.
```

---

# 4. Authentication, Users, Roles, and Permissions

## Tables

```text
roles
permissions
role_permissions
users
user_sessions
```

## Purpose

These tables control who can log in and what each user can do.

The owner can create roles and assign permissions.

Example roles:

```text
Owner
Admin
Accountant
Inventory Manager
Salesman
Viewer
```

Example permissions:

```text
inventory.view
inventory.create
purchase_orders.create
purchase_orders.receive
dispatch.create
dispatch.approve
dispatch.settle
customers.view
customers.create
debts.manage
reports.view
roles.manage
users.manage
```

## Relations

```text
roles.id → users.role_id
roles.id → role_permissions.role_id
permissions.id → role_permissions.permission_id
users.id → user_sessions.user_id
```

## Backend APIs

Implement:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
PATCH  /api/users/:id/status
DELETE /api/users/:id

GET    /api/roles
POST   /api/roles
GET    /api/roles/:id
PATCH  /api/roles/:id
DELETE /api/roles/:id

GET    /api/permissions
PUT    /api/roles/:id/permissions
```

## Backend Rules

* Passwords must be hashed.
* Deactivated users cannot log in.
* Every protected route must check JWT.
* Every sensitive route must check permission.
* Role deletion should be blocked if users are assigned to it, unless reassigned first.

---

# 5. Company Profile and Settings

## Tables

```text
company_profiles
system_settings
```

## Purpose

These store general company information and dynamic settings.

Examples:

```text
Company name
Logo
Phone
Address
Currency
Default commission rule
Low stock alert threshold
```

## Relations

```text
users.id → system_settings.updated_by
```

## Backend APIs

```text
GET   /api/company-profile
PATCH /api/company-profile

GET   /api/settings
PATCH /api/settings/:key
```

---

# 6. Locations, Sublocations, Salesmen, and Targets

## Tables

```text
locations
sublocations
salesmen
salesman_sublocations
location_targets
sublocation_targets
salesman_targets
```

## Purpose

The company divides sales by geographic areas.

Example:

```text
Location: Beirut
  Sublocation: Hamra
  Sublocation: Verdun
  Sublocation: Achrafieh
```

Each main location has a target.

Example:

```text
Beirut monthly target = $30,000
```

The owner manually divides this target across sublocations.

Example:

```text
Hamra = $10,000
Verdun = $8,000
Achrafieh = $12,000
```

The sum of sublocation targets must equal the main location target.

Salesmen are assigned to sublocations. A salesman can belong to multiple sublocations.

Example:

```text
Ahmad → Hamra
Ahmad → Verdun
```

Each sublocation target is divided equally across assigned salesmen.

Example:

```text
Hamra target = $6,000
3 salesmen assigned

Each salesman target = $2,000
```

## Relations

```text
locations.id → sublocations.location_id
users.id → salesmen.user_id
salesmen.id → salesman_sublocations.salesman_id
sublocations.id → salesman_sublocations.sublocation_id

locations.id → location_targets.location_id
location_targets.id → sublocation_targets.location_target_id
sublocations.id → sublocation_targets.sublocation_id

sublocation_targets.id → salesman_targets.sublocation_target_id
salesmen.id → salesman_targets.salesman_id
```

## Backend APIs

```text
GET    /api/locations
POST   /api/locations
PATCH  /api/locations/:id
DELETE /api/locations/:id

GET    /api/locations/:id/sublocations
POST   /api/sublocations
PATCH  /api/sublocations/:id
DELETE /api/sublocations/:id

GET    /api/salesmen
POST   /api/salesmen
PATCH  /api/salesmen/:id
DELETE /api/salesmen/:id

POST   /api/salesmen/:id/sublocations
DELETE /api/salesmen/:id/sublocations/:sublocationId

POST   /api/location-targets
GET    /api/location-targets
GET    /api/location-targets/:id
PATCH  /api/location-targets/:id

POST   /api/location-targets/:id/sublocation-targets
POST   /api/sublocation-targets/:id/generate-salesman-targets
```

## Backend Rules

* Sublocation belongs to one location.
* Salesman can belong to many sublocations.
* Main location target period should not duplicate for the same location.
* Sublocation targets must sum exactly to location target.
* Salesman targets should be regenerated when salesman assignments change, but avoid destroying historical closed targets.
* Extra sales in one sublocation must not cover missing target in another sublocation.

---

# 7. Inventory Module

## Tables

```text
item_categories
units
items
item_variants
warehouses
stock_balances
stock_movements
```

## Purpose

This module tracks all stock.

There are different item types:

```text
raw_charcoal
packaging
finished_product
service
other
```

Examples:

```text
Raw Charcoal
Carton
Package Bag
Sticker
Finished Carton 400g x 20
Loose Charcoal Shawl
```

Each item can have variants.

Examples:

```text
Raw Charcoal:
  - 5.5 size
  - 4.5 size
  - 4 size

Package Bag:
  - 400g bag
  - 900g bag

Sticker:
  - Square sticker
  - Circular sticker
```

## Relations

```text
item_categories.id → item_categories.parent_id
item_categories.id → items.category_id
units.id → units.base_unit_id
units.id → items.base_unit_id
items.id → item_variants.item_id
locations.id → warehouses.location_id
warehouses.id → stock_balances.warehouse_id
item_variants.id → stock_balances.item_variant_id
warehouses.id → stock_movements.warehouse_id
item_variants.id → stock_movements.item_variant_id
users.id → stock_movements.created_by
```

## Important Concept

```text
stock_balances = current stock
stock_movements = stock history
```

Never update `stock_balances` alone.

Every stock change should:

```text
1. Insert stock_movements record
2. Update stock_balances
3. Link the movement to reference_type and reference_id
```

Example:

```text
Purchase receive:
movement_type = purchase_receive

Dispatch out:
movement_type = dispatch_out

Production consumes components:
movement_type = production_consume

Production outputs finished product:
movement_type = production_output
```

## Backend APIs

```text
GET    /api/item-categories
POST   /api/item-categories
PATCH  /api/item-categories/:id
DELETE /api/item-categories/:id

GET    /api/units
POST   /api/units
PATCH  /api/units/:id
DELETE /api/units/:id

GET    /api/items
POST   /api/items
GET    /api/items/:id
PATCH  /api/items/:id
DELETE /api/items/:id

GET    /api/item-variants
POST   /api/item-variants
GET    /api/item-variants/:id
PATCH  /api/item-variants/:id
DELETE /api/item-variants/:id

GET    /api/warehouses
POST   /api/warehouses
PATCH  /api/warehouses/:id
DELETE /api/warehouses/:id

GET    /api/stock-balances
GET    /api/stock-movements
POST   /api/stock-adjustments
```

## Backend Rules

* Cannot delete item if it has stock movement history.
* Cannot dispatch more than available quantity.
* Low stock alert should be calculated from stock_balances.
* Stock movements must be immutable. Do not edit old movement records except correction flow.
* Use transactions for all stock operations.

---

# 8. Purchase Orders and Partial Receiving

## Tables

```text
suppliers
purchase_orders
purchase_order_items
purchase_receipts
purchase_receipt_items
supplier_payments
```

## Purpose

The company buys charcoal and packaging materials from suppliers.

A purchase order may be:

```text
draft
pending
partially_received
received
cancelled
```

The purchase may be received in multiple parts.

Example:

```text
PO #1: 10 tons charcoal

Receipt #1: 3 tons
Receipt #2: 4 tons
Receipt #3: 3 tons
```

## Relations

```text
suppliers.id → purchase_orders.supplier_id
warehouses.id → purchase_orders.warehouse_id
users.id → purchase_orders.created_by
users.id → purchase_orders.approved_by

purchase_orders.id → purchase_order_items.purchase_order_id
item_variants.id → purchase_order_items.item_variant_id

purchase_orders.id → purchase_receipts.purchase_order_id
users.id → purchase_receipts.received_by

purchase_receipts.id → purchase_receipt_items.purchase_receipt_id
purchase_order_items.id → purchase_receipt_items.purchase_order_item_id
item_variants.id → purchase_receipt_items.item_variant_id

suppliers.id → supplier_payments.supplier_id
purchase_orders.id → supplier_payments.purchase_order_id
users.id → supplier_payments.created_by
```

## Backend APIs

```text
GET    /api/suppliers
POST   /api/suppliers
PATCH  /api/suppliers/:id
DELETE /api/suppliers/:id

GET    /api/purchase-orders
POST   /api/purchase-orders
GET    /api/purchase-orders/:id
PATCH  /api/purchase-orders/:id
POST   /api/purchase-orders/:id/submit
POST   /api/purchase-orders/:id/approve
POST   /api/purchase-orders/:id/cancel

POST   /api/purchase-orders/:id/receipts
GET    /api/purchase-orders/:id/receipts

POST   /api/supplier-payments
GET    /api/supplier-payments
```

## Backend Rules

* Cannot receive more than ordered quantity.
* Receiving must create stock movement.
* Receiving must update stock balance.
* Purchase order status updates automatically:

  * received quantity = 0 → pending
  * received quantity < ordered quantity → partially_received
  * received quantity = ordered quantity → received
* Cancelled purchase order cannot be received.
* Supplier balance should be calculated from purchases minus payments.

---

# 9. Packaging Configurations and Production

## Tables

```text
packaging_configurations
packaging_configuration_components
production_batches
production_batch_components
product_cost_history
```

## Purpose

This is like a BOM/recipe system.

It defines how to create a finished product from raw charcoal and packaging materials.

Example:

```text
Output product:
Carton 400g x 20

Components:
- 8kg charcoal
- 20 package bags
- 20 stickers
- 1 carton
```

Packaging types:

```text
carton_with_packages
carton_direct
loose_shawl
custom
```

## Relations

```text
item_variants.id → packaging_configurations.output_item_variant_id
item_variants.id → packaging_configurations.charcoal_variant_id
units.id → packaging_configurations.charcoal_unit_id
users.id → packaging_configurations.created_by

packaging_configurations.id → packaging_configuration_components.packaging_configuration_id
item_variants.id → packaging_configuration_components.component_item_variant_id
units.id → packaging_configuration_components.unit_id

packaging_configurations.id → production_batches.packaging_configuration_id
warehouses.id → production_batches.warehouse_id
item_variants.id → production_batches.output_item_variant_id
users.id → production_batches.created_by

production_batches.id → production_batch_components.production_batch_id
item_variants.id → production_batch_components.component_item_variant_id

item_variants.id → product_cost_history.item_variant_id
packaging_configurations.id → product_cost_history.packaging_configuration_id
users.id → product_cost_history.created_by
```

## Backend APIs

```text
GET    /api/packaging-configurations
POST   /api/packaging-configurations
GET    /api/packaging-configurations/:id
PATCH  /api/packaging-configurations/:id
DELETE /api/packaging-configurations/:id

POST   /api/packaging-configurations/:id/components
PATCH  /api/packaging-configuration-components/:id
DELETE /api/packaging-configuration-components/:id

POST   /api/packaging-configurations/:id/calculate-cost

GET    /api/production-batches
POST   /api/production-batches
GET    /api/production-batches/:id
POST   /api/production-batches/:id/start
POST   /api/production-batches/:id/complete
POST   /api/production-batches/:id/cancel

GET    /api/product-cost-history
```

## Backend Rules

* Finished product must be an item variant.
* Components must exist as item variants.
* Production cannot complete if components are not available in stock.
* Completing production must:

  * consume component stock
  * create `production_consume` stock movements
  * increase finished product stock
  * create `production_output` stock movement
  * calculate actual production cost
* Product cost history should be inserted when cost changes.
* Use database transactions.

---

# 10. Customers

## Tables

```text
customers
```

## Purpose

Stores all customers the company sells to.

Customer data includes:

```text
Name
Phone
Location
Sublocation
Address
Detailed address
Assigned salesman
Total purchased
Total paid
Debt balance
Status
```

## Relations

```text
locations.id → customers.location_id
sublocations.id → customers.sublocation_id
salesmen.id → customers.assigned_salesman_id
users.id → customers.created_by
```

## Backend APIs

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PATCH  /api/customers/:id
DELETE /api/customers/:id

GET    /api/customers/:id/receipts
GET    /api/customers/:id/debts
GET    /api/customers/:id/payments
```

## Backend Rules

* Customer must belong to a location and sublocation.
* Customer can optionally be assigned to a salesman.
* Cannot delete customer with existing dispatch/payment/debt history.
* Support search by name, phone, location, sublocation, salesman.

---

# 11. Dispatch Requests

## Tables

```text
dispatch_requests
dispatch_customers
dispatch_items
dispatch_signatures
dispatch_returns
```

## Purpose

This is the flow where salesman/driver requests stock for customers.

The salesman cannot request stock without linking it to customers.

Example:

```text
Salesman Ahmad requests:

Customer A:
- 5 cartons
- $100 total

Customer B:
- 3 cartons
- $60 total

Total dispatch value: $160
```

## Relations

```text
salesmen.id → dispatch_requests.salesman_id
warehouses.id → dispatch_requests.warehouse_id
users.id → dispatch_requests.created_by
users.id → dispatch_requests.approved_by
users.id → dispatch_requests.dispatched_by
users.id → dispatch_requests.completed_by

dispatch_requests.id → dispatch_customers.dispatch_request_id
customers.id → dispatch_customers.customer_id
locations.id → dispatch_customers.location_id
sublocations.id → dispatch_customers.sublocation_id

dispatch_customers.id → dispatch_items.dispatch_customer_id
dispatch_requests.id → dispatch_items.dispatch_request_id
item_variants.id → dispatch_items.item_variant_id

dispatch_requests.id → dispatch_signatures.dispatch_request_id

dispatch_requests.id → dispatch_returns.dispatch_request_id
dispatch_items.id → dispatch_returns.dispatch_item_id
item_variants.id → dispatch_returns.item_variant_id
users.id → dispatch_returns.created_by
```

## Dispatch Status Flow

Use this flow:

```text
draft
→ pending_approval
→ approved
→ dispatched
→ partially_settled
→ completed
```

Also allow:

```text
cancelled
```

## Backend APIs

```text
GET    /api/dispatch-requests
POST   /api/dispatch-requests
GET    /api/dispatch-requests/:id
PATCH  /api/dispatch-requests/:id

POST   /api/dispatch-requests/:id/customers
POST   /api/dispatch-customers/:id/items

POST   /api/dispatch-requests/:id/submit
POST   /api/dispatch-requests/:id/approve
POST   /api/dispatch-requests/:id/dispatch
POST   /api/dispatch-requests/:id/cancel

GET    /api/dispatch-requests/:id/print-summary
GET    /api/dispatch-requests/:id/print-customer-receipts

POST   /api/dispatch-requests/:id/returns
```

## Backend Rules

* Draft can be edited.
* Pending approval cannot be edited by salesman unless returned/rejected.
* Approved request can be dispatched.
* Dispatching should reduce/reserve stock.
* Do not allow dispatch if stock is insufficient.
* Dispatch must be customer-linked.
* Printed receipts should be generated only after approval or dispatch.
* Use transactions when dispatching stock.

---

# 12. Daily Settlements

## Tables

```text
dispatch_settlements
dispatch_settlement_customers
```

## Purpose

At the end of the day, the salesman returns with money.

The accountant checks each customer:

```text
Customer A expected $100, paid $100 → paid
Customer B expected $60, paid $0 → debt
Customer C expected $40, paid $20 → partial debt
```

## Relations

```text
dispatch_requests.id → dispatch_settlements.dispatch_request_id
users.id → dispatch_settlements.settled_by

dispatch_settlements.id → dispatch_settlement_customers.dispatch_settlement_id
dispatch_customers.id → dispatch_settlement_customers.dispatch_customer_id
customers.id → dispatch_settlement_customers.customer_id
```

## Backend APIs

```text
POST /api/dispatch-requests/:id/settlements
GET  /api/dispatch-requests/:id/settlements

POST /api/dispatch-settlements/:id/customers
POST /api/dispatch-settlements/:id/complete
```

## Backend Rules

* Settlement expected amount should match dispatch total.
* Customer paid amount cannot exceed expected amount unless handled as advance payment.
* Missing amount creates customer debt.
* Paid amount creates customer payment.
* Settlement completion updates dispatch status.
* If all customers settled and debts recorded, dispatch can be completed.
* Settlement should update salesman balance.

---

# 13. Customer Debts, Payments, and Receipts

## Tables

```text
customer_debts
customer_payments
customer_receipts
```

## Purpose

Tracks unpaid customer money and cash collection.

## Relations

```text
customers.id → customer_debts.customer_id
salesmen.id → customer_debts.salesman_id
dispatch_requests.id → customer_debts.dispatch_request_id
dispatch_customers.id → customer_debts.dispatch_customer_id
users.id → customer_debts.created_by

customers.id → customer_payments.customer_id
customer_debts.id → customer_payments.customer_debt_id
dispatch_requests.id → customer_payments.dispatch_request_id
salesmen.id → customer_payments.collected_by_salesman_id
users.id → customer_payments.received_by_user_id

customers.id → customer_receipts.customer_id
dispatch_requests.id → customer_receipts.dispatch_request_id
dispatch_customers.id → customer_receipts.dispatch_customer_id
customer_payments.id → customer_receipts.customer_payment_id
users.id → customer_receipts.created_by
```

## Backend APIs

```text
GET    /api/customer-debts
GET    /api/customer-debts/:id
POST   /api/customer-debts/:id/payments
PATCH  /api/customer-debts/:id/status

GET    /api/customer-payments
POST   /api/customer-payments

GET    /api/customer-receipts
GET    /api/customer-receipts/:id
GET    /api/customer-receipts/:id/print
```

## Backend Rules

* Debt is created when customer payment is missing or partial.
* Debt status:

  * pending
  * partially_paid
  * paid
  * written_off
  * cancelled
* Payment against debt updates paid amount and remaining amount.
* Receipt should be generated for sale/payment/debt.
* Customer total purchased, total paid, and debt balance can be calculated by reports/views, or updated carefully by service logic.

---

# 14. Accounting

## Tables

```text
expense_categories
expenses
cash_accounts
financial_transactions
salesman_balances
supplier_payments
```

## Purpose

Tracks company financial movements.

This module should show:

```text
Revenue
Cash collected
Customer debt
Supplier payments
Expenses
Salesman balances
Profit/loss
Commission payments
```

## Relations

```text
expense_categories.id → expenses.expense_category_id
users.id → expenses.created_by

cash_accounts.id → financial_transactions.cash_account_id
users.id → financial_transactions.created_by

salesmen.id → salesman_balances.salesman_id
dispatch_requests.id → salesman_balances.dispatch_request_id
users.id → salesman_balances.closed_by
```

## Backend APIs

```text
GET    /api/expense-categories
POST   /api/expense-categories
PATCH  /api/expense-categories/:id
DELETE /api/expense-categories/:id

GET    /api/expenses
POST   /api/expenses
GET    /api/expenses/:id
PATCH  /api/expenses/:id
DELETE /api/expenses/:id

GET    /api/cash-accounts
POST   /api/cash-accounts
PATCH  /api/cash-accounts/:id

GET    /api/financial-transactions

GET    /api/salesman-balances
GET    /api/salesman-balances/:id
POST   /api/salesman-balances/:id/close
```

## Backend Rules

* Any cash movement should create a financial transaction.
* Customer payment creates transaction type `income`.
* Supplier payment creates transaction type `expense`.
* Expense creates transaction type `expense`.
* Commission payment creates transaction type `expense`.
* Do not physically delete important accounting records. Prefer cancelled/reversed status.

---

# 15. Commission System

## Tables

```text
commission_rules
commission_calculations
commission_payments
```

## Purpose

Commission is calculated from salesman target achievement.

Default rule:

```text
If sales below target:
  5% commission on actual sales

If sales equal target:
  10% commission on target

If sales above target:
  10% commission on target
  + 1% commission on extra sales
```

Example:

```text
Target = $1,000
Actual Sales = $1,500

Commission:
10% of $1,000 = $100
1% of $500 = $5

Total commission = $105
```

Important:

A salesman may have multiple sublocation targets.

Example:

```text
Ahmad:
Hamra target = $1,000
Verdun target = $1,000
```

If Ahmad sells:

```text
Hamra = $1,500
Verdun = $500
```

The extra $500 from Hamra does not cover the missing $500 in Verdun.

So commission must be calculated per salesman target/sublocation.

## Relations

```text
commission_rules.id → commission_calculations.commission_rule_id
salesman_targets.id → commission_calculations.salesman_target_id
salesmen.id → commission_calculations.salesman_id
sublocations.id → commission_calculations.sublocation_id
users.id → commission_calculations.approved_by

commission_calculations.id → commission_payments.commission_calculation_id
salesmen.id → commission_payments.salesman_id
users.id → commission_payments.paid_by
```

## Backend APIs

```text
GET    /api/commission-rules
POST   /api/commission-rules
PATCH  /api/commission-rules/:id
DELETE /api/commission-rules/:id

POST   /api/commissions/calculate
GET    /api/commissions
GET    /api/commissions/:id
POST   /api/commissions/:id/approve
POST   /api/commissions/:id/pay
```

## Backend Rules

* Calculate commission per salesman_target_id.
* Sales amount should be based on completed/settled dispatches in that sublocation and period.
* Do not include unpaid/cancelled dispatches unless business rule says otherwise.
* Approved commission should not be recalculated silently.
* If correction is needed, create recalculation/revision history.

---

# 16. Audit Logs

## Table

```text
audit_logs
```

## Purpose

Every important action must be logged.

Examples:

```text
User created purchase order
User received stock
User approved dispatch
User completed settlement
User changed product price
User created customer debt
User paid supplier
User changed role permissions
```

## Relation

```text
users.id → audit_logs.user_id
```

## Backend APIs

```text
GET /api/audit-logs
GET /api/audit-logs/:id
```

## Backend Rules

* Audit logs should be read-only.
* Log old and new values for updates.
* Log module, action, table_name, record_id.
* Log IP/user agent if available.
* Do not allow normal users to delete audit logs.

---

# 17. Reports

The schema includes reporting views such as:

```text
v_current_stock
v_customer_balances
v_salesman_target_progress
v_dispatch_summary
```

Reports should be implemented after core modules.

## Backend APIs

```text
GET /api/reports/current-stock
GET /api/reports/customer-balances
GET /api/reports/salesman-target-progress
GET /api/reports/dispatch-summary

GET /api/reports/sales
GET /api/reports/debts
GET /api/reports/purchases
GET /api/reports/stock-movements
GET /api/reports/profit-loss
GET /api/reports/commissions
```

## Report Filters

Every report should support filters:

```text
date_from
date_to
location_id
sublocation_id
salesman_id
customer_id
warehouse_id
item_id
item_variant_id
status
search
page
limit
sort_by
sort_order
```

---

# 18. Critical Backend Implementation Rules

Use MySQL transactions for these operations:

```text
Purchase receiving
Stock adjustment
Production completion
Dispatch approval/dispatching
Dispatch settlement
Customer debt payment
Supplier payment
Commission payment
```

Example transaction for receiving stock:

```text
BEGIN

1. Insert purchase_receipts
2. Insert purchase_receipt_items
3. Insert stock_movements
4. Update stock_balances
5. Update received quantity on purchase_order_items
6. Update purchase_order status

COMMIT
```

If any step fails:

```text
ROLLBACK
```

---

# 19. Stock Service Requirements

Create a reusable `stockService`.

Required methods:

```text
getAvailableStock(warehouseId, itemVariantId)

increaseStock({
  warehouseId,
  itemVariantId,
  quantity,
  unitCost,
  movementType,
  referenceType,
  referenceId,
  createdBy
})

decreaseStock({
  warehouseId,
  itemVariantId,
  quantity,
  movementType,
  referenceType,
  referenceId,
  createdBy
})

reserveStock(... optional later)

adjustStock({
  warehouseId,
  itemVariantId,
  quantityChange,
  reason,
  createdBy
})
```

Rules:

```text
- Increase stock creates positive movement.
- Decrease stock creates negative movement.
- Do not allow stock to go below zero.
- Update average cost carefully.
- Always create stock_movements.
```

---

# 20. Commission Service Requirements

Create `commissionService`.

Required methods:

```text
calculateForSalesmanTarget(salesmanTargetId)

calculateForPeriod({
  periodStart,
  periodEnd,
  salesmanId?,
  locationId?,
  sublocationId?
})

approveCommission(commissionCalculationId, approvedBy)

payCommission(commissionCalculationId, paidBy, cashAccountId)
```

Formula:

```text
if actual_sales < target:
  commission = actual_sales * below_target_rate

if actual_sales == target:
  commission = target * target_reached_rate

if actual_sales > target:
  commission = (target * target_reached_rate)
             + ((actual_sales - target) * above_target_extra_rate)
```

Default rates:

```text
below target = 5%
target reached = 10%
above target extra = 1%
```

---

# 21. Dispatch Service Requirements

Create `dispatchService`.

Required methods:

```text
createDispatchRequest(data)
addCustomerToDispatch(dispatchId, customerData)
addItemToDispatchCustomer(dispatchCustomerId, itemData)
submitDispatch(dispatchId)
approveDispatch(dispatchId, approvedBy)
dispatchStock(dispatchId, dispatchedBy)
settleDispatch(dispatchId, settlementData)
completeDispatch(dispatchId, completedBy)
cancelDispatch(dispatchId)
```

Important:

When dispatching stock:

```text
- Check stock availability
- Create stock movement dispatch_out
- Update stock balance
- Change status to dispatched
```

When settling:

```text
- Check each customer expected amount
- Record paid amount
- Create payment if paid > 0
- Create debt if missing amount > 0
- Create receipt
- Update dispatch status
- Update salesman balance
```

---

# 22. Backend Implementation Phases

## Phase 1: Project Foundation

Implement:

```text
Express setup
MySQL connection
Environment variables
Error handler
Response format
Pagination helper
Validation helper
Auth middleware
Permission middleware
Audit middleware
```

Do not implement business modules before foundation is clean.

---

## Phase 2: Auth, Users, Roles, Permissions

Implement:

```text
Login
Logout
Current user
User CRUD
Role CRUD
Permission list
Assign permissions to role
Protect routes
```

Acceptance criteria:

```text
- Inactive user cannot login
- JWT required for protected routes
- Permission middleware blocks unauthorized actions
- Owner/admin can manage roles
```

---

## Phase 3: Inventory Masters

Implement:

```text
Categories
Units
Items
Item variants
Warehouses
Stock balances
Stock movements list
Manual stock adjustment
```

Acceptance criteria:

```text
- Can create charcoal item and variants
- Can create packaging items and variants
- Can view current stock
- Stock adjustment creates stock movement
```

---

## Phase 4: Purchase Orders

Implement:

```text
Suppliers
Purchase order create/edit
Purchase order items
Submit/approve/cancel PO
Partial receiving
Supplier payments
```

Acceptance criteria:

```text
- Can create PO for 10 tons charcoal
- Can receive 3 tons only
- PO becomes partially_received
- Stock increases by 3 tons
- Can receive remaining quantity later
- PO becomes received when complete
- Cannot receive more than ordered quantity
```

---

## Phase 5: Packaging and Production

Implement:

```text
Packaging configurations
Configuration components
Cost calculation
Production batches
Complete production
Product cost history
```

Acceptance criteria:

```text
- Can define Carton 400g x 20
- Can calculate component cost
- Can produce finished products
- Components decrease from stock
- Finished product increases in stock
```

---

## Phase 6: Locations, Salesmen, Customers, Targets

Implement:

```text
Locations
Sublocations
Salesmen
Salesman-sublocation assignments
Customers
Location targets
Sublocation targets
Generate salesman targets
```

Acceptance criteria:

```text
- Location target can be divided into sublocations
- System validates total sublocation target equals location target
- Salesman can be assigned to multiple sublocations
- Salesman targets are generated per sublocation
```

---

## Phase 7: Dispatch

Implement:

```text
Create dispatch request
Add customers
Add customer items
Submit request
Approve request
Dispatch stock
Print summary endpoint
Print customer receipts endpoint
```

Acceptance criteria:

```text
- Salesman cannot create dispatch without customers
- Dispatch cannot exceed stock
- Approved dispatch can reduce stock
- Dispatch contains customer-level items and totals
```

---

## Phase 8: Settlement, Debts, Payments

Implement:

```text
Dispatch settlement
Customer-level settlement
Customer payments
Customer debts
Customer receipts
Salesman balances
```

Acceptance criteria:

```text
- Accountant can settle dispatch
- Paid customer creates payment
- Unpaid/partial customer creates debt
- Dispatch can be completed after settlement
- Salesman balance shows expected, collected, debt
```

---

## Phase 9: Accounting

Implement:

```text
Expense categories
Expenses
Cash accounts
Financial transactions
Supplier payments integration
Customer payments integration
Commission payment integration
```

Acceptance criteria:

```text
- Customer payment creates income transaction
- Expense creates expense transaction
- Supplier payment creates expense transaction
- Reports can calculate cash movement
```

---

## Phase 10: Commissions

Implement:

```text
Commission rules
Commission calculation
Commission approval
Commission payment
```

Acceptance criteria:

```text
- Below target uses 5%
- At target uses 10%
- Above target uses 10% on target + 1% on extra
- Commission is calculated per salesman target/sublocation
```

---

## Phase 11: Reports and Audit Logs

Implement:

```text
Inventory reports
Sales reports
Debt reports
Purchase reports
Commission reports
Profit/loss reports
Audit logs list
```

Acceptance criteria:

```text
- Reports support filters
- Reports support pagination
- Audit logs show important user actions
```

---

# 23. Recommended API Response Format

Use a consistent response format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

For errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be greater than zero"
    }
  ]
}
```

---

# 24. Important Validation Examples

## Purchase Receiving

```text
received_quantity > 0
received_quantity <= remaining_quantity
purchase_order.status is not cancelled
item belongs to purchase order
```

## Dispatch

```text
dispatch has at least one customer
each customer has at least one item
quantity > 0
unit_price >= 0
stock available before dispatch
```

## Settlement

```text
paid_amount >= 0
paid_amount <= expected_amount
missing amount creates debt
settlement cannot be completed twice
```

## Commission

```text
target_amount > 0
actual_sales >= 0
rates are valid percentages
do not duplicate commission calculation for same salesman target and period
```

---

# 25. What Codex Should Do First

Before coding, Codex should:

```text
1. Read the full SQL file.
2. Identify all tables and relationships.
3. Create a backend implementation plan based on the SQL.
4. Create module folders.
5. Implement database connection.
6. Implement auth and permission middleware.
7. Start with users/roles/permissions.
8. Then inventory masters.
9. Then purchase receiving and stock service.
```

Do not start with dispatch before inventory and purchases work.

Do not start with reports before the core flows work.

Do not start with UI.

---

# 26. Final Instruction to Codex

```text
Your task is to implement the backend for this database in clean phases.

Start with Phase 1 only:
- Express backend setup
- MySQL connection
- Environment config
- Error handling
- Auth middleware structure
- Permission middleware structure
- Standard response format
- Folder/module structure
- Basic health check route

Do not implement all modules at once.
After Phase 1, provide a summary and wait for the next phase.

Important:
Use database transactions for all stock, accounting, dispatch, purchase receiving, and settlement operations.
Use audit logs for important actions.
Keep business logic in services, not controllers.
Use clean, readable code.
```

---

# Short Version You Can Also Send

```text
This SQL schema is for a charcoal distribution ERP.

It manages:
- Users, roles, permissions
- Inventory items and variants
- Warehouses and stock balances
- Purchase orders with partial receiving
- Stock movements
- Packaging configurations and production batches
- Customers
- Locations, sublocations, salesmen, and targets
- Dispatch requests
- Daily settlements
- Customer debts
- Payments and receipts
- Accounting transactions
- Commission calculations
- Audit logs
- Reports

The backend must be implemented in phases:
1. Foundation
2. Auth/users/roles/permissions
3. Inventory masters
4. Purchase orders and stock receiving
5. Packaging and production
6. Locations, customers, salesmen, targets
7. Dispatch
8. Settlement, payments, debts
9. Accounting
10. Commissions
11. Reports and audit logs

The most important backend rules:
- Every stock change must create stock_movements.
- Do not allow negative stock.
- Purchase orders support partial receiving.
- Dispatch must be linked to customers.
- Dispatch settlement must create payments or debts.
- Commission is calculated per salesman target/sublocation.
- Extra sales in one sublocation do not cover missing target in another.
- Sensitive operations must use transactions.
- All important actions must be audit logged.
```
