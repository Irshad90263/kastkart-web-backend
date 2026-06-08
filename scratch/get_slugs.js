import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to DB");
    const products = await Product.find({}, "name slug _id");
    console.log(JSON.stringify(products, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
run();
