import { shiprocketRequest } from "../services/shiprocket.service.js";

// Get tracking details
export const getTrackingDetails = async (awbCode) => {
  try {
    const res = await shiprocketRequest("get", `/courier/track/awb/${awbCode}`);
    return res.data;
  } catch (error) {
    console.error("Tracking error:", error.response?.data || error.message);
    throw error;
  }
};

// Get all shipments
export const getShipments = async () => {
  try {
    const res = await shiprocketRequest("get", "/shipments");
    return res.data;
  } catch (error) {
    console.error("Shipments error:", error.response?.data || error.message);
    throw error;
  }
};

// Cancel shipment
export const cancelShipment = async (awbCode) => {
  try {
    const res = await shiprocketRequest("post", "/orders/cancel/shipment/awbs", {
      awbs: [awbCode]
    });
    return res.data;
  } catch (error) {
    console.error("Cancel shipment error:", error.response?.data || error.message);
    throw error;
  }
};