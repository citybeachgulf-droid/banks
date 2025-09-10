import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function initDB() {
  const db = await open({
    filename: './omanbanks.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank TEXT,
      branch TEXT,
      city TEXT,
      employee TEXT,
      phone TEXT
    )
  `);

  return db;
}

export default initDB;
