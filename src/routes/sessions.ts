import express from "express";
import {
  addSetToSession,
  createSessionWithSets,
  deleteSession,
  deleteSet,
  editSessionNotes,
  editSet,
  getAllSessions,
  type SetInput,
} from "../database/sessions.ts";

const SET_FIELDS = [
  "weight_kg",
  "reps",
  "duration_seconds",
  "distance_km",
  "avg_heart_rate_bpm",
  "avg_power_watts",
  "avg_cadence",
] as const;

// A calendar day, "YYYY-MM-DD". The round-trip rejects real-looking but
// impossible dates like 2026-02-31, which Postgres would otherwise reject
// with a 500.
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Returns undefined if the value isn't a usable set
function toSetInput(value: unknown): SetInput | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const set: SetInput = {};

  if (raw.avg_speed_kmh !== undefined) {
    return undefined; // computed from distance + duration; not settable
  }

  for (const field of SET_FIELDS) {
    const fieldValue = raw[field];
    if (fieldValue === undefined || fieldValue === null) continue;
    if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) {
      return undefined;
    }
    set[field] = fieldValue;
  }

  return set;
}

// Shared by every route that takes an :id
function toId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

const router = express.Router();

// Create a session and its sets
router.post("/create", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Body
  const trainingTypeId: unknown = req.body?.trainingTypeId;
  const performedOn: unknown = req.body?.performedOn;
  const notes: unknown = req.body?.notes;
  const sets: unknown = req.body?.sets;

  // Validate
  if (
    typeof trainingTypeId !== "number" ||
    !Number.isInteger(trainingTypeId) ||
    trainingTypeId <= 0
  ) {
    return res
      .status(400)
      .json({ message: "Valid training type ID is required" });
  }
  if (!isCalendarDate(performedOn)) {
    return res
      .status(400)
      .json({ message: "Performed on must be a date like 2026-08-29" });
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return res.status(400).json({ message: "Notes must be a string" });
  }
  if (!Array.isArray(sets)) {
    return res.status(400).json({ message: "Sets must be an array" });
  }

  const parsedSets: SetInput[] = [];
  for (const [index, set] of sets.entries()) {
    const parsed = toSetInput(set);
    if (!parsed) {
      return res
        .status(400)
        .json({ message: `Set ${index + 1} has invalid values` });
    }
    parsedSets.push(parsed);
  }

  try {
    const session = await createSessionWithSets(
      userId,
      trainingTypeId,
      performedOn,
      notes ?? null,
      parsedSets,
    );

    // undefined means the training type doesn't exist or isn't this user's
    if (!session) {
      return res.status(404).json({ message: "Training type not found" });
    }

    res.status(201).json(session);
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

// Append one set to a session, as it is performed
router.post("/sets/create", async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sessionId = toId(req.body?.sessionId);
  if (!sessionId) {
    return res.status(400).json({ message: "Valid session ID is required" });
  }

  const set = toSetInput(req.body);
  if (!set) {
    return res.status(400).json({ message: "Set has invalid values" });
  }

  try {
    const created = await addSetToSession(sessionId, userId, set);
    if (!created) {
      return res.status(404).json({ message: "Training session not found" });
    }
    res.status(201).json(created);
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error adding a set:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Replace a set's values. Omitted fields are cleared, not preserved.
router.put("/sets/edit/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const setId = toId(req.params.id);
  if (!setId) {
    return res.status(400).json({ message: "Valid set ID is required" });
  }

  const set = toSetInput(req.body);
  if (!set) {
    return res.status(400).json({ message: "Set has invalid values" });
  }

  try {
    const updated = await editSet(setId, userId, set);
    if (!updated) {
      return res.status(404).json({ message: "Set not found" });
    }
    res.status(200).json(updated);
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error editing a set:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/sets/delete/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const setId = toId(req.params.id);
  if (!setId) {
    return res.status(400).json({ message: "Valid set ID is required" });
  }

  try {
    const deleted = await deleteSet(setId, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Set not found" });
    }
    res
      .status(200)
      .json({ message: "Set deleted successfully", id: deleted.id });
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error deleting a set:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Notes are the only editable field: the training type and date define which
// session this is, and session_order is managed by the database.
router.put("/edit/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sessionId = toId(req.params.id);
  if (!sessionId) {
    return res.status(400).json({ message: "Valid session ID is required" });
  }

  const notes: unknown = req.body?.notes;
  if (notes !== null && typeof notes !== "string") {
    return res.status(400).json({ message: "Notes must be a string or null" });
  }

  try {
    const updated = await editSessionNotes(sessionId, userId, notes);
    if (!updated) {
      return res.status(404).json({ message: "Training session not found" });
    }
    res.status(200).json(updated);
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error editing a session:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Its sets go with it, via ON DELETE CASCADE
router.delete("/delete/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sessionId = toId(req.params.id);
  if (!sessionId) {
    return res.status(400).json({ message: "Valid session ID is required" });
  }

  try {
    const deleted = await deleteSession(sessionId, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Training session not found" });
    }
    res.status(200).json({
      message: "Training session deleted successfully",
      id: deleted.id,
    });
  } catch (error) {
    console.error("⚠️ [SESSIONS] Error deleting a session:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
