import express from "express";
import {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
} from "../controllers/corporateInquiryController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public route - Submit inquiry
router.post("/", createInquiry);

// Protected routes - Admin only
router.get("/", requireAuth, getAllInquiries);
router.get("/:id", requireAuth, getInquiryById);
router.put("/:id", requireAuth, updateInquiryStatus);
router.delete("/:id", requireAuth, deleteInquiry);

export default router;
