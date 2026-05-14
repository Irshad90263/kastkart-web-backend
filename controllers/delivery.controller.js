import { checkDelhivery } from "../services/delhivery.service.js";
import { shiprocketRequest } from "../services/shiprocket.service.js";

export const checkDeliveryAvailability = async (req, res) => {
  try {
    const { pincode, weight } = req.method === "POST" ? req.body : req.params;
    const current_pickup_postcode = (process.env.PICKUP_POSTCODE || "").trim();

    // Validation
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode",
      });
    }

    // Shiprocket + Delhivery Parallel API Call
    const [shiprocketResponse, delhiveryResponse] = await Promise.allSettled([
      shiprocketRequest(
        "GET",
        `/courier/serviceability/?pickup_postcode=${current_pickup_postcode}&delivery_postcode=${pincode}&weight=${weight || 0.5}&cod=1`
      ),
      checkDelhivery(pincode, current_pickup_postcode),
    ]);

    const availableCouriers = [];

    // --- Normalize Shiprocket Data ---
    const shiprocketData = shiprocketResponse.status === "fulfilled" ? shiprocketResponse.value?.data?.data : null;
    const shiprocketCompanies = shiprocketData?.available_courier_companies || [];
    
    if (shiprocketCompanies.length > 0) {
      const fastestShiprocket = shiprocketCompanies[0];
      availableCouriers.push({
        provider: "shiprocket",
        available: true,
        courierName: fastestShiprocket.courier_name,
        estimatedDays: parseInt(fastestShiprocket.estimated_delivery_days) || 7,
        etd: fastestShiprocket.etd,
        freightCharge: fastestShiprocket.freight_charge,
        codAvailable: fastestShiprocket.cod === 1
      });
    }

    // --- Normalize Delhivery Data ---
    const delhiveryData = delhiveryResponse.status === "fulfilled" ? delhiveryResponse.value : null;
    if (delhiveryData) {
      let delhiveryOption = null;

      // Case 1: EDD Response
      if (delhiveryData.resource && delhiveryData.resource.length > 0) {
        const eddData = delhiveryData.resource[0];
        const etd = eddData.expected_delivery_date;
        
        if (etd) {
          const today = new Date();
          const deliveryDate = new Date(etd);
          const diffTime = Math.abs(deliveryDate - today);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 4;

          delhiveryOption = {
            provider: "delhivery",
            available: true,
            courierName: "Delhivery",
            estimatedDays: diffDays,
            etd: etd,
            freightCharge: null, // Delhivery doesn't always provide freight in this API
            codAvailable: true
          };
        }
      } 
      
      // Case 2: Serviceability Response (Fallback)
      if (!delhiveryOption && delhiveryData.delivery_codes && delhiveryData.delivery_codes.length > 0) {
        const code = delhiveryData.delivery_codes[0].postal_code;
        const isServiceable = 
          code.is_serviceable === "Y" || 
          code.is_serviceable === true || 
          code.pre_paid === "Y" || 
          code.cod === "Y";

        if (isServiceable) {
          delhiveryOption = {
            provider: "delhivery",
            available: true,
            courierName: "Delhivery",
            estimatedDays: 5,
            etd: "Standard Delivery (3-5 days)",
            freightCharge: null,
            codAvailable: code.cod === "Y" || code.cod === "Yes"
          };
        }
      }

      if (delhiveryOption) {
        availableCouriers.push(delhiveryOption);
      }
    }

    return res.status(200).json({
      success: true,
      availableCouriers
    });
  } catch (error) {
    console.log("DELIVERY CHECK ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to check delivery availability",
    });
  }
};
