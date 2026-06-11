import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

// Helper to update product ratings
const updateProductRatings = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: {
        _id: "$product",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 0
    });
  }
};

// Check if user is eligible to review (ordered the product and hasn't reviewed yet)
export const checkEligibility = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.sub;

    // Check if user already reviewed
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      return res.status(200).json({ eligible: false, message: "You have already reviewed this product." });
    }

    // Check if user ordered this product and it wasn't completely cancelled
    const order = await Order.findOne({
      userId: userId,
      "items.product": productId,
      status: { $ne: "cancelled" }
    });

    console.log(`[checkEligibility] User: ${userId}, Product: ${productId}, Found Order:`, order ? order._id : 'None');

    if (order) {
      return res.status(200).json({ eligible: true });
    }

    return res.status(200).json({ eligible: false, message: "You can only review products you have purchased." });
  } catch (error) {
    console.error("Error in checkEligibility:", error);
    res.status(500).json({ message: "Server error checking eligibility." });
  }
};

// Add a new review
export const addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, remark } = req.body;
    const userId = req.user.sub;

    if (!rating || !remark) {
      return res.status(400).json({ message: "Please provide rating and remark." });
    }

    // Check eligibility again for security
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product." });
    }

    const order = await Order.findOne({
      userId: userId,
      "items.product": productId,
      status: { $ne: "cancelled" }
    });

    if (!order) {
      return res.status(403).json({ message: "You must purchase this product before reviewing." });
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      remark,
    });

    // Update Product Ratings
    await updateProductRatings(productId);

    res.status(201).json({ success: true, message: "Review submitted successfully", review });
  } catch (error) {
    console.error("Error in addReview:", error);
    res.status(500).json({ message: "Server error submitting review." });
  }
};

// Get reviews for a specific product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product: productId })
      .populate("user", "firstName lastName profilePicture")
      .sort("-createdAt");
    
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    console.error("Error in getProductReviews:", error);
    res.status(500).json({ message: "Server error fetching reviews." });
  }
};

// Admin: Get all reviews
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "firstName lastName email phone")
      .populate("product", "name mainImage")
      .sort("-createdAt");
    
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    console.error("Error in getAllReviews:", error);
    res.status(500).json({ message: "Server error fetching all reviews." });
  }
};

// Admin: Update a review
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, remark } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (rating) review.rating = rating;
    if (remark) review.remark = remark;

    await review.save();

    // Update Product Ratings
    await updateProductRatings(review.product);

    res.status(200).json({ success: true, message: "Review updated successfully", review });
  } catch (error) {
    console.error("Error in updateReview:", error);
    res.status(500).json({ message: "Server error updating review." });
  }
};

// Admin: Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Update Product Ratings
    await updateProductRatings(review.product);

    res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error in deleteReview:", error);
    res.status(500).json({ message: "Server error deleting review." });
  }
};
