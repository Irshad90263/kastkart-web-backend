import Video from "../models/video.js";
import { cloudinary } from "../config/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  ADD VIDEO
export const addVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Video file required" });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const video = await Video.create({
      url: `${baseUrl}/uploads/videos/${req.file.filename}`,
      publicId: req.file.filename,
    });

    res.status(201).json({
      message: "Video uploaded successfully",
      video,
    });
  } catch (err) {
    console.error("addVideo error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  GET ALL VIDEOS
export const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json({ videos });
  } catch (err) {
    console.error("getAllVideos error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  GET SINGLE VIDEO
export const getSingleVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json({ video });
  } catch (err) {
    console.error("getSingleVideo error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  DELETE VIDEO
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Delete local file
    const filePath = path.join(__dirname, "../", video.url.replace(process.env.BASE_URL || 'http://localhost:5000', ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // await cloudinary.uploader.destroy(video.publicId, {
    //   resource_type: "video",
    // });

    await video.deleteOne();

    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    console.error("deleteVideo error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
