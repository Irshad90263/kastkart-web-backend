// routes/orderRoutes.js
import express from "express";
import {
  placeOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  getOrderTracking,
} from "../controllers/orderController.js";
import { getTrackingDetails } from "../controllers/shiprocketTracking.controller.js";
import { getShiprocketTracking } from "../controllers/shiprocketOrder.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// public
router.post("/", placeOrder);

// admin
router.get("/", requireAuth, listOrders);
router.get("/:orderId", requireAuth, getOrder);
router.put("/:orderId/status", requireAuth, updateOrderStatus);

// tracking routes
router.get("/:orderId/tracking", getOrderTracking); // Get order tracking info
router.get("/track/:awbCode", requireAuth, async (req, res) => {
  try {
    const { awbCode } = req.params;
    const trackingData = await getTrackingDetails(awbCode);
    res.json({ trackingData });
  } catch (error) {
    res.status(500).json({ message: "Tracking failed", error: error.message });
  }
});

// Shiprocket tracking
router.get("/shiprocket/track/:awbCode", requireAuth, async (req, res) => {
  try {
    const { awbCode } = req.params;
    const trackingData = await getShiprocketTracking(awbCode);
    res.json({ trackingData });
  } catch (error) {
    res.status(500).json({ message: "Shiprocket tracking failed", error: error.message });
  }
});

export default router;
