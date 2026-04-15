import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png"]);

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const base =
      path.extname(file.originalname) || MIME_EXT[file.mimetype] || "";
    cb(null, `${crypto.randomUUID()}${base}`);
  },
});

const maxBytes = Number.parseInt(process.env.UPLOAD_MAX_BYTES || "", 10);
const fileSize =
  Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : 10 * 1024 * 1024;

export const uploadImage = multer({
  storage,
  limits: { fileSize },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image uploads are allowed (JPEG, PNG)."));
  },
}).single("image");
