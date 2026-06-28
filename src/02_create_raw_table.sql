-- Phase 1 - Ingestion
-- Step 2: raw landing table. Everything NVARCHAR, nothing cast on load.
-- Casting (strip '$', comma->dot decimal, parse d/m/yyyy date) happens in Phase 3.
--
-- CSV column -> raw column mapping (column order preserved from the file):
--   ' Revenue '                  -> revenue
--   'Patient ID'                 -> patient_id
--   'AdvancedMD Appointment UID' -> appointment_uid
--   '1/2'                        -> appointment_type
--   'Service Date'               -> service_date
--
-- row_id is load metadata (surrogate to distinguish duplicate rows during Phase 2
-- QA), not a transformation of the source data.

IF SCHEMA_ID('raw') IS NULL
    EXEC('CREATE SCHEMA raw;');
GO

IF OBJECT_ID('raw.appointments', 'U') IS NULL
BEGIN
    CREATE TABLE raw.appointments
    (
        row_id           INT IDENTITY(1,1) NOT NULL,
        revenue          NVARCHAR(100) NULL,
        patient_id       NVARCHAR(100) NULL,
        appointment_uid  NVARCHAR(100) NULL,
        appointment_type NVARCHAR(100) NULL,
        service_date     NVARCHAR(100) NULL
    );
END
GO
