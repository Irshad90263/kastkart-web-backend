import Orchard from "../models/Orchard.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CREATE
export const createOrchard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const { isActive } = req.body;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    
    const orchard = await Orchard.create({
      image: {
        url: `${baseUrl}/uploads/orchards/${req.file.filename}`,
        publicId: req.file.filename,
      },
      isActive: isActive !== undefined ? isActive === 'true' : true,
    });

    res.status(201).json({ message: "Orchard image added", orchard });
  } catch (err) {
    console.error("createOrchard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// LIST (Public & Admin) with Pagination & Filtering
export const listOrchards = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    let filter = {};
    
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    // If limit is provided, use pagination. Otherwise, return all.
    if (limit) {
      const skip = (parseInt(page || 1) - 1) * parseInt(limit);
      const totalCount = await Orchard.countDocuments(filter);
      const orchards = await Orchard.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      return res.json({ 
        orchards, 
        pagination: {
          total: totalCount,
          page: parseInt(page || 1),
          pages: Math.ceil(totalCount / parseInt(limit)),
          limit: parseInt(limit)
        }
      });
    }

    // No limit -> return all matching
    const orchards = await Orchard.find(filter).sort({ createdAt: -1 });
    res.json({ orchards });

  } catch (err) {
    console.error("listOrchards error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// TOGGLE STATUS
export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const orchard = await Orchard.findById(id);
    if (!orchard) return res.status(404).json({ message: "Orchard not found" });

    orchard.isActive = !orchard.isActive;
    await orchard.save();
    res.json({ message: "Status updated", orchard });
  } catch (err) {
    console.error("toggleStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE
export const deleteOrchard = async (req, res) => {
  try {
    const { id } = req.params;
    const orchard = await Orchard.findById(id);
    if (!orchard) return res.status(404).json({ message: "Orchard not found" });

    // Delete file
    const filePath = path.join(__dirname, "../", orchard.image.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Orchard.deleteOne({ _id: id });
    res.json({ message: "Orchard image deleted" });
  } catch (err) {
    console.error("deleteOrchard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
