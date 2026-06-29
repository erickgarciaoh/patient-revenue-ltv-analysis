-- Phase 4 - Analysis
-- Story 7: project appointments to dic-2026 for the six target patients via
-- individual cadence (mean interval between visits).
--
-- Method: avg_gap_days = observed window / (visits - 1); projected additional
-- appointments = floor(days from last visit to 2026-12-31 / avg_gap_days);
-- projected revenue = projected appointments x patient's average ticket.
--
-- Assumptions (drivers / limitations to state in the deliverable):
--   * Constant cadence = historical mean (no seasonality, no decay).
--   * Future ticket = patient's historical average ticket.
--   * No churn: assumes the patient stays active through 2026. Cohort retention
--     (story 4) shows most patients lapse, so this OVER-estimates -- it is a
--     planning ceiling, not a forecast.

CREATE OR ALTER VIEW analysis.vw_target_patients_projection
AS
WITH agg AS
(
    SELECT
        p.patient_id,
        COUNT(*)                       AS visit_count,
        MIN(d.full_date)               AS first_visit,
        MAX(d.full_date)               AS last_visit,
        AVG(f.revenue)                 AS avg_ticket
    FROM core.fact_appointment f
    JOIN core.dim_patient p ON p.patient_key = f.patient_key
    JOIN core.dim_date    d ON d.date_key    = f.date_key
    WHERE p.patient_id IN (108, 224, 416, 842, 889, 1019)
    GROUP BY p.patient_id
),
calc AS
(
    SELECT
        *,
        CAST(DATEDIFF(day, first_visit, last_visit) * 1.0 / NULLIF(visit_count - 1, 0) AS decimal(8,2)) AS avg_gap_days,
        DATEDIFF(day, last_visit, '2026-12-31') AS remaining_days
    FROM agg
)
SELECT
    patient_id,
    visit_count,
    first_visit,
    last_visit,
    avg_gap_days,
    remaining_days,
    CASE WHEN avg_gap_days > 0 THEN FLOOR(remaining_days / avg_gap_days) ELSE 0 END AS projected_additional_appts,
    CAST(avg_ticket AS decimal(12,2)) AS avg_ticket,
    CAST(CASE WHEN avg_gap_days > 0 THEN FLOOR(remaining_days / avg_gap_days) * avg_ticket ELSE 0 END AS decimal(12,2)) AS projected_additional_revenue
FROM calc;
GO
