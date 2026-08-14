const dotenv = require("dotenv");

dotenv.config();

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitList = (value, fallback) => {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

// const env = {
//   nodeEnv: process.env.NODE_ENV || "development",
//   port: asNumber(process.env.PORT, 5000),
//   mongoUri: process.env.MONGODB_URI ,
//   corsOrigins: splitList(process.env.CORS_ORIGIN, ["http://localhost:5173"]),
//   accessTokenSecret:
//     process.env.JWT_ACCESS_SECRET || "replace-this-access-secret-before-production",
//   refreshTokenSecret:
//     process.env.JWT_REFRESH_SECRET || "replace-this-refresh-secret-before-production",
//   accessTokenTtl: process.env.JWT_ACCESS_TTL || "15m",
//   refreshTokenTtl: process.env.JWT_REFRESH_TTL || "7d",
//   refreshCookieName: process.env.JWT_REFRESH_COOKIE_NAME || "refresh_token",
//   bcryptRounds: asNumber(process.env.BCRYPT_ROUNDS, 12),
//   rateLimitWindowMs: asNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
//   rateLimitMax: asNumber(process.env.RATE_LIMIT_MAX, 300),
//   authRateLimitMax: asNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
//   uploadMaxBytes: asNumber(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
//   smtp: {
//     host: process.env.SMTP_HOST,
//     port: asNumber(process.env.SMTP_PORT, 587),
//     secure: process.env.SMTP_SECURE === "true",
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//     from: process.env.SMTP_FROM || "Shop Management <no-reply@example.com>",
//   },
// };

// const env = {
//   nodeEnv: process.env.NODE_ENV || "development",
//   port: asNumber(process.env.PORT, 5000),

//   mongoUri: process.env.MONGODB_URI,

//   corsOrigins: splitList(process.env.CORS_ORIGIN, [
//     "http://localhost:5173",
//   ]),

//   accessTokenSecret: process.env.JWT_ACCESS_SECRET,
//   refreshTokenSecret: process.env.JWT_REFRESH_SECRET,

//   accessTokenTtl: process.env.JWT_ACCESS_TTL || "15m",
//   refreshTokenTtl: process.env.JWT_REFRESH_TTL || "7d",
//   refreshCookieName: process.env.JWT_REFRESH_COOKIE_NAME || "refresh_token",

//   bcryptRounds: asNumber(process.env.BCRYPT_ROUNDS, 12),
//   rateLimitWindowMs: asNumber(
//     process.env.RATE_LIMIT_WINDOW_MS,
//     15 * 60 * 1000
//   ),
//   rateLimitMax: asNumber(process.env.RATE_LIMIT_MAX, 300),
//   authRateLimitMax: asNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
//   uploadMaxBytes: asNumber(
//     process.env.UPLOAD_MAX_BYTES,
//     5 * 1024 * 1024
//   ),

//   smtp: {
//     host: process.env.SMTP_HOST,
//     port: asNumber(process.env.SMTP_PORT, 587),
//     secure: process.env.SMTP_SECURE === "true",
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//     from:
//       process.env.SMTP_FROM ||
//       "Shop Management <no-reply@example.com>",
//   },
// };

// if (
//   env.nodeEnv === "production" &&
//   (env.accessTokenSecret.includes("replace-this") ||
//     env.refreshTokenSecret.includes("replace-this"))
// ) {
//   throw new Error("JWT secrets must be configured in production.");
// }
// if (!env.mongoUri) {
//   throw new Error("MONGODB_URI must be configured.");
// }

// if (!env.accessTokenSecret) {
//   throw new Error("JWT_ACCESS_SECRET must be configured.");
// }

// if (!env.refreshTokenSecret) {
//   throw new Error("JWT_REFRESH_SECRET must be configured.");
// }






const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: asNumber(process.env.PORT, 5000),

  mongoUri: process.env.MONGODB_URI,

  corsOrigins: splitList(process.env.CORS_ORIGIN, [
    "http://localhost:5173",
  ]),

  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,

  accessTokenTtl: process.env.JWT_ACCESS_TTL || "15m",
  refreshTokenTtl: process.env.JWT_REFRESH_TTL || "7d",
  refreshCookieName:
    process.env.JWT_REFRESH_COOKIE_NAME || "refresh_token",

  bcryptRounds: asNumber(process.env.BCRYPT_ROUNDS, 12),

  rateLimitWindowMs: asNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  rateLimitMax: asNumber(
    process.env.RATE_LIMIT_MAX,
    300
  ),

  authRateLimitMax: asNumber(
    process.env.AUTH_RATE_LIMIT_MAX,
    20
  ),

  uploadMaxBytes: asNumber(
    process.env.UPLOAD_MAX_BYTES,
    5 * 1024 * 1024
  ),

  smtp: {
    host: process.env.SMTP_HOST,
    port: asNumber(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from:
      process.env.SMTP_FROM ||
      "Shop Management <no-reply@example.com>",
  },
};

if (!env.mongoUri) {
  throw new Error("MONGODB_URI must be configured.");
}

if (!env.accessTokenSecret) {
  throw new Error("JWT_ACCESS_SECRET must be configured.");
}

if (!env.refreshTokenSecret) {
  throw new Error("JWT_REFRESH_SECRET must be configured.");
}

if (
  env.nodeEnv === "production" &&
  env.corsOrigins.includes("http://localhost:5173")
) {
  throw new Error("Production CORS_ORIGIN must not use localhost.");
}

module.exports = env;
