import CorporateInquiry from "../models/CorporateInquiry.model.js";

// Create a new corporate inquiry
export const createInquiry = async (req, res) => {
  try {
    const inquiry = new CorporateInquiry(req.body);
    await inquiry.save();
    res.status(201).json({
      success: true,
      message: "Corporate inquiry submitted successfully",
      data: inquiry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit inquiry",
      error: error.message,
    });
  }
};

// Get all inquiries (Admin use)
export const getAllInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const skip = (page - 1) * limit;

    // Search query
    const query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const total = await CorporateInquiry.countDocuments(query);
    const inquiries = await CorporateInquiry.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: inquiries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
      error: error.message,
    });
  }
};

// Get inquiry by ID
export const getInquiryById = async (req, res) => {
  try {
    const inquiry = await CorporateInquiry.findById(req.params.id).populate(
      "userId",
      "firstName lastName email"
    );
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }
    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiry",
      error: error.message,
    });
  }
};

// Update inquiry status
export const updateInquiryStatus = async (req, res) => {
  try {
    const inquiry = await CorporateInquiry.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: inquiry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

// Delete inquiry
export const deleteInquiry = async (req, res) => {
  try {
    const inquiry = await CorporateInquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete inquiry",
      error: error.message,
    });
  }
};
