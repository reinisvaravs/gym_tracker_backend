import pool from "./db.js";

// Mirrors the CHECK constraint on training_types.category in database.sql
export const CATEGORIES = [
  "weighted_reps",
  "bodyweight_reps",
  "cardio",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.includes(value as Category);
}

export async function createType(
  userId: number,
  trainingName: string,
  category: Category,
) {
  const result = await pool.query(
    `INSERT INTO training_types (user_id, training_name, category) VALUES ($1, $2, $3) RETURNING *`,
    [userId, trainingName, category],
  );
  return result.rows[0];
}

export async function getAllTypes(userId: number) {
  const result = await pool.query(
    `SELECT * FROM training_types WHERE user_id = $1`,
    [userId],
  );
  return result.rows;
}

export async function getType(trainingId: number, userId: number) {
  const result = await pool.query(
    `SELECT * FROM training_types WHERE id = $1 and user_id = $2`,
    [trainingId, userId],
  );
  return result.rows[0];
}

export async function editType(
  trainingId: number,
  userId: number,
  trainingName?: string,
  category?: Category,
) {
  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (trainingName !== undefined) {
    values.push(trainingName);
    sets.push(`training_name = $${values.length}`);
  }
  if (category !== undefined) {
    values.push(category);
    sets.push(`category = $${values.length}`);
  }
  if (sets.length === 0) return undefined;

  values.push(trainingId, userId);
  const result = await pool.query(
    `UPDATE training_types
     SET ${sets.join(", ")}
     WHERE id = $${values.length - 1} AND user_id = $${values.length}
     RETURNING *`,
    values,
  );
  return result.rows[0];
}

export async function deleteType(trainingId: number, userId: number) {
  const result = await pool.query(
    `DELETE FROM training_types WHERE id = $1 AND user_id = $2 RETURNING id`,
    [trainingId, userId],
  );
  return result.rows[0];
}
