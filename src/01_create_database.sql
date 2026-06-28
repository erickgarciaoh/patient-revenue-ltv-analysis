-- Phase 1 - Ingestion
-- Step 1: create the project database.
-- Defaults from the model database (paths, sizes, collation) are sufficient for
-- ingestion. Any collation needs for the European date/decimal cleanup belong to
-- Phase 3, not here.

IF DB_ID('patient_revenue_ltv') IS NULL
    CREATE DATABASE patient_revenue_ltv;
GO
