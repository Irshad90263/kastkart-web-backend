import { shiprocketRequest } from "../services/shiprocket.service.js";
import Order from "../models/Order.js";

// Create Shiprocket order for existing order
export const createOrderForExisting = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log("🔍 Finding order:", orderId);

    // Find the order
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      console.log("❌ Order not found:", orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("📋 Order found:", {
      id: order._id,
      paymentMethod: order.paymentMethod,
      shiprocketCreated: order.shiprocketCreated,
      itemsCount: order.items?.length,
      shippingAddress: order.shippingAddress ? 'Present' : 'Missing'
    });

    if (order.shiprocketCreated) {
      return res.status(400).json({ message: "Shiprocket order already created" });
    }

    // Create Shiprocket order
    const shiprocketResponse = await createShiprocketOrder(order);

    // ✅ Double-check: providerOrderId must exist before saving
    if (!shiprocketResponse || !shiprocketResponse.providerOrderId) {
      throw new Error(
        "Shiprocket integration failed: no valid order ID received. DB will not be updated."
      );
    }

    // Update order with Shiprocket data (Legacy + New Generic)
    order.shiprocketCreated = true;
    order.shiprocketOrderId = shiprocketResponse.providerOrderId;
    order.shipmentId = shiprocketResponse.shipmentId;
    order.awbCode = shiprocketResponse.awbCode;
    order.courierName = shiprocketResponse.courierName;
    order.trackingUrl = shiprocketResponse.trackingUrl;

    // Set New Generic Object
    order.shippingDetails = shiprocketResponse;
    order.selectedCourier = "shiprocket";

    order.status = "confirmed"; // Auto confirm when manually created

    await order.save();

    console.log("✅ Shiprocket order created and confirmed:", {
      shiprocketOrderId: shiprocketResponse.providerOrderId,
      shipmentId: shiprocketResponse.shipmentId,
      awbCode: shiprocketResponse.awbCode
    });

    res.json({
      message: "Shiprocket order created and order confirmed successfully",
      shipping: shiprocketResponse
    });
  } catch (error) {
    console.error("❌ Create Shiprocket order error:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    res.status(500).json({
      message: error.response?.data?.message || error.message || "Failed to create Shiprocket order"
    });
  }
};

// Get tracking info
export const getTrackingInfo = async (req, res) => {
  try {
    const { awbCode } = req.params;
    const trackingData = await getShiprocketTracking(awbCode);
    res.json(trackingData);
  } catch (error) {
    console.error("Get tracking error:", error);
    res.status(500).json({
      message: error.response?.data?.message || error.message || "Failed to get tracking info"
    });
  }
};

// Cancel order (placeholder)
export const cancelOrder = async (req, res) => {
  try {
    res.status(501).json({ message: "Cancel order not implemented yet" });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel order" });
  }
};

// Enhanced Shiprocket Order Creation
export const createShiprocketOrder = async (order) => {
  try {
    console.log("📦 Creating Shiprocket order for:", order._id);
    console.log("📦 Order data:", JSON.stringify({
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      items: order.items.map(item => ({
        productName: item.productName,
        productId: item.product?._id || item.product,
        quantity: item.quantity,
        price: item.productPrice
      })),
      total: order.total
    }, null, 2));

    // Validate required fields
    if (!order.shippingAddress || !order.shippingAddress.name || !order.shippingAddress.phone) {
      throw new Error("Invalid shipping address data");
    }

    if (!order.items || order.items.length === 0) {
      throw new Error("No items in order");
    }

    // Split name into first and last name
    const nameParts = order.shippingAddress.name.trim().split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'Name';

    // Shiprocket order_id: MongoDB _id is already globally unique.
    // Using it directly as channel_order_id.
    const shiprocketOrderId = order._id.toString();

    const payload = {
      order_id: shiprocketOrderId,
      order_date: new Date().toISOString().split("T")[0],

      pickup_location: "Kaashtkart Marketplace",

      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: order.shippingAddress.addressLine1,
      billing_address_2: order.shippingAddress.addressLine2 || "",
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.pincode,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: order.shippingAddress.email || "",
      billing_phone: order.shippingAddress.phone,

      shipping_is_billing: true,

      order_items: order.items.map((item) => ({
        name: item.productName || "Product",
        sku: item.product ? item.product._id?.toString() || item.product.toString() : "SKU001",
        units: item.quantity || 1,
        selling_price: item.productPrice || 100,
      })),

      payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      sub_total: order.total || 100,

      length: 10,
      breadth: 10,
      height: 5,
      weight: order.weight || 0.5, // Actual order weight from DB
    };

    console.log("📦 Shiprocket payload:", JSON.stringify({
      ...payload,
      order_items: payload.order_items.map(item => ({
        ...item,
        sku: item.sku.substring(0, 50) // Truncate for readability
      }))
    }, null, 2));

    const res = await shiprocketRequest(
      "post",
      "/orders/create/adhoc",
      payload
    );

    console.log("📬 Shiprocket raw response:", res.data);

    // ✅ Validate Shiprocket response — API returns 200 even on failure
    const data = res.data;

    if (!data) {
      throw new Error("Shiprocket returned an empty response");
    }

    // Agar order_id missing ho ya sirf 'message' field aa raha ho (error case)
    if (!data.order_id) {
      const errorMsg =
        data.message ||
        data.errors ||
        "Shiprocket order creation failed: order_id missing in response";
      console.error("❌ Shiprocket API error response:", data);
      throw new Error(
        typeof errorMsg === "object" ? JSON.stringify(errorMsg) : errorMsg
      );
    }

    console.log("✅ Shiprocket order created successfully:", {
      order_id: data.order_id,
      shipment_id: data.shipment_id,
      awb_code: data.awb_code,
    });

    // ─── Step 2: Auto-assign courier to get AWB code ───────────────────────
    // Shiprocket order create hone ke baad awb_code empty hota hai.
    // AWB milne ke liye /courier/assign/awb call karna padta hai.
    let awbCode = data.awb_code || "";
    let courierName = data.courier_name || "Shiprocket";
    let courierCompanyId = data.courier_company_id || null;

    if (data.shipment_id && !awbCode) {
      try {
        console.log("🔄 Auto-assigning courier for shipment:", data.shipment_id);

        const assignRes = await shiprocketRequest(
          "post",
          "/courier/assign/awb",
          { shipment_id: data.shipment_id.toString() }
        );

        console.log("📬 Courier assign response:", assignRes.data);

        const assignData = assignRes.data?.response?.data || assignRes.data;

        if (assignData?.awb_assign_status === 1 || assignData?.awb_code) {
          awbCode = assignData.awb_code || "";
          courierName = assignData.courier_name || courierName;
          courierCompanyId = assignData.courier_company_id || courierCompanyId;
          console.log("✅ Courier assigned & AWB received:", { awbCode, courierName });
        } else {
          // AWB assign nahi hua — warning log karo but order save karo
          console.warn("⚠️ AWB auto-assign failed (non-critical):", assignData);
        }
      } catch (assignError) {
        // AWB assign fail hona critical nahi hai — order phir bhi saved rahega
        console.warn("⚠️ Courier auto-assign error (non-critical):", assignError.response?.data || assignError.message);
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    // Normalize response
    return {
      provider: "shiprocket",
      providerOrderId: data.order_id.toString(),
      awbCode,
      courierName,
      courierCompanyId: courierCompanyId?.toString() || "",
      shipmentId: data.shipment_id?.toString(),
      trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : "",
      shippingStatus: awbCode ? "AWB Assigned" : "Pickup Scheduled",
      created: true
    };
  } catch (error) {
    console.error("❌ Shiprocket order creation failed:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// Get Shiprocket order tracking
export const getShiprocketTracking = async (awbCode) => {
  try {
    const res = await shiprocketRequest(
      "get",
      `/courier/track/awb/${awbCode}`
    );
    return res.data;
  } catch (error) {
    console.error("❌ Shiprocket tracking failed:", error.message);
    throw error;
  }
};

// Cancel Shiprocket Order
export const cancelShiprocketOrder = async (orderId) => {
  try {
    // Shiprocket expects an array of order IDs for cancellation
    const payload = {
      ids: [orderId]
    };

    console.log("📦 Cancelling Shiprocket order:", orderId);

    const res = await shiprocketRequest(
      "post",
      "/orders/cancel",
      payload
    );

    return res;
  } catch (error) {
    console.error("❌ Shiprocket cancellation failed:", error.response?.data || error.message);
    throw error;
  }
};
