import { env, isDev } from "../env.ts";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.ts";
import trainingTypesRoutes from "./routes/types.ts";
import authMiddleware from "./middleware/auth.ts";
import trainingSessionsRoutes from "./routes/sessions.ts";
import cookieParser from "cookie-parser";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(
    "dev",
    // { skip: () => isTestEnv() }
  ),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Gym Tracker API",
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/types", authMiddleware, trainingTypesRoutes);
app.use("/sessions", authMiddleware, trainingSessionsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Something went wrong!",
      ...(isDev() && { details: err.message }),
    });
  },
);

export { app };

export default app;
