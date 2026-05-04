// controllers/userController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { sendOtpSms } from "../services/sendSms.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

const signJwt = (user) =>
  jwt.sign(
    { sub: String(user._id), email: user.email, tv: user.tokenVersion },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


// Register User
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, gender } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Check email exists
    const emailExists = await User.findOne({ email }).lean();
    if (emailExists) {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    // Check phone exists
    const phoneExists = await User.findOne({ phone }).lean();
    if (phoneExists) {
      return res.status(409).json({
        message: "User already exists with this phone number please login",
      });
    }

    // let generateOtp = generateOTP();

    // Create user directly (no password, no token)
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      // OTP: generateOtp,
      gender,
    });

    // const SendOtp = sendOtpSms(phone, generateOtp)


    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
      },
    });
  } catch (err) {
    console.error("registerUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// Login User
export const loginUser = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const user = await User.findOne({ phone }).select("+tokenVersion");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // -------------------------
    // CASE 1️⃣ : ONLY PHONE
    // -------------------------
    if (!otp) {
      const generatedOtp = generateOTP();

      user.OTP = generatedOtp;
      user.isOtpVerified = false;
      await user.save();

      await sendOtpSms(phone, generatedOtp);

      return res.status(200).json({
        message: "OTP sent successfully",
      });
    }

    // -------------------------
    // CASE 2️⃣ : PHONE + OTP
    // -------------------------
    if (user.OTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ OTP matched
    user.isOtpVerified = true;
    user.lastLogin = new Date();
    await user.save();

    // ✅ TOKEN GENERATE HERE
    const token = signJwt(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        gender: user.gender,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// Get Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const {
      // profile fields
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      preferences,
      profilePicture,

      // password fields
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;


    const user = await User.findById(req.user.sub).select("+password")
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // =========================
    //  PASSWORD UPDATE FLOW
    // =========================
    const isPasswordUpdate =
      currentPassword || newPassword || confirmPassword;

    if (isPasswordUpdate) {
      //  profile + password together not allowed
      if (
        firstName ||
        lastName ||
        phone ||
        dateOfBirth ||
        gender ||
        preferences ||
        profilePicture
      ) {
        return res.status(400).json({
          message: "Profile update and password update cannot be done together",
        });
      }

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          message: "Current, new and confirm password are required",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message: "New password and confirm password do not match",
        });
      }

      console.log(user.password)
      const isMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isMatch) {
        return res.status(401).json({
          message: "Current password is incorrect",
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      return res.json({
        message: "Password updated successfully",
      });
    }

    // =========================
    // 👤 PROFILE UPDATE FLOW
    // =========================
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    if (phone) {
      const phoneExists = await User.findOne({
        phone,
        _id: { $ne: user._id },
      }).lean();

      if (phoneExists) {
        return res.status(409).json({
          message: "Phone number already exists",
        });
      }
      user.phone = phone;
    }

    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (gender) user.gender = gender;
    if (profilePicture) user.profilePicture = profilePicture;

    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences,
      };
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get All Addresses
export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ addresses: user.addresses });
  } catch (err) {
    console.error("getAddresses error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add Address
export const addAddress = async (req, res) => {
  try {
    const { name, phone, addressLine1, addressLine2, city, state, pincode, addressType, isDefault } = req.body;

    if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({ message: "Required address fields missing" });
    }

    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push({
      name,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      addressType: addressType || "home",
      isDefault
    });
    await user.save();

    res.json({ message: "Address added", addresses: user.addresses });
  } catch (err) {
    console.error("addAddress error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Address
export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });

    if (updates.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, updates);
    await user.save();

    res.json({ message: "Address updated", addresses: user.addresses });
  } catch (err) {
    console.error("updateAddress error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Address
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user.sub);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.pull(addressId);
    await user.save();

    res.json({ message: "Address deleted", addresses: user.addresses });
  } catch (err) {
    console.error("deleteAddress error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// getallusers
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find({}, '-password -tokenVersion')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      users,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
}