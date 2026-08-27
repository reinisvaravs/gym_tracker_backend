import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";

import { initDatabase } from "./database/database.js";
import authRoutes from "./routes/auth.js";
import trainingsRoutes from "./routes/training-types.js";
import authMiddleware from "./middleware/auth.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/trainings", authMiddleware, trainingsRoutes);

// Server
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
