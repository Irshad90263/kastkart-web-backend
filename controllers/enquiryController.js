// controllers/enquiryController.js
import Enquiry from "../models/Enquiry.js";

export const createEnquiry = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ message: "name and message required" });
    }
    const enquiry = await Enquiry.create({
      name,
      email,
      phone,
      subject,
      message,
    });
    res.status(201).json({ message: "Enquiry submitted", enquiry });
  } catch (err) {
    console.error("createEnquiry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listEnquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalEnquiries = await Enquiry.countDocuments();
    const enquiries = await Enquiry.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      enquiries,
      pagination: {
        total: totalEnquiries,
        page,
        limit,
        totalPages: Math.ceil(totalEnquiries / limit)
      }
    });
  } catch (err) {
    console.error("listEnquiries error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await Enquiry.findById(id);
    if (!enquiry) return res.status(404).json({ message: "Not found" });
    res.json({ enquiry });
  } catch (err) {
    console.error("getEnquiry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isRead } = req.body;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) return res.status(404).json({ message: "Not found" });

    if (status) enquiry.status = status;
    if (isRead !== undefined) enquiry.isRead = !!isRead;

    await enquiry.save();
    res.json({ message: "Enquiry updated", enquiry });
  } catch (err) {
    console.error("updateEnquiryStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
