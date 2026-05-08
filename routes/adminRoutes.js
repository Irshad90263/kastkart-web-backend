// routes/adminRoutes.js
import express from "express";
import {
  createAdmin,
  loginAdmin,
  listAdmins,
  logoutAll,
  changePassword,
} from "../controllers/adminController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadBlogImage } from "../config/cloudinary.js";

const router = express.Router();

router.post("/create", createAdmin);
router.post("/login", loginAdmin);

// protected routes
router.post("/upload", requireAuth, uploadBlogImage, (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const url = `${req.protocol}://${req.get("host")}/uploads/blogs/${req.file.filename}`;
  res.json({ url });
});
router.get("/list", requireAuth, listAdmins);
router.post("/logout-all", requireAuth, logoutAll);
router.post("/change-password", requireAuth, changePassword);

export default router;
