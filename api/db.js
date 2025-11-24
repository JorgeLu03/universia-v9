import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'scores.db');

const db = new Database(process.env.DB_PATH ?? dbPath);
db.pragma('journal_mode = WAL');

// Crear tabla inicial con constraint flexible de points
db.prepare(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    username TEXT NOT NULL,
    level INTEGER NOT NULL CHECK(level IN (1,2,3)),
    points INTEGER NOT NULL CHECK(points >= 100 AND points <= 600),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

// Migración para agregar la columna difficulty si no existe
try {
  db.prepare(`ALTER TABLE scores ADD COLUMN difficulty TEXT DEFAULT 'normal'`).run();
  console.log('✅ Columna difficulty agregada exitosamente');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('ℹ️ Columna difficulty ya existe');
  } else {
    console.warn('⚠️ Error al agregar columna difficulty:', error.message);
  }
}

// Actualizar registros existentes que no tengan difficulty
try {
  const updated = db.prepare(`UPDATE scores SET difficulty = 'normal' WHERE difficulty IS NULL`).run();
  if (updated.changes > 0) {
    console.log(`✅ ${updated.changes} registros actualizados con difficulty por defecto`);
  }
} catch (error) {
  console.warn('⚠️ Error al actualizar difficulty por defecto:', error.message);
}

export default db;