const jwt = require("jsonwebtoken");

module.exports = function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return response.status(401).json({ error: "Please log in to continue." });
  try {
    request.business = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    response.status(401).json({ error: "Your session has expired. Please log in again." });
  }
};
