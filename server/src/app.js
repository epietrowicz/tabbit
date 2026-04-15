import fs from "node:fs/promises";
import express from "express";
import multer from "multer";
import {
  db,
  getReceiptById,
  insertReceiptClaimMessage,
  insertReceiptClaims,
  insertReceiptLineItems,
  insertReceiptUpload,
  listReceiptClaimMessages,
  listReceiptClaimsForReceipt,
  listReceiptLineItems,
  listReceiptUploads,
} from "./db/index.js";
import { parsePlainTextToReceiptClaims } from "./ai/claimItems.js";
import { analyzeReceiptImage } from "./ai/receiptVision.js";
import { UPLOAD_DIR, uploadImage } from "./upload.js";
import dotenv from "dotenv";
dotenv.config();

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use("/files", express.static(UPLOAD_DIR));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/receipts", (req, res) => {
    const raw = req.query.limit;
    const limit = raw === undefined ? 50 : Number.parseInt(String(raw), 10);
    if (Number.isNaN(limit)) {
      return res.status(400).json({ error: 'Query "limit" must be a number.' });
    }
    try {
      const rows = listReceiptUploads(limit);
      res.json({ receipts: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to read receipts." });
    }
  });

  app.get("/receipts/:id", (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid receipt id." });
    }
    try {
      const row = getReceiptById(id);
      if (!row) {
        return res.status(404).json({ error: "Receipt not found." });
      }
      const line_items = listReceiptLineItems(id);
      const claim_messages = listReceiptClaimMessages(id);
      const receipt_claims = listReceiptClaimsForReceipt(id);
      res.json({
        receipt: {
          ...row,
          url: `/files/${encodeURIComponent(row.stored_filename)}`,
          line_items,
          claim_messages,
          receipt_claims,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to read receipt." });
    }
  });

  app.post("/receipts/:id/claims", async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid receipt id." });
    }
    const raw = req.body?.message ?? req.body?.text;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "Message is required." });
    }
    if (text.length > 8000) {
      return res.status(400).json({
        error: "Message is too long (max 8000 characters).",
      });
    }
    try {
      const row = getReceiptById(id);
      if (!row) {
        return res.status(404).json({ error: "Receipt not found." });
      }
      const message = insertReceiptClaimMessage(id, text);
      let claims = [];
      let claimParseError = null;
      try {
        const lineItems = listReceiptLineItems(id);
        if (lineItems.length > 0) {
          const { claimRows } = await parsePlainTextToReceiptClaims(
            text,
            lineItems,
          );
          claims = insertReceiptClaims(message.id, claimRows);
        }
      } catch (parseErr) {
        console.error(parseErr);
        claimParseError =
          parseErr instanceof Error
            ? parseErr.message
            : "Failed to parse claim against line items.";
      }
      res.status(201).json({
        message,
        claims,
        ...(claimParseError != null ? { claimParseError } : {}),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save claim message." });
    }
  });

  app.post("/upload", (req, res, next) => {
    uploadImage(req, res, async (err) => {
      if (err) {
        next(err);
        return;
      }
      if (!req.file) {
        res.status(400).json({
          error:
            'No image file provided. Send multipart/form-data with field "image".',
        });
        return;
      }
      const {
        filename,
        size,
        mimetype,
        originalname,
        path: filePath,
      } = req.file;

      let itemization = null;
      try {
        itemization = await analyzeReceiptImage(filePath, mimetype);
      } catch (e) {
        await fs.unlink(filePath).catch(() => {});
        console.error(e);
        res.status(502).json({
          error:
            e instanceof Error ? e.message : "Receipt image analysis failed.",
        });
        return;
      }

      try {
        const row = db.transaction(() => {
          const r = insertReceiptUpload(
            filename,
            originalname,
            mimetype,
            size,
            itemization,
          );
          insertReceiptLineItems(r.id, itemization);
          return r;
        })();
        res.status(201).json({
          id: row.id,
          filename,
          originalFilename: originalname,
          url: `/files/${encodeURIComponent(filename)}`,
          size,
          mimetype,
          created_at: row.created_at,
          itemization,
        });
      } catch (dbErr) {
        console.error(dbErr);
        await fs.unlink(filePath).catch(() => {});
        res.status(500).json({ error: "Failed to save receipt record." });
      }
    });
  });

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "File too large." });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (
      err instanceof Error &&
      err.message.startsWith("Only image uploads are allowed")
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });

  return app;
}
