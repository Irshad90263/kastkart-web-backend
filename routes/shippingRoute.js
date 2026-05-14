import express from "express";
import { checkServiceability } from "../controllers/shipping.controller.js";

import { checkDeliveryAvailability } from "../controllers/delivery.controller.js";

const router = express.Router();

// Existing legacy check (GET)
router.get("/check", checkServiceability);

// NEW Multi-Courier check (POST)
router.post("/check-availability", checkDeliveryAvailability);

export default router;
