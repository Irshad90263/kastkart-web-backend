import Vendor from "../models/Vender.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to delete local files
const deleteFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(__dirname, "..", "uploads", "venders", filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// @desc    Create a new vendor
// @route   POST /api/venders
// @access  Private (Admin)
export const createVendor = async (req, res) => {
  try {
    const data = { ...req.body };

    // 1. Parse JSON fields (important for multipart/form-data)
    const jsonFields = [
      "residentialAddress",
      "orchardAddress",
      "farmingExperience",
      "mangoVarietiesGrown",
      "farmingPractices",
      "socialMedia",
      "contactDetails",
    ];

    jsonFields.forEach((field) => {
      if (typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {
          console.error(`Error parsing ${field}:`, e);
        }
      }
    });

    const {
      name,
      residentialAddress,
      orchardAddress,
      farmingExperience,
      totalAreaOfCultivation,
      expectedQuantity,
      mangoVarietiesGrown,
      farmingPractices,
      harvestingPractices,
      socialMedia,
      contactDetails,
      vendorDesignation,
      signedDate,
    } = data;

    // 2. Basic Validation (Now it will work correctly on parsed objects)
    if (!name) return res.status(400).json({ success: false, message: "Vendor name is required" });
    if (!contactDetails || !contactDetails.phoneNumber) {
      return res.status(400).json({ success: false, message: "Contact phone number is required" });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    // 3. Handle Images
    let photo = undefined;
    if (req.files && req.files.photo) {
      const file = req.files.photo[0];
      photo = {
        url: `${baseUrl}/uploads/venders/${file.filename}`,
        publicId: file.filename
      };
    } else {
      // Schema marks photo.publicId as required, so we should check here
      return res.status(400).json({ success: false, message: "Grower photo is required" });
    }

    let growerSignature = undefined;
    if (req.files && req.files.growerSignature) {
      const file = req.files.growerSignature[0];
      growerSignature = {
        url: `${baseUrl}/uploads/venders/${file.filename}`,
        publicId: file.filename
      };
    } else {
      // Schema marks growerSignature.publicId as required
      return res.status(400).json({ success: false, message: "Grower signature is required" });
    }

    let orchardImages = [];
    if (req.files && req.files.orchardImages) {
      orchardImages = req.files.orchardImages.map(file => ({
        url: `${baseUrl}/uploads/venders/${file.filename}`,
        publicId: file.filename
      }));
    }

    // Create new vendor
    const vendor = new Vendor({
      name,
      photo,
      residentialAddress,
      orchardAddress,
      farmingExperience,
      totalAreaOfCultivation,
      expectedQuantity,
      mangoVarietiesGrown,
      farmingPractices,
      harvestingPractices,
      socialMedia,
      contactDetails,
      vendorDesignation,
      orchardImages,
      growerSignature,
      signedDate,
    });

    const savedVendor = await vendor.save();

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor: savedVendor,
    });
  } catch (error) {
    console.error("Error creating vendor:", error);
    // Cleanup uploaded files on error
    if (req.files) {
      Object.values(req.files).flat().forEach(file => deleteFile(file.filename));
    }
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get all vendors
// @route   GET /api/venders
// @access  Private (Admin)
export const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: vendors.length, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get vendor list (minimal data for dropdowns)
// @route   GET /api/venders/vendorlist
// @access  Private (Admin)
export const getVendorList = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true })
      .select("name contactDetails.phoneNumber")
      .sort({ name: 1 });
    res.status(200).json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get single vendor by ID
// @route   GET /api/venders/:id
// @access  Private (Admin)
export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update vendor
// @route   PUT /api/venders/:id
// @access  Private (Admin)
export const updateVendor = async (req, res) => {
  try {
    let vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    // Update simple fields
    const updateData = { ...req.body };

    // Parse JSON strings if sent as multipart/form-data
    const jsonFields = ['residentialAddress', 'orchardAddress', 'farmingExperience', 'mangoVarietiesGrown', 'farmingPractices', 'socialMedia', 'contactDetails', 'orchardImages'];
    jsonFields.forEach(field => {
      if (typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (e) {
          // If orchardImages is not a valid JSON (e.g. not provided), just ignore it
          if (field !== 'orchardImages') console.error(`Error parsing ${field}:`, e);
        }
      }
    });

    // 📸 Handle Image Updates
    if (req.files) {
      if (req.files.photo) {
        deleteFile(vendor.photo?.publicId);
        const file = req.files.photo[0];
        updateData.photo = {
          url: `${baseUrl}/uploads/venders/${file.filename}`,
          publicId: file.filename
        };
      }

      if (req.files.growerSignature) {
        deleteFile(vendor.growerSignature?.publicId);
        const file = req.files.growerSignature[0];
        updateData.growerSignature = {
          url: `${baseUrl}/uploads/venders/${file.filename}`,
          publicId: file.filename
        };
      }
    }

    // Handle Orchard Images separately to allow deletion and appending
    let currentOrchardImages = updateData.orchardImages || vendor.orchardImages || [];

    // If updateData.orchardImages was provided, it means the user might have deleted some.
    // We should delete the files that are no longer in the list.
    if (updateData.orchardImages) {
      const remainingPublicIds = updateData.orchardImages.map(img => img.publicId);
      vendor.orchardImages.forEach(img => {
        if (!remainingPublicIds.includes(img.publicId)) {
          deleteFile(img.publicId);
        }
      });
    }

    // Append new images if any
    if (req.files && req.files.orchardImages) {
      const newImages = req.files.orchardImages.map(file => ({
        url: `${baseUrl}/uploads/venders/${file.filename}`,
        publicId: file.filename
      }));
      currentOrchardImages = [...currentOrchardImages, ...newImages];
    }

    updateData.orchardImages = currentOrchardImages;

    const updatedVendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: "Vendor updated successfully", vendor: updatedVendor });
  } catch (error) {
    console.error("Update Vendor Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete vendor
// @route   DELETE /api/venders/:id
// @access  Private (Admin)
export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    // Delete associated files
    deleteFile(vendor.photo?.publicId);
    deleteFile(vendor.growerSignature?.publicId);
    vendor.orchardImages.forEach(img => deleteFile(img.publicId));

    await Vendor.deleteOne({ _id: vendor._id });

    res.status(200).json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
