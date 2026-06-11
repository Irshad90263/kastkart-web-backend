// models/Product.js
import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const addOnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },

    variety: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variety",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    weightOptions: [
      {
        weight: { type: String, required: true },
        price: { type: Number, required: true },
      }
    ],

    discountPercent: { type: Number, default: 0, min: 0, max: 100 },

    mainImage: { type: imageSchema, required: true },
    galleryImages: [imageSchema],

    description: { type: String, default: "" },
    about: {
      ingredients: { type: String, default: "" },
      shelfLife: { type: String, default: "" },
      netWeight: { type: [String], default: [] },
      aboutHtml: { type: String, default: "" },
    },

    isActive: { type: Boolean, default: true },

    ratingsAverage: { type: Number, default: 0 },
    ratingsQuantity: { type: Number, default: 0 },

    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);


productSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") + "-" + Date.now();
  }
  
  if (!this.addOns || this.addOns.length === 0) {
    this.addOns = [{ name: "None", price: 0, isDefault: true }];
  } else {
    const hasDefault = this.addOns.some((a) => a.isDefault);
    if (!hasDefault) {
      this.addOns.unshift({ name: "None", price: 0, isDefault: true });
    }
  }

  next();
});

export default mongoose.model("Product", productSchema);
