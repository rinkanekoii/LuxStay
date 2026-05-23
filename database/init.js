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
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      price_per_night INTEGER NOT NULL,
      max_guests INTEGER NOT NULL,
      beds TEXT NOT NULL,
      amenities TEXT NOT NULL,
      rating REAL DEFAULT 4.8,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      guests INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmed',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(room_id) REFERENCES rooms(id)
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

  // Lightweight migrations for older LuxStay lab databases. SQLite, the tiny filing cabinet
  // pretending to be infrastructure, will ignore columns that already exist.
  try { db.run("ALTER TABLE rooms ADD COLUMN city TEXT DEFAULT 'Đà Nẵng'"); } catch (_) {}
  try { db.run("ALTER TABLE rooms ADD COLUMN image TEXT DEFAULT '/img/room-skyline.svg'"); } catch (_) {}
  try { db.run("ALTER TABLE rooms ADD COLUMN price_per_night INTEGER DEFAULT 1200000"); } catch (_) {}
  try { db.run("ALTER TABLE rooms ADD COLUMN max_guests INTEGER DEFAULT 2"); } catch (_) {}
  try { db.run("ALTER TABLE rooms ADD COLUMN beds TEXT DEFAULT '1 giường queen'"); } catch (_) {}
  try { db.run("ALTER TABLE rooms ADD COLUMN rating REAL DEFAULT 4.8"); } catch (_) {}
  try { db.run('ALTER TABLE rooms ADD COLUMN is_available INTEGER DEFAULT 1'); } catch (_) {}

  try { db.run("ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'confirmed'"); } catch (_) {}
  try { db.run('ALTER TABLE bookings ADD COLUMN note TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE bookings ADD COLUMN total_price INTEGER DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE bookings ADD COLUMN guests INTEGER DEFAULT 1'); } catch (_) {}
  try { db.run('ALTER TABLE bookings ADD COLUMN check_in DATE'); } catch (_) {}
  try { db.run('ALTER TABLE bookings ADD COLUMN check_out DATE'); } catch (_) {}

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

  let lastInsertRowid = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || null;
  const insertMatch = String(sql).match(/^\s*INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (insertMatch) {
    const tableName = insertMatch[1];
    lastInsertRowid = db.exec(`SELECT MAX(rowid) FROM ${tableName}`)[0]?.values[0]?.[0] || lastInsertRowid;
  }

  save();
  return {
    lastInsertRowid,
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
