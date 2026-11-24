import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { initDatabase } from "./schema.ts";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "restaurant.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __restaurant_db: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (!global.__restaurant_db) {
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    initDatabase(db);

    // node:sqlite returns row objects created with Object.create(null).
    // React Server Components (Next.js 15/16 RSC) strictly rejects null-prototype
    // objects passed from Server to Client Components.
    // Intercepting prepare().all and prepare().get guarantees all rows across the
    // entire application are standard plain objects with Object.prototype.
    const origPrepare = db.prepare.bind(db);
    db.prepare = function (sql: string) {
      const stmt = origPrepare(sql);
      const origAll = stmt.all.bind(stmt);
      const origGet = stmt.get.bind(stmt);
      const stmtAny = stmt as unknown as { iterate?: (...args: unknown[]) => Iterable<unknown> };
      const origIterate = typeof stmtAny.iterate === "function" ? stmtAny.iterate.bind(stmt) : null;
      stmt.all = function (...args: unknown[]) {
        const rows = origAll(...args);
        return rows.map((r: unknown) => (r && typeof r === "object" ? { ...r } : r));
      };
      stmt.get = function (...args: unknown[]) {
        const r = origGet(...args);
        return r && typeof r === "object" ? { ...r } : r;
      };
      if (origIterate) {
        stmtAny.iterate = function* (...args: unknown[]) {
          for (const row of origIterate(...args)) {
            yield row && typeof row === "object" ? { ...row } : row;
          }
        };
      }
      return stmt;
    };

    global.__restaurant_db = db;
  }
  return global.__restaurant_db;
}

/**
 * Creates an atomic, hot snapshot backup of the SQLite database using VACUUM INTO.
 * Safe to execute while the database is actively receiving reads and writes.
 */
export function backupDatabase(targetPath?: string): string {
  const db = getDb();
  const backupFile = targetPath || path.join(DATA_DIR, `restaurant_backup_${Date.now()}.sqlite`);
  // Ensure target doesn't already exist because VACUUM INTO fails if target file exists
  if (fs.existsSync(/*turbopackIgnore: true*/ backupFile)) {
    fs.unlinkSync(backupFile);
  }
  db.exec(`VACUUM INTO '${backupFile.replace(/'/g, "''")}'`);
  return backupFile;
}

export default getDb;
