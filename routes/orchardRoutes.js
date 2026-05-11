import express from "express";
import {
  createOrchard,
  listOrchards,
  deleteOrchard,
  toggleStatus,
} from "../controllers/orchardController.js";

import { requireAuth } from "../middleware/auth.js";
import { uploadOrchardImage } from "../config/cloudinary.js";

const router = express.Router();

// Public
router.get("/", listOrchards);

// Admin (requireAuth)
router.post("/", requireAuth, uploadOrchardImage, createOrchard);
router.patch("/:id/toggle-status", requireAuth, toggleStatus);
router.delete("/:id", requireAuth, deleteOrchard);


export default router;
