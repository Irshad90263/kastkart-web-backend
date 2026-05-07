import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    // 1. Grower / Producer / Seller
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    photo: {
      url: { type: String, default: "" },
      publicId: { type: String, required: true },
    },

    // 2. Residential Address
    residentialAddress: {
      address: {
        type: String,
        trim: true,
        default: "",
      },

      pincode: {
        type: String,
        trim: true,
        match: [/^[0-9]{6}$/, "Invalid pincode"],
        default: "",
      },
    },

    // 3. Orchard / Farm Address
    orchardAddress: {
      address: {
        type: String,
        trim: true,
        default: "",
      },

      pincode: {
        type: String,
        trim: true,
        match: [/^[0-9]{6}$/, "Invalid pincode"],
        default: "",
      },
    },

    // 4. Farming Experience
    farmingExperience: {
      years: {
        type: Number,
        min: 0,
        default: 0,
      },
    },

    // 5. Total Area of Cultivation
    totalAreaOfCultivation: {
      type: Number,
      min: 0,
      default: 0,
    },

    // 6. Expected Quantity
    expectedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    // 7. Mango Varieties
    mangoVarietiesGrown: [
      {
        type: String,
        trim: true,
      },
    ],

    // 8. Farming Practices
    farmingPractices: {
      type: {
        type: String,
        enum: ["organic", "chemical", "both"],
        default: "chemical",
      },

      // Organic Details
      organicDetails: {
        methodsUsed: {
          type: String,
          trim: true,
          default: "",
        },

        certification: {
          type: String,
          trim: true,
          default: "",
        },
      },

      // Chemical Details
      chemicalDetails: {
        pesticidesFertilizersUsed: {
          type: String,
          trim: true,
          default: "",
        },
      },
    },

    // 10. Harvesting & Post-Harvest Practices
    harvestingPractices: {
      type: String,
      trim: true,
      default: "",
    },

    // 11. Social Media / Online Presence
    socialMedia: {
      facebook: {
        type: String,
        trim: true,
        default: "",
      },

      instagram: {
        type: String,
        trim: true,
        default: "",
      },

      website: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // 12. Contact Details
    contactDetails: {
      phoneNumber: {
        type: String,
        trim: true,
        match: [/^[6-9]\d{9}$/, "Invalid phone number"],
        required: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
        match: [
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          "Invalid email address",
        ],
      },
    },

    // 13. Vendor Designation
    vendorDesignation: {
      type: String,
      trim: true,
      default: "",
    },

    // 14. Orchard Images
    orchardImages: [
      {
        url: { type: String },
        publicId: { type: String, required: true },
      },
    ],

    // Signature
    growerSignature: {
      url: { type: String, default: "" },
      publicId: { type: String, required: true },
    },

    signedDate: {
      type: Date,
      default: null,
    },

    // Optional metadata
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound Indexes
vendorSchema.index({
  name: 1,
  "contactDetails.phoneNumber": 1,
});

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;