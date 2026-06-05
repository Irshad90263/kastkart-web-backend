// config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is missing");

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      autoIndex: true,
    });
    console.log("✅ MongoDB connected");

    // Run migration
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: "categories" }).toArray();
    if (collections.length > 0) {
      const categoriesColl = db.collection("categories");
      const legacyDocsCount = await categoriesColl.countDocuments({
        $or: [{ slug: { $exists: true } }, { isActive: { $exists: true } }]
      });

      if (legacyDocsCount > 0) {
        const targetCollections = await db.listCollections({ name: "varieties" }).toArray();
        if (targetCollections.length > 0) {
          console.log("⚡ Database Migration: Both 'categories' and 'varieties' collections exist. Merging...");
          const varietiesColl = db.collection("varieties");
          const docs = await categoriesColl.find({
            $or: [{ slug: { $exists: true } }, { isActive: { $exists: true } }]
          }).toArray();
          if (docs.length > 0) {
            try {
              await varietiesColl.insertMany(docs, { ordered: false });
            } catch (insertErr) {
              // Ignore duplicate key errors (code 11000)
              console.log("⚡ Database Migration: Merged legacy categories documents (duplicates ignored)");
            }
          }
          await categoriesColl.deleteMany({
            $or: [{ slug: { $exists: true } }, { isActive: { $exists: true } }]
          });
          console.log("⚡ Database Migration: Cleaned up legacy documents from 'categories' collection");
        } else {
          await db.renameCollection("categories", "varieties");
          console.log("⚡ Database Migration: Renamed legacy 'categories' collection to 'varieties'");
        }
      } else {
        console.log("⚡ Database Migration: 'categories' contains no legacy documents. Skipping migration.");
      }
    }

    // Recovery: Move mistakenly migrated new Categories from varieties back to categories
    const varietiesCheck = await db.listCollections({ name: "varieties" }).toArray();
    if (varietiesCheck.length > 0) {
      const varietiesColl = db.collection("varieties");
      const categoriesColl = db.collection("categories");
      const mistakenCategories = await varietiesColl.find({
        category: { $exists: false }
      }).toArray();
      
      if (mistakenCategories.length > 0) {
        console.log(`⚡ Database Recovery: Found ${mistakenCategories.length} categories mistakenly migrated to varieties. Restoring...`);
        try {
          await categoriesColl.insertMany(mistakenCategories, { ordered: false });
        } catch (insertErr) {
          // Ignore duplicate key errors
        }
        
        const mistakenIds = mistakenCategories.map(c => c._id);
        const deleteResult = await varietiesColl.deleteMany({ _id: { $in: mistakenIds } });
        console.log(`⚡ Database Recovery: Restored and deleted ${deleteResult.deletedCount} mistaken category documents from varieties`);
      }
    }

    const productsColl = db.collection("products");
    const updateResult = await productsColl.updateMany(
      { category: { $exists: true }, variety: { $exists: false } },
      { $rename: { category: "variety" } }
    );
    if (updateResult.modifiedCount > 0) {
      console.log(`⚡ Database Migration: Renamed 'category' field in ${updateResult.modifiedCount} products`);
    }

    // New Migration: Backfill category from variety for existing products
    const productsWithoutCategory = await productsColl.find({ category: { $exists: false } }).toArray();
    if (productsWithoutCategory.length > 0) {
      console.log(`⚡ Database Migration: Backfilling category for ${productsWithoutCategory.length} products...`);
      const varietiesColl = db.collection("varieties");
      let backfilledCount = 0;
      for (const product of productsWithoutCategory) {
        if (product.variety) {
          const variety = await varietiesColl.findOne({ _id: product.variety });
          if (variety && variety.category) {
            await productsColl.updateOne(
              { _id: product._id },
              { $set: { category: variety.category } }
            );
            backfilledCount++;
          }
        }
      }
      console.log(`⚡ Database Migration: Backfilled category for ${backfilledCount} products`);
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
