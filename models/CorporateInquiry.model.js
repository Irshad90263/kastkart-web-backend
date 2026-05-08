import mongoose from "mongoose";

const corporateInquirySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    occasion: {
      type: String,
      trim: true,
    },
    customBranding: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "in-negotiation", "closed", "cancelled"],
      default: "new",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CorporateInquiry", corporateInquirySchema);
