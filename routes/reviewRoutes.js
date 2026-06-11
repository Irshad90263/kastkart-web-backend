import express from "express";
import {
  checkEligibility,
  addReview,
  getProductReviews,
  getAllReviews,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { authenticateUser } from "../middleware/userAuth.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/product/:productId", getProductReviews);

// User protected routes
router.get("/eligibility/:productId", authenticateUser, checkEligibility);
router.post("/product/:productId", authenticateUser, addReview);

// Admin protected routes
router.get("/admin", requireAuth, getAllReviews);
router.put("/:id", requireAuth, updateReview);
router.delete("/:id", requireAuth, deleteReview);

export default router;
