const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: true },
  emailVerificationCodeHash: { type: String, default: null },
  emailVerificationExpiresAt: { type: Date, default: null },
  emailVerificationSentAt: { type: Date, default: null },
  emailVerificationAttempts: { type: Number, default: 0 },
  phone: { type: String, default: "" },
  publicCode: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  logoUrl: { type: String, default: "" },
  googleReviewUrl: { type: String, default: "" },
  accountStatus: { type: String, enum: ["active", "banned"], default: "active" },
  inactiveSince: { type: Date, default: null },
  deletionPending: { type: Boolean, default: false },
  subscriptionStatus: { type: String, enum: ["inactive", "active"], default: "inactive" },
  subscriptionExpiresAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("Business", businessSchema);
