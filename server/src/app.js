// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
// import path from "path";
// import { fileURLToPath } from "url";
// import routes from "./routes/index.js";
// import errorHandler from "./middlewares/error.middleware.js";
// import rateLimit from "express-rate-limit";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname  = path.dirname(__filename);

// const app = express();

// // ======================
// // SECURITY MIDDLEWARES
// // ======================

// app.use(helmet());

// app.use(
//   cors({
//     origin: process.env.CLIENT_URL, 
//     credentials: true,
//   })
// );

// // ======================
// // LOGGING
// // ======================

// app.use(morgan("combined"));

// // ======================
// // BODY PARSING (SECURED)
// // ======================

// app.use(express.json({ limit: "10kb" }));
// app.use(express.urlencoded({ extended: true }));

// // ======================
// // RATE LIMITER (CRITICAL)
// // ======================

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 500, // increased for dev; lower for production
//   message: {
//     success: false,
//     message: "Too many requests, try again later",
//   },
// });

// app.use("/api", limiter);

// // ======================
// // HEALTH CHECK
// // ======================

// app.get("/api/health", (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "Server is running 🚀",
//   });
// });

// // ======================
// // STATIC FILES — uploaded receipts (FR3.5)
// // ======================
// app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// // ======================
// // ROUTES
// // ======================

// app.use("/api/v1", routes);

// // ======================
// // ERROR HANDLER (LAST)
// // ======================

// app.use(errorHandler);

// export default app;

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import errorHandler from "./middlewares/error.middleware.js";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ======================
// SECURITY MIDDLEWARES
// ======================

app.use(helmet());

// 🔥 Robust CORS (handles preflight + multiple origins)
const allowedOrigins = [
  process.env.CLIENT_URL,      // your Vercel URL (NO trailing slash)
  "http://localhost:5173"      // local dev
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow non-browser tools (no origin) and allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// 🔥 Explicitly handle preflight requests
app.options("*", cors(corsOptions));

// ======================
// LOGGING
// ======================

app.use(morgan("combined"));

// ======================
// BODY PARSING
// ======================

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ======================
// RATE LIMITER
// ======================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: "Too many requests, try again later",
  },
});

app.use("/api", limiter);

// ======================
// HEALTH CHECK
// ======================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running 🚀",
  });
});

// ======================
// STATIC FILES
// ======================

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ======================
// ROUTES
// ======================

app.use("/api/v1", routes);

// ======================
// ERROR HANDLER
// ======================

app.use(errorHandler);

export default app;