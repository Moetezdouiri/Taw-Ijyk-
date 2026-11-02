require("dotenv").config();
const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const Business = require("./models/Business");
const BusinessEvent = require("./models/BusinessEvent");
const Order = require("./models/Order");
const requireAuth = require("./middleware/auth");
const requireAdmin = require("./middleware/requireAdmin");
const requireActiveSubscription = require("./middleware/requireActiveSubscription");
const adminLoginRateLimit = require("./middleware/adminLoginRateLimit");

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error("MONGO_URI and JWT_SECRET are required.");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: false }));
app.use(express.json());

app.post("/api/admin/login", adminLoginRateLimit, (request, response) => {
  const configuredPassword = process.env.ADMIN_PASSWORD || "";
  if (configuredPassword.length < 16) {
    return response.status(503).json({ error: "Admin access is not configured. Set ADMIN_PASSWORD to a strong password of at least 16 characters." });
  }
  const submittedPassword = String(request.body.password || "");
  const configuredHash = crypto.createHash("sha256").update(configuredPassword).digest();
  const submittedHash = crypto.createHash("sha256").update(submittedPassword).digest();
  if (!crypto.timingSafeEqual(configuredHash, submittedHash)) {
    return response.status(401).json({ error: "Admin password is incorrect." });
  }
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "8h" });
  response.json({ token });
});

app.get("/api/admin/businesses", requireAdmin, async (request, response) => {
  try {
    const [businesses, activity] = await Promise.all([
      Business.find().select("name email phone logoUrl googleReviewUrl accountStatus inactiveSince deletionPending subscriptionStatus subscriptionExpiresAt createdAt").sort({ createdAt: -1 }).lean(),
      Order.aggregate([
        {
          $group: {
            _id: "$businessId",
            lastActivityAt: { $max: "$createdAt" },
            ordersToday: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", new Date(new Date().setHours(0, 0, 0, 0))] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);
    const activityByBusiness = new Map(activity.map((entry) => [String(entry._id), entry]));
    const accounts = businesses.map((business) => ({
      ...business,
      lastActivityAt: activityByBusiness.get(String(business._id))?.lastActivityAt || null,
      ordersToday: activityByBusiness.get(String(business._id))?.ordersToday || 0,
    }));
    response.json(accounts);
  } catch (error) {
    console.error("Admin business list failed:", error.message);
    response.status(500).json({ error: "Could not load business accounts." });
  }
});

app.get("/api/admin/history", requireAdmin, async (request, response) => {
  try {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [events, businesses, [revenue]] = await Promise.all([
      BusinessEvent.find().sort({ createdAt: -1 }).limit(500).lean(),
      Business.find().select("_id name email createdAt").lean(),
      BusinessEvent.aggregate([
        { $match: { type: "renewed" } },
        {
          $group: {
            _id: null,
            totalTnd: { $sum: { $ifNull: ["$amountTnd", 0] } },
            thisMonthTnd: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", monthStart] },
                  { $ifNull: ["$amountTnd", 0] },
                  0,
                ],
              },
            },
            recordedPayments: {
              $sum: { $cond: [{ $ne: ["$amountTnd", null] }, 1, 0] },
            },
          },
        },
      ]),
    ]);
    const businessesById = new Map(businesses.map((business) => [String(business._id), business]));
    const history = [
      ...businesses.map((business) => ({
        _id: `created-${business._id}`,
        type: "created",
        createdAt: business.createdAt,
        businessId: business._id,
        businessName: business.name,
        businessEmail: business.email,
      })),
      ...events.map((event) => {
        const business = businessesById.get(String(event.businessId));
        return {
          ...event,
          businessName: business?.name || "Deleted account",
          businessEmail: business?.email || "",
          accountDeleted: !business,
        };
      }),
    ].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt)).slice(0, 500);
    response.json({
      totalTnd: revenue?.totalTnd || 0,
      thisMonthTnd: revenue?.thisMonthTnd || 0,
      recordedPayments: revenue?.recordedPayments || 0,
      events: history,
      truncated: events.length + businesses.length > 500,
    });
  } catch (error) {
    console.error("Admin payment history load failed:", error.message);
    response.status(500).json({ error: "Could not load payment and account history." });
  }
});

app.patch("/api/admin/businesses/:id/account-status", requireAdmin, async (request, response) => {
  const { status } = request.body;
  if (!["active", "banned"].includes(status)) {
    return response.status(400).json({ error: "Choose an active or banned account status." });
  }
  try {
    const business = await Business.findOne({ _id: request.params.id, deletionPending: { $ne: true } });
    if (!business) return response.status(404).json({ error: "Business account not found." });
    business.accountStatus = status;
    await business.save();
    await BusinessEvent.create({ businessId: business._id, type: status === "banned" ? "banned" : "unbanned" });
    response.json({ id: business.id, accountStatus: business.accountStatus });
  } catch (error) {
    if (error.name === "CastError") return response.status(400).json({ error: "Business account not found." });
    console.error("Admin account status update failed:", error.message);
    response.status(500).json({ error: "Could not update the account status." });
  }
});

app.patch("/api/admin/businesses/:id/review-link", requireAdmin, async (request, response) => {
  const { googleReviewUrl } = request.body;
  if (typeof googleReviewUrl !== "string" || googleReviewUrl.length > 500) {
    return response.status(400).json({ error: "Enter a valid Google review link." });
  }
  const normalizedUrl = googleReviewUrl.trim();
  if (normalizedUrl) {
    try {
      const url = new URL(normalizedUrl);
      const hostname = url.hostname.toLowerCase();
      const isGoogleHost = hostname === "g.page"
        || hostname === "maps.app.goo.gl"
        || hostname === "google.com"
        || hostname.endsWith(".google.com");
      if (url.protocol !== "https:" || !isGoogleHost || url.username || url.password) {
        throw new Error("Invalid Google review URL.");
      }
    } catch {
      return response.status(400).json({ error: "Enter a valid Google review link." });
    }
  }
  try {
    const business = await Business.findOne({ _id: request.params.id, deletionPending: { $ne: true } });
    if (!business) return response.status(404).json({ error: "Business account not found." });
    business.googleReviewUrl = normalizedUrl;
    await business.save();
    response.json({ id: business.id, googleReviewUrl: business.googleReviewUrl });
  } catch (error) {
    if (error.name === "CastError") return response.status(400).json({ error: "Business account not found." });
    console.error("Admin Google review link update failed:", error.message);
    response.status(500).json({ error: "Could not update the Google review link." });
  }
});

app.delete("/api/admin/businesses/:id", requireAdmin, async (request, response) => {
  try {
    const business = await Business.findOne({ _id: request.params.id, deletionPending: { $ne: true } });
    if (!business) return response.status(404).json({ error: "Business account not found." });
    await Order.deleteMany({ businessId: business._id });
    await Business.deleteOne({ _id: business._id });
    response.json({ deleted: true });
  } catch (error) {
    if (error.name === "CastError") return response.status(400).json({ error: "Business account not found." });
    console.error("Admin account deletion failed:", error.message);
    response.status(500).json({ error: "Could not delete the account and its orders." });
  }
});

app.patch("/api/admin/businesses/:id/subscription", requireAdmin, async (request, response) => {
  const { status, expiresAt, paymentAmountTnd } = request.body;
  if (!["active", "inactive"].includes(status)) {
    return response.status(400).json({ error: "Choose an active or inactive subscription status." });
  }

  let subscriptionExpiresAt = null;
  if (status === "active") {
    if (typeof expiresAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      return response.status(400).json({ error: "Choose a valid subscription expiry date." });
    }
    subscriptionExpiresAt = new Date(`${expiresAt}T23:59:59.999Z`);
    if (
      Number.isNaN(subscriptionExpiresAt.getTime())
      || subscriptionExpiresAt.toISOString().slice(0, 10) !== expiresAt
      || subscriptionExpiresAt.getTime() <= Date.now()
    ) {
      return response.status(400).json({ error: "Choose an expiry date in the future." });
    }
  }
  const amount = paymentAmountTnd === "" || paymentAmountTnd === null || paymentAmountTnd === undefined
    ? null
    : Number(paymentAmountTnd);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1000000)) {
    return response.status(400).json({ error: "Enter a valid payment amount in TND." });
  }
  try {
    const business = await Business.findOne({ _id: request.params.id, deletionPending: { $ne: true } });
    if (!business) return response.status(404).json({ error: "Business account not found." });
    const wasActive = business.subscriptionStatus === "active";
    business.subscriptionStatus = status;
    business.subscriptionExpiresAt = subscriptionExpiresAt;
    business.inactiveSince = status === "active" ? null : (business.inactiveSince || new Date());
    business.deletionPending = false;
    await business.save();
    if (status === "active") {
      await BusinessEvent.create({ businessId: business._id, type: "renewed", amountTnd: amount, expiresAt: subscriptionExpiresAt });
    } else if (wasActive) {
      await BusinessEvent.create({ businessId: business._id, type: "deactivated" });
    }
    response.json({
      id: business.id,
      subscriptionStatus: business.subscriptionStatus,
      subscriptionExpiresAt: business.subscriptionExpiresAt,
    });
  } catch (error) {
    if (error.name === "CastError") return response.status(400).json({ error: "Business account not found." });
    console.error("Admin subscription update failed:", error.message);
    response.status(500).json({ error: "Could not update the subscription." });
  }
});

const parseLogoUpload = express.raw({
  type: ["image/jpeg", "image/png", "image/webp"],
  limit: "5mb",
});

function parseLogoBody(request, response, next) {
  parseLogoUpload(request, response, (error) => {
    if (!error) return next();
    if (error.type === "entity.too.large") {
      return response.status(413).json({ error: "Logo file must be 5 MB or smaller." });
    }
    console.error("Logo upload request parsing failed:", error.message);
    return response.status(400).json({ error: "Could not read the logo file." });
  });
}

function cloudinarySettings() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret || !/^[a-zA-Z0-9_-]+$/.test(cloudName)) return null;
  return { cloudName, apiKey, apiSecret };
}

function cloudinarySignature(parameters, apiSecret) {
  const signedParameters = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${signedParameters}${apiSecret}`).digest("hex");
}

function cloudinaryAssetUrl(cloudName, secureUrl) {
  return typeof secureUrl === "string"
    && secureUrl.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`);
}

function logoMatchesContentType(buffer, contentType) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

function sendAuthSession(response, business) {
  const token = jwt.sign({ id: business.id, name: business.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
  response.json({ token, business: { id: business.id, name: business.name, email: business.email } });
}

function emailTransportConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
}

async function sendVerificationCode(email, code) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "تأكيد بريدك الإلكتروني - توا يجيك",
    text: `مرحباً بك في توا يجيك\n\nرمز تأكيد بريدك الإلكتروني هو: ${code}\n\nتنتهي صلاحية الرمز خلال 15 دقيقة. إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذه الرسالة.`,
    html: `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>تأكيد بريدك الإلكتروني - توا يجيك</title>
  </head>
  <body style="margin:0;padding:32px 12px;background-color:#f1f2f8;font-family:Arial,Tahoma,sans-serif;color:#17172c;direction:rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding:0 0 18px;text-align:center;">
          <img src="cid:taw-ijyk-logo" width="190" alt="توا يجيك" style="display:block;width:190px;max-width:70%;height:auto;margin:0 auto;">
        </td>
      </tr>
      <tr>
        <td style="padding:0;background-color:#ffffff;border:1px solid #e6e7f0;border-radius:20px;overflow:hidden;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:34px 30px 30px;text-align:center;">
                <p style="display:inline-block;margin:0 0 14px;padding:7px 13px;border-radius:20px;background-color:#f5edff;color:#7a35c5;font-size:13px;font-weight:bold;">تأكيد البريد الإلكتروني</p>
                <h1 style="margin:0;color:#17172c;font-size:25px;line-height:1.55;">مرحباً بك في توا يجيك</h1>
                <p style="margin:10px 0 24px;color:#686a80;font-size:15px;line-height:1.9;">أدخل الرمز التالي لتأكيد بريدك الإلكتروني وإكمال إنشاء حسابك.</p>
                <div dir="ltr" style="padding:18px 12px;border:1px solid #e9ddfa;border-radius:14px;background-color:#faf7ff;color:#6b2eb4;font-size:36px;font-weight:bold;letter-spacing:10px;">${code}</div>
                <p style="margin:17px 0 0;color:#686a80;font-size:13px;line-height:1.8;">تنتهي صلاحية هذا الرمز خلال <strong style="color:#34344b;">15 دقيقة</strong>.</p>
                <div style="height:1px;margin:25px 0 17px;background-color:#ececf2;"></div>
                <p style="margin:0;color:#898a9b;font-size:12px;line-height:1.9;">إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذه الرسالة بأمان.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:17px 12px 0;text-align:center;color:#898a9b;font-size:12px;line-height:1.8;">توا يجيك — وقتك ليك.</td>
      </tr>
    </table>
  </body>
</html>`,
    attachments: [{
      filename: "taw-ijyk-logo.png",
      path: require("node:path").join(__dirname, "../../client/public/logo.png"),
      cid: "taw-ijyk-logo",
    }],
  });
}

function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function createVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

app.post("/api/auth/signup", async (request, response) => {
  try {
    const name = String(request.body.name || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    const password = String(request.body.password || "");
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return response.status(400).json({ error: "Enter a business name, valid email, and password of at least 8 characters." });
    }
    if (!emailTransportConfigured()) {
      return response.status(503).json({ error: "Email verification is not configured. Please contact the administrator." });
    }
    const exists = await Business.exists({ email });
    if (exists) return response.status(409).json({ error: "An account with that email already exists." });
    const code = createVerificationCode();
    const now = new Date();
    const business = await Business.create({
      name,
      email,
      publicCode: crypto.randomBytes(8).toString("hex"),
      passwordHash: await bcrypt.hash(password, 12),
      inactiveSince: now,
      emailVerified: false,
      emailVerificationCodeHash: hashVerificationCode(code),
      emailVerificationExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      emailVerificationSentAt: now,
    });
    try {
      await sendVerificationCode(email, code);
    } catch (error) {
      await Business.deleteOne({ _id: business._id });
      console.error("Verification email delivery failed:", error.message);
      return response.status(503).json({ error: "Could not send verification email. Please try again later." });
    }
    response.status(201).json({ created: true, verificationRequired: true });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: "An account with that email already exists." });
    console.error("Business signup failed:", error.message);
    response.status(500).json({ error: "Could not create the account." });
  }
});

app.post("/api/auth/verify-email", async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const code = String(request.body.code || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: "Enter your email and 6-digit verification code." });
  }
  try {
    const business = await Business.findOne({ email, emailVerified: false });
    if (!business || !business.emailVerificationCodeHash || !business.emailVerificationExpiresAt || business.emailVerificationExpiresAt <= new Date()) {
      return response.status(400).json({ error: "The verification code is invalid or has expired." });
    }
    if (business.emailVerificationAttempts >= 5) {
      return response.status(429).json({ error: "Too many verification attempts. Request a new code." });
    }
    if (hashVerificationCode(code) !== business.emailVerificationCodeHash) {
      business.emailVerificationAttempts += 1;
      await business.save();
      return response.status(business.emailVerificationAttempts >= 5 ? 429 : 400).json({
        error: business.emailVerificationAttempts >= 5
          ? "Too many verification attempts. Request a new code."
          : "The verification code is invalid or has expired.",
      });
    }
    business.emailVerified = true;
    business.emailVerificationCodeHash = null;
    business.emailVerificationExpiresAt = null;
    business.emailVerificationSentAt = null;
    business.emailVerificationAttempts = 0;
    await business.save();
    response.json({ verified: true });
  } catch (error) {
    console.error("Email verification failed:", error.message);
    response.status(500).json({ error: "Could not verify the email address." });
  }
});

app.post("/api/auth/resend-verification", async (request, response) => {
  if (!emailTransportConfigured()) {
    return response.status(503).json({ error: "Email verification is not configured. Please contact the administrator." });
  }
  const email = String(request.body.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  try {
    const business = await Business.findOne({ email, emailVerified: false });
    if (!business) return response.json({ sent: true });
    const now = new Date();
    if (
      business.emailVerificationAttempts < 5
      && business.emailVerificationSentAt
      && now.getTime() - business.emailVerificationSentAt.getTime() < 60_000
    ) {
      return response.json({ sent: true });
    }
    const code = createVerificationCode();
    business.emailVerificationCodeHash = hashVerificationCode(code);
    business.emailVerificationExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    business.emailVerificationSentAt = now;
    business.emailVerificationAttempts = 0;
    await business.save();
    try {
      await sendVerificationCode(email, code);
    } catch (error) {
      console.error("Verification email resend failed:", error.message);
      return response.status(503).json({ error: "Could not send verification email. Please try again later." });
    }
    response.json({ sent: true });
  } catch (error) {
    console.error("Verification email resend failed:", error.message);
    response.status(500).json({ error: "Could not send verification email. Please try again later." });
  }
});

app.post("/api/auth/login", async (request, response) => {
  const business = await Business.findOne({ email: String(request.body.email || "").toLowerCase() });
  if (business?.accountStatus === "banned") {
    return response.status(403).json({ error: "This account has been banned." });
  }
  if (!business?.passwordHash || !(await bcrypt.compare(request.body.password || "", business.passwordHash))) {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }
  if (business.emailVerified === false) {
    return response.status(403).json({ error: "Please verify your email before signing in." });
  }
  if (!business.publicCode) {
    business.publicCode = crypto.randomBytes(8).toString("hex");
    await business.save();
  }
  sendAuthSession(response, business);
});

app.post("/api/auth/google", async (request, response) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return response.status(503).json({ error: "Google sign-in is not configured on the server." });
  }
  const credential = String(request.body.credential || "");
  const mode = request.body.mode;
  const name = String(request.body.name || "").trim();
  if (!credential || !["login", "signup", "signup-check"].includes(mode) || (mode === "signup" && !name)) {
    return response.status(400).json({ error: "Complete the required account details and try again." });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return response.status(401).json({ error: "Google could not verify your sign-in. Please try again." });
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    return response.status(401).json({ error: "Google did not provide a verified email address." });
  }

  try {
    const existingBusiness = async () => Business.exists({
      $or: [
        { email: payload.email.toLowerCase() },
        { googleId: payload.sub },
      ],
    });
    if (mode === "signup-check") {
      if (await existingBusiness()) {
        return response.status(409).json({ error: "An account with that email already exists. Please sign in instead." });
      }
      return response.json({ available: true });
    }

    let business;
    if (mode === "signup") {
      if (await existingBusiness()) {
        return response.status(409).json({ error: "An account with that email already exists. Please sign in instead." });
      }
      business = new Business({
        name,
        email: payload.email.toLowerCase(),
        publicCode: crypto.randomBytes(8).toString("hex"),
        googleId: payload.sub,
        inactiveSince: new Date(),
      });
    } else {
      business = await Business.findOne({ googleId: payload.sub });
      if (!business) {
        business = await Business.findOne({ email: payload.email.toLowerCase() });
        if (business?.googleId && business.googleId !== payload.sub) {
          return response.status(409).json({ error: "This email is already linked to a different Google account." });
        }
        if (!business) {
          return response.status(404).json({ error: "No account exists for this Google email. Create an account first." });
        }
        business.googleId = payload.sub;
      }
    }
    if (business?.accountStatus === "banned") {
      return response.status(403).json({ error: "This account has been banned." });
    }
    business.emailVerified = true;
    business.emailVerificationCodeHash = null;
    business.emailVerificationExpiresAt = null;
    business.emailVerificationSentAt = null;
    business.emailVerificationAttempts = 0;
    if (!business.publicCode) business.publicCode = crypto.randomBytes(8).toString("hex");
    if (business.isNew || business.isModified()) await business.save();
    sendAuthSession(response, business);
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: "An account with that email already exists. Please sign in instead." });
    }
    console.error("Google sign-in failed:", error.message);
    response.status(500).json({ error: "Could not complete Google sign-in." });
  }
});

app.get("/api/auth/me", requireAuth, async (request, response) => {
  const business = await Business.findById(request.business.id).select("name email phone publicCode passwordHash logoUrl googleReviewUrl accountStatus subscriptionStatus subscriptionExpiresAt");
  if (!business) return response.status(401).json({ error: "Account not found." });
  response.json({
    name: business.name,
    email: business.email,
    phone: business.phone || "",
    publicCode: business.publicCode,
    logoUrl: business.logoUrl || "",
    googleReviewUrl: business.googleReviewUrl || "",
    hasPassword: Boolean(business.passwordHash),
    accountStatus: business.accountStatus || "active",
    subscriptionStatus: business.subscriptionStatus || "inactive",
    subscriptionExpiresAt: business.subscriptionExpiresAt || null,
  });
});

app.post("/api/auth/business/logo", requireAuth, parseLogoBody, async (request, response) => {
  const settings = cloudinarySettings();
  if (!settings) return response.status(503).json({ error: "Cloudinary logo uploads are not configured." });
  if (!logoMatchesContentType(request.body, request.headers["content-type"])) {
    return response.status(400).json({ error: "Choose a valid PNG, JPG, or WebP logo." });
  }

  try {
    const business = await Business.findById(request.business.id);
    if (!business) return response.status(401).json({ error: "Account not found." });

    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = {
      overwrite: "true",
      public_id: `business-logos/${business.id}`,
      timestamp: String(timestamp),
    };
    const signature = cloudinarySignature(parameters, settings.apiSecret);
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[request.headers["content-type"]];
    const formData = new FormData();
    formData.append("file", new Blob([request.body], { type: request.headers["content-type"] }), `logo.${extension}`);
    formData.append("api_key", settings.apiKey);
    formData.append("signature", signature);
    for (const [key, value] of Object.entries(parameters)) formData.append(key, value);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${settings.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const result = await uploadResponse.json();
    const expectedPublicId = parameters.public_id;
    if (!uploadResponse.ok || result.public_id !== expectedPublicId || !cloudinaryAssetUrl(settings.cloudName, result.secure_url)) {
      console.error("Cloudinary logo upload failed:", result.error?.message || "Unexpected upload response.");
      return response.status(502).json({ error: "Could not upload business logo." });
    }

    business.logoUrl = result.secure_url;
    await business.save();
    response.json({ logoUrl: business.logoUrl });
  } catch (error) {
    console.error("Business logo upload failed:", error.message);
    response.status(502).json({ error: "Could not upload business logo." });
  }
});

app.delete("/api/auth/business/logo", requireAuth, async (request, response) => {
  try {
    const business = await Business.findById(request.business.id);
    if (!business) return response.status(401).json({ error: "Account not found." });
    if (!business.logoUrl) return response.json({ logoUrl: "" });

    const settings = cloudinarySettings();
    if (!settings) return response.status(503).json({ error: "Cloudinary logo uploads are not configured." });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const parameters = {
      invalidate: "true",
      public_id: `business-logos/${business.id}`,
      timestamp,
    };
    const formData = new URLSearchParams({
      ...parameters,
      api_key: settings.apiKey,
      signature: cloudinarySignature(parameters, settings.apiSecret),
    });
    const deleteResponse = await fetch(`https://api.cloudinary.com/v1_1/${settings.cloudName}/image/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    const result = await deleteResponse.json();
    if (!deleteResponse.ok || !["ok", "not found"].includes(result.result)) {
      console.error("Cloudinary logo removal failed:", result.error?.message || result.result || "Unexpected delete response.");
      return response.status(502).json({ error: "Could not remove business logo." });
    }

    business.logoUrl = "";
    await business.save();
    response.json({ logoUrl: "" });
  } catch (error) {
    console.error("Business logo removal failed:", error.message);
    response.status(502).json({ error: "Could not remove business logo." });
  }
});

app.patch("/api/auth/business", requireAuth, async (request, response) => {
  const fields = Object.keys(request.body);
  if (fields.length !== 1 || !["name", "phone", "googleReviewUrl"].includes(fields[0])) {
    return response.status(400).json({ error: "Could not update the business details." });
  }

  const field = fields[0];
  const value = request.body[field];
  let normalizedValue = value;
  if (field === "name" && typeof value === "string") {
    normalizedValue = value.trim();
    if (!normalizedValue || normalizedValue.length > 100) {
      return response.status(400).json({ error: "Enter a business name between 1 and 100 characters." });
    }
  } else if (field === "phone" && (typeof value !== "string" || !/^\d{8}$/.test(value))) {
    return response.status(400).json({ error: "Enter an 8-digit Tunisian phone number." });
  } else if (field === "googleReviewUrl") {
    if (typeof value !== "string" || value.length > 500) {
      return response.status(400).json({ error: "Enter a valid Google review link." });
    }
    normalizedValue = value.trim();
    if (normalizedValue) {
      try {
        const url = new URL(normalizedValue);
        const hostname = url.hostname.toLowerCase();
        const isGoogleHost = hostname === "g.page"
          || hostname === "maps.app.goo.gl"
          || hostname === "google.com"
          || hostname.endsWith(".google.com");
        if (url.protocol !== "https:" || !isGoogleHost || url.username || url.password) {
          throw new Error("Invalid Google review URL.");
        }
      } catch {
        return response.status(400).json({ error: "Enter a valid Google review link." });
      }
    }
  }

  if (field === "name" && typeof value !== "string") {
    return response.status(400).json({ error: "Enter a business name between 1 and 100 characters." });
  }

  try {
    const business = await Business.findById(request.business.id);
    if (!business) return response.status(401).json({ error: "Account not found." });
    business[field] = normalizedValue;
    await business.save();
    response.json({ [field]: business[field] || "" });
  } catch (error) {
    console.error("Business details update failed:", error.message);
    response.status(500).json({ error: "Could not update the business details." });
  }
});

app.post("/api/auth/password", requireAuth, async (request, response) => {
  const newPassword = String(request.body.newPassword || "");
  const currentPassword = String(request.body.currentPassword || "");
  if (newPassword.length < 8) {
    return response.status(400).json({ error: "Enter a new password of at least 8 characters." });
  }

  try {
    const business = await Business.findById(request.business.id);
    if (!business) return response.status(401).json({ error: "Account not found." });
    if (business.passwordHash && !(await bcrypt.compare(currentPassword, business.passwordHash))) {
      return response.status(400).json({ error: "Current password is incorrect." });
    }
    business.passwordHash = await bcrypt.hash(newPassword, 12);
    await business.save();
    response.json({ updated: true });
  } catch (error) {
    console.error("Password update failed:", error.message);
    response.status(500).json({ error: "Could not update the password." });
  }
});

app.get("/api/orders", requireAuth, async (request, response) => {
  response.json(await Order.find({ businessId: request.business.id }).sort({ createdAt: -1 }));
});

app.post("/api/orders", requireAuth, requireActiveSubscription, async (request, response) => {
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

app.post("/api/orders/:id/extend", requireAuth, requireActiveSubscription, async (request, response) => {
  const minutes = Number(request.body.minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    return response.status(400).json({ error: "Enter additional time from 1 to 180 minutes." });
  }
  const now = new Date();
  const order = await Order.findOneAndUpdate(
    { _id: request.params.id, businessId: request.business.id, status: "waiting" },
    [{ $set: { readyAt: { $add: [{ $max: ["$readyAt", now] }, minutes * 60000] } } }],
    { new: true },
  );
  if (!order) return response.status(404).json({ error: "Order not found." });
  response.json(order);
});

app.post("/api/orders/:id/ready", requireAuth, requireActiveSubscription, async (request, response) => {
  const order = await Order.findOneAndUpdate({ _id: request.params.id, businessId: request.business.id, status: "waiting" }, { status: "ready", completedAt: new Date() }, { new: true });
  if (!order) return response.status(404).json({ error: "Order not found." });
  response.json(order);
});

app.get("/api/public/business", async (request, response) => {
  const businessCode = String(request.query.business || "").trim();
  if (!/^[a-f0-9]{16}$/.test(businessCode)) {
    return response.status(400).json({ error: "This QR code is missing its business identity. Please scan the current counter QR code." });
  }
  const business = await Business.findOne({ publicCode: businessCode }).select("name logoUrl googleReviewUrl");
  if (!business) return response.status(404).json({ error: "Business not found." });
  response.json({ name: business.name, logoUrl: business.logoUrl || "", googleReviewUrl: business.googleReviewUrl || "" });
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

async function cleanupExpiredAccounts() {
  const now = new Date();
  const inactiveCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const expiredCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dueConditions = [
    { subscriptionStatus: "inactive", inactiveSince: { $lte: inactiveCutoff } },
    { subscriptionStatus: "active", subscriptionExpiresAt: { $lte: expiredCutoff } },
  ];
  const candidates = await Business.find({
    accountStatus: { $ne: "banned" },
    $or: [{ deletionPending: true }, ...dueConditions],
  }).select("_id");

  for (const candidate of candidates) {
    const claimed = await Business.findOneAndUpdate(
      { _id: candidate._id, accountStatus: { $ne: "banned" }, $or: [{ deletionPending: true }, ...dueConditions] },
      { $set: { deletionPending: true } },
      { new: true },
    );
    if (!claimed) continue;
    try {
      await Order.deleteMany({ businessId: claimed._id });
      await Business.deleteOne({ _id: claimed._id, deletionPending: true });
      console.log(`Permanently deleted expired business account ${claimed._id}.`);
    } catch (error) {
      console.error(`Account cleanup failed for ${claimed._id}:`, error.message);
    }
  }
}

async function start() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await Business.updateMany(
    { subscriptionStatus: "inactive", inactiveSince: null },
    { $set: { inactiveSince: new Date() } },
  );
  await cleanupExpiredAccounts();
  const cleanupTimer = setInterval(() => {
    cleanupExpiredAccounts().catch((error) => console.error("Scheduled account cleanup failed:", error.message));
  }, 60 * 60 * 1000);
  cleanupTimer.unref();
  const port = Number(process.env.PORT) || 8000;
  const server = app.listen(port, () => console.log(`Taw Ijyk API listening on port ${port}`));
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Taw Ijyk may already be running there.`);
      console.error("Do not start a second API process on the same port.");
    } else {
      console.error("Taw Ijyk API server error:", error.message);
    }
    process.exit(1);
  });
}

const clientDist = path.resolve(__dirname, "../../dist");
app.use(express.static(clientDist));
app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api/")) return next();
  response.sendFile(path.join(clientDist, "index.html"));
});

start().catch((error) => {
  console.error("Could not start Taw Ijyk API:", error.message);
  console.error("Make sure MongoDB is running and MONGO_URI in .env points to the correct database.");
  process.exit(1);
});
