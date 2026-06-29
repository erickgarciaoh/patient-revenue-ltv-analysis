-- Phase 4 - Analysis
-- Story 3: LTV waterfall (methodology fixed in Phase 2). Average LTV decomposed
-- additively into two service lines; each line further explained by its drivers
-- (volume x price). Components are computed from the fact, not hardcoded, and sum
-- exactly to the real average LTV.
--
--   Average LTV = General component + Specialized component
--   General      = general visits/patient        x avg general ticket
--   Specialized  = conversion rate x spec visits/converter x avg spec ticket

-- Waterfall steps (long format for a waterfall chart).
CREATE OR ALTER VIEW analysis.vw_ltv_waterfall
AS
WITH agg AS
(
    SELECT
        COUNT(DISTINCT patient_key)                            AS n_patients,
        SUM(CASE WHEN type_key = 1 THEN revenue ELSE 0 END)    AS rev_general,
        SUM(CASE WHEN type_key = 2 THEN revenue ELSE 0 END)    AS rev_specialized,
        SUM(revenue)                                          AS rev_total
    FROM core.fact_appointment
),
comp AS
(
    SELECT
        CAST(rev_general     * 1.0 / n_patients AS decimal(12,2)) AS gen_comp,
        CAST(rev_specialized * 1.0 / n_patients AS decimal(12,2)) AS spec_comp,
        CAST(rev_total       * 1.0 / n_patients AS decimal(12,2)) AS ltv
    FROM agg
)
SELECT 1 AS step_order, CAST('Start' AS NVARCHAR(40)) AS step_name, CAST('base' AS VARCHAR(10)) AS step_type,
       CAST(0 AS decimal(12,2)) AS step_value, CAST(0 AS decimal(12,2)) AS running_total FROM comp
UNION ALL
SELECT 2, 'General consultations', 'increase', gen_comp,  gen_comp                FROM comp
UNION ALL
SELECT 3, 'Specializations',       'increase', spec_comp, gen_comp + spec_comp    FROM comp
UNION ALL
SELECT 4, 'Average LTV',           'total',    ltv,       ltv                     FROM comp;
GO

-- Driver breakdown (wide format, single row) backing the methodology narrative.
CREATE OR ALTER VIEW analysis.vw_ltv_waterfall_drivers
AS
WITH agg AS
(
    SELECT
        COUNT(DISTINCT patient_key)                                                         AS n_patients,
        COUNT(DISTINCT CASE WHEN type_key = 2 THEN patient_key END)                         AS n_converters,
        SUM(CASE WHEN type_key = 1 THEN 1 ELSE 0 END)                                        AS general_visits,
        SUM(CASE WHEN type_key = 2 THEN 1 ELSE 0 END)                                        AS specialized_visits,
        SUM(CASE WHEN type_key = 1 THEN revenue ELSE 0 END)                                  AS rev_general,
        SUM(CASE WHEN type_key = 2 THEN revenue ELSE 0 END)                                  AS rev_specialized
    FROM core.fact_appointment
)
SELECT
    CAST(general_visits     * 1.0 / n_patients   AS decimal(8,2))  AS gen_visits_per_patient,
    CAST(rev_general        * 1.0 / general_visits      AS decimal(8,2))  AS avg_general_ticket,
    CAST(rev_general        * 1.0 / n_patients   AS decimal(12,2)) AS general_component,
    CAST(100.0 * n_converters / n_patients       AS decimal(5,2))  AS conversion_rate_pct,
    CAST(specialized_visits * 1.0 / n_converters AS decimal(8,2))  AS spec_visits_per_converter,
    CAST(rev_specialized    * 1.0 / specialized_visits  AS decimal(8,2))  AS avg_specialized_ticket,
    CAST(rev_specialized    * 1.0 / n_patients   AS decimal(12,2)) AS specialized_component
FROM agg;
GO
