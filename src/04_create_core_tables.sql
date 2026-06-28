-- Phase 3 - Transformation
-- Step 4: light star schema in the 'core' schema (raw -> core -> consumption).
-- Tables only here; load logic lives in 05_create_core_load_procs.sql.
--
-- Grain of fact_appointment = one appointment. appointment_uid is the natural key
-- (verified unique in Phase 2). Surrogate keys: date_key = YYYYMMDD,
-- patient_key = IDENTITY, type_key = natural {1,2}.

IF SCHEMA_ID('core') IS NULL
    EXEC('CREATE SCHEMA core;');
GO

-- Dimension: appointment type. type_name encodes the (unverified) business
-- assumption from Phase 2: general consultation vs specialization.
IF OBJECT_ID('core.dim_appointment_type', 'U') IS NULL
BEGIN
    CREATE TABLE core.dim_appointment_type
    (
        type_key  TINYINT       NOT NULL CONSTRAINT pk_dim_appointment_type PRIMARY KEY,
        type_name NVARCHAR(20)  NOT NULL
    );
END
GO

-- Dimension: date. Spans data window + projection horizon (Task 4, dic-2026).
IF OBJECT_ID('core.dim_date', 'U') IS NULL
BEGIN
    CREATE TABLE core.dim_date
    (
        date_key    INT          NOT NULL CONSTRAINT pk_dim_date PRIMARY KEY,
        full_date   DATE         NOT NULL,
        [year]      SMALLINT     NOT NULL,
        [month]     TINYINT      NOT NULL,
        month_name  NVARCHAR(20) NOT NULL,
        [quarter]   TINYINT      NOT NULL,
        year_month  CHAR(7)      NOT NULL
    );
END
GO

-- Dimension: patient. Enriched with behavioural attributes (first visit, cohort);
-- no metrics here -- LTV/counts belong to the fact / Phase 4.
IF OBJECT_ID('core.dim_patient', 'U') IS NULL
BEGIN
    CREATE TABLE core.dim_patient
    (
        patient_key        INT      NOT NULL IDENTITY(1,1) CONSTRAINT pk_dim_patient PRIMARY KEY,
        patient_id         INT      NOT NULL CONSTRAINT uq_dim_patient_patient_id UNIQUE,
        first_service_date DATE     NOT NULL,
        cohort_month       CHAR(7)  NOT NULL
    );
END
GO

-- Fact: appointment grain.
IF OBJECT_ID('core.fact_appointment', 'U') IS NULL
BEGIN
    CREATE TABLE core.fact_appointment
    (
        appointment_uid BIGINT        NOT NULL CONSTRAINT pk_fact_appointment PRIMARY KEY,
        patient_key     INT           NOT NULL,
        date_key        INT           NOT NULL,
        type_key        TINYINT       NOT NULL,
        revenue         DECIMAL(12,2) NOT NULL,
        CONSTRAINT fk_fact_patient FOREIGN KEY (patient_key) REFERENCES core.dim_patient (patient_key),
        CONSTRAINT fk_fact_date    FOREIGN KEY (date_key)    REFERENCES core.dim_date (date_key),
        CONSTRAINT fk_fact_type    FOREIGN KEY (type_key)    REFERENCES core.dim_appointment_type (type_key)
    );
END
GO
