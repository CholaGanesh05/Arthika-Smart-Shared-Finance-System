import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import errorHandler from "./middlewares/error.middleware.js";
import rateLimit from "express-rate-limit";

const app = express();

// ======================
// SECURITY MIDDLEWARES
// ======================

app.use(helmet());

app.use(
  cors({
    origin: "*", // ⚠️ change in production
    credentials: true,
  })
);

// ======================
// LOGGING
// ======================

app.use(morgan("combined"));

// ======================
// BODY PARSING (SECURED)
// ======================

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ======================
// RATE LIMITER (CRITICAL)
// ======================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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
// ROUTES
// ======================

app.use("/api/v1", routes);

// ======================
// ERROR HANDLER (LAST)
// ======================

app.use(errorHandler);

export default app;