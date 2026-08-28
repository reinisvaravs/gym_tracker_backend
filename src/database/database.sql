

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

-- One entry per training type performed on a given date
CREATE TABLE IF NOT EXISTS training_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_type_id INTEGER NOT NULL REFERENCES training_types(id) ON DELETE CASCADE,
    performed_on DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One row per "set" within a session. Which columns are populated depends
-- on the parent training_type's category:
--   weighted_reps   -> weight_kg + reps
--   bodyweight_reps -> reps only
--   cardio          -> duration_seconds, distance_km, avg_heart_rate_bpm,
--                      avg_speed_kmh, avg_power_watts, avg_cadence (optional;
--                      a cardio session is usually just one "set" = one row)
CREATE TABLE IF NOT EXISTS training_sets (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    set_order INTEGER NOT NULL,
    weight_kg NUMERIC(6,2),
    reps NUMERIC(5,2),
    duration_seconds INTEGER,
    distance_km NUMERIC(6,2),
    avg_heart_rate_bpm INTEGER,
    avg_speed_kmh NUMERIC(5,2),
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
