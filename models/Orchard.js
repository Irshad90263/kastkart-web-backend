import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const orchardSchema = new mongoose.Schema(
  {
    image: { type: imageSchema, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);


export default mongoose.model("Orchard", orchardSchema);
