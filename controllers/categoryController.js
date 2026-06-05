// controllers/categoryController.js
import Category from "../models/Category.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new category
// @route   POST /api/product-categories
// @access  Private (Admin)
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const trimmedName = name.trim();

    // Check if category already exists (case-insensitive check)
    const exists = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, "i") } });
    if (exists) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(409).json({ message: "Category with this name already exists" });
    }

    let imageData = null;
    if (req.file) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      imageData = {
        url: `${baseUrl}/uploads/categories/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    const category = await Category.create({
      name: trimmedName,
      description: description ? description.trim() : "",
      image: imageData
    });

    res.status(201).json({ message: "Category created successfully", category });
  } catch (err) {
    console.error("createCategory error:", err);
    // Clean up uploaded file if save fails
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all categories
// @route   GET /api/product-categories
// @access  Public
export const listCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    console.error("listCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a single category by ID
// @route   GET /api/product-categories/:id
// @access  Public
export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ category });
  } catch (err) {
    console.error("getCategory error:", err);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid category ID" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a category by ID
// @route   PUT /api/product-categories/:id
// @access  Private (Admin)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, removeImage } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      // Clean up uploaded file if category not found
      if (req.file) {
        const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(404).json({ message: "Category not found" });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        // Clean up uploaded file
        if (req.file) {
          const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ message: "name cannot be empty" });
      }

      // Check if another category has the same name
      const exists = await Category.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        _id: { $ne: id }
      });
      if (exists) {
        // Clean up uploaded file
        if (req.file) {
          const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(409).json({ message: "Category with this name already exists" });
      }
      category.name = trimmedName;
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    // Image removal
    if (removeImage === 'true' || removeImage === true) {
      if (category.image && category.image.filename) {
        const oldImagePath = path.join(__dirname, "..", "uploads", "categories", category.image.filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      category.image = null;
    }

    // Image upload/replacement
    if (req.file) {
      if (category.image && category.image.filename) {
        const oldImagePath = path.join(__dirname, "..", "uploads", "categories", category.image.filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      category.image = {
        url: `${baseUrl}/uploads/categories/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    await category.save();
    res.json({ message: "Category updated successfully", category });
  } catch (err) {
    console.error("updateCategory error:", err);
    // Clean up uploaded file if update fails
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid category ID" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a category by ID
// @route   DELETE /api/product-categories/:id
// @access  Private (Admin)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Clean up local image file
    if (category.image && category.image.filename) {
      const imagePath = path.join(__dirname, "..", "uploads", "categories", category.image.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Category.deleteOne({ _id: id });
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("deleteCategory error:", err);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid category ID" });
    }
    res.status(500).json({ message: "Server error" });
  }
};
