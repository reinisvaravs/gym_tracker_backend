import express from "express";
import {
  createType,
  deleteType,
  editType,
  getAllTypes,
  getType,
  isCategory,
  CATEGORIES,
} from "../database/types.js";
import pg from "pg";

const router = express.Router();

// Create a training type to training_types
router.post("/create", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Body
  const trainingName: unknown = req.body?.trainingName;
  const category: unknown = req.body?.category;

  if (typeof trainingName !== "string" || !trainingName.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!isCategory(category)) {
    return res.status(400).json({
      message: `Category must be one of: ${CATEGORIES.join(", ")}`,
    });
  }

  try {
    const created = await createType(userId, trainingName, category);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof pg.DatabaseError && error.code === "23505") {
      // not an error so no log
      return res
        .status(409)
        .json({ message: "This training type name already exists" });
    }

    console.error("⚠️ [TYPES] Error creating training type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get a all training types from training_types
router.get("/get-all", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await getAllTypes(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error("⚠️ [TYPES] Error getting all training types:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get one training type from training_types
router.get("/get/:id", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const trainingId = Number(req.params.id);
  if (!Number.isInteger(trainingId) || trainingId <= 0) {
    return res
      .status(400)
      .json({ message: "Valid training type ID is required" });
  }

  try {
    const result = await getType(trainingId, userId);
    if (!result) {
      return res.status(404).json({ message: "Training type not found" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("⚠️ [TYPES] Error getting a training type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Edit a training type in training_types
router.put("/edit/:id", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const trainingName: unknown = req.body?.trainingName;
  const category: unknown = req.body?.category;

  if (trainingName === undefined && category === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }
  if (trainingName !== undefined && typeof trainingName !== "string") {
    return res.status(400).json({ message: "Name must be a string" });
  }
  if (category !== undefined && !isCategory(category)) {
    return res.status(400).json({
      message: `Category must be one of: ${CATEGORIES.join(", ")}`,
    });
  }

  const trainingId = Number(req.params.id);
  if (!Number.isInteger(trainingId) || trainingId <= 0) {
    return res
      .status(400)
      .json({ message: "Valid training type ID is required" });
  }

  try {
    const updated = await editType(trainingId, userId, trainingName, category);
    if (!updated) {
      return res.status(404).json({ message: "Training type not found" });
    }
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof pg.DatabaseError && error.code === "23505") {
      // not an error so no log
      return res
        .status(409)
        .json({ message: "This training type name already exists" });
    }

    console.error("⚠️ [TYPES] Error editing training type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a training type in training_types
router.delete("/delete/:id", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const trainingId = Number(req.params.id);
  if (!Number.isInteger(trainingId) || trainingId <= 0) {
    return res
      .status(400)
      .json({ message: "Valid training type ID is required" });
  }

  try {
    const deleted = await deleteType(trainingId, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Training type not found" });
    }
    res
      .status(200)
      .json({ message: "Training type deleted successfully", id: deleted.id });
  } catch (error) {
    console.error("⚠️ [TYPES] Error deleting training type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
