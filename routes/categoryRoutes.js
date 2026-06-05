// routes/categoryRoutes.js
import express from "express";
import {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadNewCategoryImage } from "../config/cloudinary.js";

const router = express.Router();

router.get("/", listCategories);
router.get("/:id", getCategory);

router.post("/", requireAuth, uploadNewCategoryImage, createCategory);
router.put("/:id", requireAuth, uploadNewCategoryImage, updateCategory);
router.delete("/:id", requireAuth, deleteCategory);

export default router;
