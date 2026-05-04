import express from "express";
import { checkServiceability } from "../controllers/shipping.controller.js";

const router = express.Router();
router.get("/check", checkServiceability);

export default router;
