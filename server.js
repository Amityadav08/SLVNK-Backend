// server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());

// Configure CORS to allow requests from frontend
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173","https://spontaneous-kelpie-84bc47.netlify.app","https://slvnk-frontend.vercel.app/"], // Add your frontend URL
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Request"],
  })
);

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Import route modules
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Test endpoint for checking API connectivity
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

// Use routes (all endpoints are prefixed with /api)
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/admin", adminRoutes);

// Global error handling middleware (simple example)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
