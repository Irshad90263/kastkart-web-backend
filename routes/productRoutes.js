// routes/productRoutes.js
import express from "express";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  listProductsByCategory,
  toggleProductStatus,
} from "../controllers/productController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadProductImages } from "../config/cloudinary.js";

const router = express.Router();

router.get("/", listProducts);
router.get("/by-category/:idOrSlug", listProductsByCategory);
router.get("/by-variety/:idOrSlug", listProductsByCategory);
router.get("/:idOrSlug", getProduct);

router.post("/", requireAuth, uploadProductImages, createProduct);
router.put("/:idOrSlug", requireAuth, uploadProductImages, updateProduct);
router.delete("/:idOrSlug", requireAuth, deleteProduct);
router.patch("/:idOrSlug/toggle-status", requireAuth, toggleProductStatus);

export default router;
