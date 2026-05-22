const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'luxstay.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      password_hash TEXT,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      member_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_name TEXT,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { db.run('ALTER TABLE users ADD COLUMN password TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE users ADD COLUMN member_code TEXT'); } catch (_) {}

  save();
  return db;
}

function save() {
  if (db) fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length ? rows[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
  return {
    lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0],
    changes: db.getRowsModified()
  };
}

function exec(sql) {
  const result = db.exec(sql);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function execRaw(sql) {
  try {
    return { rows: exec(sql), error: null };
  } catch (err) {
    return { rows: [], error: err.message || String(err) };
  }
}

module.exports = { getDb, save, all, get, run, exec, execRaw };
