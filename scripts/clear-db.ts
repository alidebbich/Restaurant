#!/usr/bin/env tsx
/**
 * Clear / Reset Database Script
 *
 * Usage:
 *   npm run db:clear             - Completely resets database to clean initial state (creates backup first)
 *   npm run db:clear --data-only - Clears only orders, reservations, activity logs, sessions (keeps menu & settings)
 */

import { getDb, backupDatabase } from "../src/lib/db";
import { initDatabase } from "../src/lib/db/schema";

const args = process.argv.slice(2);
const dataOnly = args.includes("--data-only") || args.includes("--orders-only");

async function main() {
  console.log("📦 Creating backup before clearing database...");
  try {
    const backupFile = backupDatabase();
    console.log(`✅ Backup saved to: ${backupFile}`);
  } catch (err) {
    console.warn("⚠️ Could not create automatic backup:", err);
  }

  const db = getDb();
  db.exec("PRAGMA foreign_keys = OFF;");

  if (dataOnly) {
    console.log("🧹 Clearing transactional data (orders, reservations, logs, sessions)...");
    const tables = [
      "orders",
      "order_items",
      "order_status_history",
      "reservations",
      "reservation_status_history",
      "guests",
      "waitlist",
      "notification_log",
      "activity_logs",
      "sessions",
    ];
    for (const table of tables) {
      try {
        db.exec(`DELETE FROM ${table};`);
        console.log(`  ✓ Cleared ${table}`);
      } catch {
        // Table might not exist yet
      }
    }
  } else {
    console.log("🧨 Clearing ALL tables and resetting database to clean initial state...");
    const allTables = [
      "order_status_history",
      "order_items",
      "orders",
      "reservation_status_history",
      "reservations",
      "guests",
      "waitlist",
      "notification_log",
      "activity_logs",
      "sessions",
      "menu_item_option_values",
      "menu_item_options",
      "menu_items",
      "categories",
      "gallery_images",
      "homepage_content",
      "hours_exceptions",
      "operating_hours",
      "reservation_rules",
      "restaurant_settings",
      "admin_users",
    ];
    for (const table of allTables) {
      try {
        db.exec(`DROP TABLE IF EXISTS ${table};`);
        console.log(`  ✓ Dropped ${table}`);
      } catch {
        // Ignore
      }
    }

    console.log("🌱 Re-initializing database schema & default starter data...");
    initDatabase(db);
    console.log("✅ Database re-initialized cleanly with default tables and default admin account.");
  }

  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("VACUUM;");
  console.log("🎉 Database clear completed successfully!");
}

main().catch((err) => {
  console.error("❌ Failed to clear database:", err);
  process.exit(1);
});

