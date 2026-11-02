const Business = require("../models/Business");

module.exports = async function requireActiveSubscription(request, response, next) {
  try {
    const business = await Business.findById(request.business.id).select("subscriptionStatus subscriptionExpiresAt");
    if (!business) return response.status(401).json({ error: "Account not found." });
    if (
      business.subscriptionStatus !== "active"
      || !business.subscriptionExpiresAt
      || business.subscriptionExpiresAt.getTime() <= Date.now()
    ) {
      return response.status(403).json({ error: "An active subscription is required to manage orders." });
    }
    next();
  } catch (error) {
    console.error("Subscription verification failed:", error.message);
    response.status(500).json({ error: "Could not verify the subscription." });
  }
};
