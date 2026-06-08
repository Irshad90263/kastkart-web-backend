import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import Product from "../models/Product.js";

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    const product = await Product.findOne().sort({ updatedAt: -1 });
    if (product) {
      const output = `Product Name: ${product.name}\n\nAbout Block:\n${JSON.stringify(product.about, null, 2)}`;
      fs.writeFileSync("scratch/product_out.txt", output);
      console.log("Written to scratch/product_out.txt");
    } else {
      fs.writeFileSync("scratch/product_out.txt", "No product found");
      console.log("No product found");
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
run();
