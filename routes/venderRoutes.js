import express from "express";
import {
  createVendor,
  deleteVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
} from "../controllers/vender.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadVendorImages } from "../config/cloudinary.js";

const router = express.Router();

router.route("/")
  .post(requireAuth, uploadVendorImages, createVendor)
  .get(requireAuth, getAllVendors);

router.route("/:id")
  .get(requireAuth, getVendorById)
  .put(requireAuth, uploadVendorImages, updateVendor)
  .delete(requireAuth, deleteVendor);

export default router;
