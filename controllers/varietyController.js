// controllers/varietyController.js
import Variety from "../models/Variety.js";
import Product from "../models/Product.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createVariety = async (req, res) => {
  try {
    let { name, description, category } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    if (!category) return res.status(400).json({ message: "category is required" });

    // Normalize category to an array
    let categoriesArray = category;
    if (typeof category === 'string') {
      try { categoriesArray = JSON.parse(category); }
      catch (e) { categoriesArray = [category]; }
    }
    if (!Array.isArray(categoriesArray)) categoriesArray = [categoriesArray];
    category = categoriesArray;

    const exists = await Variety.findOne({ name });
    if (exists) return res.status(409).json({ message: "Variety exists" });

    let imageData = null;
    if (req.file) {
      imageData = {
        url: `${process.env.BASE_URL}/uploads/varieties/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    const variety = await Variety.create({ 
      name, 
      description,
      category,
      image: imageData
    });
    res.status(201).json({ message: "Variety created", category: variety, variety });
  } catch (err) {
    console.error("createVariety error:", err);
    res.status(500).json({ message: "CONTROLLER_ERROR: " + err.message, stack: err.stack });
  }
};

export const listVarieties = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status === 'active') filter = { isActive: true };
    if (status === 'inactive') filter = { isActive: false };
    
    const varieties = await Variety.find(filter).populate("category").sort({ createdAt: -1 });
    res.json({ categories: varieties, varieties });
  } catch (err) {
    console.error("listVarieties error:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

export const getVariety = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const variety =
      (await Variety.findOne({ slug: idOrSlug }).populate("category")) ||
      (await Variety.findById(idOrSlug).populate("category"));
    if (!variety) return res.status(404).json({ message: "Not found" });
    res.json({ category: variety, variety });
  } catch (err) {
    console.error("getVariety error:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

export const updateVariety = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let variety =
      (await Variety.findOne({ slug: idOrSlug })) ||
      (await Variety.findById(idOrSlug));
    if (!variety) return res.status(404).json({ message: "Not found" });

    let { name, description, isActive, removeImage, category } = req.body;

    if (name) {
      variety.name = name;
      variety.slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "") + "-" + Date.now();
    }
    if (description !== undefined) variety.description = description;
    if (isActive !== undefined) variety.isActive = !!isActive;
    
    if (category !== undefined) {
      let categoriesArray = category;
      if (typeof category === 'string') {
        try { categoriesArray = JSON.parse(category); }
        catch (e) { categoriesArray = [category]; }
      }
      if (!Array.isArray(categoriesArray)) categoriesArray = [categoriesArray];
      variety.category = categoriesArray;
    }

    if (removeImage === 'true' || removeImage === true) {
      if (variety.image && variety.image.filename) {
        const oldImagePath = path.join(__dirname, "..", "uploads", "varieties", variety.image.filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      variety.image = null;
    }
    
    if (req.file) {
      if (variety.image && variety.image.filename) {
        const oldImagePath = path.join(__dirname, "..", "uploads", "varieties", variety.image.filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      variety.image = {
        url: `${process.env.BASE_URL}/uploads/varieties/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    await variety.save();
    res.json({ message: "Variety updated", category: variety, variety });
  } catch (err) {
    console.error("updateVariety error:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

export const deleteVariety = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let variety =
      (await Variety.findOne({ slug: idOrSlug })) ||
      (await Variety.findById(idOrSlug));
    if (!variety) return res.status(404).json({ message: "Not found" });

    const productCount = await Product.countDocuments({
      variety: variety._id,
    });
    if (productCount > 0) {
      return res
        .status(400)
        .json({ message: "Variety has products, cannot delete" });
    }

    if (variety.image && variety.image.filename) {
      const imagePath = path.join(__dirname, "..", "uploads", "varieties", variety.image.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Variety.deleteOne({ _id: variety._id });
    res.json({ message: "Variety deleted" });
  } catch (err) {
    console.error("deleteVariety error:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};
