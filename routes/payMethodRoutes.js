import express from "express";
import {
  createPaymentMethod,
  getPaymentMethods,
  updatePaymentMethodStatus,
  updatePaymentMethodName,
  deletePaymentMethod,
} from "../controllers/paymentMethodController.js";

const router = express.Router();

router.post("/create", createPaymentMethod);
router.get("/get", getPaymentMethods);
router.patch("/:id/status", updatePaymentMethodStatus);
router.patch("/:id/name", updatePaymentMethodName);
router.delete("/:id", deletePaymentMethod);

export default router;
