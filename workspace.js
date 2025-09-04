import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "64kb" }));
app.set("trust proxy", true);

// ----------- Logging Setup -----------
const LOG_DIR = path.resolve("./logs");
const LOG_FILE = path.join(LOG_DIR, "access.log");
fs.mkdirSync(LOG_DIR, { recursive: true });

function writeLog(obj) {
  const logID = crypto.randomUUID();
  const line =
    JSON.stringify({ logID, ts: new Date().toISOString(), ...obj }) + "\n";
  fs.appendFile(LOG_FILE, line, () => {});
  return logID;
}

// ----------- Logging Middleware -----------
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  const start = process.hrtime.bigint();

  writeLog({
    type: "request",
    id: req.id,
    method: req.method,
    path: req.originalUrl,
    headers: {
      "user-agent": req.get("user-agent"),
      referer: req.get("referer") || null,
      "x-forwarded-for": req.get("x-forwarded-for") || null,
    },
  });

  res.on("finish", () => {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    writeLog({
      type: "response",
      id: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Math.round(durMs),
    });
  });

  next();
});

// ----------- Helpers -----------
const store = new Map();

function isValidUrl(u) {
  try {
    const parsed = new URL(u);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (_) {
    return false;
  }
}

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function randomBase62(n = 6) {
  const bytes = crypto.randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function isValidShortcode(code) {
  return typeof code === "string" && /^[A-Za-z0-9]{4,12}$/.test(code);
}

function buildShortLink(req, code) {
  return `${req.protocol}://${req.get("host")}/${code}`;
}

function minutesFromNow(mins) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

// ----------- Routes -----------

// Health check (for pre-test setup compatibility)
app.get("/health", (req, res) => {
  const logID = writeLog({ type: "health_check" });
  res.json({ logID, message: "log created successfully" });
});

// Create a short URL
app.post("/shorturls", (req, res, next) => {
  try {
    const { url, validity, shortcode } = req.body || {};

    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      const logID = writeLog({
        type: "validation_error",
        id: req.id,
        field: "url",
      });
      return res
        .status(400)
        .json({ logID, error: "Invalid or missing 'url'. Must be a valid http/https URL." });
    }

    let ttlMins = 30;
    if (validity !== undefined) {
      const parsed = parseInt(validity, 10);
      if (isNaN(parsed) || parsed <= 0 || parsed > 1440) {
        const logID = writeLog({
          type: "validation_error",
          id: req.id,
          field: "validity",
        });
        return res
          .status(400)
          .json({ logID, error: "'validity' must be an integer between 1 and 1440 minutes." });
      }
      ttlMins = parsed;
    }

    let code = shortcode;
    if (code !== undefined) {
      if (!isValidShortcode(code)) {
        const logID = writeLog({
          type: "validation_error",
          id: req.id,
          field: "shortcode",
        });
        return res
          .status(400)
          .json({ logID, error: "Invalid 'shortcode'. Use 4-12 alphanumeric characters." });
      }
      if (store.has(code)) {
        const logID = writeLog({
          type: "conflict",
          id: req.id,
          shortcode: code,
        });
        return res
          .status(409)
          .json({ logID, error: "Shortcode already in use. Please choose another." });
      }
    } else {
      do {
        code = randomBase62(7);
      } while (store.has(code));
    }

    const createdAt = new Date().toISOString();
    const expiry = minutesFromNow(ttlMins);

    const record = { url, shortcode: code, createdAt, expiry, clicks: 0, clickDetails: [] };
    store.set(code, record);

    const logID = writeLog({
      type: "shorturl_created",
      id: req.id,
      shortcode: code,
      url,
      expiry,
    });

    return res.status(201).json({
      logID,
      shortLink: buildShortLink(req, code),
      expiry,
    });
  } catch (err) {
    next(err);
  }
});

// Get metadata of a short URL
app.get("/shorturls/:code", (req, res) => {
  const code = req.params.code;
  const record = store.get(code);
  if (!record) {
    const logID = writeLog({ type: "not_found", id: req.id, shortcode: code });
    return res.status(404).json({ logID, error: "Shortcode not found." });
  }

  const logID = writeLog({ type: "metadata_fetched", id: req.id, shortcode: code });
  return res.json({
    logID,
    shortcode: record.shortcode,
    shortLink: buildShortLink(req, record.shortcode),
    url: record.url,
    createdAt: record.createdAt,
    expiry: record.expiry,
    clicks: record.clicks,
    clickDetails: record.clickDetails,
  });
});

// Redirect to original URL (with debug mode for Postman)
app.get("/:code", (req, res) => {
  const code = req.params.code;
  const record = store.get(code);
  if (!record) {
    const logID = writeLog({ type: "not_found", id: req.id, shortcode: code });
    return res.status(404).json({ logID, error: "Shortcode not found." });
  }

  const now = new Date();
  if (now > new Date(record.expiry)) {
    const logID = writeLog({ type: "expired", id: req.id, shortcode: code });
    return res
      .status(410)
      .json({ logID, error: "Short link expired.", expiry: record.expiry });
  }

  record.clicks += 1;
  record.clickDetails.push({
    timestamp: new Date().toISOString(),
    referrer: req.get("referer") || null,
    ip: req.ip || null,
  });
  if (record.clickDetails.length > 1000) record.clickDetails.shift();

  const logID = writeLog({ type: "redirect", id: req.id, shortcode: code, to: record.url });

  // Debug mode for Postman testing
  if (req.query.debug === "true") {
    return res.json({ logID, redirectTo: record.url });
  }

  return res.redirect(302, record.url);
});

// Error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  const logID = writeLog({ type: "error", id: req.id, status, message });
  res.status(status).json({ logID, error: message });
});

// ----------- Startup -----------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  writeLog({ type: "startup", port: PORT });
});
console.log(`Server running on port ${PORT}`);