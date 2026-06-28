-- Phase 1 - Ingestion
-- Step 3: importer stored procedure. Staging pattern:
--   1. BULK INSERT the CSV into a #stage temp table (no IDENTITY) via the XML
--      format file. With no IDENTITY column, the positional column mapping lines
--      up (5 fields -> 5 columns), so the format file works as intended.
--   2. INSERT ... SELECT from #stage into the physical raw.appointments; row_id
--      (IDENTITY) auto-generates -- no surrogate join needed.
-- No casting here (European $/comma/date land as raw text); conversion is Phase 3.
--
-- #stage is created in the proc body (parent scope), so the BULK INSERT issued
-- from sp_executesql (child batch) can see it. The file is read by the SQL Server
-- service account (MSSQL$DB001), not the caller: "Access denied" = that account
-- lacks read permission on the repo folder, not a SQL error.

CREATE OR ALTER PROCEDURE raw.usp_import_appointments
    @csv_path       NVARCHAR(260) = N'd:\Dev\Projects\patient_revenue_ltv_analysis\data\raw\Data_Financial_Analyst.csv',
    @format_path    NVARCHAR(260) = N'd:\Dev\Projects\patient_revenue_ltv_analysis\src\appointments.fmt',
    @truncate_first BIT           = 1
AS
BEGIN
    SET NOCOUNT ON;

    -- Landing zone: same column order as the CSV, no IDENTITY.
    CREATE TABLE #stage
    (
        revenue          NVARCHAR(100) NULL,
        patient_id       NVARCHAR(100) NULL,
        appointment_uid  NVARCHAR(100) NULL,
        appointment_type NVARCHAR(100) NULL,
        service_date     NVARCHAR(100) NULL
    );

    -- BULK INSERT needs literal paths -> dynamic SQL. #stage (parent scope) is
    -- visible to this child batch. Terminators come from the format file.
    DECLARE @sql NVARCHAR(MAX) =
        N'BULK INSERT #stage' + NCHAR(10) +
        N'FROM ' + QUOTENAME(@csv_path, '''') + NCHAR(10) +
        N'WITH (' + NCHAR(10) +
        N'    FORMATFILE = ' + QUOTENAME(@format_path, '''') + N',' + NCHAR(10) +
        N'    FIRSTROW = 2,' + NCHAR(10) +
        N'    CODEPAGE = ''65001'',' + NCHAR(10) +
        N'    TABLOCK' + NCHAR(10) +
        N');';

    EXEC sys.sp_executesql @sql;

    -- Idempotency: clear the physical table (and reset IDENTITY) before reload.
    IF @truncate_first = 1
        TRUNCATE TABLE raw.appointments;

    -- Promote to the physical table; row_id (IDENTITY) auto-generates.
    INSERT INTO raw.appointments (revenue, patient_id, appointment_uid, appointment_type, service_date)
    SELECT revenue, patient_id, appointment_uid, appointment_type, service_date
    FROM #stage;

    SELECT COUNT(*) AS rows_loaded FROM raw.appointments;
END;
GO
