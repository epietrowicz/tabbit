import { db } from "./connection.js";

/**
 * Persists parsed line items for a receipt. Skips rows with invalid or missing numeric fields.
 *
 * @param {number} receiptId
 * @param {Record<string, unknown> | null | undefined} itemization
 */
export function insertReceiptLineItems(receiptId, itemization) {
  if (itemization == null || typeof itemization !== "object") {
    return;
  }
  const raw = itemization.lineItems;
  if (!Array.isArray(raw) || raw.length === 0) {
    return;
  }

  const stmt = db.prepare(
    `INSERT INTO receipt_line_items (
       receipt_id, line_index, description, quantity, unit_price, line_total
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (line == null || typeof line !== "object") {
      continue;
    }
    const o = /** @type {Record<string, unknown>} */ (line);
    const description =
      typeof o.description === "string"
        ? o.description
        : String(o.description ?? "");
    const quantity = Number(o.quantity);
    const unitPrice = Number(o.unitPrice);
    const lineTotal = Number(o.lineTotal);
    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(unitPrice) ||
      !Number.isFinite(lineTotal)
    ) {
      continue;
    }
    stmt.run(receiptId, i, description, quantity, unitPrice, lineTotal);
  }
}

/**
 * @param {number} receiptId
 * @returns {Array<{ id: number, receipt_id: number, line_index: number, description: string, quantity: number, unit_price: number, line_total: number, created_at: string }>}
 */
export function listReceiptLineItems(receiptId) {
  const n = Number(receiptId);
  if (!Number.isInteger(n) || n < 1) {
    return [];
  }
  const stmt = db.prepare(
    `SELECT id, receipt_id, line_index, description, quantity, unit_price, line_total, created_at
     FROM receipt_line_items
     WHERE receipt_id = ?
     ORDER BY line_index ASC`,
  );
  return stmt.all(n);
}
