import pool from "./db.js";

export async function registerUser(
  fullName: string,
  email: string,
  normalizedEmail: string,
  passwordHash: string,
) {
  const result = await pool.query(
    `INSERT INTO users (full_name, email, email_normalized, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email`,
    [fullName, email, normalizedEmail, passwordHash],
  );
  return result.rows[0];
}

export async function getUserByEmail(normalizedEmail: string) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email_normalized = $1`,
    [normalizedEmail],
  );
  return result.rows[0];
}
