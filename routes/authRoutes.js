// routes/authRoutes.js
const express = require("express");
const router = express.Router();
// const bcrypt = require("bcrypt"); // bcrypt is handled by the model's pre-save hook now
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator"); // Re-added 'body' for login validation
const multer = require("multer"); // Import multer
const path = require("path"); // To handle file paths
const fs = require("fs"); // To ensure upload directory exists

const User = require("../models/User");
const handleValidationError = require("../middleware/handleValidationError"); // Assuming a helper for formatting Mongoose errors

// --- Multer Configuration for Profile Pictures ---
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/profile-pictures");
    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Create a unique filename: fieldname-timestamp.extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

const uploadProfilePic = multer({
  storage: profilePicStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("profileImage"); // Field name expected from the frontend
// ---------------------------------------------

// Registration Endpoint - Updated for comprehensive fields AND file upload
router.post(
  "/register",
  // 1. Apply Multer middleware first to handle potential file upload
  (req, res, next) => {
    uploadProfilePic(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading (e.g., file size limit)
        let message = "File upload error.";
        if (err.code === "LIMIT_FILE_SIZE") {
          message = "Image size cannot exceed 5MB.";
        }
        return res
          .status(400)
          .json({
            success: false,
            message: message,
            errors: { profileImage: message },
          });
      } else if (err) {
        // An unknown error occurred when uploading (e.g., wrong file type)
        return res
          .status(400)
          .json({
            success: false,
            message: err.message || "Invalid file type.",
            errors: { profileImage: err.message || "Invalid file type." },
          });
      }
      // Everything went fine with multer, proceed to next middleware/handler
      next();
    });
  },
  // 2. Now handle the rest of the registration logic
  async (req, res, next) => {
    try {
      // File info is in req.file (if uploaded), text fields are in req.body
      // console.log("Registration Body:", req.body);
      // console.log("Registration File:", req.file);

      const {
        email,
        password,
        mobileNumber,
        name,
        gender,
        dateOfBirth,
        heightCm,
        weightKg,
        maritalStatus,
        motherTongue,
        physicalStatus,
        bodyType,
        complexion,
        profileCreatedBy,
        city,
        state,
        country,
        religion,
        caste,
        subCaste,
        gothra,
        manglik,
        educationLevel,
        educationField,
        occupation,
        annualIncome,
        fatherStatus,
        motherStatus,
        numberOfSiblings,
        siblingsMarried,
        familyType,
        familyValues,
        diet,
        smokingHabits,
        drinkingHabits,
        bio,
      } = req.body;

      // Basic check for essential fields (Email, Password, Mobile, Name, Gender, DOB, City, State, Country)
      if (
        !email ||
        !password ||
        !mobileNumber ||
        !name ||
        !gender ||
        !dateOfBirth ||
        !city ||
        !state ||
        !country
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing essential registration fields.",
        });
      }

      // Check if user exists by email or mobile
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { mobileNumber }],
      });
      if (existingUser) {
        let message = "User already exists.";
        if (existingUser.email === email.toLowerCase()) {
          message = "An account with this email already exists.";
        } else if (existingUser.mobileNumber === mobileNumber) {
          message = "An account with this mobile number already exists.";
        }
        // Important: If an image was uploaded but user exists, we should delete the uploaded file
        if (req.file) {
          fs.unlink(req.file.path, (unlinkErr) => {
            if (unlinkErr)
              console.error("Error deleting orphaned upload:", unlinkErr);
          });
        }
        return res.status(400).json({ success: false, message });
      }

      // Create new user instance
      const newUser = new User({
        email: email.toLowerCase(),
        password, // Hashed by pre-save hook
        mobileNumber,
        name,
        gender,
        dateOfBirth,
        heightCm,
        weightKg,
        maritalStatus,
        motherTongue,
        physicalStatus,
        bodyType,
        complexion,
        profileCreatedBy,
        city,
        state,
        country,
        religion,
        caste,
        subCaste,
        gothra,
        manglik,
        educationLevel,
        educationField,
        occupation,
        annualIncome,
        fatherStatus,
        motherStatus,
        numberOfSiblings,
        siblingsMarried,
        familyType,
        familyValues,
        diet,
        smokingHabits,
        drinkingHabits,
        bio,
      });

      // Add profile picture path if uploaded
      if (req.file) {
        // Store the path relative to the server root or a base URL
        // Example: store '/uploads/profile-pictures/profileImage-1678886400000-123456789.jpg'
        const relativePath = path
          .join("/uploads/profile-pictures", req.file.filename)
          .replace(/\\/g, "/");
        newUser.profilePicture = relativePath;
      }

      // Save the user
      const savedUser = await newUser.save();

      // Prepare response
      const userForResponse = savedUser.toObject();
      delete userForResponse.password;

      // Issue JWT token
      const payload = { userId: savedUser._id, role: savedUser.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      });

      res.status(201).json({ success: true, token, user: userForResponse });
    } catch (err) {
      // If save fails (e.g., validation error) and a file was uploaded, delete the file
      if (req.file && err.name === "ValidationError") {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr)
            console.error(
              "Error deleting file after validation failure:",
              unlinkErr
            );
        });
      }
      // Handle potential Mongoose validation errors
      if (err.name === "ValidationError") {
        return handleValidationError(err, res);
      }
      // Handle other errors
      console.error("Registration Error:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error during registration." });
    }
  }
);

// Login Endpoint - Updated to use comparePassword method and select password
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      const { email, password } = req.body;

      // Find user by email and explicitly select the password
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password"
      );

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password." }); // Use 401 for auth errors
      }

      // Use the comparePassword method from the User model
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password." });
      }

      // Check if user is active (optional)
      // if (!user.isActive) {
      //   return res.status(403).json({ success: false, message: 'Account is deactivated.' });
      // }

      // Issue JWT token
      const payload = { userId: user._id, role: user.role }; // Include role
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      });

      // Prepare user object for response (without password)
      const userForResponse = user.toObject();
      delete userForResponse.password;

      res.json({ success: true, token, user: userForResponse });
    } catch (err) {
      console.error("Login Error:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error during login." });
      // next(err);
    }
  }
);

module.exports = router;
