// routes/varietyRoutes.js
import express from "express";
import {
  createVariety,
  listVarieties,
  getVariety,
  updateVariety,
  deleteVariety,
} from "../controllers/varietyController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadVarietyImage } from "../config/cloudinary.js";

const router = express.Router();

router.get("/", listVarieties);
router.get("/:idOrSlug", getVariety);

router.post("/", requireAuth, uploadVarietyImage, createVariety); 
router.put("/:idOrSlug", requireAuth, uploadVarietyImage, updateVariety); 
router.delete("/:idOrSlug", requireAuth, deleteVariety);

export default router;
