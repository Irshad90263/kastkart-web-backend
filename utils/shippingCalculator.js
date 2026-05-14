import { shiprocketRequest } from "../services/shiprocket.service.js";
import { checkDelhivery } from "../services/delhivery.service.js";

/**
 * Recalculate shipping charge for a given provider, pincode and weight
 */
export const calculateShippingCharge = async (provider, pincode, weight) => {
  try {
    const pickup_postcode = (process.env.PICKUP_POSTCODE || "226010").trim(); // Default or from env

    if (provider?.toLowerCase() === "shiprocket") {
      const response = await shiprocketRequest(
        "GET",
        `/courier/serviceability/?pickup_postcode=${pickup_postcode}&delivery_postcode=${pincode}&weight=${weight || 0.5}&cod=1`
      );
      
      const companies = response?.data?.data?.available_courier_companies || [];
      if (companies.length > 0) {
        // Return the first available courier's freight charge
        return Math.ceil(companies[0].freight_charge);
      }
    } else if (provider?.toLowerCase() === "delhivery") {
      // Delhivery API might not return freight charge easily without a complete order payload or specific rate API
      // If we don't have a rate API for Delhivery, we might need a fallback or fixed rate
      // For now, let's try to return a default if it's null, or look for other fields
      return 0; // Default for Delhivery if not found (as per current system)
    }
    
    return 0;
  } catch (error) {
    console.error("Shipping recalculation failed:", error.message);
    return 0;
  }
};
