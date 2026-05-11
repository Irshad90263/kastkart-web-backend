// routes/delivery.routes.js

import express from "express";
import { checkDeliveryAvailability } from "../controllers/delivery.controller.js";
// import { checkDeliveryAvailability } from "../controllers/delivery.controller.js";

const deliveyRoutes = express.Router();

deliveyRoutes.get("/check-delivery/:pincode/", checkDeliveryAvailability);

export default deliveyRoutes;