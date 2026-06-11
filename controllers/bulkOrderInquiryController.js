import BulkOrderInquiry from "../models/BulkOrderInquiry.model.js";

// Create a new bulk order inquiry
export const createBulkOrderInquiry = async (req, res) => {
  try {
    const {
      fullName,
      companyName,
      mobileNumber,
      emailId,
      deliveryCityState,
      country,
      typeOfBuyer,
      preferredMangoVariety,
      requiredQuantity,
      packagingPreference,
      exactDeliveryAddress,
      expectedDeliveryDate,
      frequencyOfOrder,
      specialRequirements,
      consent,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !mobileNumber ||
      !emailId ||
      !deliveryCityState ||
      !country ||
      !typeOfBuyer ||
      !preferredMangoVariety ||
      !requiredQuantity ||
      !packagingPreference ||
      !exactDeliveryAddress ||
      !expectedDeliveryDate ||
      !frequencyOfOrder ||
      consent === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    const newInquiry = new BulkOrderInquiry({
      fullName,
      companyName,
      mobileNumber,
      emailId,
      deliveryCityState,
      country,
      typeOfBuyer,
      preferredMangoVariety,
      requiredQuantity,
      packagingPreference,
      exactDeliveryAddress,
      expectedDeliveryDate,
      frequencyOfOrder,
      specialRequirements,
      consent,
    });

    const savedInquiry = await newInquiry.save();

    res.status(201).json({
      success: true,
      message: "Bulk order inquiry submitted successfully. Our team will contact you within 24 hours.",
      data: savedInquiry,
    });
  } catch (error) {
    console.error("Error creating bulk order inquiry:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while submitting the inquiry. Please try again later.",
      error: error.message,
    });
  }
};

// Get all bulk order inquiries (for admin)
export const getAllBulkOrderInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { companyName: { $regex: search, $options: "i" } },
          { mobileNumber: { $regex: search, $options: "i" } },
        ]
      };
    }

    const total = await BulkOrderInquiry.countDocuments(query);
    const inquiries = await BulkOrderInquiry.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching bulk order inquiries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bulk order inquiries.",
      error: error.message,
    });
  }
};

// Get a single bulk order inquiry by ID
export const getBulkOrderInquiryById = async (req, res) => {
  try {
    const inquiry = await BulkOrderInquiry.findById(req.params.id).populate("preferredMangoVariety");
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found" });
    }
    res.status(200).json({ success: true, data: inquiry });
  } catch (error) {
    console.error("Error fetching bulk order inquiry:", error);
    res.status(500).json({ success: false, message: "Failed to fetch inquiry.", error: error.message });
  }
};

// Update a bulk order inquiry
export const updateBulkOrderInquiry = async (req, res) => {
  try {
    const updatedInquiry = await BulkOrderInquiry.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedInquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found" });
    }
    res.status(200).json({ success: true, message: "Inquiry updated successfully", data: updatedInquiry });
  } catch (error) {
    console.error("Error updating bulk order inquiry:", error);
    res.status(500).json({ success: false, message: "Failed to update inquiry.", error: error.message });
  }
};

// Delete a bulk order inquiry
export const deleteBulkOrderInquiry = async (req, res) => {
  try {
    const deletedInquiry = await BulkOrderInquiry.findByIdAndDelete(req.params.id);
    if (!deletedInquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found" });
    }
    res.status(200).json({ success: true, message: "Inquiry deleted successfully" });
  } catch (error) {
    console.error("Error deleting bulk order inquiry:", error);
    res.status(500).json({ success: false, message: "Failed to delete inquiry.", error: error.message });
  }
};
