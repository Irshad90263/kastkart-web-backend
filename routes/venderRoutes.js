import express from "express";
import {
  createVendor,
  deleteVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  getVendorList,
} from "../controllers/vender.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadVendorImages } from "../config/cloudinary.js";

const router = express.Router();

router.route("/")
  .post(requireAuth, uploadVendorImages, createVendor)
  .get(requireAuth, getAllVendors);

router.get("/vendorlist", requireAuth, getVendorList);

router.route("/:id")
  .get(requireAuth, getVendorById)
  .put(requireAuth, uploadVendorImages, updateVendor)
  .delete(requireAuth, deleteVendor);

export default router;
