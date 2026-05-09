// controllers/blogController.js
import Blog from "../models/Blog.js";

// ADMIN FUNCTIONS

// Create Blog (Admin)
export const createBlog = async (req, res) => {
  try {
    const { title, description, image, relatedBlog } = req.body;

    if (!title || !description || !image) {
      return res.status(400).json({ message: "Title, description, and image are required" });
    }

    const blog = await Blog.create({
      title,
      description,
      image,
      relatedBlog: Array.isArray(relatedBlog) ? relatedBlog : [],
    });

    res.status(201).json({ message: "Blog created successfully", blog });
  } catch (err) {
    console.error("createBlog error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Blogs (Admin/Public)
export const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, admin, search, status } = req.query;
    
    // Initial query logic
    let query = admin === "true" ? {} : { isActive: true };

    // Server-side Searching
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // Server-side Filtering by Status
    if (status && status !== "all") {
      query.isActive = status === "active";
    }

    const blogs = await Blog.find(query)
      .populate("relatedBlog", "title image")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(query);

    res.json({
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllBlogs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Blog (Admin)
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    // Apply updates
    Object.keys(updates).forEach((key) => {
      blog[key] = updates[key];
    });

    await blog.save(); // This will trigger the pre-save hook for slug

    res.json({ message: "Blog updated successfully", blog });
  } catch (err) {
    console.error("updateBlog error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Blog (Admin)
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    console.error("deleteBlog error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle Blog Status (Admin)
export const toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.isActive = !blog.isActive;
    await blog.save();

    res.json({ message: `Blog ${blog.isActive ? 'activated' : 'deactivated'} successfully`, blog });
  } catch (err) {
    console.error("toggleBlogStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUBLIC FUNCTIONS

// Get Single Blog (Public)
export const getBlog = async (req, res) => {
  try {
    const { id } = req.params; // This can be an ID or a Slug
    
    let blog;
    
    // Check if the provided param is a valid MongoDB ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(id)
        .populate("relatedBlog", "title image slug description createdAt")
        .select("-comments"); // Hide comments from public view
    } else {
      // If not an ID, search by slug
      blog = await Blog.findOne({ slug: id })
        .populate("relatedBlog", "title image slug description createdAt")
        .select("-comments"); // Hide comments from public view
    }

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.json({ blog });
  } catch (err) {
    console.error("getBlog error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add Comment to Blog (Public)
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, comment } = req.body;

    if (!user || !comment) {
      return res.status(400).json({ message: "User ID and comment are required" });
    }

    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.comments.push({ user, comment });
    await blog.save();

    res.status(201).json({ message: "Comment added successfully" });
  } catch (err) {
    console.error("addComment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Single Blog (Admin) - Detailed with comments
export const getBlogByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id)
      .populate("relatedBlog", "title image slug description createdAt")
      .populate("comments.user", "firstName lastName phone profilePicture");

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.json({ blog });
  } catch (err) {
    console.error("getBlogByIdAdmin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};