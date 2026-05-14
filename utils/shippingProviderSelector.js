import { createShiprocketOrder, getShiprocketTracking, cancelShiprocketOrder } from "../controllers/shiprocketOrder.controller.js";
import { createDelhiveryOrder, getDelhiveryTracking, cancelDelhiveryOrder } from "../controllers/delhiveryOrder.controller.js";

/**
 * Universal Shipping Order Creator
 */
export const createShippingOrder = async (provider, order) => {
  console.log(`🚚 Selecting shipping provider: ${provider}`);
  
  switch (provider?.toLowerCase()) {
    case "shiprocket":
      return await createShiprocketOrder(order);
    case "delhivery":
      return await createDelhiveryOrder(order);
    default:
      throw new Error(`Unsupported shipping provider: ${provider}`);
  }
};

/**
 * Universal Tracking Details Fetcher
 */
export const getTrackingDetails = async (provider, awb) => {
  switch (provider?.toLowerCase()) {
    case "shiprocket":
      return await getShiprocketTracking(awb);
    case "delhivery":
      return await getDelhiveryTracking(awb);
    default:
      throw new Error(`Unsupported shipping provider: ${provider}`);
  }
};

/**
 * Universal Order Canceller
 */
export const cancelShippingOrder = async (provider, orderId, awb) => {
  console.log(`🚚 Cancelling order on provider: ${provider}`);
  
  switch (provider?.toLowerCase()) {
    case "shiprocket":
      return await cancelShiprocketOrder(orderId);
    case "delhivery":
      return await cancelDelhiveryOrder(awb);
    default:
      throw new Error(`Unsupported shipping provider: ${provider}`);
  }
};
