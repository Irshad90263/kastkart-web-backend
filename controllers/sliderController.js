// controllers/sliderController.js
import Slider from "../models/Slider.js";
import { cloudinary } from "../config/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createSlider = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "image is required" });

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const slider = await Slider.create({
      title: `Slider ${Date.now()}`,
      image: { 
        url: `${baseUrl}/uploads/sliders/${req.file.filename}`, 
        publicId: req.file.filename 
      },
    });

    res.status(201).json({ message: "Slider created", slider });
  } catch (err) {
    console.error("createSlider error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listActiveSliders = async (_req, res) => {
  try {
    const sliders = await Slider.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json({ sliders });
  } catch (err) {
    console.error("listActiveSliders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listAllSliders = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    const sliders = await Slider.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ sliders });
  } catch (err) {
    console.error("listAllSliders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleSliderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const slider = await Slider.findById(id);
    if (!slider) return res.status(404).json({ message: "Slider not found" });

    slider.isActive = !slider.isActive;
    await slider.save();

    res.json({ message: "Slider status updated", slider });
  } catch (err) {
    console.error("toggleSliderStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const slider = await Slider.findById(id);
    if (!slider) return res.status(404).json({ message: "Slider not found" });

    if (req.file) {
      // Delete old local file
      const oldFilePath = path.join(__dirname, "../", slider.image.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      // await cloudinary.uploader.destroy(slider.image.publicId);
      
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      slider.image = { 
        url: `${baseUrl}/uploads/sliders/${req.file.filename}`, 
        publicId: req.file.filename 
      };
    }

    await slider.save();
    res.json({ message: "Slider updated", slider });
  } catch (err) {
    console.error("updateSlider error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const slider = await Slider.findById(id);
    if (!slider) return res.status(404).json({ message: "Slider not found" });

    // Delete local file
    const filePath = path.join(__dirname, "../", slider.image.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // await cloudinary.uploader.destroy(slider.image.publicId);
    
    await Slider.deleteOne({ _id: slider._id });

    res.json({ message: "Slider deleted" });
  } catch (err) {
    console.error("deleteSlider error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
