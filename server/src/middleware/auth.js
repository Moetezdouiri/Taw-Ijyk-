const jwt = require("jsonwebtoken");
const Business = require("../models/Business");

module.exports = async function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return response.status(401).json({ error: "Please log in to continue." });
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return response.status(401).json({ error: "Your session has expired. Please log in again." });
  }
  try {
    const business = await Business.findById(claims.id).select("accountStatus deletionPending");
    if (!business || business.accountStatus === "banned" || business.deletionPending) {
      return response.status(401).json({ error: "This account has been banned." });
    }
    request.business = claims;
    next();
  } catch (error) {
    console.error("Account authorization failed:", error.message);
    response.status(500).json({ error: "Could not verify the account." });
  }
};
