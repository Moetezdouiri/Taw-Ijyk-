require("dotenv").config();
const crypto = require("node:crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Business = require("./models/Business");
const Order = require("./models/Order");
const requireAuth = require("./middleware/auth");

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error("MONGO_URI and JWT_SECRET are required.");
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: false }));
app.use(express.json());

app.post("/api/auth/signup", async (request, response) => {
  try {
    const { name, email, password } = request.body;
    if (!name || !/^\S+@\S+\.\S+$/.test(email || "") || !password || password.length < 8) {
      return response.status(400).json({ error: "Enter a business name, valid email, and password of at least 8 characters." });
    }
    const exists = await Business.exists({ email: email.toLowerCase() });
    if (exists) return response.status(409).json({ error: "An account with that email already exists." });
    await Business.create({ name, email: email.toLowerCase(), publicCode: crypto.randomBytes(8).toString("hex"), passwordHash: await bcrypt.hash(password, 12) });
    response.status(201).json({ created: true });
  } catch (error) {
    response.status(500).json({ error: "Could not create the account." });
  }
});

app.post("/api/auth/login", async (request, response) => {
  const business = await Business.findOne({ email: String(request.body.email || "").toLowerCase() });
  if (!business || !(await bcrypt.compare(request.body.password || "", business.passwordHash))) {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }
  if (!business.publicCode) {
    business.publicCode = crypto.randomBytes(8).toString("hex");
    await business.save();
  }
  const token = jwt.sign({ id: business.id, name: business.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
  response.json({ token, business: { id: business.id, name: business.name, email: business.email } });
});

app.get("/api/auth/me", requireAuth, async (request, response) => {
  const business = await Business.findById(request.business.id).select("name email publicCode");
  if (!business) return response.status(401).json({ error: "Account not found." });
  response.json(business);
});

app.get("/api/orders", requireAuth, async (request, response) => {
  response.json(await Order.find({ businessId: request.business.id }).sort({ createdAt: -1 }));
});

app.post("/api/orders", requireAuth, async (request, response) => {
  const invoice = String(request.body.invoice || "").trim();
  const minutes = Number(request.body.minutes);
  if (!/^\d+$/.test(invoice) || !Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    return response.status(400).json({ error: "Enter a valid invoice number and time from 1 to 180 minutes." });
  }
  const duplicate = await Order.exists({ businessId: request.business.id, invoice, status: "waiting" });
  if (duplicate) return response.status(409).json({ error: "That invoice is already in the live queue." });
  const order = await Order.create({ businessId: request.business.id, invoice, minutes, publicToken: crypto.randomBytes(18).toString("hex"), readyAt: new Date(Date.now() + minutes * 60000) });
  response.status(201).json(order);
});

app.post("/api/orders/:id/ready", requireAuth, async (request, response) => {
  const order = await Order.findOneAndUpdate({ _id: request.params.id, businessId: request.business.id }, { status: "ready", completedAt: new Date() }, { new: true });
  if (!order) return response.status(404).json({ error: "Order not found." });
  response.json(order);
});

app.get("/api/public/orders/:token", async (request, response) => {
  const businessCode = String(request.query.business || "").trim();
  if (!/^[a-f0-9]{16}$/.test(businessCode)) {
    return response.status(400).json({ error: "This QR code is missing its business identity. Please scan the current counter QR code." });
  }
  const business = await Business.findOne({ publicCode: businessCode }).select("_id");
  if (!business) return response.status(404).json({ error: "Business not found." });
  const order = await Order.findOne({ publicToken: request.params.token, businessId: business._id }).select("invoice minutes status readyAt completedAt publicToken");
  if (!order) return response.status(404).json({ error: "Order not found." });
  response.json(order);
});

app.get("/api/public/orders", async (request, response) => {
  const invoice = String(request.query.invoice || "").trim();
  const businessCode = String(request.query.business || "").trim();
  if (!/^\d+$/.test(invoice) || !/^[a-f0-9]{16}$/.test(businessCode)) {
    return response.status(400).json({ error: "Scan this business’s QR code before entering an invoice number." });
  }
  const business = await Business.findOne({ publicCode: businessCode }).select("_id");
  if (!business) return response.status(404).json({ error: "Business not found." });
  const order = await Order.findOne({ businessId: business._id, invoice }).sort({ createdAt: -1 }).select("invoice minutes status readyAt completedAt publicToken");
  if (!order) return response.status(404).json({ error: "Order not found." });
  response.json(order);
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const port = Number(process.env.PORT) || 8000;
  const server = app.listen(port, () => console.log(`Dorak API listening on port ${port}`));
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Dorak may already be running there.`);
      console.error(`Use http://localhost:5173 and do not start a second API process.`);
    } else {
      console.error("Dorak API server error:", error.message);
    }
    process.exit(1);
  });
}
start().catch((error) => {
  console.error("Could not start Dorak API:", error.message);
  console.error("Make sure MongoDB is running and MONGO_URI in .env points to the correct database.");
  process.exit(1);
});
