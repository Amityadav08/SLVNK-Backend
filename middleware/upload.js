// middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define storage location and filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads/profile-pics");
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname-timestamp.extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    req.fileValidationError =
      "Only image files (jpg, jpeg, png, gif) are allowed!";
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

// Configure multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB file size limit
  },
  fileFilter: fileFilter,
}).single("profileImage"); // Expecting a single file with the fieldname 'profileImage'

// Middleware function to handle upload and errors
const uploadMiddleware = (req, res, next) => {
  upload(req, res, function (err) {
    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File size cannot be larger than 5MB!" });
      }
      // Handle other Multer errors
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // An unknown error occurred when uploading.
      console.error("Unknown upload error:", err);
      return res.status(500).json({ message: "Error uploading file." });
    }
    // Everything went fine.
    next();
  });
};

module.exports = uploadMiddleware;
