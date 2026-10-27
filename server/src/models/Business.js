const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  publicCode: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Business", businessSchema);
