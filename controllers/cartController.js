// controllers/cartController.js
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// Get Cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user.sub;

    const cartAgg = await Cart.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },

      { $unwind: "$items" },

      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product"
        }
      },

      { $unwind: "$product" },

      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          items: {
            $push: {
              product: "$product",
              quantity: "$items.quantity"
            }
          },
          totalAmount: {
            $sum: {
              $multiply: ["$product.finalPrice", "$items.quantity"]
            }
          },
          totalItems: {
            $sum: "$items.quantity"
          }
        }
      }
    ]);

    if (!cartAgg.length) {
      return res.json({ cart: { items: [], totalAmount: 0, totalItems: 0 } });
    }

    // persist totalAmount safely
    await Cart.updateOne(
      { _id: cartAgg[0]._id },
      {
        totalAmount: cartAgg[0].totalAmount,
        totalItems: cartAgg[0].totalItems
      }
    );

    res.json({ cart: cartAgg[0] });
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};




// Add to Cart
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1} = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found or inactive" });
    }

    let cart = await Cart.findOne({ user: req.user.sub });
    if (!cart) {
      cart = await Cart.create({ user: req.user.sub, items: [] });
    }

    // Check if item already exists with same variant
    const existingItemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate("items.product");

    res.json({ message: "Item added to cart", cart });
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Cart Item
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params; // cartItemId
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    const cart = await Cart.findOne({ user: req.user.sub });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // ✅ cartItemId se find karo
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    item.quantity = quantity;
    await cart.save();

    res.json({ message: "Cart updated", cart });
  } catch (err) {
    console.error("updateCartItem error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Remove from Cart
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.sub });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items.pull(itemId);
    await cart.save();
    await cart.populate("items.product");

    res.json({ message: "Item removed from cart", cart });
  } catch (err) {
    console.error("removeFromCart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Clear Cart
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.sub });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    cart.totalItems = 0;
    cart.totalAmount = 0;
    await cart.save();

    res.json({ message: "Cart cleared", cart });
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Cart Total for Payment
export const getCartTotal = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.sub })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({ message: "Cart is empty" });
    }

    let totalAmount = 0;

    const validItems = cart.items.filter(item => {
      if (!item.product || !item.product.isActive) return false;

      totalAmount += item.product.finalPrice * item.quantity;
      return true;
    });

    res.json({
      totalAmount,
      totalItems: validItems.reduce((sum, i) => sum + i.quantity, 0),
      items: validItems
    });
  } catch (err) {
    console.error("getCartTotal error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
