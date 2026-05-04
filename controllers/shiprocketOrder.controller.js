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
    
    // Update order with Shiprocket data
    order.shiprocketCreated = true;
    order.shiprocketOrderId = shiprocketResponse.order_id;
    order.shipmentId = shiprocketResponse.shipment_id;
    order.awbCode = shiprocketResponse.awb_code;
    order.courierName = shiprocketResponse.courier_name;
    order.status = "confirmed"; // Auto confirm when manually created
    
    await order.save();
    
    console.log("✅ Manual Shiprocket order created and confirmed:", {
      shiprocketOrderId: shiprocketResponse.order_id,
      awbCode: shiprocketResponse.awb_code
    });
    
    res.json({
      message: "Shiprocket order created and order confirmed successfully",
      shiprocketOrderId: shiprocketResponse.order_id,
      shipmentId: shiprocketResponse.shipment_id,
      awbCode: shiprocketResponse.awb_code,
      courierName: shiprocketResponse.courier_name
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

    const payload = {
      order_id: order._id.toString(),
      order_date: new Date().toISOString().split("T")[0],

      pickup_location: "Sandila Ahirawan",

      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: order.shippingAddress.addressLine1,
      billing_address_2: order.shippingAddress.addressLine2 || "",
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.pincode,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: order.shippingAddress.email || "customer@example.com",
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
      weight: order.weight || 0.5,
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
    
    console.log("✅ Shiprocket response:", res.data);
    return res.data;
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
