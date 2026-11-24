#!/usr/bin/env tsx
/**
 * Database Verification Script
 *
 * Lists all tables and their row counts in the SQLite database.
 */

import { getDb } from "../src/lib/db";

async function main() {
  try {
    const db = getDb();

    // Get all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];

    console.log("📊 Database Verification");
    console.log("========================\n");

    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
        console.log(`${table.name}: ${count.count} rows`);
      } catch (error) {
        console.log(`${table.name}: ERROR - ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Check WAL mode
    const journalMode = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    console.log(`\n📝 Journal Mode: ${journalMode.journal_mode}`);

    // Check foreign keys
    const foreignKeys = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
    console.log(`🔗 Foreign Keys: ${foreignKeys.foreign_keys === 1 ? "ON" : "OFF"}`);

    // Database file size
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dbPath = path.join(process.cwd(), "data", "restaurant.sqlite");
    const stats = fs.statSync(dbPath);
    console.log(`💾 Database Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

main();