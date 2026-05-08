// routes/blogRoutes.js
import express from "express";
import {
  // Admin functions
  createBlog,
  getAllBlogs,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
  
  // Public functions
  getBlog
} from "../controllers/blogController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// PUBLIC ROUTES
router.get("/", getAllBlogs); // Get blogs with pagination
router.get("/:id", getBlog); // Get single blog by ID

// ADMIN ROUTES (Protected)
router.post("/admin", requireAuth, createBlog); // Create blog
router.get("/admin/all", requireAuth, getAllBlogs); // Get all blogs (admin)
router.put("/admin/:id", requireAuth, updateBlog); // Update blog
router.patch("/admin/status/:id", requireAuth, toggleBlogStatus); // Toggle status
router.delete("/admin/:id", requireAuth, deleteBlog); // Delete blog

export default router;