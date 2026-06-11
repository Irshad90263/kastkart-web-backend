import express from "express";
import {
  createBulkOrderInquiry,
  getAllBulkOrderInquiries,
  getBulkOrderInquiryById,
  updateBulkOrderInquiry,
  deleteBulkOrderInquiry,
} from "../controllers/bulkOrderInquiryController.js";

const router = express.Router();

// Public route to create a bulk order inquiry
router.post("/", createBulkOrderInquiry);

// Admin route to get all inquiries
router.get("/", getAllBulkOrderInquiries);

// Admin routes to get, update, delete specific inquiry
router.get("/:id", getBulkOrderInquiryById);
router.put("/:id", updateBulkOrderInquiry);
router.delete("/:id", deleteBulkOrderInquiry);

export default router;
