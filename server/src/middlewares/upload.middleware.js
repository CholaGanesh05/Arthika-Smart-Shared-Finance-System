import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Store receipts in server/uploads/receipts/
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "receipts");

// Create dir if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// FR3.5 — only JPEG/PNG allowed, max 5MB
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `receipt-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png"];
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG images are allowed"), false);
  }
};

export const uploadReceiptMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // FR3.5 — max 5MB
  },
}).single("receipt"); // field name in multipart form
