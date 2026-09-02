import { env } from "../../env.ts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// pg returns NUMERIC as a string to protect arbitrary precision, and DATE as a
// JS Date (which JSON-serializes with a timezone and can shift the day).
// Our numbers are small and our dates are calendar days, so hand the frontend
// plain numbers and "YYYY-MM-DD" strings.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export async function initDatabase() {
  // Create all tables if they don't exist from database.sql
  const sqlFilePath = path.join(__dirname, "database.sql");
  const sql = fs.readFileSync(sqlFilePath, "utf8");

  try {
    await pool.query(sql);
  } catch (error) {
    console.error("⚠️ [DATABASE] Error initializing database:", error);
    throw error;
  }
}

export default pool;
