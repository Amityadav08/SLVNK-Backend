// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // Check for admin header first
  if (req.header("X-Admin-Request") === "true") {
    console.log(
      "Auth Middleware: Admin request detected, bypassing token check."
    );
    // Optionally, set a flag or admin user info if needed downstream
    // req.isAdmin = true;
    return next(); // Admin is authorized, proceed
  }

  // If not admin, check for standard user token
  const token = req.header("Authorization")?.split(" ")[1]; // Expect token as "Bearer <token>"
  if (!token) {
    return res
      .status(401)
      .json({ message: "No token or admin header, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded payload (e.g., { userId: ... })
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = authMiddleware;
