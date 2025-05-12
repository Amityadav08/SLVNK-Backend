// routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/upload");

// --- Specific routes first (e.g., /me, /search) ---

// Get logged-in user profile
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// Update logged-in user profile
router.put("/me", authMiddleware, async (req, res, next) => {
  const {
    name,
    age,
    location,
    religion,
    education,
    occupation,
    motherTongue,
    maritalStatus,
    about,
  } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Update fields
    if (name !== undefined) user.name = name;
    if (age !== undefined) user.age = age;
    if (location !== undefined) user.location = location;
    if (religion !== undefined) user.religion = religion;
    if (education !== undefined) user.education = education;
    if (occupation !== undefined) user.occupation = occupation;
    if (motherTongue !== undefined) user.motherTongue = motherTongue;
    if (maritalStatus !== undefined) user.maritalStatus = maritalStatus;
    if (about !== undefined) user.about = about;

    const updatedUser = await user.save();
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse,
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    }
    next(err);
  }
});

// Upload profile picture for logged-in user OR specific user by admin
router.post(
  "/me/upload-picture",
  [authMiddleware, uploadMiddleware],
  async (req, res, next) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded or middleware error occurred." });
    }

    let targetUserId;
    const isAdminRequest = req.header("X-Admin-Request") === "true";

    if (isAdminRequest) {
      // Admin request: Get userId from request body
      targetUserId = req.body.userId;
      if (!targetUserId) {
        return res
          .status(400)
          .json({ message: "Admin upload request requires userId in body" });
      }
      console.log(`Admin upload request for user ID: ${targetUserId}`);
    } else {
      // Standard user request: Get userId from JWT token (set by authMiddleware)
      if (!req.user || !req.user.userId) {
        // This case shouldn't happen if authMiddleware ran correctly for non-admin
        return res
          .status(401)
          .json({ message: "User ID not found in token for standard upload" });
      }
      targetUserId = req.user.userId;
      console.log(`Standard upload request for user ID: ${targetUserId}`);
    }

    const filePath = `/uploads/profile-pics/${req.file.filename}`;

    try {
      const user = await User.findByIdAndUpdate(
        targetUserId, // Use the determined target user ID
        { profilePicture: filePath },
        { new: true }
      ).select("-password");

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found for picture update" });
      }

      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        filePath: filePath,
        user: user,
      });
    } catch (err) {
      console.error("Error updating user profile picture in DB:", err);
      // Handle potential CastError if targetUserId format is wrong
      if (err.name === "CastError") {
        return res
          .status(400)
          .json({ message: "Invalid user ID format provided" });
      }
      next(err);
    }
  }
);

// Search profiles (requires auth, includes filtering and pagination)
router.get("/search", authMiddleware, async (req, res, next) => {
  try {
    const {
      gender,
      minAge,
      maxAge,
      location,
      religion,
      page = 1,
      limit = 10, // Default limit
    } = req.query;

    // Base filter: exclude the logged-in user
    const filter = { _id: { $ne: req.user.userId } };

    // Add query filters
    if (gender) filter.gender = gender;
    if (location) filter.location = { $regex: new RegExp(location, "i") }; // Case-insensitive search
    if (religion) filter.religion = { $regex: new RegExp(religion, "i") };
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = Number(minAge);
      if (maxAge) filter.age.$lte = Number(maxAge);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with filters and pagination
    const users = await User.find(filter)
      .select("-password") // Exclude password
      .limit(limitNum)
      .skip(skip)
      .sort({ createdAt: -1 }) // Optional: Sort by newest first
      .exec();

    // Get total count for pagination info
    const count = await User.countDocuments(filter);

    res.json({
      success: true,
      results: users, // Changed key to 'results' for consistency?
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (err) {
    console.error("Search error:", err);
    next(err);
  }
});

// --- Generic routes last (e.g., /:id) ---

// Get All Profiles (Public? - Simplified, no filtering here now)
router.get("/", async (req, res, next) => {
  // This route now just gets all profiles (paginated) without filters
  // Consider if authentication or different logic is needed here
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const profiles = await User.find({})
      .select("-password")
      .limit(limitNum)
      .skip(skip)
      .sort({ createdAt: -1 })
      .exec();

    const count = await User.countDocuments({});
    res.json({ count, profiles }); // Original response format
  } catch (err) {
    next(err);
  }
});

// Get Single Profile by ID (Public?)
router.get("/:id", authMiddleware, async (req, res, next) => {
  // This will now only match if it's not /me or /search
  try {
    const profile = await User.findById(req.params.id).select("-password");
    if (!profile) {
      // Return a success=false structure for consistency if preferred, or just 404
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }
    // Wrap the successful response as expected by the frontend
    res.json({ success: true, profile: profile });
  } catch (err) {
    // Handle CastError specifically if ID format is invalid
    if (err.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid profile ID format" });
    }
    // Pass other errors to the central error handler
    next(err);
  }
});

// Update Profile by ID (Protected - for admin or owner?)
// Keep this only if admin functionality is intended
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    // Add proper admin check or ensure this matches /me logic if only self-update allowed
    if (req.user.userId !== req.params.id /* && !req.user.isAdmin */) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    const updatedData = req.body;
    const updatedProfile = await User.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    ).select("-password");
    if (!updatedProfile)
      return res.status(404).json({ message: "Profile not found" });
    res.json(updatedProfile);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid profile ID format" });
    }
    next(err);
  }
});

module.exports = router;
