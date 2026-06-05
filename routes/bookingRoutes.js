import express from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  getUserBookings,
  updateBookingStatus,
  deleteBooking,
  createBookingPaymentOrder,
  verifyBookingPaymentAndSave,
  exportBookingsToExcel,
  createRemainingPaymentOrder,
  verifyRemainingPayment,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";
import { authenticateUser } from "../middleware/userAuth.js";

const router = express.Router();

// Public Route - Submit Booking Form (Legacy / Manual pay fallback)
router.post("/", createBooking);

// Public Routes - Razorpay Payment & Booking
router.post("/create-payment-order", createBookingPaymentOrder);
router.post("/verify-payment", verifyBookingPaymentAndSave);

// User Protected Route - Get My Bookings
router.get("/my-bookings", authenticateUser, getUserBookings);
router.post("/create-remaining-payment-order", authenticateUser, createRemainingPaymentOrder);
router.post("/verify-remaining-payment", authenticateUser, verifyRemainingPayment);

// Admin Protected Routes
router.get("/admin/export/excel", requireAuth, exportBookingsToExcel);
router.get("/admin/all", requireAuth, getAllBookings);
router.get("/:id", requireAuth, getBookingById);
router.put("/:id/status", requireAuth, updateBookingStatus);
router.delete("/:id", requireAuth, deleteBooking);

export default router;
