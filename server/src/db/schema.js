/**
 * @param {import("better-sqlite3").Database} db
 */
export function applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipt_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stored_filename TEXT NOT NULL,
      original_filename TEXT,
      mimetype TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      merchant_name TEXT,
      transaction_date TEXT,
      currency TEXT,
      subtotal REAL,
      tax_total REAL,
      tip_total REAL,
      total REAL,
      grand_total REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL REFERENCES receipt_uploads(id) ON DELETE CASCADE,
      line_index INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_receipt_line_items_receipt_id
      ON receipt_line_items(receipt_id);

    CREATE TABLE IF NOT EXISTS receipt_claim_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL REFERENCES receipt_uploads(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_receipt_claim_messages_receipt_id
      ON receipt_claim_messages(receipt_id);

    CREATE TABLE IF NOT EXISTS receipt_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_claim_message_id INTEGER NOT NULL REFERENCES receipt_claim_messages(id) ON DELETE CASCADE,
      receipt_line_item_id INTEGER NOT NULL REFERENCES receipt_line_items(id) ON DELETE CASCADE,
      quantity_claimed REAL NOT NULL,
      allocated_amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_receipt_claims_message_id
      ON receipt_claims(receipt_claim_message_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_claims_line_item_id
      ON receipt_claims(receipt_line_item_id);
  `);

  try {
    db.exec(`ALTER TABLE receipt_uploads DROP COLUMN analysis_text`);
  } catch {
    /* column absent or SQLite version without DROP COLUMN */
  }

  try {
    db.exec(`DROP TABLE IF EXISTS summaries`);
  } catch {
    /* ignore */
  }

  for (const [col, sqlType] of [
    ["merchant_name", "TEXT"],
    ["transaction_date", "TEXT"],
    ["currency", "TEXT"],
    ["subtotal", "REAL"],
    ["tax_total", "REAL"],
    ["tip_total", "REAL"],
    ["total", "REAL"],
    ["grand_total", "REAL"],
  ]) {
    try {
      db.exec(`ALTER TABLE receipt_uploads ADD COLUMN ${col} ${sqlType}`);
    } catch {
      /* column already exists */
    }
  }
}
