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
    } = req.body;

    // Basic Validation
    if (!name) return res.status(400).json({ success: false, message: "Vendor name is required" });
    if (!contactDetails || !contactDetails.phoneNumber) {
      return res.status(400).json({ success: false, message: "Contact phone number is required" });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    // 📸 Handle Images
    let photo = undefined;
    if (req.files && req.files.photo) {
      const file = req.files.photo[0];
      photo = {
        url: `${baseUrl}/uploads/venders/${file.filename}`,
        publicId: file.filename
      };
    }

    let growerSignature = undefined;
    if (req.files && req.files.growerSignature) {
      const file = req.files.growerSignature[0];
      growerSignature = {
        url: `${baseUrl}/uploads/venders/${file.filename}`,
        publicId: file.filename
      };
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
      residentialAddress: typeof residentialAddress === 'string' ? JSON.parse(residentialAddress) : residentialAddress,
      orchardAddress: typeof orchardAddress === 'string' ? JSON.parse(orchardAddress) : orchardAddress,
      farmingExperience: typeof farmingExperience === 'string' ? JSON.parse(farmingExperience) : farmingExperience,
      totalAreaOfCultivation,
      expectedQuantity,
      mangoVarietiesGrown: typeof mangoVarietiesGrown === 'string' ? JSON.parse(mangoVarietiesGrown) : mangoVarietiesGrown,
      farmingPractices: typeof farmingPractices === 'string' ? JSON.parse(farmingPractices) : farmingPractices,
      harvestingPractices,
      socialMedia: typeof socialMedia === 'string' ? JSON.parse(socialMedia) : socialMedia,
      contactDetails: typeof contactDetails === 'string' ? JSON.parse(contactDetails) : contactDetails,
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
    const jsonFields = ['residentialAddress', 'orchardAddress', 'farmingExperience', 'mangoVarietiesGrown', 'farmingPractices', 'socialMedia', 'contactDetails'];
    jsonFields.forEach(field => {
      if (typeof updateData[field] === 'string') {
        updateData[field] = JSON.parse(updateData[field]);
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

      if (req.files.orchardImages) {
        // Option: Append to existing or replace? Let's replace for simplicity or handle as needed.
        // Usually, for updates, you might want to manage individual deletions, but here we'll replace or append.
        const newImages = req.files.orchardImages.map(file => ({
          url: `${baseUrl}/uploads/venders/${file.filename}`,
          publicId: file.filename
        }));
        
        // If the user sends a flag to replace, we delete old ones.
        if (req.body.replaceOrchardImages === 'true') {
          vendor.orchardImages.forEach(img => deleteFile(img.publicId));
          updateData.orchardImages = newImages;
        } else {
          updateData.orchardImages = [...vendor.orchardImages, ...newImages];
        }
      }
    }

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
