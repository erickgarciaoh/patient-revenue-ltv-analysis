-- Phase 4 - Analysis
-- Story 2: conversion funnel general (T1) -> specialized (T2). Central business
-- question. Patient-level: how many reach a general consultation, and how many
-- convert to a specialization. Long format (one row per stage) for funnel charts.

CREATE OR ALTER VIEW analysis.vw_conversion_funnel
AS
WITH flags AS
(
    SELECT
        patient_key,
        MAX(CASE WHEN type_key = 1 THEN 1 ELSE 0 END) AS has_general,
        MAX(CASE WHEN type_key = 2 THEN 1 ELSE 0 END) AS has_specialized
    FROM core.fact_appointment
    GROUP BY patient_key
),
stages AS
(
    SELECT 1 AS stage_order, CAST('Total patients' AS NVARCHAR(40)) AS stage_name, COUNT(*) AS n_patients FROM flags
    UNION ALL
    SELECT 2, 'With general (T1)',     SUM(has_general)     FROM flags
    UNION ALL
    SELECT 3, 'With specialized (T2)', SUM(has_specialized) FROM flags
)
SELECT
    stage_order,
    stage_name,
    n_patients,
    CAST(100.0 * n_patients / MAX(n_patients) OVER () AS decimal(5,2)) AS pct_of_total
FROM stages;
GO
