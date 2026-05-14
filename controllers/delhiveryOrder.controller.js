import { delhiveryRequest } from "../services/delhivery.service.js";
import Order from "../models/Order.js";

/**
 * Create Delhivery Order
 */
export const createDelhiveryOrder = async (order) => {
  try {
    console.log("🚀 Creating Delhivery order for:", order._id);

    // Validate required fields
    if (!order.shippingAddress || !order.shippingAddress.name || !order.shippingAddress.phone) {
      throw new Error("Invalid shipping address data");
    }

    const payload = {
      format: "json",
      data: {
        shipments: [
          {
            name: order.shippingAddress.name,
            add: `${order.shippingAddress.addressLine1} ${order.shippingAddress.addressLine2 || ""}`.trim(),
            pin: order.shippingAddress.pincode,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            country: "India",
            phone: order.shippingAddress.phone,
            order: order._id.toString(),
            payment_mode: order.paymentMethod === "COD" ? "COD" : "Prepaid",
            total_amount: order.total,
            cod_amount: order.paymentMethod === "COD" ? order.total : 0,
            quantity: order.items.reduce((acc, item) => acc + (item.quantity || 1), 0),
            weight: order.weight || 0.5,
            products_desc: order.items.map(item => item.productName).join(", "),
            hsn_code: "",
          },
        ],
        pickup_location: {
          name: process.env.DELHIVERY_PICKUP_LOCATION || "KaashtKart",
        },
      }
    };

    const res = await delhiveryRequest("post", "/api/cmu/create.json", payload, {}, true);
    
    console.log("📥 Delhivery Response Raw:", JSON.stringify(res));

    if (res.success && res.packages && res.packages.length > 0) {
      const pkg = res.packages[0];
      console.log("✅ Delhivery order created:", pkg.waybill);
      
      return {
        provider: "delhivery",
        providerOrderId: order._id.toString(),
        awbCode: pkg.waybill,
        courierName: "Delhivery",
        shipmentId: pkg.waybill, // Delhivery uses waybill as shipment identifier often
        trackingUrl: `https://www.delhivery.com/track/package/${pkg.waybill}`,
        shippingStatus: "Manifested",
        created: true,
      };
    } else {
      const errorMsg = res.errors?.join(", ") || res.rmk || "Failed to create Delhivery order";
      console.error("❌ Delhivery API Error Detail:", errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error("❌ Delhivery Controller Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get Delhivery Tracking Info
 */
export const getDelhiveryTracking = async (awb) => {
  try {
    const res = await delhiveryRequest("get", `/api/v1/packages/json/?waybill=${awb}`);
    return res;
  } catch (error) {
    console.error("❌ Delhivery tracking failed:", error.message);
    throw error;
  }
};

/**
 * Cancel Delhivery Order
 */
export const cancelDelhiveryOrder = async (awb) => {
  try {
    const payload = {
      waybill: awb,
      cancellation: true,
    };
    const res = await delhiveryRequest("post", "/api/p/edit", payload);
    return res;
  } catch (error) {
    console.error("❌ Delhivery cancellation failed:", error.message);
    throw error;
  }
};
