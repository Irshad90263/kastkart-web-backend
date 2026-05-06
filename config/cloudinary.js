// config/cloudinary.js
// ==================== CLOUDINARY CODE (COMMENTED OUT) ====================
// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import dotenv from "dotenv";
// dotenv.config();

// if (
//   !process.env.CLOUDINARY_CLOUD_NAME ||
//   !process.env.CLOUDINARY_API_KEY ||
//   !process.env.CLOUDINARY_API_SECRET
// ) {
//   console.error("❌ Cloudinary env missing");
// }

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });
// ==================== END CLOUDINARY CODE ====================

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, "../uploads");
const productsDir = path.join(uploadsDir, "products");
const slidersDir = path.join(uploadsDir, "sliders");
const videosDir = path.join(uploadsDir, "videos");
const categoriesDir = path.join(uploadsDir, "categories");  // 🔥 ADD THIS LINE

[uploadsDir, productsDir, slidersDir, videosDir, categoriesDir].forEach(dir => {  // 🔥 ADD categoriesDir
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ==================== LOCAL STORAGE SETUP ====================

// CATEGORY IMAGE - Local Storage (🔥 ADD THIS NEW SECTION)
const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, categoriesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "cat-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const categoryMulter = multer({
  storage: categoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only JPEG, PNG, WebP allowed"), false);
  },
});

const uploadCategoryImage = categoryMulter.single("image");  // 🔥 "image" matches frontend field name

// PRODUCT IMAGES - Local Storage
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "product-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const productMulter = multer({
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type"), false);
  },
});

const uploadProductImages = productMulter.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "galleryImages", maxCount: 10 },
]);

// SLIDER IMAGE - Local Storage
const sliderStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, slidersDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "slider-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const sliderMulter = multer({
  storage: sliderStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type"), false);
  },
});

const uploadSliderImage = sliderMulter.single("image");

// VIDEO REVIEWS - Local Storage
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "video-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const videoMulter = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/mov", "video/webm", "video/mkv"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid video file type"), false);
  },
});

const uploadVideo = videoMulter.single("video");

// Dummy cloudinary object for compatibility
const cloudinary = {
  uploader: {
    destroy: async (publicId) => {
      // Local file deletion will be handled in controllers
      console.log("Cloudinary disabled - file deletion handled locally");
      return { result: "ok" };
    },
  },
};

export {
  cloudinary,
  uploadProductImages,
  uploadSliderImage,
  uploadVideo,
  uploadCategoryImage,  // 🔥 ADD THIS EXPORT
};