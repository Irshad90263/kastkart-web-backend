import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const paymentMethodModel = mongoose.model("PaymentMethod", paymentMethodSchema);

export default paymentMethodModel;
