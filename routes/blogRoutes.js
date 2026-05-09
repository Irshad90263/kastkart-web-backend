// routes/blogRoutes.js
import express from "express";
import {
  // Admin functions
  createBlog,
  getAllBlogs,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
  getBlogByIdAdmin,
  
  // Public functions
  getBlog,
  addComment
} from "../controllers/blogController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// PUBLIC ROUTES
router.get("/", getAllBlogs); // Get blogs with pagination
router.get("/:id", getBlog); // Get single blog by ID
router.post("/comment/:id", addComment); // Add comment to blog

// ADMIN ROUTES (Protected)
router.post("/admin", requireAuth, createBlog); // Create blog
router.get("/admin/all", requireAuth, getAllBlogs); // Get all blogs (admin)
router.get("/admin/:id", requireAuth, getBlogByIdAdmin); // Get single blog (admin)
router.put("/admin/:id", requireAuth, updateBlog); // Update blog
router.patch("/admin/status/:id", requireAuth, toggleBlogStatus); // Toggle status
router.delete("/admin/:id", requireAuth, deleteBlog); // Delete blog

export default router;