import Booking from "../models/Booking.js";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import crypto from "crypto";
import XLSX from "xlsx";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to generate a unique booking number
const generateBookingNo = async () => {
  let exists = true;
  let bookingNo = "";
  while (exists) {
    bookingNo = "KK-BK-" + Math.floor(100000 + Math.random() * 900000);
    const count = await Booking.countDocuments({ bookingNo });
    if (count === 0) {
      exists = false;
    }
  }
  return bookingNo;
};

// @desc    Create a new booking request
// @route   POST /api/bookings
// @access  Public (or Protected if userId present)
export const createBooking = async (req, res) => {
  try {
    const bookingData = { ...req.body };

    // Extract userId from JWT if authorization header exists
    if (req.headers.authorization) {
      try {
        const header = req.headers.authorization;
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.sub) {
            bookingData.userId = decoded.sub;
          }
        }
      } catch (err) {
        // Ignore token errors for public route
        console.warn("Soft JWT verify failed for public booking:", err.message);
      }
    }

    // If bookingNo is not provided, generate a unique one
    if (!bookingData.bookingNo) {
      bookingData.bookingNo = await generateBookingNo();
    }

    const booking = new Booking(bookingData);
    await booking.save();

    res.status(201).json({
      success: true,
      message: "Booking request submitted successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit booking request",
      error: error.message,
    });
  }
};

// @desc    Get all bookings (Admin use)
// @route   GET /api/bookings/admin/all
// @access  Private/Admin
export const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const paymentStatus = req.query.paymentStatus || "all";
    const skip = (page - 1) * limit;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { bookingNo: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
        { pincode: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Payment Status filter
    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus;
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate("mangoCategory", "name")
      .populate("mangoVariety", "name slug")
      .populate({
        path: "mangoName",
        select: "name slug finalPrice mainImage vendor_id",
        populate: {
          path: "vendor_id",
          select: "name contactDetails"
        }
      })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// @desc    Get booking details by ID
// @route   GET /api/bookings/:id
// @access  Private/Admin
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("mangoCategory", "name")
      .populate("mangoVariety", "name slug")
      .populate({
        path: "mangoName",
        select: "name slug finalPrice mainImage vendor_id",
        populate: {
          path: "vendor_id",
          select: "name contactDetails"
        }
      })
      .populate("userId", "firstName lastName email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Error fetching booking by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking details",
      error: error.message,
    });
  }
};

// @desc    Get bookings of logged in user
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user ? (req.user.sub || req.user._id) : req.query.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const bookings = await Booking.find({ userId })
      .populate("mangoCategory", "name")
      .populate("mangoVariety", "name slug")
      .populate("mangoName", "name slug finalPrice mainImage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user bookings",
      error: error.message,
    });
  }
};

// @desc    Update booking status and payment status (Admin use)
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updateData = {};

    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("mangoCategory", "name")
      .populate("mangoVariety", "name slug")
      .populate({
        path: "mangoName",
        select: "name slug finalPrice mainImage vendor_id",
        populate: {
          path: "vendor_id",
          select: "name contactDetails"
        }
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking status",
      error: error.message,
    });
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete booking",
      error: error.message,
    });
  }
};

// @desc    Create Razorpay Order for booking advance
// @route   POST /api/bookings/create-payment-order
// @access  Public
export const createBookingPaymentOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // Razorpay expects amount in paise (must be an integer)
      currency,
      receipt: receipt || `booking_receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("createBookingPaymentOrder error:", err);
    res.status(500).json({ message: "Payment order creation failed" });
  }
};

// @desc    Verify booking payment signature and create booking in DB
// @route   POST /api/bookings/verify-payment
// @access  Public
export const verifyBookingPaymentAndSave = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingDetails,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment verification failed" 
      });
    }

    const bookingData = { 
      ...bookingDetails,
      bookingNo: await generateBookingNo(),
      paymentStatus: "paid",
      status: "confirmed",
      transactionId: razorpay_payment_id,
      bookingAmountPaid: bookingDetails.bookingAmountPaid || "100",
    };

    // Extract userId from JWT if authorization header exists
    if (req.headers.authorization) {
      try {
        const header = req.headers.authorization;
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.sub) {
            bookingData.userId = decoded.sub;
          }
        }
      } catch (err) {
        // Ignore token errors
      }
    }

    const booking = new Booking(bookingData);
    await booking.save();

    res.status(201).json({
      success: true,
      message: "Booking request submitted successfully and payment verified",
      data: booking,
    });
  } catch (error) {
    console.error("Error verifying payment and saving booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment and save booking",
      error: error.message,
    });
  }
};

export const exportBookingsToExcel = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("mangoCategory", "name")
      .populate("mangoVariety", "name slug")
      .populate({
        path: "mangoName",
        select: "name slug finalPrice mainImage vendor_id",
        populate: {
          path: "vendor_id",
          select: "name contactDetails"
        }
      })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    const data = bookings.map(b => ({
      "Booking ID": b.bookingNo || "-",
      "Customer Name": b.fullName || "-",
      "Mobile Number": b.mobileNumber || "-",
      "Alternate Mobile": b.alternateMobileNumber || "-",
      "Email": b.emailId || "-",
      "Address": b.completeAddress || "-",
      "City": b.city || "-",
      "State": b.state || "-",
      "Pincode": b.pincode || "-",
      "Landmark": b.landmark || "-",
      "Category": b.mangoCategory?.name || "-",
      "Variety": b.mangoVariety?.name || "-",
      "Product Name": b.mangoName?.name || "-",
      "Box Size": b.boxSize || "-",
      "Number of Boxes": b.numberOfBoxes || 0,
      "Preferred Delivery Week": b.preferredDeliveryWeek || "-",
      "Special Instructions": b.specialInstructions || "-",
      "Product Price": b.productPrice || 0,
      "Advance Paid": b.bookingAmountPaid || "-",
      "Total Amount": b.totalAmount || 0,
      "Payment Mode": b.paymentMode || "-",
      "Transaction ID": b.transactionId || "-",
      "Referral Source": b.referralSource || "-",
      "Status": b.status || "-",
      "Payment Status": b.paymentStatus || "-",
      "Created At": b.createdAt ? new Date(b.createdAt).toLocaleString("en-IN") : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="bookings.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({ success: false, message: "Export failed", error: error.message });
  }
};
