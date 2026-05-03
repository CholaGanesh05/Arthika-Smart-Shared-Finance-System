import multer from "multer";

// ======================
// FILE FILTER — JPEG/PNG only (FR3.5)
// ======================
const imageFilter = (_req, file, cb) => {
  const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];
  if (ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG images are allowed"), false);
  }
};

// ======================
// MEMORY STORAGE
// Store file in memory as a Buffer so we can stream it directly to Cloudinary
// ======================
const storage = multer.memoryStorage();

// ======================
// EXPORTED MIDDLEWARES
// ======================

// For receipt uploads — field name: "receipt"
export const uploadReceiptMiddleware = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("receipt");

// For avatar uploads — field name: "avatar"
export const uploadAvatarMiddleware = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("avatar");
