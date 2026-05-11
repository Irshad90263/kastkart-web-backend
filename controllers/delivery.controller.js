// controllers/delivery.controller.js

import { shiprocketRequest } from "../services/shiprocket.service.js";

export const checkDeliveryAvailability = async (req, res) => {
  try {
    const { pincode, weight } = req.params;

    // Validation
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode",
      });
    }

    // Shiprocket API Call
    const response = await shiprocketRequest(
      "GET",
      `/courier/serviceability/?pickup_postcode=203001&delivery_postcode=${pincode}&weight=3&cod=0`
    );

    const companies =
      response?.data?.data?.available_courier_companies;

    // No courier available
    if (!companies || companies.length === 0) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "Delivery not available",
      });
    }

    // Fastest courier
    const courier = companies[0];

    return res.status(200).json({
      success: true,
      available: true,

      estimatedDays:
        courier.estimated_delivery_days,

      courierName: courier.courier_name,

      freightCharge: courier.freight_charge,

      codAvailable: courier.cod,

      etd: courier.etd,
    });
  } catch (error) {
    console.log(
      "SHIPROCKET DELIVERY ERROR:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to check delivery",
    });
  }
};