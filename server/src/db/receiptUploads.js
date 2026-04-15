import { db } from "./connection.js";

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function numOrNull(value) {
  if (value == null) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function strOrNull(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  return String(value);
}

/**
 * @param {string} storedFilename
 * @param {string | null | undefined} originalFilename
 * @param {string} mimetype
 * @param {number} sizeBytes
 * @param {Record<string, unknown> | null | undefined} [itemization]
 * @returns {{ id: number, created_at: string }}
 */
export function insertReceiptUpload(
  storedFilename,
  originalFilename,
  mimetype,
  sizeBytes,
  itemization,
) {
  const merchantName = strOrNull(itemization?.merchantName);
  const transactionDate = strOrNull(itemization?.transactionDate);
  const currency = strOrNull(itemization?.currency);
  const subtotal = numOrNull(itemization?.subtotal);
  const taxTotal = numOrNull(itemization?.taxTotal);
  const tipTotal = numOrNull(itemization?.tipTotal);
  const total = numOrNull(itemization?.total);
  const grandTotal = numOrNull(itemization?.grandTotal);

  const stmt = db.prepare(
    `INSERT INTO receipt_uploads (
       stored_filename, original_filename, mimetype, size_bytes,
       merchant_name, transaction_date, currency,
       subtotal, tax_total, tip_total, total, grand_total
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id, created_at`,
  );
  const row = stmt.get(
    storedFilename,
    originalFilename ?? null,
    mimetype,
    sizeBytes,
    merchantName,
    transactionDate,
    currency,
    subtotal,
    taxTotal,
    tipTotal,
    total,
    grandTotal,
  );
  return row;
}

/**
 * @param {number} limit
 * @returns {Array<{ id: number, stored_filename: string, original_filename: string | null, mimetype: string, size_bytes: number, merchant_name: string | null, transaction_date: string | null, currency: string | null, subtotal: number | null, tax_total: number | null, tip_total: number | null, total: number | null, grand_total: number | null, created_at: string }>}
 */
export function listReceiptUploads(limit) {
  const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const stmt = db.prepare(
    `SELECT id, stored_filename, original_filename, mimetype, size_bytes,
            merchant_name, transaction_date, currency,
            subtotal, tax_total, tip_total, total, grand_total, created_at
     FROM receipt_uploads
     ORDER BY id DESC
     LIMIT ?`,
  );
  return stmt.all(n);
}

/**
 * @param {number} id
 * @returns {{ id: number, stored_filename: string, original_filename: string | null, mimetype: string, size_bytes: number, merchant_name: string | null, transaction_date: string | null, currency: string | null, subtotal: number | null, tax_total: number | null, tip_total: number | null, total: number | null, grand_total: number | null, created_at: string } | undefined}
 */
export function getReceiptById(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) {
    return undefined;
  }
  const stmt = db.prepare(
    `SELECT id, stored_filename, original_filename, mimetype, size_bytes,
            merchant_name, transaction_date, currency,
            subtotal, tax_total, tip_total, total, grand_total, created_at
     FROM receipt_uploads
     WHERE id = ?`,
  );
  return stmt.get(n);
}
