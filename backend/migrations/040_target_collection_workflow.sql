-- Active target bundles, immutable collected-cash attribution, workflow history,
-- and idempotent notification milestones.  This migration does not alter any
-- loose-carton or open-shelf inventory structures.

CREATE TABLE IF NOT EXISTS target_collection_credits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  salesman_target_id BIGINT UNSIGNED NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  sublocation_id BIGINT UNSIGNED NOT NULL,
  dispatch_customer_id BIGINT UNSIGNED NULL,
  source_type ENUM('settlement_customer','payment_allocation','return_adjustment') NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  collection_date DATE NOT NULL,
  original_collection_date DATE NULL,
  is_late_exception TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_target_collection_source (source_type, source_id),
  KEY idx_target_collection_target_date (salesman_target_id, collection_date),
  KEY idx_target_collection_salesman_date (store_id, salesman_id, sublocation_id, collection_date),
  CONSTRAINT fk_target_collection_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_target_collection_target FOREIGN KEY (salesman_target_id) REFERENCES salesman_targets(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_target_collection_salesman FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_target_collection_sublocation FOREIGN KEY (sublocation_id) REFERENCES sublocations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_target_collection_dispatch_customer FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS target_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  location_target_id BIGINT UNSIGNED NOT NULL,
  salesman_target_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  payload JSON NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_target_events_target_created (location_target_id, created_at),
  CONSTRAINT fk_target_events_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_target_events_location_target FOREIGN KEY (location_target_id) REFERENCES location_targets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_target_events_salesman_target FOREIGN KEY (salesman_target_id) REFERENCES salesman_targets(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_target_events_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS target_notification_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salesman_target_id BIGINT UNSIGNED NOT NULL,
  milestone ENUM('assigned','50','100','above') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_target_notification_milestone (salesman_target_id, milestone),
  CONSTRAINT fk_target_notification_target FOREIGN KEY (salesman_target_id) REFERENCES salesman_targets(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW v_salesman_target_progress AS
SELECT st.id AS salesman_target_id, st.store_id, s.id AS salesman_id, s.full_name AS salesman_name,
  s.base_salary, l.id AS location_id, l.name AS location_name, sl.id AS sublocation_id,
  sl.name AS sublocation_name, lt.target_period, lt.period_start, lt.period_end,
  st.target_amount, COALESCE(SUM(tcc.amount), 0) AS achieved_sales_amount,
  CASE WHEN st.target_amount = 0 THEN 0 ELSE ROUND((COALESCE(SUM(tcc.amount), 0) / st.target_amount) * 100, 2) END AS achievement_percentage
FROM salesman_targets st
JOIN salesmen s ON s.id = st.salesman_id
JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
JOIN location_targets lt ON lt.id = slt.location_target_id
JOIN sublocations sl ON sl.id = slt.sublocation_id
JOIN locations l ON l.id = sl.location_id
LEFT JOIN target_collection_credits tcc ON tcc.salesman_target_id = st.id
WHERE st.status IN ('active', 'closed')
GROUP BY st.id, st.store_id, s.id, s.full_name, s.base_salary, l.id, l.name, sl.id, sl.name,
  lt.target_period, lt.period_start, lt.period_end, st.target_amount;
