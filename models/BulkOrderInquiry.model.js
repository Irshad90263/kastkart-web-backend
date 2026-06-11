import mongoose from "mongoose";

const bulkOrderInquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    emailId: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryCityState: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    typeOfBuyer: {
      type: String,
      required: true,
    },
    preferredMangoVariety: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variety",
      },
    ],
    requiredQuantity: {
      type: String,
      required: true,
      trim: true,
    },
    packagingPreference: {
      type: String,
      required: true,
      trim: true,
    },
    exactDeliveryAddress: {
      type: String,
      required: true,
    },
    expectedDeliveryDate: {
      type: String,
      required: true,
    },
    frequencyOfOrder: {
      type: String,
      required: true,
      trim: true,
    },
    specialRequirements: {
      type: String,
      trim: true,
    },
    consent: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const BulkOrderInquiry = mongoose.model("BulkOrderInquiry", bulkOrderInquirySchema);

export default BulkOrderInquiry;
