const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const routes = require("./routes");
const { apiLimiter } = require("./middlewares/rateLimit.middleware");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin is not allowed."));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (req, res) =>
  res.status(200).json({
    success: true,
    message: "API is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  })
);

app.use("/api/v1", apiLimiter, routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
