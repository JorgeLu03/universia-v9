import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH ?? './data/scores.db');
db.pragma('journal_mode = WAL');

db.prepare(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    username TEXT NOT NULL,
    level INTEGER NOT NULL CHECK(level IN (1,2,3)),
    points INTEGER NOT NULL CHECK(points IN (100,200,300)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

export default db;