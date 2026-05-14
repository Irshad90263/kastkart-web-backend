import axios from "axios";

/**
 * Reusable Delhivery Request Helper
 */
export const delhiveryRequest = async (method, url, data = {}, params = {}, isFormData = false) => {
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${process.env.DELHIVERY_BASE_URL}${url}`,
      headers: {
        Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
      },
      params: params,
    };

    if (isFormData) {
      config.headers["Content-Type"] = "application/x-www-form-urlencoded";
      // Delhivery expects data to be sent as stringified JSON in a 'data' field
      const formParams = new URLSearchParams();
      for (const key in data) {
        formParams.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
      }
      config.data = formParams.toString();
    } else {
      config.headers["Content-Type"] = "application/json";
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("❌ Delhivery API Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Existing Serviceability Logic (Refactored)
 */
export const checkDelhivery = async (pincode, pickup_pincode) => {
  try {
    // Try EDD first
    const response = await delhiveryRequest(
      "get",
      "/api/k-api/v1/speed_api/k-api/v1/expected_delivery_date.json",
      {},
      { pincode: pincode, source: pickup_pincode }
    );
    return response;
  } catch (error) {
    // Fallback to serviceability check
    try {
      const response = await delhiveryRequest(
        "get",
        "/c/api/pin-codes/json/",
        {},
        { filter_codes: pincode }
      );
      return response;
    } catch (innerError) {
      return null;
    }
  }
};
