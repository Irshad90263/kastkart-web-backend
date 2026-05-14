// routes/delivery.routes.js

import express from "express";
import { checkDeliveryAvailability } from "../controllers/delivery.controller.js";
import { delhiveryRequest } from "../services/delhivery.service.js";

const deliveyRoutes = express.Router();

deliveyRoutes.get("/check-delivery/:pincode/:weight", checkDeliveryAvailability);

// DEBUG: List all registered Delhivery warehouses
deliveyRoutes.get("/delhivery-warehouses", async (req, res) => {
  try {
    const result = await delhiveryRequest("get", "/api/backend/clientwarehouse/list/");
    return res.json({ success: true, warehouses: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

export default deliveyRoutes;