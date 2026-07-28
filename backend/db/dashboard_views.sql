-- AUTOVERSE — Dashboard aggregation views
-- Run after core_schema.sql AND schema.sql (autoinspect_reports) —
-- these views join against autoinspect_reports, which doesn't exist
-- until schema.sql has run.
--
-- Materializing these as plain views keeps the dashboard query simple
-- and correct; if dealer volume grows large, convert to a MATERIALIZED
-- VIEW refreshed on a schedule (e.g. every 5 min) rather than
-- optimizing the live query further.

-- Per-vehicle stats: latest AutoInspect result + engagement counts.
-- Used to render each listing card in the dashboard.
CREATE OR REPLACE VIEW vehicle_listing_stats AS
SELECT
  v.id                          AS vehicle_id,
  v.dealer_id,
  v.make, v.model, v.year, v.mileage_km, v.price_ngn,
  v.status, v.primary_image_url, v.created_at, v.updated_at,
  latest_report.overall_score   AS autoinspect_score,
  latest_report.grade           AS autoinspect_grade,
  COALESCE(views_30d.count, 0)   AS views_30d,
  COALESCE(inquiries_30d.count, 0) AS inquiries_30d
FROM vehicles v
LEFT JOIN LATERAL (
  SELECT overall_score, grade
  FROM autoinspect_reports ar
  WHERE ar.vehicle_id = v.id
  ORDER BY ar.created_at DESC
  LIMIT 1
) latest_report ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count
  FROM listing_views lv
  WHERE lv.vehicle_id = v.id AND lv.viewed_at >= now() - INTERVAL '30 days'
) views_30d ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count
  FROM inquiries iq
  WHERE iq.vehicle_id = v.id AND iq.created_at >= now() - INTERVAL '30 days'
) inquiries_30d ON true;

-- Per-dealer rollup: the top-level stat cards on the dashboard.
CREATE OR REPLACE VIEW dealer_dashboard_summary AS
SELECT
  d.id AS dealer_id,
  d.business_name,
  d.verification_status,
  d.subscription_tier,
  COALESCE(active.count, 0)        AS active_listings,
  COALESCE(sold_month.count, 0)     AS sold_this_month,
  COALESCE(views_30d.count, 0)       AS total_views_30d,
  COALESCE(inquiries_30d.count, 0)    AS total_inquiries_30d,
  COALESCE(new_inquiries.count, 0)     AS new_inquiries,
  ROUND(avg_score.avg_score::numeric, 1) AS avg_autoinspect_score
FROM dealers d
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM vehicles v
  WHERE v.dealer_id = d.id AND v.status = 'active'
) active ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM vehicles v
  WHERE v.dealer_id = d.id AND v.status = 'sold'
    AND date_trunc('month', v.sold_at) = date_trunc('month', now())
) sold_month ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM listing_views lv
  JOIN vehicles v ON v.id = lv.vehicle_id
  WHERE v.dealer_id = d.id AND lv.viewed_at >= now() - INTERVAL '30 days'
) views_30d ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM inquiries iq
  WHERE iq.dealer_id = d.id AND iq.created_at >= now() - INTERVAL '30 days'
) inquiries_30d ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM inquiries iq
  WHERE iq.dealer_id = d.id AND iq.status = 'new'
) new_inquiries ON true
LEFT JOIN LATERAL (
  SELECT AVG(ar.overall_score) AS avg_score
  FROM autoinspect_reports ar
  JOIN vehicles v ON v.id = ar.vehicle_id
  WHERE v.dealer_id = d.id
) avg_score ON true;
