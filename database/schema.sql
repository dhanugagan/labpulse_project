-- ============================================================
-- LabPulse — Genie-Powered Facility & Laboratory Utilisation
-- Role-Based Edition — Relational Schema
-- Deployable as Delta Tables in Databricks Unity Catalog, or
-- as standard tables in Postgres/MySQL for local development.
-- ============================================================

-- ---------- USERS & ROLES (drives RBAC + Genie scoping) ----------
CREATE TABLE users (
    user_id         VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(30) NOT NULL,      -- admin, faculty, student, lab_incharge,
                                                -- maintenance, operations, guest
    department      VARCHAR(50),               -- scope for faculty / students
    assigned_facility_ids TEXT,                -- comma-separated facility_ids, for lab_incharge
    active          BOOLEAN DEFAULT TRUE,
    access_expires_at TIMESTAMP,               -- used for guest / visiting faculty roles
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- FACILITIES ----------
CREATE TABLE facilities (
    facility_id     VARCHAR(10) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(30) NOT NULL,      -- lab, hall, equipment
    capacity        INT,
    department      VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'active' -- active, under_maintenance
);

-- ---------- BOOKINGS (intent) ----------
CREATE TABLE bookings (
    booking_id      VARCHAR(20) PRIMARY KEY,
    facility_id     VARCHAR(10) REFERENCES facilities(facility_id),
    requested_by    VARCHAR(20) REFERENCES users(user_id),
    approved_by     VARCHAR(20) REFERENCES users(user_id),
    purpose         VARCHAR(200),
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending' -- pending, confirmed, rejected, cancelled
);

-- ---------- USAGE LOGS (ground truth) ----------
CREATE TABLE usage_logs (
    log_id          VARCHAR(20) PRIMARY KEY,
    facility_id     VARCHAR(10) REFERENCES facilities(facility_id),
    booking_id      VARCHAR(20) REFERENCES bookings(booking_id),
    log_date        DATE NOT NULL,
    hours_actually_used DECIMAL(4,2),
    headcount       INT,
    logged_by       VARCHAR(20) REFERENCES users(user_id), -- lab_incharge, or IoT system
    source          VARCHAR(20) DEFAULT 'manual'           -- manual, swipe, iot
);

-- ---------- MAINTENANCE RECORDS (root cause) ----------
CREATE TABLE maintenance_records (
    ticket_id       VARCHAR(20) PRIMARY KEY,
    facility_id     VARCHAR(10) REFERENCES facilities(facility_id),
    reported_by     VARCHAR(20) REFERENCES users(user_id),
    assigned_to     VARCHAR(20) REFERENCES users(user_id),  -- maintenance team member
    issue           VARCHAR(255) NOT NULL,
    severity        VARCHAR(20) DEFAULT 'medium',           -- low, medium, high, critical
    reported_date   DATE NOT NULL,
    resolved_date   DATE,
    status          VARCHAR(20) DEFAULT 'open'              -- open, in_progress, resolved
);

-- ---------- APPROVAL / WORKFLOW REQUESTS ----------
-- Handles student -> faculty/lab_incharge approval routing
CREATE TABLE approval_requests (
    request_id      VARCHAR(20) PRIMARY KEY,
    facility_id     VARCHAR(10) REFERENCES facilities(facility_id),
    requested_by    VARCHAR(20) REFERENCES users(user_id),
    routed_to_role  VARCHAR(30) NOT NULL,   -- faculty, lab_incharge
    routed_to_user  VARCHAR(20) REFERENCES users(user_id),
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP NOT NULL,
    reason          VARCHAR(200),
    status          VARCHAR(20) DEFAULT 'pending' -- pending, approved, rejected
);

-- ---------- AUDIT LOG (who asked Genie what, and under which scope) ----------
CREATE TABLE genie_query_log (
    query_id        VARCHAR(20) PRIMARY KEY,
    user_id         VARCHAR(20) REFERENCES users(user_id),
    role            VARCHAR(30),
    scope_applied   VARCHAR(255),   -- e.g. department=CSE or facility_id=F001
    question        TEXT,
    genie_sql       TEXT,
    answered_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ADDITIONAL TABLES — added to cover the full master spec
-- (departments, notifications, audit trail, equipment)
-- ============================================================

-- ---------- DEPARTMENTS ----------
CREATE TABLE departments (
    department_id   VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    head_user_id    VARCHAR(20) REFERENCES users(user_id)
);

-- ---------- EQUIPMENT (linked to facilities, for search filters) ----------
CREATE TABLE equipment (
    equipment_id    VARCHAR(20) PRIMARY KEY,
    facility_id     VARCHAR(10) REFERENCES facilities(facility_id),
    name            VARCHAR(100) NOT NULL,     -- e.g. "Projector", "GC-MS", "40 PCs"
    condition       VARCHAR(20) DEFAULT 'working' -- working, faulty
);

-- ---------- NOTIFICATIONS (faculty + operations alerts) ----------
CREATE TABLE notifications (
    notification_id VARCHAR(20) PRIMARY KEY,
    user_id         VARCHAR(20) REFERENCES users(user_id), -- NULL = broadcast to a role
    role_target     VARCHAR(30),                            -- used when user_id is NULL
    type            VARCHAR(40) NOT NULL, -- booking_confirmed, booking_cancelled,
                                           -- maintenance_alert, underutilisation_alert,
                                           -- demand_spike, facility_available
    message         VARCHAR(255) NOT NULL,
    related_facility_id VARCHAR(10),
    read            BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- AUDIT TRAIL (every important action, not just Genie queries) ----------
CREATE TABLE audit_logs (
    audit_id        VARCHAR(20) PRIMARY KEY,
    user_id         VARCHAR(20) REFERENCES users(user_id),
    role            VARCHAR(30),
    action          VARCHAR(60) NOT NULL, -- login, booking_created, booking_cancelled,
                                           -- facility_created, facility_deleted,
                                           -- maintenance_reported, maintenance_updated,
                                           -- user_created, user_deactivated
    details         VARCHAR(255),
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Notes for Databricks Unity Catalog deployment:
-- 1. Create these as managed Delta tables inside a dedicated
--    catalog/schema, e.g. campus_ops.labpulse
-- 2. The users table (role + department + assigned_facility_ids)
--    is the single source of truth the backend AND the Genie
--    Space instructions both reference for access control.
-- 3. genie_query_log gives you an auditable trail of exactly
--    what each role was allowed to ask and see — useful both
--    for the demo and for real institutional compliance.
-- ============================================================
