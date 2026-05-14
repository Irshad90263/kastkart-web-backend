// models/Order.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String },
    color: { type: String },
    addOnName: { type: String },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },

    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    handlingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    offerCode: { type: String },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "COD" },
    
    // Razorpay fields
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },

    // Multi-Courier Shipping Fields
    shippingDetails: {
      provider: {
        type: String,
        enum: ["shiprocket", "delhivery"],
      },
      providerOrderId: String,
      awbCode: String,
      courierName: String,
      trackingUrl: String,
      shipmentId: String,
      shippingStatus: String,
      created: {
        type: Boolean,
        default: false,
      },
      error: String,
    },
    selectedCourier: {
      type: String,
      enum: ["shiprocket", "delhivery"],
    },

    // Legacy Shiprocket fields
    shiprocketOrderId: { type: String },
    awbCode: { type: String },
    courierName: { type: String },
    trackingUrl: { type: String },
    shipmentId: { type: String },
    weight: { type: Number, default: 0.5 }, // kg
    shippingStatus: { type: String }, // Shiprocket webhook status
    shiprocketCreated: { type: Boolean, default: false },
    shiprocketError: { type: String }, // Store any shiprocket errors

    shippingAddress: { type: addressSchema, required: true },
    notes: { type: String, default: "" },

    // Cancellation Tracking
    cancelledBy: { type: mongoose.Schema.Types.ObjectId }, // User ID or Admin ID
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
