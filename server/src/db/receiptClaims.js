import { db } from "./connection.js";

/**
 * @param {number} receiptId
 * @returns {Array<{ id: number, receipt_id: number, body: string, created_at: string }>}
 */
export function listReceiptClaimMessages(receiptId) {
  const n = Number(receiptId);
  if (!Number.isInteger(n) || n < 1) {
    return [];
  }
  const stmt = db.prepare(
    `SELECT id, receipt_id, body, created_at
     FROM receipt_claim_messages
     WHERE receipt_id = ?
     ORDER BY created_at ASC, id ASC`,
  );
  return stmt.all(n);
}

/**
 * @param {number} receiptId
 * @param {string} body
 * @returns {{ id: number, receipt_id: number, body: string, created_at: string }}
 */
export function insertReceiptClaimMessage(receiptId, body) {
  const n = Number(receiptId);
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError("Invalid receipt id");
  }
  const stmt = db.prepare(
    `INSERT INTO receipt_claim_messages (receipt_id, body)
     VALUES (?, ?)
     RETURNING id, receipt_id, body, created_at`,
  );
  const row = stmt.get(n, body);
  return row;
}

/**
 * @param {number} messageId
 * @returns {Array<{ id: number, receipt_claim_message_id: number, receipt_line_item_id: number, quantity_claimed: number, allocated_amount: number, created_at: string, line_description: string, line_index: number }>}
 */
export function listReceiptClaimsForMessage(messageId) {
  const n = Number(messageId);
  if (!Number.isInteger(n) || n < 1) {
    return [];
  }
  const stmt = db.prepare(
    `SELECT rc.id, rc.receipt_claim_message_id, rc.receipt_line_item_id,
            rc.quantity_claimed, rc.allocated_amount, rc.created_at,
            rli.description AS line_description, rli.line_index
     FROM receipt_claims rc
     JOIN receipt_line_items rli ON rli.id = rc.receipt_line_item_id
     WHERE rc.receipt_claim_message_id = ?
     ORDER BY rli.line_index ASC, rc.id ASC`,
  );
  return stmt.all(n);
}

/**
 * @param {number} receiptClaimMessageId
 * @param {Array<{ receipt_line_item_id: number, quantity_claimed: number, allocated_amount: number }>} rows
 * @returns {Array<{ id: number, receipt_claim_message_id: number, receipt_line_item_id: number, quantity_claimed: number, allocated_amount: number, created_at: string, line_description: string, line_index: number }>}
 */
export function insertReceiptClaims(receiptClaimMessageId, rows) {
  const mid = Number(receiptClaimMessageId);
  if (!Number.isInteger(mid) || mid < 1) {
    throw new RangeError("Invalid receipt claim message id");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return listReceiptClaimsForMessage(mid);
  }

  const insert = db.prepare(
    `INSERT INTO receipt_claims (
       receipt_claim_message_id, receipt_line_item_id, quantity_claimed, allocated_amount
     ) VALUES (?, ?, ?, ?)`,
  );

  const run = db.transaction(() => {
    for (const r of rows) {
      const lid = Number(r.receipt_line_item_id);
      const q = Number(r.quantity_claimed);
      const amt = Number(r.allocated_amount);
      if (!Number.isInteger(lid) || lid < 1) {
        continue;
      }
      if (!Number.isFinite(q) || q <= 0) {
        continue;
      }
      if (!Number.isFinite(amt) || amt < 0) {
        continue;
      }
      insert.run(mid, lid, q, amt);
    }
  });
  run();
  return listReceiptClaimsForMessage(mid);
}

/**
 * @param {number} receiptId
 * @returns {Array<{ id: number, receipt_claim_message_id: number, receipt_line_item_id: number, quantity_claimed: number, allocated_amount: number, created_at: string, line_description: string, line_index: number }>}
 */
export function listReceiptClaimsForReceipt(receiptId) {
  const n = Number(receiptId);
  if (!Number.isInteger(n) || n < 1) {
    return [];
  }
  const stmt = db.prepare(
    `SELECT rc.id, rc.receipt_claim_message_id, rc.receipt_line_item_id,
            rc.quantity_claimed, rc.allocated_amount, rc.created_at,
            rli.description AS line_description, rli.line_index
     FROM receipt_claims rc
     JOIN receipt_claim_messages rcm ON rcm.id = rc.receipt_claim_message_id
     JOIN receipt_line_items rli ON rli.id = rc.receipt_line_item_id
     WHERE rcm.receipt_id = ?
     ORDER BY rc.created_at ASC, rc.id ASC`,
  );
  return stmt.all(n);
}
