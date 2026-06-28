-- Phase 3 - Transformation
-- Step 5: load procedures for the core star. Casting rules fixed in Phase 2:
--   revenue: strip '$'/space, comma->dot, then decimal(12,2)
--   date:    CONVERT(date, service_date, 103)  (dd/mm/yyyy)
-- Entry point is core.usp_build_core, which orders loads to satisfy FKs.

-- ---------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE core.usp_load_dim_appointment_type
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM core.dim_appointment_type;
    INSERT INTO core.dim_appointment_type (type_key, type_name)
    VALUES (1, N'General'), (2, N'Especializado');
END
GO

-- ---------------------------------------------------------------------------
-- Calendar 2024-01-01 .. 2026-12-31 (data window + projection horizon).
-- month_name forced to en-US so it does not depend on session language.
CREATE OR ALTER PROCEDURE core.usp_load_dim_date
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM core.dim_date;

    ;WITH d AS
    (
        SELECT CAST('2024-01-01' AS date) AS dt
        UNION ALL
        SELECT DATEADD(day, 1, dt) FROM d WHERE dt < '2026-12-31'
    )
    INSERT INTO core.dim_date (date_key, full_date, [year], [month], month_name, [quarter], year_month)
    SELECT
        CONVERT(int, CONVERT(char(8), dt, 112)),
        dt,
        DATEPART(year, dt),
        DATEPART(month, dt),
        FORMAT(dt, 'MMMM', 'en-US'),
        DATEPART(quarter, dt),
        LEFT(CONVERT(char(10), dt, 120), 7)
    FROM d
    OPTION (MAXRECURSION 0);
END
GO

-- ---------------------------------------------------------------------------
-- One row per patient, with first service date and cohort (month of first visit).
CREATE OR ALTER PROCEDURE core.usp_load_dim_patient
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM core.dim_patient;
    DBCC CHECKIDENT('core.dim_patient', RESEED, 0) WITH NO_INFOMSGS;

    INSERT INTO core.dim_patient (patient_id, first_service_date, cohort_month)
    SELECT
        s.patient_id,
        s.first_service_date,
        LEFT(CONVERT(char(10), s.first_service_date, 120), 7)
    FROM
    (
        SELECT
            CONVERT(int, r.patient_id) AS patient_id,
            MIN(CONVERT(date, r.service_date, 103)) AS first_service_date
        FROM raw.appointments r
        GROUP BY CONVERT(int, r.patient_id)
    ) s;
END
GO

-- ---------------------------------------------------------------------------
-- Fact at appointment grain. Assumes fact already truncated by the orchestrator.
CREATE OR ALTER PROCEDURE core.usp_load_fact_appointment
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO core.fact_appointment (appointment_uid, patient_key, date_key, type_key, revenue)
    SELECT
        CONVERT(bigint, r.appointment_uid),
        p.patient_key,
        CONVERT(int, CONVERT(char(8), CONVERT(date, r.service_date, 103), 112)),
        CONVERT(tinyint, r.appointment_type),
        TRY_CONVERT(decimal(12,2), REPLACE(REPLACE(REPLACE(r.revenue, '$', ''), ' ', ''), ',', '.'))
    FROM raw.appointments r
    JOIN core.dim_patient p ON p.patient_id = CONVERT(int, r.patient_id);
END
GO

-- ---------------------------------------------------------------------------
-- Orchestrator: truncate fact first (frees FKs), reload dims, then fact.
CREATE OR ALTER PROCEDURE core.usp_build_core
AS
BEGIN
    SET NOCOUNT ON;

    TRUNCATE TABLE core.fact_appointment;

    EXEC core.usp_load_dim_appointment_type;
    EXEC core.usp_load_dim_date;
    EXEC core.usp_load_dim_patient;
    EXEC core.usp_load_fact_appointment;

    SELECT
        (SELECT COUNT(*) FROM core.dim_appointment_type) AS dim_type,
        (SELECT COUNT(*) FROM core.dim_date)             AS dim_date,
        (SELECT COUNT(*) FROM core.dim_patient)          AS dim_patient,
        (SELECT COUNT(*) FROM core.fact_appointment)     AS fact_rows;
END
GO
