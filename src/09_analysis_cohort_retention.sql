-- Phase 4 - Analysis
-- Story 4: cohort retention by month of first visit. month_offset = whole months
-- between a patient's first service date and each visit (0 = acquisition month,
-- 100% by definition). Long format for a cohort heatmap.
-- Note: tiny cohorts (2024-03, 2024-04) are noisy; consumers can filter on
-- cohort_size.

CREATE OR ALTER VIEW analysis.vw_cohort_retention
AS
WITH visits AS
(
    SELECT
        p.cohort_month,
        f.patient_key,
        DATEDIFF(month, p.first_service_date, d.full_date) AS month_offset
    FROM core.fact_appointment f
    JOIN core.dim_patient p ON p.patient_key = f.patient_key
    JOIN core.dim_date    d ON d.date_key    = f.date_key
),
cohort_size AS
(
    SELECT cohort_month, COUNT(*) AS cohort_size
    FROM core.dim_patient
    GROUP BY cohort_month
)
SELECT
    v.cohort_month,
    cs.cohort_size,
    v.month_offset,
    COUNT(DISTINCT v.patient_key) AS active_patients,
    CAST(100.0 * COUNT(DISTINCT v.patient_key) / cs.cohort_size AS decimal(5,2)) AS retention_pct
FROM visits v
JOIN cohort_size cs ON cs.cohort_month = v.cohort_month
GROUP BY v.cohort_month, cs.cohort_size, v.month_offset;
GO
