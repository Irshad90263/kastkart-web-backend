import express from "express";
import { checkServiceability } from "../controllers/shipping.controller.js";
import { createManualShippingOrder } from "../controllers/orderController.js";
import { checkDeliveryAvailability } from "../controllers/delivery.controller.js";

const router = express.Router();

// Existing legacy check (GET)
router.get("/check", checkServiceability);

// NEW Multi-Courier check (POST)
router.post("/check-availability", checkDeliveryAvailability);

// NEW Generic Manual Shipping Creation
router.post("/create-order/:orderId", createManualShippingOrder);

export default router;
