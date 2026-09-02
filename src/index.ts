import { env } from "../env.ts";
import { initDatabase } from "./database/db.ts";
import app from "./server.ts";

app.listen(env.PORT, async () => {
  console.log(`Environment: ${env.APP_STAGE}`);
  console.log(`Server is running on port ${env.PORT}`);

  // Initialize the database when the server starts
  try {
    await initDatabase();
    console.log("✅ [SERVER] Database initialized successfully");
  } catch (error) {
    console.error("⚠️ [SERVER] Failed to initialize database:", error);
  }
});
