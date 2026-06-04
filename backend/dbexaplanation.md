Done — I created the full MySQL schema file:

[Download the full MySQL file](sandbox:/mnt/data/charcoal_erp_full_mysql_schema.sql)

This schema is based on your uploaded business plan for the charcoal inventory, packaging, dispatch, accounting, commission, customer debt, reporting, permissions, and audit system. 

---

# 1. Big Analysis of the Plan

Your system is not a simple inventory app. It is closer to a **small ERP system** for a charcoal distribution company.

It needs to manage:

```text
Raw charcoal purchase
→ Partial receiving
→ Inventory stock
→ Packaging materials
→ Product configuration
→ Cost calculation
→ Salesman dispatch
→ Customer delivery
→ Cash collection
→ Customer debt
→ Salesman balance
→ Commission
→ Profit/loss
→ Reports
```

The most important thing is that the database must protect the business flow.

For example:

A salesman should not just take stock randomly.

He should create a dispatch request linked to:

```text
Salesman
→ Customers
→ Products
→ Quantities
→ Prices
```

Then accountant/inventory approves it, stock goes out, receipts are printed, and later the salesman returns with money. If money is missing, it becomes customer debt.

---

# 2. Main Database Modules

The file contains these major sections:

```text
1. Users, roles, permissions
2. Company and settings
3. Locations, sublocations, salesmen, targets
4. Suppliers and inventory
5. Purchase orders and partial receiving
6. Packaging configuration and production
7. Customers
8. Dispatch and settlements
9. Customer debts, payments, receipts
10. Accounting
11. Commissions
12. Audit logs
13. Notifications
14. Reporting views
15. Basic seed data
```

---

# 3. Users, Roles, and Permissions Relations

## `roles`

Stores user roles.

Examples:

```text
Owner
Admin
Accountant
Inventory Manager
Salesman
Viewer
```

One role can be assigned to many users.

Relation:

```text
roles.id → users.role_id
```

---

## `permissions`

Stores every action that can be allowed or denied.

Examples:

```text
inventory.view
purchase_orders.receive
dispatch.approve
reports.export
roles.manage
```

---

## `role_permissions`

This is the bridge table between roles and permissions.

A role can have many permissions.
A permission can belong to many roles.

Relation:

```text
roles.id → role_permissions.role_id
permissions.id → role_permissions.permission_id
```

Example:

```text
Accountant role
→ dispatch.approve
→ dispatch.settle
→ debts.manage
→ accounting.manage
```

---

## `users`

Stores login accounts.

Each user belongs to one role.

Relation:

```text
roles.id → users.role_id
```

A user can be:

```text
active
inactive
suspended
```

---

## `user_sessions`

Stores login sessions/tokens.

Relation:

```text
users.id → user_sessions.user_id
```

If a user is deleted, their sessions are deleted.

---

# 4. Company and Settings Relations

## `company_profiles`

Stores company information:

```text
Company name
Phone
Email
Address
Logo
Currency
Tax number
```

---

## `system_settings`

Stores dynamic settings.

Example:

```text
currency = USD
default_commission_rule = 1
low_stock_alert = true
```

Relation:

```text
users.id → system_settings.updated_by
```

This lets you know who changed a setting.

---

# 5. Locations, Sublocations, and Salesmen Relations

## `locations`

Main areas.

Example:

```text
Beirut
Saida
Tripoli
Bekaa
```

---

## `sublocations`

Smaller areas inside a main location.

Relation:

```text
locations.id → sublocations.location_id
```

Example:

```text
Beirut
  → Hamra
  → Verdun
  → Achrafieh
```

---

## `salesmen`

Stores salesman/driver information.

A salesman can optionally be connected to a system login user.

Relation:

```text
users.id → salesmen.user_id
```

This means a salesman can log in to the system if needed.

---

## `salesman_sublocations`

This table allows one salesman to belong to multiple sublocations.

Relations:

```text
salesmen.id → salesman_sublocations.salesman_id
sublocations.id → salesman_sublocations.sublocation_id
```

Example:

```text
Ahmad → Hamra
Ahmad → Verdun
```

This is important because one salesman can have multiple independent targets.

---

# 6. Target Relations

## `location_targets`

Stores the big target of a main location for a specific period.

Relation:

```text
locations.id → location_targets.location_id
```

Example:

```text
Beirut target for May = $30,000
```

---

## `sublocation_targets`

Stores how the location target is divided across sublocations.

Relations:

```text
location_targets.id → sublocation_targets.location_target_id
sublocations.id → sublocation_targets.sublocation_id
```

Example:

```text
Beirut May target = $30,000

Hamra = $10,000
Verdun = $8,000
Achrafieh = $12,000
```

The app logic should validate that:

```text
Sum of sublocation targets = main location target
```

---

## `salesman_targets`

Stores each salesman’s target inside a specific sublocation target.

Relations:

```text
sublocation_targets.id → salesman_targets.sublocation_target_id
salesmen.id → salesman_targets.salesman_id
```

Example:

```text
Hamra target = $6,000
Salesmen = 3

Ahmad = $2,000
Ali = $2,000
Hassan = $2,000
```

This supports your rule that salesman targets are divided equally under a sublocation.

---

# 7. Inventory Master Relations

## `suppliers`

Stores suppliers.

Example:

```text
Charcoal supplier
Carton supplier
Sticker supplier
```

---

## `item_categories`

Stores item categories.

It supports parent-child categories.

Relation:

```text
item_categories.id → item_categories.parent_id
```

Example:

```text
Packaging Materials
  → Cartons
  → Bags
  → Stickers
```

---

## `units`

Stores measurement units.

Examples:

```text
kg
g
ton
pc
carton
bag
```

It supports unit conversion.

Relation:

```text
units.id → units.base_unit_id
```

Example:

```text
1 ton = 1000 kg
1 g = 0.001 kg
```

---

## `items`

Stores the main item.

Examples:

```text
Raw charcoal
Carton
Package bag
Sticker
Finished carton product
```

Relations:

```text
item_categories.id → items.category_id
units.id → items.base_unit_id
users.id → items.created_by
```

Each item has an `item_type`:

```text
raw_charcoal
packaging
finished_product
service
other
```

---

## `item_variants`

Stores item variations.

Relation:

```text
items.id → item_variants.item_id
```

Examples:

```text
Raw charcoal
  → 5.5 size
  → 4.5 size
  → 4 size

Package bag
  → 400g bag
  → 900g bag

Sticker
  → Square sticker
  → Circular sticker
```

This is very important because your business depends on variants.

---

## `warehouses`

Stores warehouse/storage locations.

Relation:

```text
locations.id → warehouses.location_id
```

A warehouse can optionally belong to a location.

---

## `stock_balances`

Stores the current available stock.

Relations:

```text
warehouses.id → stock_balances.warehouse_id
item_variants.id → stock_balances.item_variant_id
```

Example:

```text
Main warehouse
→ 5.5 charcoal
→ quantity_on_hand = 3000 kg
```

This table is the current stock summary.

---

## `stock_movements`

Stores every stock movement.

Relations:

```text
warehouses.id → stock_movements.warehouse_id
item_variants.id → stock_movements.item_variant_id
users.id → stock_movements.created_by
```

Examples of movement types:

```text
purchase_receive
production_consume
production_output
dispatch_out
dispatch_return
damage
adjustment
```

This table is the inventory history.

Important:

```text
stock_balances = current stock
stock_movements = stock history
```

---

# 8. Purchase Order Relations

## `purchase_orders`

Stores purchase order headers.

Relations:

```text
suppliers.id → purchase_orders.supplier_id
warehouses.id → purchase_orders.warehouse_id
users.id → purchase_orders.created_by
users.id → purchase_orders.approved_by
```

Statuses:

```text
draft
pending
partially_received
received
cancelled
```

---

## `purchase_order_items`

Stores items inside the purchase order.

Relations:

```text
purchase_orders.id → purchase_order_items.purchase_order_id
item_variants.id → purchase_order_items.item_variant_id
```

Example:

```text
PO #1
→ 10 tons charcoal 5.5
→ 5000 cartons
→ 20000 stickers
```

---

## `purchase_receipts`

Stores each receiving operation.

Relation:

```text
purchase_orders.id → purchase_receipts.purchase_order_id
users.id → purchase_receipts.received_by
```

This allows partial receiving.

Example:

```text
PO = 10 tons
Receipt 1 = 3 tons
Receipt 2 = 4 tons
Receipt 3 = 3 tons
```

---

## `purchase_receipt_items`

Stores the received items in each receipt.

Relations:

```text
purchase_receipts.id → purchase_receipt_items.purchase_receipt_id
purchase_order_items.id → purchase_receipt_items.purchase_order_item_id
item_variants.id → purchase_receipt_items.item_variant_id
```

This is how the system knows exactly which PO item was received.

---

## `supplier_payments`

Stores payments to suppliers.

Relations:

```text
suppliers.id → supplier_payments.supplier_id
purchase_orders.id → supplier_payments.purchase_order_id
users.id → supplier_payments.created_by
```

A supplier payment can be linked to a PO or can be general.

---

# 9. Packaging and Production Relations

This is one of the most important parts of your app.

## `packaging_configurations`

This table defines how a finished product is built.

Relations:

```text
item_variants.id → packaging_configurations.output_item_variant_id
item_variants.id → packaging_configurations.charcoal_variant_id
units.id → packaging_configurations.charcoal_unit_id
users.id → packaging_configurations.created_by
```

Example:

```text
Output product:
Carton 400g x 20

Uses:
5.5 charcoal
20 package bags
20 stickers
1 carton
```

Packaging types:

```text
carton_with_packages
carton_direct
loose_shawl
custom
```

---

## `packaging_configuration_components`

Stores the components used in a packaging configuration.

Relations:

```text
packaging_configurations.id → packaging_configuration_components.packaging_configuration_id
item_variants.id → packaging_configuration_components.component_item_variant_id
units.id → packaging_configuration_components.unit_id
```

Example:

```text
Configuration: Carton 400g x 20

Components:
5.5 charcoal = 8 kg
400g bag = 20 pcs
Square sticker = 20 pcs
Carton = 1 pc
```

This table is like a recipe/BOM.

---

## `production_batches`

Stores actual production operations.

Relations:

```text
packaging_configurations.id → production_batches.packaging_configuration_id
warehouses.id → production_batches.warehouse_id
item_variants.id → production_batches.output_item_variant_id
users.id → production_batches.created_by
```

Example:

```text
Produce 100 cartons of 400g x 20
```

When completed:

```text
Component stock decreases
Finished product stock increases
```

---

## `production_batch_components`

Stores the actual consumed materials for a production batch.

Relations:

```text
production_batches.id → production_batch_components.production_batch_id
item_variants.id → production_batch_components.component_item_variant_id
```

Example:

```text
Batch #1 consumed:
800 kg charcoal
2000 bags
2000 stickers
100 cartons
```

---

## `product_cost_history`

Stores calculated product costs over time.

Relations:

```text
item_variants.id → product_cost_history.item_variant_id
packaging_configurations.id → product_cost_history.packaging_configuration_id
users.id → product_cost_history.created_by
```

This is important because costs change.

Example:

```text
Carton 400g x 20 cost in May = $8
Carton 400g x 20 cost in June = $8.70
```

You should not overwrite old costs without history.

---

# 10. Customer Relations

## `customers`

Stores customers.

Relations:

```text
locations.id → customers.location_id
sublocations.id → customers.sublocation_id
salesmen.id → customers.assigned_salesman_id
users.id → customers.created_by
```

Example:

```text
Customer: Mini Market Al Nour
Location: Beirut
Sublocation: Hamra
Assigned salesman: Ahmad
```

Customers are linked to dispatch, payments, debts, and receipts.

---

# 11. Dispatch Relations

Dispatch is the daily stock-out flow for salesmen/drivers.

## `dispatch_requests`

Main dispatch request.

Relations:

```text
salesmen.id → dispatch_requests.salesman_id
warehouses.id → dispatch_requests.warehouse_id
users.id → dispatch_requests.approved_by
users.id → dispatch_requests.dispatched_by
users.id → dispatch_requests.completed_by
users.id → dispatch_requests.created_by
```

Statuses:

```text
draft
pending_approval
approved
dispatched
partially_settled
completed
cancelled
```

Example:

```text
Ahmad requests products for 10 customers.
```

---

## `dispatch_customers`

Stores customers inside a dispatch request.

Relations:

```text
dispatch_requests.id → dispatch_customers.dispatch_request_id
customers.id → dispatch_customers.customer_id
locations.id → dispatch_customers.location_id
sublocations.id → dispatch_customers.sublocation_id
```

Example:

```text
Dispatch #15
→ Customer A
→ Customer B
→ Customer C
```

This lets the accountant check payment customer by customer.

---

## `dispatch_items`

Stores products sold to each customer inside the dispatch.

Relations:

```text
dispatch_customers.id → dispatch_items.dispatch_customer_id
dispatch_requests.id → dispatch_items.dispatch_request_id
item_variants.id → dispatch_items.item_variant_id
```

Example:

```text
Customer A:
→ 5 cartons
→ unit price $10
→ total $50
```

This table is the real sales detail.

---

## `dispatch_signatures`

Stores signatures for printed papers.

Relation:

```text
dispatch_requests.id → dispatch_signatures.dispatch_request_id
```

Signer types:

```text
inventory_manager
salesman
accountant
customer
```

This supports your requirement for signatures from inventory manager and driver.

---

## `dispatch_settlements`

Stores the end-of-day settlement.

Relations:

```text
dispatch_requests.id → dispatch_settlements.dispatch_request_id
users.id → dispatch_settlements.settled_by
```

Example:

```text
Expected: $1,000
Collected: $850
Debt: $150
Returned stock: $0
```

---

## `dispatch_settlement_customers`

Stores the settlement result per customer.

Relations:

```text
dispatch_settlements.id → dispatch_settlement_customers.dispatch_settlement_id
dispatch_customers.id → dispatch_settlement_customers.dispatch_customer_id
customers.id → dispatch_settlement_customers.customer_id
```

Example:

```text
Customer A paid fully
Customer B paid partially
Customer C became debt
```

---

## `dispatch_returns`

Stores returned stock from a dispatch.

Relations:

```text
dispatch_requests.id → dispatch_returns.dispatch_request_id
dispatch_items.id → dispatch_returns.dispatch_item_id
item_variants.id → dispatch_returns.item_variant_id
users.id → dispatch_returns.created_by
```

Example:

```text
Salesman returned 2 cartons unsold.
```

---

# 12. Customer Debt, Payments, and Receipt Relations

## `customer_debts`

Stores unpaid customer amounts.

Relations:

```text
customers.id → customer_debts.customer_id
salesmen.id → customer_debts.salesman_id
dispatch_requests.id → customer_debts.dispatch_request_id
dispatch_customers.id → customer_debts.dispatch_customer_id
users.id → customer_debts.created_by
```

Example:

```text
Customer B owes $60 from Dispatch #15.
Salesman Ahmad must collect it.
```

Statuses:

```text
pending
partially_paid
paid
written_off
cancelled
```

---

## `customer_payments`

Stores money collected from customers.

Relations:

```text
customers.id → customer_payments.customer_id
customer_debts.id → customer_payments.customer_debt_id
dispatch_requests.id → customer_payments.dispatch_request_id
salesmen.id → customer_payments.collected_by_salesman_id
users.id → customer_payments.received_by_user_id
```

A payment can be:

```text
Direct dispatch payment
Debt payment
General customer payment
```

---

## `customer_receipts`

Stores printable receipts.

Relations:

```text
customers.id → customer_receipts.customer_id
dispatch_requests.id → customer_receipts.dispatch_request_id
dispatch_customers.id → customer_receipts.dispatch_customer_id
customer_payments.id → customer_receipts.customer_payment_id
users.id → customer_receipts.created_by
```

Receipt types:

```text
sale
payment
debt
return
```

---

# 13. Accounting Relations

## `expense_categories`

Stores expense types.

Examples:

```text
Fuel
Maintenance
Rent
Salaries
Other
```

---

## `expenses`

Stores company expenses.

Relations:

```text
expense_categories.id → expenses.expense_category_id
users.id → expenses.created_by
```

Example:

```text
Fuel expense = $40
```

---

## `cash_accounts`

Stores money accounts.

Examples:

```text
Main Cashbox
Bank Account
Wallet
```

---

## `financial_transactions`

Stores all accounting money movements.

Relations:

```text
cash_accounts.id → financial_transactions.cash_account_id
users.id → financial_transactions.created_by
```

It also has:

```text
reference_type
reference_id
```

So it can point to different business documents, such as:

```text
customer_payment
supplier_payment
expense
commission_payment
```

This is a flexible accounting ledger.

---

## `salesman_balances`

Stores daily salesman balance.

Relations:

```text
salesmen.id → salesman_balances.salesman_id
dispatch_requests.id → salesman_balances.dispatch_request_id
users.id → salesman_balances.closed_by
```

Example:

```text
Ahmad expected to bring $1,000
He brought $850
Debt = $150
Balance closed by accountant
```

---

# 14. Commission Relations

## `commission_rules`

Stores commission rules.

Default rule from your plan:

```text
Below target = 5%
At target = 10%
Above target extra = 1%
```

---

## `commission_calculations`

Stores actual calculated commissions.

Relations:

```text
commission_rules.id → commission_calculations.commission_rule_id
salesman_targets.id → commission_calculations.salesman_target_id
salesmen.id → commission_calculations.salesman_id
sublocations.id → commission_calculations.sublocation_id
users.id → commission_calculations.approved_by
```

This is important because commission is calculated per salesman target, not only globally.

Example:

```text
Ahmad - Hamra
Target: $1,000
Sales: $1,500
Commission: $105
```

---

## `commission_payments`

Stores paid commission.

Relations:

```text
commission_calculations.id → commission_payments.commission_calculation_id
salesmen.id → commission_payments.salesman_id
users.id → commission_payments.paid_by
```

This separates calculated commission from paid commission.

---

# 15. Audit Log Relations

## `audit_logs`

Stores every important user action.

Relation:

```text
users.id → audit_logs.user_id
```

It also stores:

```text
module
action
table_name
record_id
old_values
new_values
ip_address
user_agent
description
```

Example:

```text
User Sara approved dispatch request #20.
Old status: pending_approval
New status: approved
```

This is very important for security and accountability.

---

# 16. Notifications Relations

## `notifications`

Stores internal alerts.

Relation:

```text
users.id → notifications.user_id
```

Example notifications:

```text
Low stock alert
Purchase order partially received
Customer debt overdue
Dispatch waiting for approval
```

---

# 17. Reporting Views

The file includes ready views.

## `v_current_stock`

Shows current stock with item names, warehouse, available quantity, average cost, and stock value.

Uses:

```text
stock_balances
warehouses
item_variants
items
units
```

---

## `v_customer_balances`

Shows customer debt summary.

Uses:

```text
customers
locations
sublocations
customer_debts
```

---

## `v_salesman_target_progress`

Shows target progress by salesman and sublocation.

Uses:

```text
salesman_targets
salesmen
sublocation_targets
location_targets
sublocations
locations
```

---

## `v_dispatch_summary`

Shows dispatch overview.

Uses:

```text
dispatch_requests
salesmen
warehouses
dispatch_customers
```

---

# 18. Most Important Business Flow in This Schema

## Purchase and stock flow

```text
purchase_orders
→ purchase_order_items
→ purchase_receipts
→ purchase_receipt_items
→ stock_movements
→ stock_balances
```

---

## Packaging flow

```text
items
→ item_variants
→ packaging_configurations
→ packaging_configuration_components
→ production_batches
→ production_batch_components
→ stock_movements
→ stock_balances
```

---

## Dispatch flow

```text
dispatch_requests
→ dispatch_customers
→ dispatch_items
→ dispatch_signatures
→ dispatch_settlements
→ dispatch_settlement_customers
→ customer_debts / customer_payments / customer_receipts
```

---

## Target and commission flow

```text
locations
→ sublocations
→ location_targets
→ sublocation_targets
→ salesman_targets
→ commission_calculations
→ commission_payments
```

---

## Customer money flow

```text
customers
→ dispatch_customers
→ dispatch_items
→ customer_receipts
→ customer_payments
→ customer_debts
→ financial_transactions
```

---

# 19. Important Note Before Implementation

This SQL file gives you the **database foundation**, but some rules should be enforced in backend logic or stored procedures.

For example:

```text
Sum of sublocation targets must equal location target
Salesman targets should be divided equally
Cannot dispatch more than available stock
Cannot receive more than ordered quantity
Commission must be calculated using your formula
Dispatch cannot be completed before settlement
Debt should be created when payment is missing
Stock movement should be created for every stock change
```

The database has the correct tables and relations, but the backend must control the workflow.

---

# 20. Best Implementation Order

Do not start with reports.

Start with:

```text
1. Users, roles, permissions
2. Categories, units, items, variants
3. Warehouses and stock balances
4. Purchase orders and receiving
5. Stock movements
6. Packaging configurations
7. Production batches
8. Locations, sublocations, salesmen
9. Customers
10. Dispatch requests
11. Settlements and debts
12. Accounting
13. Commissions
14. Reports
15. Audit logs everywhere
```

This order will prevent confusion and broken relations.
