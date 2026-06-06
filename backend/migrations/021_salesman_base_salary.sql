ALTER TABLE salesmen
  ADD COLUMN IF NOT EXISTS base_salary DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER national_id;

CREATE OR REPLACE VIEW v_salesman_target_progress AS
SELECT
    progress.salesman_target_id,
    progress.store_id,
    progress.salesman_id,
    progress.salesman_name,
    progress.base_salary,
    progress.location_id,
    progress.location_name,
    progress.sublocation_id,
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
        s.base_salary,
        l.id AS location_id,
        l.name AS location_name,
        sl.id AS sublocation_id,
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
