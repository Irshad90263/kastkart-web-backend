import { shiprocketRequest } from "../services/shiprocket.service.js";

export const checkServiceability = async (req, res) => {
  try {
    const { pickup_pincode, delivery_pincode, weight } = req.query;

    const response = await shiprocketRequest(
      "get",
      `/courier/serviceability?pickup_postcode=${pickup_pincode}&delivery_postcode=${delivery_pincode}&weight=${weight}&cod=0`
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data);
    res.status(500).json({ message: "Shipping check failed" });
  }
};
