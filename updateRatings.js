import mongoose from "mongoose";
import dotenv from "dotenv";
import Review from "./models/Review.js";
import Product from "./models/Product.js";

dotenv.config();

const updateAllRatings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const products = await Product.find({}, '_id');
    console.log(`Found ${products.length} products. Updating ratings...`);

    let count = 0;
    for (const product of products) {
      const stats = await Review.aggregate([
        { $match: { product: product._id } },
        { $group: {
            _id: "$product",
            nRating: { $sum: 1 },
            avgRating: { $avg: "$rating" }
          }
        }
      ]);

      if (stats.length > 0) {
        await Product.findByIdAndUpdate(product._id, {
          ratingsQuantity: stats[0].nRating,
          ratingsAverage: stats[0].avgRating
        });
        count++;
      } else {
        await Product.findByIdAndUpdate(product._id, {
          ratingsQuantity: 0,
          ratingsAverage: 0
        });
      }
    }
    console.log(`Finished updating ratings. ${count} products have reviews.`);
    process.exit(0);
  } catch (error) {
    console.error("Error updating ratings:", error);
    process.exit(1);
  }
};

updateAllRatings();
