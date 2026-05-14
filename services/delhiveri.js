// services/delhiveri.js
// NOTE: This file is deprecated. Please use services/delhivery.service.js instead.
/*
import axios from "axios";

export const checkDelhivery = async (pincode, pickup_pincode) => {
  try {
    const response = await axios.get(
      `${process.env.DELHIVERY_BASE_URL}/api/k-api/v1/speed_api/k-api/v1/expected_delivery_date.json`,
      {
        params: {
          pincode: pincode,
          source: pickup_pincode,
        },
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    // Fallback to serviceability check if EDD fails
    try {
      const response = await axios.get(
        `${process.env.DELHIVERY_BASE_URL}/c/api/pin-codes/json/`,
        {
          params: { filter_codes: pincode },
          headers: {
            Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
          },
        }
      );
      return response.data;
    } catch (innerError) {
      return null;
    }
  }
};
*/