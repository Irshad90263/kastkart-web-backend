import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Offer from "../models/Offer.js";
import { createShippingOrder, getTrackingDetails, cancelShippingOrder } from "../utils/shippingProviderSelector.js";

const applyOffer = (offer, subtotal) => {
  if (!offer) return { discount: 0, total: subtotal };
  if (offer.minOrderAmount && subtotal < offer.minOrderAmount) {
    return { discount: 0, total: subtotal };
  }
  let discount = 0;
  if (offer.discountType === "percentage") {
    discount = (subtotal * offer.discountValue) / 100;
  } else {
    discount = offer.discountValue;
  }
  if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
    discount = offer.maxDiscountAmount;
  }
  const total = Math.max(0, subtotal - discount);
  return { discount: Math.round(discount), total: Math.round(total) };
};

// PLACE ORDER (public) - Dynamic Multi-Courier Integration
export const placeOrder = async (req, res) => {
  try {
    const {
      userId,
      items,
      shippingAddress,
      offerCode,
      paymentMethod,
      notes,
      shippingCharges = 0,
      handlingFee = 0,
      selectedCourier, // "shiprocket" or "delhivery"
      weight            // Total package weight from frontend (kg)
    } = req.body;

    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "userId and items are required" });
    }

    if (!selectedCourier) {
      return res.status(400).json({ message: "Please select a shipping courier" });
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone) {
      return res.status(400).json({ message: "shippingAddress is invalid" });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const itemsForOrder = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find(
        (p) => String(p._id) === String(item.productId)
      );

      if (!product) {
        return res.status(400).json({ message: `Invalid productId: ${item.productId}` });
      }

      const qty = Number(item.quantity || 1);
      const linePrice = product.finalPrice * qty;
      subtotal += linePrice;

      itemsForOrder.push({
        product: product._id,
        productName: product.name,
        productPrice: product.finalPrice,
        quantity: qty,
        size: item.size,
        color: item.color,
        addOnName: item.addOnName
      });
    }

    // 🎯 OFFER / DISCOUNT
    let offer = null;
    if (offerCode) {
      const now = new Date();
      const code = String(offerCode).toUpperCase();
      offer = await Offer.findOne({ code, isActive: true });

      if (
        offer &&
        ((offer.startDate && offer.startDate > now) ||
          (offer.endDate && offer.endDate < now))
      ) {
        offer = null;
      }
    }

    const { discount, total: discountedTotal } = applyOffer(offer, subtotal);

    // 🚚 ADD SHIPPING + HANDLING
    const finalTotal =
      Number(discountedTotal) +
      Number(shippingCharges) +
      Number(handlingFee);

    // 📦 CREATE ORDER IN DB
    const order = await Order.create({
      userId,
      items: itemsForOrder,
      subtotal,
      discount,
      shippingCharges: Number(shippingCharges),
      handlingFee: Number(handlingFee),
      total: finalTotal,
      offerCode: offer ? offer.code : undefined,
      paymentMethod: paymentMethod || "COD",
      shippingAddress,
      notes,
      selectedCourier: selectedCourier.toLowerCase(),
      weight: Number(weight) || 0.5  // Save weight — used by Shiprocket/Delhivery for AWB
    });

    // 🚀 DYNAMIC COURIER ORDER CREATION
    try {
      console.log(`🚀 Creating ${selectedCourier} order for:`, order._id);

      const shippingResponse = await createShippingOrder(selectedCourier, order);
      console.log(shippingResponse)

      // Save shipping details in generic object
      order.shippingDetails = shippingResponse;
      order.shippingProvider = shippingResponse.provider;
      order.shippingCreated = true;
      order.status = "confirmed"; // Auto confirm if shipping succeeds

      // Maintain legacy fields for compatibility
      order.shiprocketOrderId = shippingResponse.providerOrderId;
      order.awbCode = shippingResponse.awbCode;
      order.courierName = shippingResponse.courierName;
      order.shipmentId = shippingResponse.shipmentId;
      order.shiprocketCreated = shippingResponse.provider === "shiprocket";

      await order.save();
      console.log(`✅ ${selectedCourier} order created and confirmed:`, shippingResponse.awbCode);
    } catch (shippingError) {
      console.error(`❌ ${selectedCourier} creation failed:`, shippingError.message);
      
      // Save error in both new and legacy fields
      if (order.shippingDetails) {
        order.shippingDetails.error = shippingError.message;
      } else {
        order.shippingDetails = { provider: selectedCourier, error: shippingError.message };
      }
      
      order.shippingError = shippingError.message;
      order.shiprocketError = shippingError.message; // Legacy
      await order.save();
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
      shipping: order.shippingDetails
    });
  } catch (err) {
    console.error("placeOrder error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ADMIN list
export const listOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("items.product", "name slug");

    res.json({
      orders,
      pagination: {
        total: totalOrders,
        page,
        limit,
        totalPages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (err) {
    console.error("listOrders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN get single
export const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate(
      "items.product",
      "name slug"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    console.error("getOrder error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN update status with Dynamic Shipping integration
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // If status confirmed and shipping not created yet
    if (status === "confirmed" && order.status !== "confirmed" && !order.shippingCreated && !order.shiprocketCreated) {
      try {
        const provider = order.selectedCourier || "shiprocket"; // Default to shiprocket if not selected
        console.log(`🚀 Creating ${provider} order via Admin for:`, orderId);

        const shippingResponse = await createShippingOrder(provider, order);

        // Update with shipping details
        order.shippingDetails = shippingResponse;
        order.shippingCreated = true;
        order.shippingError = null;

        // Legacy fields
        order.shiprocketOrderId = shippingResponse.providerOrderId;
        order.awbCode = shippingResponse.awbCode;
        order.courierName = shippingResponse.courierName;
        order.shipmentId = shippingResponse.shipmentId;
        order.shiprocketCreated = shippingResponse.provider === "shiprocket";

        console.log(`✅ ${provider} order created:`, shippingResponse.awbCode);
      } catch (shippingError) {
        const actualError =
          shippingError?.response?.data?.message ||
          shippingError?.message ||
          "Shipping creation failed";
        console.error("❌ Shipping error:", actualError);
        order.shippingError = actualError;
        await order.save(); // Save error to DB for reference
        return res.status(400).json({
          message: "Order confirmation failed",
          error: actualError, // Actual Shiprocket error (e.g. "Wrong Pickup location entered...")
        });
      }
    }
    
    // 🛑 If status set to CANCELLED and shipping exists, cancel it on provider side too
    if (status === "cancelled" && order.status !== "cancelled") {
      const provider = order.shippingDetails?.provider || order.selectedCourier;
      const providerOrderId = order.shippingDetails?.providerOrderId || order.shiprocketOrderId;
      const awb = order.shippingDetails?.awbCode || order.awbCode;
      
      if (provider && (providerOrderId || awb)) {
        try {
          console.log(`🛑 Cancelling ${provider} shipment for order:`, orderId);
          await cancelShippingOrder(provider, providerOrderId, awb);
          console.log(`✅ ${provider} shipment cancelled successfully`);
        } catch (cancelError) {
          console.warn("⚠️ Provider cancellation failed (non-critical):", cancelError.message);
          // Cancellation on provider might fail if already shipped/cancelled, 
          // we still allow DB update to keep system moving.
        }
      }
      
      // Track who cancelled (Admin)
      const adminId = req.user?.adminId || req.user?.sub;
      if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
        order.cancelledBy = new mongoose.Types.ObjectId(adminId);
      }
      order.cancelledAt = new Date();
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    res.json({
      message: "Order updated successfully",
      order,
      shippingStatus: order.shippingCreated ? "Active" : "Not created"
    });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get order tracking info
export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    const provider = order.shippingDetails?.provider || order.selectedCourier || (order.shiprocketOrderId ? "shiprocket" : null);
    const awb = order.shippingDetails?.awbCode || order.awbCode;

    let trackingData = null;
    if (provider && awb) {
      try {
        trackingData = await getTrackingDetails(provider, awb);
      } catch (e) {
        console.error("Tracking fetch failed:", e.message);
      }
    }

    res.json({
      orderId: order._id,
      status: order.status,
      shippingProvider: provider,
      awbCode: awb,
      trackingData
    });
  } catch (err) {
    console.error("getOrderTracking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
