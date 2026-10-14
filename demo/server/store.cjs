'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

/** EntityStore contract: async get/list/set/delete, transaction(callback), close.
 * transaction callbacks use one isolated connection; commit only on success.
 * A DM8 adapter may be injected into createApplication({store}). JSON is canonical
 * entity payload. collection + id is a unique key; no in-memory fallback is allowed.
 */
class SQLiteStore {
  constructor(filename = ':memory:') {
    if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    this.kind = 'sqlite';
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS entity_records (collection TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(collection,id))');
    if (filename !== ':memory:') fs.chmodSync(filename, 0o600);
    this.read = this.db.prepare('SELECT value FROM entity_records WHERE collection=? AND id=?');
    this.scan = this.db.prepare('SELECT value FROM entity_records WHERE collection=? ORDER BY id');
    this.write = this.db.prepare('INSERT INTO entity_records(collection,id,value) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET value=excluded.value');
    this.remove = this.db.prepare('DELETE FROM entity_records WHERE collection=? AND id=?');
    this.queue = Promise.resolve();
  }
  async get(collection, id) { const row = this.read.get(collection, String(id)); return row ? JSON.parse(row.value) : null; }
  async list(collection) { return this.scan.all(collection).map(row => JSON.parse(row.value)); }
  async set(collection, id, value) { this.write.run(collection, String(id), JSON.stringify(value)); }
  async delete(collection, id) { this.remove.run(collection, String(id)); }
  async transaction(callback) {
    const previous = this.queue;
    let release;
    this.queue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      this.db.exec('BEGIN IMMEDIATE');
      const result = await callback(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    finally { release(); }
  }
  async close() { await this.queue; this.db.close(); }
}
module.exports = { SQLiteStore };
