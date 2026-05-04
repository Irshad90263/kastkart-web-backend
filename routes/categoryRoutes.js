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

const router = express.Router();

router.get("/", listCategories);
router.get("/:idOrSlug", getCategory);

router.post("/", requireAuth, createCategory);
router.put("/:idOrSlug", requireAuth, updateCategory);
router.delete("/:idOrSlug", requireAuth, deleteCategory);

export default router;
