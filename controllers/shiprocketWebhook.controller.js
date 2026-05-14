import Order from "../models/Order.js";

// Enhanced Shiprocket Webhook Handler
export const shiprocketWebhook = async (req, res) => {
  try {
    console.log("📦 Shiprocket Webhook received:", req.body);
    
    const { awb, current_status, order_id, shipment_id } = req.body;
    
    if (!awb && !order_id) {
      return res.status(400).json({ message: "AWB or order_id required" });
    }
    
    // Find order by AWB (Check generic first, then legacy)
    let order = await Order.findOne({ "shippingDetails.awbCode": awb });
    
    if (!order && awb) {
      order = await Order.findOne({ awbCode: awb });
    }
    
    if (!order && order_id) {
      order = await Order.findOne({ "shippingDetails.providerOrderId": order_id.toString() }) || 
              await Order.findOne({ shiprocketOrderId: order_id.toString() });
    }
    
    if (!order) {
      console.log("⚠️ Order not found for webhook:", { awb, order_id });
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Update shipping status (Generic + Legacy)
    if (order.shippingDetails) {
      order.shippingDetails.shippingStatus = current_status;
    }
    order.shippingStatus = current_status;
    
    // Map Shiprocket status to our order status
    const statusMapping = {
      'PICKUP_SCHEDULED': 'confirmed',
      'PICKED_UP': 'shipped',
      'IN_TRANSIT': 'shipped',
      'OUT_FOR_DELIVERY': 'shipped',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled',
      'RTO': 'cancelled',
      'LOST': 'cancelled'
    };
    
    if (statusMapping[current_status]) {
      order.status = statusMapping[current_status];
    }
    
    await order.save();
    
    console.log("✅ Order status updated:", {
      orderId: order._id,
      status: order.status,
      shippingStatus: current_status
    });
    
    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Shiprocket webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};
