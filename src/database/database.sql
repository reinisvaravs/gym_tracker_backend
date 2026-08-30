

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,                         -- exactly what they typed
    email_normalized VARCHAR(255) UNIQUE NOT NULL,       -- the identity key
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training types the user defines once (e.g. "Bench Press", "Bike")
CREATE TABLE IF NOT EXISTS training_types (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('weighted_reps', 'bodyweight_reps', 'cardio')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, training_name)
);

-- One entry per training type performed on a given date.
-- session_order is the position within that day, 1-based: the first exercise
-- performed is 1. Later positions are done tired, so the order is part of the
-- data, not a display detail.
CREATE TABLE IF NOT EXISTS training_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_type_id INTEGER NOT NULL REFERENCES training_types(id) ON DELETE CASCADE,
    performed_on DATE NOT NULL,
    session_order INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One row per "set" within a session. Which columns are populated depends
-- on the parent training_type's category:
--   weighted_reps   -> weight_kg + reps
--   bodyweight_reps -> reps only
--   cardio          -> duration_seconds, distance_km, avg_heart_rate_bpm,
--                      avg_power_watts, avg_cadence (optional; a cardio
--                      session is usually just one "set" = one row).
--                      avg_speed_kmh is derived from distance + duration
--                      and cannot be written directly.
CREATE TABLE IF NOT EXISTS training_sets (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    set_order INTEGER NOT NULL,
    weight_kg NUMERIC(6,2),
    reps NUMERIC(5,2),
    duration_seconds INTEGER,
    distance_km NUMERIC(6,2),
    avg_heart_rate_bpm INTEGER,
    avg_speed_kmh NUMERIC(6,2) GENERATED ALWAYS AS (
        CASE
            WHEN distance_km IS NOT NULL AND duration_seconds > 0
            THEN ROUND(distance_km * 3600.0 / duration_seconds, 2)
        END
    ) STORED,
    avg_power_watts NUMERIC(6,2),
    avg_cadence NUMERIC(5,2),
    UNIQUE (session_id, set_order)
);

-- Standalone bodyweight check-ins, independent of any training type
CREATE TABLE IF NOT EXISTS bodyweight_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_on DATE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrations
-- This file re-runs on every boot, so everything below must be idempotent.
-- CREATE TABLE IF NOT EXISTS won't add a column to a table that already
-- exists, so columns added after a table shipped need an ALTER here too.

-- training_sessions.session_order: add it nullable, backfill existing rows
-- from insertion order, then require it. All three no-op after the first run.
ALTER TABLE training_sessions
    ADD COLUMN IF NOT EXISTS session_order INTEGER;

UPDATE training_sessions s
SET session_order = ranked.position
FROM (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY user_id, performed_on ORDER BY id
    ) AS position
    FROM training_sessions
) ranked
WHERE s.id = ranked.id AND s.session_order IS NULL;

ALTER TABLE training_sessions
    ALTER COLUMN session_order SET NOT NULL;
