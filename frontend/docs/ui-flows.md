# Kivaro Frontend UI Flows

This document summarizes the visible frontend workflows: main navigation, pages, tabs, and action buttons. Access is permission based, so users only see pages and buttons their role allows.

## Global Shell

- **Login**: users sign in with username/email and password. Successful login stores the session and opens the dashboard.
- **Sidebar navigation**: groups modules into Overview, Operations, Sales and Customers, Finance, Insights, and Administration. Hidden items mean the current role lacks permission.
- **Topbar menu button**: collapses or opens the sidebar on smaller screens.
- **Tables**: most pages share search/filter controls, paginated tables, loading/empty/error states, and retry actions.
- **Cancel / Close buttons**: dismiss modals and drawers without saving.
- **Save / Create / Submit buttons**: validate the current form, send the change, then refresh the relevant table.
- **Edit buttons**: open the selected record in a modal or drawer.
- **Delete / Deactivate buttons**: open a confirmation dialog before changing the record status or removing it.

## Dashboard

- Shows monthly collections, cash balance, receivables, active workflows, quick navigation cards, recent notifications, and workspace coverage.
- **Customize layout** is currently disabled.
- Quick navigation cards show whether a module is available or locked for the current role.
- Notification preview shows recent alerts, an empty state, or retry on load failure.

## Inventory

Tabs: **Items**, **Variants**, **Categories**, **Units**, **Warehouses**, **Stock balances**, **Stock movements**, **Adjustments**.

- **Items**: lists inventory items. Search filters by name/code. **New item** opens the item form. **Edit** updates item metadata. **Deactivate** confirms and marks an item inactive.
- **Variants**: lists SKU-level variants. Search filters by item/name/SKU. **New variant** opens the variant form. **Edit** updates SKU, costs, status, and attributes. **Deactivate** confirms and marks a variant inactive.
- **Categories**: lists item categories. **New category**, **Edit**, and **Deactivate** manage category records.
- **Units**: lists units of measure. **New unit** creates units. **Edit** updates unit settings. **Delete** removes a unit when allowed.
- **Warehouses**: lists warehouses. **New warehouse**, **Edit**, and **Deactivate** manage warehouse records.
- **Stock balances**: read-only current stock by warehouse, item, and variant. Filters/search narrow the table.
- **Stock movements**: read-only movement ledger. Filters include warehouse, item/variant, movement type, reference type, and dates.
- **Adjustments**: posts stock corrections and shows adjustment history. **Post adjustment** records an inventory change; history remains paginated and searchable.

## Purchases

Tabs: **Purchase orders**, **Suppliers**, **Supplier payments**.

- **Purchase orders**: search/filter purchase orders. **New purchase order** opens the PO form, including line items. **View** opens the drawer.
- Purchase order drawer buttons:
  - **Edit header** updates supplier, expected date, and notes while editable.
  - **Submit** moves a draft order to review.
  - **Approve** moves eligible draft/pending orders to approved.
  - **Receive** records received quantities for approved/partially received orders and can move the order to partially received or received.
  - **Cancel** cancels orders that are not fully received/cancelled.
  - **Close** dismisses the drawer.
- **Suppliers**: **New supplier**, **Edit**, and **Deactivate** manage suppliers.
- **Supplier payments**: records payments to suppliers. **Record supplier payment** opens a payment modal with supplier, cash account, amount, method, and reference fields.

## Locations And Targets

Tabs: **Locations**, **Sublocations**, **Salesmen**, **Targets**.

- **Locations**: **New location**, **View**, **Edit**, and **Deactivate** manage sales areas. The drawer shows related sublocations.
- **Sublocations**: **New sublocation**, **Edit**, and **Deactivate** manage child areas.
- **Salesmen**: **New salesman**, **Assign**, **Edit**, and **Deactivate** manage sales staff. Assignment connects a salesman to sublocations.
- **Targets**: **New location target**, **View**, and **Edit** manage targets by period. Target drawer can **Add sublocation target** and **Generate salesman targets**.

## Customers

- Lists customers with search by name/code/phone/address.
- **New customer** opens the customer form.
- **Open** shows the customer drawer with debts, payments, and receipts history.
- **Edit** updates customer details.
- **Deactivate** confirms and marks a customer inactive.

## Production

Tabs: **Configurations**, **Batches**, **Cost history**.

- **Configurations**: packaging recipes for finished goods. **New configuration** opens the configuration form. **View** opens a drawer.
- Configuration drawer buttons:
  - **Edit** updates configuration fields.
  - **Add component** adds charcoal/carton/package/sticker/other inputs.
  - Component **Edit** updates quantities/costs.
  - Component **Remove** confirms deletion.
  - **Calculate cost** recalculates configuration cost.
- **Batches**: production batches from configurations. **New batch** creates a batch. **View** opens the batch drawer.
- Batch drawer buttons:
  - **Start** moves a draft batch to in progress.
  - **Complete** records output and finishes eligible batches.
  - **Cancel** cancels draft/in-progress batches.
- **Cost history**: read-only cost calculation history with filters and pagination.

## Dispatch

Tab: **Dispatch requests**.

- The dispatch table supports search/status filters and opens request details with **View**.
- **New dispatch request** creates a draft request with warehouse, salesman, date, and notes.
- Dispatch drawer buttons:
  - **Edit** updates draft header details.
  - **Add customer** adds customers to the dispatch.
  - **Add item** adds item variants and quantities.
  - **Submit** moves draft to pending approval.
  - **Approve** approves pending requests.
  - **Dispatch stock** posts stock movement for approved requests.
  - **Record return** records returned stock from dispatched requests.
  - **Open settlement** starts settlement for dispatched/partially settled requests.
  - Settlement modal **Add customer** records collected/debt amounts per customer.
  - Settlement modal **Complete settlement** finalizes the selected customers; partially settled dispatches stay open for additional settlements until every customer is settled.
  - **Cancel** cancels eligible requests.
  - **Print dispatch** and **Print receipt** open printable views; **Download PDF** saves the document.

## Accounting

Tabs: **Expense categories**, **Expenses**, **Cash accounts**, **Financial transactions**, **Salesman balances**.

- **Expense categories**: **New category**, **Edit**, and **Deactivate** manage spending categories.
- **Expenses**: **New expense**, **Edit**, and **Void** manage expense records with auditable ledger adjustments.
- **Cash accounts**: **New cash account** and **Edit** manage cash/bank/wallet accounts.
- **Financial transactions**: read-only ledger of money in/out with filters.
- **Salesman balances**: read-only balances by salesman. **Close balance** closes eligible open balances.

## Debts And Payments

Tabs: **Customer debts**, **Customer payments**, **Customer credits**, **Receipts**.

- **Customer debts**: lists debts by status/customer/salesman. **View** opens debt details.
- Debt drawer buttons:
  - **Pay debt** records a payment for pending or partially paid debt.
  - **Update status** changes debt status.
- **Customer payments**: **Record customer payment** creates a customer payment linked to a cash account and method.
- **Customer credits**: read-only ledger of overpayments and applied customer credit entries.
- **Receipts**: lists customer receipts. **Print** opens the receipt modal. **Download PDF** saves the printable receipt.

## Commissions

Tabs: **Rules**, **Calculations**.

- **Rules**: **New rule**, **Edit**, and **Deactivate** manage commission rules.
- **Calculations**: **Calculate commission** creates a calculation from a target/salesman period. **View** opens the calculation drawer.
- Commission drawer buttons:
  - **Approve** approves draft calculations.
  - **Pay** records payment for approved calculations.

## Reports

Report selector tabs: **Current stock**, **Customer balances**, **Salesman target progress**, **Dispatch summary**, **Sales**, **Debts**, **Purchases**, **Stock movements**, **Profit and loss**, **Commissions**.

- Each report has only the filters supported by that report, then a paginated table.
- Picker filters load option lists only when the user has permission; otherwise numeric ID inputs are shown.
- **Refresh** reloads the active report.
- **Clear filters** resets filters and returns to page 1.
- **Export CSV** downloads all rows matching the current filters when the user has export permission.
- Summary cards use full filtered totals; charts preview the current page when useful data is available.

## Insights And Administration

- **Superadmin stores**: `/superadmin` lists stores. Opening a store navigates to `/superadmin/{store-slug}/overview`; store tabs use `/superadmin/{store-slug}/modules` and `/superadmin/{store-slug}/settings`.
- **Audit logs**: searchable/paginated audit entries. **View** opens a drawer with action details and changed values.
- **Notifications**: inbox with filters. **Send notification** opens a modal. **Mark as read** marks one notification read. **Mark all as read** clears unread notifications.
- **Users**: **Create user**, **Edit**, **Delete**, and status actions manage accounts. Bulk actions are visible but disabled.
- **Roles and permissions**: **Create role**, **Edit**, **Delete**, and **Permissions** manage role metadata and permission assignment. Bulk actions are visible but disabled.
- **Settings**: contains Company profile and System settings cards.
  - Company profile **Save** updates company/contact/branding details.
  - VAT **Save VAT** enables or disables VAT for new customer sale lines and stores the configured rate.
  - System settings **New setting** creates a key/value setting.
  - Setting **Edit** updates an existing setting.

## Error And Access Pages

- **Forbidden**: shown when a user opens a route without permission. **Back to dashboard** returns home.
- **Not found**: shown for unknown routes. **Back to dashboard** returns home.
