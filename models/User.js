// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Import bcrypt for password hashing

const userSchema = new mongoose.Schema(
  {
    // --- Account Info ---
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Don't return password by default
    },
    mobileNumber: {
      // Added for verification/contact
      type: String,
      required: [true, "Mobile number is required"],
      unique: true, // Assuming mobile should be unique
      trim: true,
      // Add validation regex if needed, e.g., for Indian numbers
      // match: [/^[6-9]\d{9}$/, 'Please use a valid Indian mobile number']
    },
    isVerified: {
      // For email/mobile verification status
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      // For admin to activate/deactivate
      type: Boolean,
      default: true,
    },

    // --- Personal Details (Step 1 & 3 expansion) ---
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["Male", "Female", "Other"],
    },
    dateOfBirth: { type: Date, required: [true, "Date of Birth is required"] },
    // 'age' can be calculated dynamically or stored if preferred, removing old 'age' field
    heightCm: { type: Number, min: 120, max: 240 }, // Example range in cm
    weightKg: { type: Number, min: 30, max: 200 }, // Example range in kg
    maritalStatus: {
      type: String,
      enum: [
        "Never Married",
        "Divorced",
        "Widowed",
        "Awaiting Divorce",
        "Annulled",
      ],
    },
    motherTongue: { type: String, trim: true },
    physicalStatus: {
      type: String,
      enum: ["Normal", "Physically Challenged"],
      default: "Normal",
    },
    bodyType: {
      type: String,
      enum: ["Slim", "Average", "Athletic", "Heavy"],
      default: "Average",
    },
    complexion: {
      type: String,
      enum: ["Very Fair", "Fair", "Wheatish", "Wheatish Brown", "Dark"],
    },
    profileCreatedBy: {
      type: String,
      enum: ["Self", "Parent", "Sibling", "Friend", "Other"],
      default: "Self",
    },

    // --- Location (Step 1 expansion) ---
    city: { type: String, required: [true, "City is required"], trim: true },
    state: { type: String, required: [true, "State is required"], trim: true },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "India",
      trim: true,
    },
    // Removed old 'location' field

    // --- Religious & Social Background (Step 3) ---
    religion: { type: String, trim: true },
    caste: { type: String, trim: true },
    subCaste: { type: String, trim: true }, // Optional
    gothra: { type: String, trim: true }, // Optional
    manglik: { type: String, enum: ["Yes", "No", "Don't Know"] },

    // --- Education & Career (Step 3) ---
    educationLevel: { type: String, trim: true }, // e.g., Bachelor's, Master's
    educationField: { type: String, trim: true }, // e.g., Engineering, Arts
    occupation: { type: String, trim: true },
    annualIncome: { type: String, trim: true }, // Storing as string for ranges (e.g., "5-10 LPA") or specific currency

    // --- Family Details (Step 3) ---
    fatherStatus: { type: String, trim: true }, // e.g., Employed, Business, Retired, Passed Away
    motherStatus: { type: String, trim: true },
    numberOfSiblings: { type: Number, min: 0, default: 0 },
    siblingsMarried: { type: Number, min: 0, default: 0 },
    familyType: { type: String, enum: ["Joint", "Nuclear"] },
    familyValues: {
      type: String,
      enum: ["Traditional", "Moderate", "Liberal"],
    },

    // --- Lifestyle (Step 3) ---
    diet: {
      type: String,
      enum: ["Vegetarian", "Non-Vegetarian", "Eggetarian", "Jain", "Vegan"],
    },
    smokingHabits: {
      type: String,
      enum: ["Non-smoker", "Occasional Smoker", "Smoker"],
      default: "Non-smoker",
    },
    drinkingHabits: {
      type: String,
      enum: ["Non-drinker", "Occasional Drinker", "Drinker"],
      default: "Non-drinker",
    },

    // --- About Me & Photos (Step 3/4) ---
    bio: { type: String, trim: true, maxlength: 500 }, // Renamed from 'about'
    profilePicture: { type: String, default: "" }, // Main profile picture URL
    photos: [{ type: String }], // Array of additional photo URLs

    // --- Partner Preferences (Separate section, maybe different model later) ---
    // Basic preferences included here for now
    partnerPreferences: {
      ageRange: { min: { type: Number }, max: { type: Number } },
      heightRangeCm: { min: { type: Number }, max: { type: Number } },
      religion: [{ type: String }], // Can prefer multiple
      caste: [{ type: String }],
      maritalStatus: [{ type: String }],
      educationLevel: [{ type: String }],
      occupation: [{ type: String }],
      location: [{ type: String }], // Cities/States/Countries
      manglik: { type: String, enum: ["Yes", "No", "Doesn't Matter"] },
      diet: [{ type: String }],
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

// --- Password Hashing Middleware ---
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password using the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass error to the next middleware
  }
});

// --- Method to compare password ---
userSchema.methods.comparePassword = async function (candidatePassword) {
  // 'this.password' won't be available here due to 'select: false'
  // We need to re-fetch the user with the password field explicitly selected
  const userWithPassword = await this.constructor
    .findById(this._id)
    .select("+password");
  if (!userWithPassword) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, userWithPassword.password);
};

module.exports = mongoose.model("User", userSchema);
