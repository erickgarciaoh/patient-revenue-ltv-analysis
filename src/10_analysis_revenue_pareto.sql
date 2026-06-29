-- Phase 4 - Analysis
-- Story 5: Pareto (80/20) of revenue concentration by patient. One row per
-- patient, ranked by lifetime revenue, with cumulative revenue share. Lets the
-- consumer read "top X% of patients hold Y% of revenue".

CREATE OR ALTER VIEW analysis.vw_revenue_pareto
AS
WITH pat AS
(
    SELECT patient_key, SUM(revenue) AS patient_revenue
    FROM core.fact_appointment
    GROUP BY patient_key
),
ranked AS
(
    SELECT
        patient_key,
        patient_revenue,
        ROW_NUMBER() OVER (ORDER BY patient_revenue DESC)                                   AS revenue_rank,
        COUNT(*)     OVER ()                                                                AS total_patients,
        SUM(patient_revenue) OVER ()                                                        AS total_revenue,
        SUM(patient_revenue) OVER (ORDER BY patient_revenue DESC ROWS UNBOUNDED PRECEDING)  AS cumulative_revenue
    FROM pat
)
SELECT
    r.revenue_rank,
    p.patient_id,
    CAST(r.patient_revenue AS decimal(12,2))                               AS patient_revenue,
    CAST(100.0 * r.revenue_rank / r.total_patients AS decimal(5,2))        AS patient_pct,
    CAST(r.cumulative_revenue AS decimal(14,2))                            AS cumulative_revenue,
    CAST(100.0 * r.cumulative_revenue / r.total_revenue AS decimal(5,2))   AS cumulative_pct_revenue
FROM ranked r
JOIN core.dim_patient p ON p.patient_key = r.patient_key;
GO
