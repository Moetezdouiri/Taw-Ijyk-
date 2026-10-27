const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  invoice: { type: String, required: true, trim: true },
  publicToken: { type: String, required: true, unique: true, index: true },
  minutes: { type: Number, required: true, min: 1, max: 180 },
  status: { type: String, enum: ["waiting", "ready"], default: "waiting" },
  readyAt: { type: Date, required: true },
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
