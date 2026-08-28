import pool from "./db.js";

export async function getSessionWithSets(sessionId: number, userId: number) {
  const sessionResult = await pool.query(
    `SELECT s.id, s.training_type_id, s.performed_on, s.notes, s.created_at,
            t.training_name, t.category
     FROM training_sessions s
     JOIN training_types t ON t.id = s.training_type_id
     WHERE s.id = $1 AND s.user_id = $2`,
    [sessionId, userId],
  );

  const session = sessionResult.rows[0];
  if (!session) return undefined;

  const setsResult = await pool.query(
    `SELECT * FROM training_sets WHERE session_id = $1 ORDER BY set_order`,
    [sessionId],
  );

  return { ...session, sets: setsResult.rows };
}

export async function getAllSessions(userId: number) {
  const result = await pool.query(
    `SELECT s.id, s.performed_on, s.notes, t.training_name, t.category,
    COUNT(st.id)::int AS set_count
    FROM training_sessions s
    JOIN training_types t ON t.id = s.training_type_id
    LEFT JOIN training_sets st ON st.session_id = s.id
    WHERE s.user_id = $1
    GROUP BY s.id, t.id
    ORDER BY s.performed_on DESC, s.id DESC`,
    [userId],
  );
  return result.rows;
}

export type SetInput = {
  weight_kg?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  distance_km?: number | null;
  avg_heart_rate_bpm?: number | null;
  avg_speed_kmh?: number | null;
  avg_power_watts?: number | null;
  avg_cadence?: number | null;
};

export async function createSessionWithSets(
  userId: number,
  trainingTypeId: number,
  performedOn: string,
  notes: string | null,
  sets: SetInput[],
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `INSERT INTO training_sessions (user_id, training_type_id, performed_on, notes)
      SELECT $1, id, $3, $4
      FROM training_types
      WHERE id = $2 AND user_id = $1
      RETURNING id`,
      [userId, trainingTypeId, performedOn, notes],
    );

    const sessionId = sessionResult.rows[0]?.id;
    if (!sessionId) {
      await client.query("ROLLBACK");
      return undefined;
    }

    for (const [index, set] of sets.entries()) {
      await client.query(
        `INSERT INTO training_sets
        (session_id, set_order, weight_kg, reps, duration_seconds, distance_km,
        avg_heart_rate_bpm, avg_speed_kmh, avg_power_watts, avg_cadence)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          sessionId,
          index + 1,
          set.weight_kg ?? null,
          set.reps ?? null,
          set.duration_seconds ?? null,
          set.distance_km ?? null,
          set.avg_heart_rate_bpm ?? null,
          set.avg_speed_kmh ?? null,
          set.avg_power_watts ?? null,
          set.avg_cadence ?? null,
        ],
      );
    }

    await client.query("COMMIT");
    return sessionId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
