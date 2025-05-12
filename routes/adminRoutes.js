// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const staticAdminMiddleware = require("../middleware/staticAdminMiddleware");

// Apply the static admin middleware to all admin routes
router.use(staticAdminMiddleware);

// Get Admin Statistics - ONLY total users now
router.get("/stats", async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ totalUsers }); // Simplified stats
  } catch (err) {
    next(err);
  }
});

// Get Users with Filtering and Pagination
router.get("/users", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9; // Default limit (e.g., 9 for 3x3 grid)
    const filterType = req.query.filter || "recent"; // 'recent', 'week', 'month'
    const skip = (page - 1) * limit;

    let query = {};
    let sort = { createdAt: -1 }; // Default sort for recent

    // Date calculations
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (filterType === "week") {
      query.createdAt = { $gte: oneWeekAgo };
    } else if (filterType === "month") {
      query.createdAt = { $gte: firstDayOfMonth };
    } else {
      // 'recent' uses default sort, no date filter needed here
    }

    // Count total users matching the filter
    const totalUsers = await User.countDocuments(query);

    // Get paginated users matching the filter
    const users = await User.find(query).sort(sort).skip(skip).limit(limit);

    res.json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      limit,
      filter: filterType,
    });
  } catch (err) {
    next(err);
  }
});

// Add an Offline User (Admin can manually create a user)
router.post("/users", async (req, res, next) => {
  try {
    // Extract required fields from request body
    const {
      name,
      email,
      password,
      mobileNumber,
      gender,
      dateOfBirth,
      city,
      state,
      country,
      maritalStatus,
      religion,
      motherTongue,
      educationLevel,
      occupation,
      annualIncome,
    } = req.body;

    // Validate essential fields
    if (
      !name ||
      !email ||
      !password ||
      !mobileNumber ||
      !gender ||
      !dateOfBirth ||
      !city ||
      !state
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        required: [
          "name",
          "email",
          "password",
          "mobileNumber",
          "gender",
          "dateOfBirth",
          "city",
          "state",
        ],
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user)
      return res
        .status(400)
        .json({ message: "User with this email already exists" });

    // Check if mobile number is already registered
    user = await User.findOne({ mobileNumber });
    if (user)
      return res
        .status(400)
        .json({ message: "User with this mobile number already exists" });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with all fields
    user = new User({
      name,
      email,
      password: hashedPassword,
      mobileNumber,
      gender,
      dateOfBirth,
      city,
      state,
      country: country || "India", // Default to India if not provided
      maritalStatus,
      religion,
      motherTongue,
      educationLevel,
      occupation,
      annualIncome,
      role: "user", // Default role
      isVerified: true, // Admin-created users are verified by default
      isActive: true, // Admin-created users are active by default
    });

    await user.save();
    res.status(201).json({
      message: "User created successfully",
      user,
      success: true,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }
    next(err);
  }
});

// Delete a User by ID
router.delete("/users/:id", async (req, res, next) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully", deletedUser });
  } catch (err) {
    next(err);
  }
});

// GET a Single User's Details by ID (for Admin)
router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id); // Fetch all details, including password hash initially

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert to plain object to manipulate before sending
    const userObject = user.toObject();
    // Remove password before sending response
    delete userObject.password;

    res.json({ success: true, user: userObject });
  } catch (err) {
    console.error("Error fetching user details:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    next(err);
  }
});

module.exports = router;
