import Order from "../models/Order.js";
import { createShiprocketOrder } from "./shiprocketOrder.controller.js";

export const placeOrder = async (req, res) => {
  try {
    const order = await Order.create(req.body);

    const shiprocketRes = await createShiprocketOrder(order);

    order.shiprocketOrderId = shiprocketRes.order_id;
    order.awb = shiprocketRes.awb_code;
    order.courier = shiprocketRes.courier_name;

    await order.save();

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ message: "Order failed" });
  }
};
