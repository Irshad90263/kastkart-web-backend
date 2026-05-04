import express from "express";
import {
  addVideo,
  getAllVideos,
  getSingleVideo,
  deleteVideo,
} from "../controllers/videoController.js";
import { uploadVideo } from "../config/cloudinary.js";

const router = express.Router();

router.post("/add", uploadVideo, addVideo);
router.get("/", getAllVideos);
router.get("/:id", getSingleVideo);
router.delete("/:id", deleteVideo);

export default router;
