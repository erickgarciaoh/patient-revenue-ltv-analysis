-- Phase 4 - Analysis
-- Consumption layer: raw -> core -> analysis. One view per business story.
-- Story 1: monthly executive summary -- appointment counts by type, unique
-- patients, and revenue per month.

IF SCHEMA_ID('analysis') IS NULL
    EXEC('CREATE SCHEMA analysis;');
GO

CREATE OR ALTER VIEW analysis.vw_monthly_executive_summary
AS
SELECT
    d.year_month,
    d.[year],
    d.[month],
    SUM(CASE WHEN f.type_key = 1 THEN 1 ELSE 0 END)              AS appts_general,
    SUM(CASE WHEN f.type_key = 2 THEN 1 ELSE 0 END)              AS appts_specialized,
    COUNT(*)                                                     AS appts_total,
    COUNT(DISTINCT f.patient_key)                               AS unique_patients,
    SUM(CASE WHEN f.type_key = 1 THEN f.revenue ELSE 0 END)      AS revenue_general,
    SUM(CASE WHEN f.type_key = 2 THEN f.revenue ELSE 0 END)      AS revenue_specialized,
    SUM(f.revenue)                                              AS revenue_total
FROM core.fact_appointment f
JOIN core.dim_date d ON d.date_key = f.date_key
GROUP BY d.year_month, d.[year], d.[month];
GO
