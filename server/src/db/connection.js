import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { applySchema } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, "..", "..", "data", "app.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

applySchema(db);
