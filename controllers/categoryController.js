// controllers/categoryController.js
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const exists = await Category.findOne({ name });
    if (exists) return res.status(409).json({ message: "Category exists" });

    // 🔥 Image handling - SIRF YEH 5 LINES ADD
    let imageData = null;
    if (req.file) {
      imageData = {
        url: `${process.env.BASE_URL}/uploads/categories/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    const category = await Category.create({ 
      name, 
      description,
      image: imageData  // 🔥 YEH LINE ADD
    });
    res.status(201).json({ message: "Category created", category });
  } catch (err) {
    console.error("createCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listCategories = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status === 'active') filter = { isActive: true };
    if (status === 'inactive') filter = { isActive: false };
    
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    console.error("listCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCategory = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const category =
      (await Category.findOne({ slug: idOrSlug })) ||
      (await Category.findById(idOrSlug));
    if (!category) return res.status(404).json({ message: "Not found" });
    res.json({ category });
  } catch (err) {
    console.error("getCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let category =
      (await Category.findOne({ slug: idOrSlug })) ||
      (await Category.findById(idOrSlug));
    if (!category) return res.status(404).json({ message: "Not found" });

    const { name, description, isActive, removeImage } = req.body; // 🔥 removeImage ADD

    if (name) {
      category.name = name;
      category.slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "") + "-" + Date.now();
    }
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = !!isActive;

    // 🔥 IMAGE HANDLING - SIRF YEH 15 LINES ADD
    if (removeImage === 'true' || removeImage === true) {
      // Delete old image file
      if (category.image && category.image.filename) {
        const oldImagePath = path.join(__dirname, "..", "uploads", "categories", category.image.filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      category.image = null;
    }
    
    if (req.file) {
      // Delete old image if exists
      if (category.image && category.image.filename) {
        const oldImagePath = path.join(__dirname, "..", "uploads", "categories", category.image.filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      // Add new image
      category.image = {
        url: `${process.env.BASE_URL}/uploads/categories/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    await category.save();
    res.json({ message: "Category updated", category });
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let category =
      (await Category.findOne({ slug: idOrSlug })) ||
      (await Category.findById(idOrSlug));
    if (!category) return res.status(404).json({ message: "Not found" });

    const productCount = await Product.countDocuments({
      category: category._id,
    });
    if (productCount > 0) {
      return res
        .status(400)
        .json({ message: "Category has products, cannot delete" });
    }

    // 🔥 DELETE IMAGE FILE - SIRF YEH 6 LINES ADD
    if (category.image && category.image.filename) {
      const imagePath = path.join(__dirname, "..", "uploads", "categories", category.image.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Category.deleteOne({ _id: category._id });
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("deleteCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};