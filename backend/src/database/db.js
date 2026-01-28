const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Initialize database
const dbDir = path.join(__dirname, "../../database");
const dbPath = path.join(dbDir, "app.sqlite");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

module.exports = db;
