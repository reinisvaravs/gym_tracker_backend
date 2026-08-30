import compression from "compression";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";

import { initDatabase } from "./database/db.js";
import authRoutes from "./routes/auth.js";
import trainingTypesRoutes from "./routes/types.js";
import authMiddleware from "./middleware/auth.js";
import trainingSessionsRoutes from "./routes/sessions.js";

const app = express();

// Middleware
// /sessions/get-all ships the full history: the same handful of keys repeated
// across every set, mostly nulls. That compresses roughly 10x.
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/types", authMiddleware, trainingTypesRoutes);
app.use("/sessions", authMiddleware, trainingSessionsRoutes);

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
