// middleware/staticAdminMiddleware.js

const staticAdminMiddleware = (req, res, next) => {
  // INSECURE DEMO CHECK: Verify a specific header is present.
  // In a real app, this should validate a secure admin token (e.g., JWT).
  const isAdminRequest = req.headers["x-admin-request"] === "true";

  if (!isAdminRequest) {
    console.warn(
      "StaticAdminMiddleware: Denying access. Missing or invalid X-Admin-Request header."
    );
    return res.status(403).json({ message: "Admin privileges required" });
  }

  // If header is present (for demo purposes), allow access.
  console.log(
    "StaticAdminMiddleware: Access granted via X-Admin-Request header."
  );
  next();
};

module.exports = staticAdminMiddleware;
