// controllers/productController.js
import Product from "../models/Product.js";
import Variety from "../models/Variety.js";
import Category from "../models/Category.js";
import { cloudinary } from "../config/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseMaybeJSON = (value, fallback) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return fallback;
  }
};

// CREATE
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      discountPercent,
      description,
      about,
      categoryId,
      varietyId,
      vendor_id,
    } = req.body;

    if (!name || !price || !varietyId || !categoryId) {
      return res
        .status(400)
        .json({ message: "name, price, varietyId, and categoryId are required" });
    }

    const variety = await Variety.findById(varietyId);
    if (!variety) {
      return res.status(400).json({ message: "Invalid varietyId" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ message: "Invalid categoryId" });
    }

    if (!req.files || !req.files.mainImage || !req.files.mainImage[0]) {
      return res.status(400).json({ message: "mainImage is required" });
    }

    const mainImageFile = req.files.mainImage[0];
    const galleryFiles = req.files.galleryImages || [];

    // Local file paths with BASE_URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const mainImageUrl = `${baseUrl}/uploads/products/${mainImageFile.filename}`;
    const galleryImages = galleryFiles.map((file) => ({
      url: `${baseUrl}/uploads/products/${file.filename}`,
      publicId: file.filename,
    }));

    const parsedAbout = parseMaybeJSON(about, {});

    const product = await Product.create({
      name,
      variety: variety._id,
      category: category._id,
      price: Number(price),
      discountPercent: Number(discountPercent || 0),
      mainImage: {
        url: mainImageUrl,
        publicId: mainImageFile.filename,
      },
      vendor_id,
      galleryImages,
      description,
      about: {
        ingredients: parsedAbout.ingredients || "",
        shelfLife: parsedAbout.shelfLife || "",
        netWeight: parsedAbout.netWeight || "",
      },
    });

    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error("createProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// LIST
export const listProducts = async (req, res) => {
  try {
    const { status, sort = "", minPrice, maxPrice, page = 1, limit = 10, search, categoryId, varietyId } = req.query;

    let filter = {};

    // Status filter
    if (status === 'active') filter = { isActive: true };
    else if (status === 'inactive') filter = { isActive: false };

    // Variety/Category filter mapping
    if (varietyId) {
      filter.variety = varietyId;
    } else if (categoryId) {
      const isVariety = await Variety.exists({ _id: categoryId });
      if (isVariety) {
        filter.variety = categoryId;
      } else {
        filter.category = categoryId;
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Price filter based on finalPrice
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.finalPrice = {};
      if (minPrice) filter.finalPrice.$gte = Number(minPrice);
      if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOption = { createdAt: -1 };

    if (sort === "price_asc") {
      sortOption = { finalPrice: 1 };
    } else if (sort === "price_desc") {
      sortOption = { finalPrice: -1 };
    } else if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "name_asc") {
      sortOption = { name: 1 };
    } else if (sort === "name_desc") {
      sortOption = { name: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate("variety", "name slug")
      .populate("category", "name")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      },
      filters: {
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        sort
      }
    });
  } catch (err) {
    console.error("listProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ONE
export const getProduct = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let product =
      (await Product.findOne({ slug: idOrSlug }).populate("variety", "name slug").populate("category", "name")) ||
      (await Product.findById(idOrSlug).populate("variety", "name slug").populate("category", "name"));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  } catch (err) {
    console.error("getProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// category/variety wise 
export const listProductsByCategory = async (req, res) => {
  try {
    let { idOrSlug } = req.params;
    const { sort = "", minPrice, maxPrice } = req.query;

    // Check if idOrSlug matches a Category (by slug or ObjectId)
    let categoryDoc = await Category.findOne({ slug: idOrSlug });
    if (!categoryDoc && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      categoryDoc = await Category.findById(idOrSlug);
    }

    // Build filter
    let filter = { isActive: true };
    let varietyIds = [];

    if (categoryDoc) {
      filter.category = categoryDoc._id;
    } else {
      // 🔥 Multiple varieties handle
      if (idOrSlug.includes(',')) {
        const slugsOrIds = idOrSlug.split(',');

        for (const item of slugsOrIds) {
          let cat = await Variety.findOne({ slug: item });
          if (!cat && item.match(/^[0-9a-fA-F]{24}$/)) {
            cat = await Variety.findById(item);
          }
          if (cat) varietyIds.push(cat._id);
        }
      } else {
        let category = await Variety.findOne({ slug: idOrSlug });
        if (!category && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
          category = await Variety.findById(idOrSlug);
        }
        if (!category) {
          return res.status(404).json({ message: "Variety or Category not found" });
        }
        varietyIds = [category._id];
      }

      if (varietyIds.length === 0) {
        return res.status(404).json({ message: "No valid varieties found" });
      }

      filter.variety = { $in: varietyIds };
    }

    // Price filter based on finalPrice
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.finalPrice = {};
      if (minPrice) filter.finalPrice.$gte = Number(minPrice);
      if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
    }

    // SORTING
    let sortOption = {};
    if (sort === "price_asc") {
      sortOption = { finalPrice: 1 };
    } else if (sort === "price_desc") {
      sortOption = { finalPrice: -1 };
    } else if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "name_asc") {
      sortOption = { name: 1 };
    } else if (sort === "name_desc") {
      sortOption = { name: -1 };
    }

    const products = await Product.find(filter)
      .populate("variety")
      .populate("category")
      .sort(sortOption);

    // Get varieties info for response
    let varieties = [];
    if (categoryDoc) {
      varieties = await Variety.find({ category: categoryDoc._id });
    } else {
      varieties = await Variety.find({ _id: { $in: varietyIds } });
    }

    res.json({
      categories: varieties.map(cat => ({
        id: cat._id,
        name: cat.name,
        slug: cat.slug
      })),
      varieties: varieties.map(cat => ({
        id: cat._id,
        name: cat.name,
        slug: cat.slug
      })),
      products,
      filters: {
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        sort
      }
    });
  } catch (err) {
    console.error("listProductsByCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// UPDATE
export const updateProduct = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let product =
      (await Product.findOne({ slug: idOrSlug })) ||
      (await Product.findById(idOrSlug));

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      name,
      price,
      discountPercent,
      description,
      about,
      categoryId,
      varietyId,
      isActive,
      vendor_id,
    } = req.body;

    // name + slug
    if (name) {
      product.name = name;
      product.slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "") +
        "-" +
        Date.now();
    }

    if (price !== undefined) product.price = Number(price);
    if (discountPercent !== undefined) {
      product.discountPercent = Number(discountPercent);
    }

    // variety update
    if (varietyId) {
      const variety = await Variety.findById(varietyId);
      if (!variety) {
        return res.status(400).json({ message: "Invalid varietyId" });
      }
      product.variety = variety._id;
    }

    // category update
    if (categoryId) {
      const isVariety = await Variety.exists({ _id: categoryId });
      if (isVariety) {
        product.variety = categoryId;
      } else {
        const category = await Category.findById(categoryId);
        if (!category) {
          return res.status(400).json({ message: "Invalid categoryId" });
        }
        product.category = category._id;
      }
    }

    // vendor update
    if (vendor_id !== undefined) {
      product.vendor_id = vendor_id || null;
    }

    // description
    if (description !== undefined) {
      product.description = description;
    }

    // about (parse if multipart)
    if (about !== undefined) {
      const parsedAbout = parseMaybeJSON(about, {});
      product.about = {
        ingredients:
          parsedAbout.ingredients ?? product.about.ingredients ?? "",
        shelfLife:
          parsedAbout.shelfLife ?? product.about.shelfLife ?? "",
        netWeight:
          parsedAbout.netWeight ?? product.about.netWeight ?? "",
      };
    }

    // active status
    if (isActive !== undefined) {
      product.isActive = !!isActive;
    }

    // main image update
    if (req.files?.mainImage?.[0]) {
      // Delete old local file
      const oldFilePath = path.join(__dirname, "../", product.mainImage.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      const file = req.files.mainImage[0];
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      product.mainImage = {
        url: `${baseUrl}/uploads/products/${file.filename}`,
        publicId: file.filename,
      };
    }

    // gallery images update
    if (req.files?.galleryImages) {
      // Delete old local files
      for (let img of product.galleryImages) {
        const oldFilePath = path.join(__dirname, "../", img.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      product.galleryImages = req.files.galleryImages.map((file) => ({
        url: `${baseUrl}/uploads/products/${file.filename}`,
        publicId: file.filename,
      }));
    }

    await product.save();

    res.json({ message: "Product updated", product });
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// TOGGLE STATUS
export const toggleProductStatus = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let product =
      (await Product.findOne({ slug: idOrSlug })) ||
      (await Product.findById(idOrSlug));

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      message: `Product ${product.isActive ? "activated" : "deactivated"} successfully`,
      product
    });
  } catch (err) {
    console.error("toggleProductStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE
export const deleteProduct = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let product =
      (await Product.findOne({ slug: idOrSlug })) ||
      (await Product.findById(idOrSlug));
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete local files
    const mainImagePath = path.join(__dirname, "../", product.mainImage.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
    if (fs.existsSync(mainImagePath)) {
      fs.unlinkSync(mainImagePath);
    }

    for (let img of product.galleryImages) {
      const imgPath = path.join(__dirname, "../", img.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await Product.deleteOne({ _id: product._id });
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


