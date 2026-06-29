-- Phase 4 - Analysis
-- Story 6: first service date, appointment UID and revenue of that first visit
-- for the six target patients (108, 224, 416, 842, 889, 1019). "First visit" =
-- earliest date; deterministic tie-break by appointment_uid when a patient has
-- several appointments on the same first day.

CREATE OR ALTER VIEW analysis.vw_target_patients_first_visit
AS
SELECT
    x.patient_id,
    x.first_service_date,
    x.appointment_uid,
    x.first_visit_type,
    x.first_visit_revenue
FROM
(
    SELECT
        p.patient_id,
        d.full_date                    AS first_service_date,
        f.appointment_uid,
        t.type_name                    AS first_visit_type,
        CAST(f.revenue AS decimal(12,2)) AS first_visit_revenue,
        ROW_NUMBER() OVER (PARTITION BY f.patient_key ORDER BY f.date_key, f.appointment_uid) AS rn
    FROM core.fact_appointment f
    JOIN core.dim_patient            p ON p.patient_key = f.patient_key
    JOIN core.dim_date               d ON d.date_key    = f.date_key
    JOIN core.dim_appointment_type   t ON t.type_key    = f.type_key
    WHERE p.patient_id IN (108, 224, 416, 842, 889, 1019)
) x
WHERE x.rn = 1;
GO
