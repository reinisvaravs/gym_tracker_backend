import pool from "./db.js";

export async function createType(
  userId: number,
  trainingName: string,
  category: string,
) {
  const result = await pool.query(
    `INSERT INTO training_types (user_id, training_name, category) VALUES ($1, $2, $3)`,
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

export async function getType(trainingId: number) {
  const result = await pool.query(
    `SELECT * FROM training_types WHERE id = $1`,
    [trainingId],
  );
  return result.rows[0];
}

export async function editType(
  trainingId: number,
  trainingName?: string,
  category?: string,
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

  values.push(trainingId);
  const result = await pool.query(
    `UPDATE training_types
     SET ${sets.join(", ")}
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );
  return result.rows[0];
}

export async function deleteType(trainingId: number) {
  const result = await pool.query(`DELETE FROM training_types WHERE id = $1`, [
    trainingId,
  ]);
  return result.rows[0];
}
