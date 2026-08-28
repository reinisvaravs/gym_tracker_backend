import express from "express";
import {
  createType,
  deleteType,
  editType,
  getAllTypes,
  getType,
} from "../database/training-types.js";

const router = express.Router();

// Create a training type to training_types
router.post("/create", async (req, res) => {
  // Get userId from auth middleware
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Body
  const { trainingName, category } = req.body;
  if (!trainingName || !category) {
    return res.status(400).json({ message: "Name and category are required" });
  }

  try {
    await createType(userId, trainingName, category);
  } catch (error) {
    console.error("⚠️ [TYPES] Error creating training type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

  res.status(201).json({ message: "Training type created successfully" });
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

  try {
    const result = await getType(trainingId);
    if (!result) {
      return res.status(404).json({ message: "Training type not found" });
    }
    if (result.user_id !== userId) {
      return res.status(401).json({ message: "Unauthorized" });
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

  // Optional body - at least one field must be present
  const { trainingName, category } = req.body ?? {};
  if (trainingName === undefined && category === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  const trainingId = Number(req.params.id);
  if (!Number.isInteger(trainingId) || trainingId <= 0) {
    return res
      .status(400)
      .json({ message: "Valid training type ID is required" });
  }

  try {
    // Check if user is owner of this row
    const result = await getType(trainingId);
    if (!result) {
      return res.status(404).json({ message: "Training type not found" });
    }

    // check ownership
    if (result.user_id !== userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Do the edit
    await editType(trainingId, trainingName, category);
  } catch (error) {
    console.error("⚠️ [TYPES] Error editing training type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

  res.status(200).json({ message: "Training type edited successfully" });
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
    // Check if user is owner of this row
    const result = await getType(trainingId);
    if (!result) {
      return res.status(404).json({ message: "Training type not found" });
    }

    // check ownership
    if (result.user_id !== userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Do the edit
    await deleteType(trainingId);
  } catch (error) {
    console.error("⚠️ [TYPES] Error deleting training type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

  res.status(200).json({ message: "Training type deleted successfully" });
});

export default router;
