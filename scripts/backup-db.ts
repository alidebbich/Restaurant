#!/usr/bin/env tsx
/**
 * Database Backup Script
 *
 * Creates a hot snapshot backup of the SQLite database using VACUUM INTO.
 * Safe to execute while the database is actively receiving reads and writes.
 */

import { backupDatabase } from "../src/lib/db";

async function main() {
  try {
    const backupPath = backupDatabase();
    console.log(`✅ Database backed up to: ${backupPath}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  }
}

main();