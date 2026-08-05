-- Target progress is earned only after the related customer delivery is fully settled.
-- Historical delivery batches are represented once per dispatch customer.
INSERT INTO delivery_target_credits (
  store_id, dispatch_request_id, dispatch_customer_id, salesman_id, customer_id,
  eligible_amount, reference_date, delivery_date, status
)
SELECT
  dr.store_id,
  dr.id,
  dc.id,
  dr.salesman_id,
  dc.customer_id,
  COALESCE(SUM(di.line_total * GREATEST((di.quantity - di.returned_quantity) / NULLIF(di.quantity, 0), 0)), 0),
  DATE(COALESCE(dr.completed_at, dr.dispatched_at, dr.request_date)),
  DATE(dr.dispatched_at),
  CASE WHEN COALESCE(dc.debt_amount, 0) = 0 THEN 'earned' ELSE 'pending' END
FROM dispatch_requests dr
JOIN dispatch_customers dc ON dc.dispatch_request_id = dr.id
LEFT JOIN dispatch_items di ON di.dispatch_customer_id = dc.id AND di.line_type = 'sale'
WHERE dr.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_target_credits existing
    WHERE existing.dispatch_request_id = dr.id AND existing.dispatch_customer_id = dc.id
  )
GROUP BY dr.store_id, dr.id, dc.id, dr.salesman_id, dc.customer_id, dc.debt_amount,
         dr.completed_at, dr.dispatched_at, dr.request_date;

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
    WHEN dtc.status = 'earned'
      AND dtc.reference_date BETWEEN lt.period_start AND lt.period_end
      THEN dtc.eligible_amount
    ELSE 0
  END), 0) AS achieved_sales_amount,
  CASE WHEN st.target_amount = 0 THEN 0 ELSE ROUND((COALESCE(SUM(CASE
    WHEN dtc.status = 'earned'
      AND dtc.reference_date BETWEEN lt.period_start AND lt.period_end
      THEN dtc.eligible_amount
    ELSE 0
  END), 0) / st.target_amount) * 100, 2) END AS achievement_percentage
FROM salesman_targets st
JOIN salesmen s ON s.id = st.salesman_id
JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
JOIN location_targets lt ON lt.id = slt.location_target_id
JOIN sublocations sl ON sl.id = slt.sublocation_id
JOIN locations l ON l.id = sl.location_id
LEFT JOIN delivery_target_credits dtc
  ON dtc.salesman_id = st.salesman_id
  AND dtc.store_id = st.store_id
  AND dtc.status = 'earned'
  AND dtc.reference_date BETWEEN lt.period_start AND lt.period_end
  AND EXISTS (
    SELECT 1 FROM dispatch_customers target_customer
    WHERE target_customer.id = dtc.dispatch_customer_id
      AND target_customer.sublocation_id = sl.id
  )
WHERE st.status = 'active'
GROUP BY st.id, st.store_id, s.id, s.full_name, s.base_salary, l.id, l.name, sl.id, sl.name,
         lt.target_period, lt.period_start, lt.period_end, st.target_amount;
