import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, "../data");

if (!fs.existsSync(dataDir)) {
fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

export default db;
