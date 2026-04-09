const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ── Database setup ──────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'kyraxx.db');
const db = new Database(DB_PATH);

// Performance pragmas for lightweight operation
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -2000');   // 2MB cache
db.pragma('temp_store = MEMORY');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    content_raw     TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    urls            TEXT,
    clean_text      TEXT,
    code            TEXT,
    attachments     TEXT,
    channel_posted  TEXT NOT NULL,
    message_id      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    deleted         INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_entries_user    ON entries(user_id);
  CREATE INDEX IF NOT EXISTS idx_entries_type    ON entries(content_type);
  CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at);
`);

// FTS5 for full-text search
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    content_raw,
    clean_text,
    urls,
    content='entries',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, content_raw, clean_text, urls)
    VALUES (new.id, new.content_raw, new.clean_text, new.urls);
  END;

  CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content_raw, clean_text, urls)
    VALUES ('delete', old.id, old.content_raw, old.clean_text, old.urls);
  END;
`);

// ── Prepared statements ─────────────────────────────────────────────────────

const stmtInsert = db.prepare(`
  INSERT INTO entries (user_id, content_raw, content_type, urls, clean_text, code, attachments, channel_posted, message_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtSearch = db.prepare(`
  SELECT e.* FROM entries e
  JOIN entries_fts fts ON e.id = fts.rowid
  WHERE entries_fts MATCH ?
    AND e.user_id = ?
    AND e.deleted = 0
  ORDER BY e.created_at DESC
  LIMIT 10
`);

const stmtRecent = db.prepare(`
  SELECT * FROM entries
  WHERE user_id = ? AND deleted = 0
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtSoftDelete = db.prepare(`
  UPDATE entries SET deleted = 1 WHERE id = ? AND user_id = ?
`);

const stmtStats = db.prepare(`
  SELECT content_type, COUNT(*) as count
  FROM entries
  WHERE user_id = ? AND deleted = 0
  GROUP BY content_type
`);

const stmtGetById = db.prepare(`
  SELECT * FROM entries WHERE id = ? AND user_id = ? AND deleted = 0
`);

// ── Exported API ────────────────────────────────────────────────────────────

function saveEntry(userId, parsed, channelId, messageId) {
  const result = stmtInsert.run(
    userId,
    parsed.raw,
    parsed.route || 'unknown',
    parsed.urls.length ? JSON.stringify(parsed.urls) : null,
    parsed.text || null,
    parsed.codeBlocks.length ? JSON.stringify(parsed.codeBlocks) : null,
    parsed.attachments.length ? JSON.stringify(parsed.attachments) : null,
    channelId,
    messageId
  );
  return result.lastInsertRowid;
}

function search(userId, query) {
  // Escape FTS5 special characters and add prefix matching
  const safeQuery = query.replace(/['"*()]/g, '').trim();
  if (!safeQuery) return [];
  try {
    return stmtSearch.all(`"${safeQuery}"`, userId);
  } catch {
    return [];
  }
}

function getRecent(userId, limit = 5) {
  return stmtRecent.all(userId, Math.min(limit, 20));
}

function deleteEntry(userId, entryId) {
  const result = stmtSoftDelete.run(entryId, userId);
  return result.changes > 0;
}

function getStats(userId) {
  return stmtStats.all(userId);
}

function getById(userId, entryId) {
  return stmtGetById.get(entryId, userId);
}

function close() {
  db.close();
}

module.exports = { saveEntry, search, getRecent, deleteEntry, getStats, getById, close };
