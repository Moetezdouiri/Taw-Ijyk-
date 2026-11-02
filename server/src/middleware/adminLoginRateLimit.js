const attemptsByIp = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_IPS = 10000;

module.exports = function adminLoginRateLimit(request, response, next) {
  const now = Date.now();
  for (const [ip, entry] of attemptsByIp) {
    if (entry.resetAt <= now && entry.pending === 0) attemptsByIp.delete(ip);
  }

  const ip = request.ip || request.socket.remoteAddress || "unknown";
  let entry = attemptsByIp.get(ip);
  if (entry && entry.resetAt <= now) {
    if (entry.pending > 0) {
      return response.status(429).json({ error: "Too many admin login attempts. Please wait and try again." });
    }
    attemptsByIp.delete(ip);
    entry = undefined;
  }

  if (entry && entry.attempts + entry.pending >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    response.set("Retry-After", String(retryAfter));
    return response.status(429).json({ error: "Too many admin login attempts. Please wait and try again." });
  }

  if (!entry) {
    if (attemptsByIp.size >= MAX_TRACKED_IPS) {
      return response.status(503).json({ error: "Admin login rate limiting is temporarily unavailable." });
    }
    entry = { attempts: 0, pending: 0, resetAt: now + WINDOW_MS };
    attemptsByIp.set(ip, entry);
  }

  entry.pending += 1;
  response.once("finish", () => {
    entry.pending -= 1;
    if (response.statusCode === 401) entry.attempts += 1;
    else if (response.statusCode >= 200 && response.statusCode < 300) entry.attempts = 0;
    if (entry.attempts === 0 && entry.pending === 0 && attemptsByIp.get(ip) === entry) {
      attemptsByIp.delete(ip);
    }
  });
  next();
};
