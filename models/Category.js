// models/Category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    image: {
      url: { type: String },
      filename: { type: String }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
