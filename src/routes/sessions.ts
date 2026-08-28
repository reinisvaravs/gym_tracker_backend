import express from "express";
import {
  createSessionWithSets,
  getAllSessions,
  getSessionWithSets,
} from "../database/training-sessions.js";

const router = express.Router();

// Get one training type from training_types
router.get("/get/:id", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: "Valid session ID is required" });
  }

  try {
    const result = await getSessionWithSets(sessionId, userId);
    if (!result) {
      return res.status(404).json({ message: "Training session not found" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error getting a training session:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a session and its sets
router.post("/create", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Body
  const { trainingTypeId, performedOn, notes, sets } = req.body ?? {};

  // Validate
  if (!Number.isInteger(trainingTypeId) || trainingTypeId <= 0) {
    return res
      .status(400)
      .json({ message: "Valid training type ID is required" });
  }
  if (typeof performedOn !== "string") {
    return res.status(400).json({ message: "Performed on is required" });
  }
  if (!Array.isArray(sets)) {
    return res.status(400).json({ message: "Sets must be an array" });
  }

  try {
    const sessionId = await createSessionWithSets(
      userId,
      trainingTypeId,
      performedOn,
      notes ?? null,
      sets,
    );

    // undefined means the training type doesn't exist or isn't this user's
    if (!sessionId) {
      return res.status(404).json({ message: "Training type not found" });
    }

    res.status(201).json({ id: sessionId });
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error creating a training session:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get all training sessions with their sets
router.get("/get-all", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const sessions = await getAllSessions(userId);

    res.status(200).json(sessions);
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error getting all sessions:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
