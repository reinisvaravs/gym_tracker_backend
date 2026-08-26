import cors from "cors";
import express from "express";

import { initDatabase } from "./database/database.js";
import authRoutes from "./routes/auth.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use("/auth", authRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Initialize the database when the server starts
  try {
    await initDatabase();
    console.log("✅ [SERVER] Database initialized successfully");
  } catch (error) {
    console.error("⚠️ [SERVER] Failed to initialize database:", error);
  }
});
