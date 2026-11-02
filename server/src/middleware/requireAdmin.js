const jwt = require("jsonwebtoken");

module.exports = function requireAdmin(request, response, next) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return response.status(401).json({ error: "Admin sign-in is required." });
  try {
    const admin = jwt.verify(token, process.env.JWT_SECRET);
    if (admin.role !== "admin") return response.status(403).json({ error: "Admin access is required." });
    next();
  } catch {
    response.status(401).json({ error: "Your admin session has expired. Please sign in again." });
  }
};
