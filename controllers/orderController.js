// controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Offer from "../models/Offer.js";
import { createShiprocketOrder } from "./shiprocketOrder.controller.js";

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

// PLACE ORDER (public) - Auto Shiprocket Integration
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
      handlingFee = 0
    } = req.body;


    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "userId and items are required" });
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
        return res
          .status(400)
          .json({ message: `Invalid productId: ${item.productId}` });
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

    // 📦 CREATE ORDER
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
      notes
    });

    // 🚀 AUTO CREATE SHIPROCKET ORDER (ALL ORDERS)
    try {
      console.log("🚀 Auto-creating Shiprocket order for:", order._id);

      const shiprocketRes = await createShiprocketOrder(order);

      order.shiprocketOrderId = shiprocketRes.order_id;
      order.awbCode = shiprocketRes.awb_code;
      order.courierName = shiprocketRes.courier_name;
      order.shipmentId = shiprocketRes.shipment_id;
      order.shiprocketCreated = true;
      order.status = "confirmed"; // Only confirm if Shiprocket creation succeeds

      await order.save();
      console.log("✅ Shiprocket order auto-created and order confirmed:", shiprocketRes.order_id);
    } catch (shiprocketError) {
      console.error(
        "❌ Auto Shiprocket creation failed, order remains pending:",
        shiprocketError.message
      );
      order.shiprocketError = shiprocketError.message;
      // Order status remains "pending" (default)
      await order.save();
    }

    return res.status(201).json({
      message: "Order placed successfully",
      order,
      shiprocketStatus: order.shiprocketCreated ? "Created" : "Pending"
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

// ADMIN update status with Enhanced Shiprocket integration
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // If status is being changed to "confirmed", create Shiprocket order if not already created
    if (status === "confirmed" && order.status !== "confirmed" && !order.shiprocketCreated) {
      try {
        console.log("🚀 Creating Shiprocket order for:", orderId);

        const shiprocketRes = await createShiprocketOrder(order);

        // Update order with Shiprocket details
        order.shiprocketOrderId = shiprocketRes.order_id;
        order.awbCode = shiprocketRes.awb_code;
        order.courierName = shiprocketRes.courier_name;
        order.shipmentId = shiprocketRes.shipment_id;
        order.shiprocketCreated = true;
        order.shiprocketError = null; // Clear any previous errors

        console.log("✅ Shiprocket order created:", {
          orderId: shiprocketRes.order_id,
          awb: shiprocketRes.awb_code,
          courier: shiprocketRes.courier_name
        });
      } catch (shiprocketError) {
        console.error("❌ Shiprocket error:", shiprocketError.message);
        order.shiprocketError = shiprocketError.message;
        // Revert status back to pending if Shiprocket creation fails
        return res.status(400).json({
          message: "Order confirmation failed: Shiprocket order creation failed",
          error: shiprocketError.message
        });
      }
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    res.json({
      message: "Order updated successfully",
      order,
      shiprocketStatus: order.shiprocketCreated ? "Active" : "Not created",
      shiprocketError: order.shiprocketError || null
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

    const trackingInfo = {
      orderId: order._id,
      status: order.status,
      shippingStatus: order.shippingStatus,
      awbCode: order.awbCode,
      courierName: order.courierName,
      trackingUrl: order.trackingUrl,
      shiprocketOrderId: order.shiprocketOrderId,
      shiprocketCreated: order.shiprocketCreated,
      shiprocketError: order.shiprocketError
    };

    res.json({ trackingInfo });
  } catch (err) {
    console.error("getOrderTracking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
