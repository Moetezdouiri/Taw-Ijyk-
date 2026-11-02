const mongoose = require("mongoose");

const businessEventSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  type: { type: String, enum: ["renewed", "deactivated", "banned", "unbanned"], required: true },
  amountTnd: { type: Number, min: 0, default: null },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("BusinessEvent", businessEventSchema);
