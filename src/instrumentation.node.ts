/**
 * Node.js Runtime Instrumentation
 * This file is only loaded when `process.env.NEXT_RUNTIME === 'nodejs'`.
 * Isolating Node APIs into this file prevents them from leaking into the Next.js Edge bundle.
 */

import { getValidatedEnv } from "./lib/env";
import { getDb } from "./lib/db";

if (process.env.NEXT_PHASE !== "phase-production-build") {
  // Validate environment variables
  try {
    getValidatedEnv();
  } catch (error) {
    console.error("Failed to validate environment:", error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  // Initialize database connection
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    console.log("✅ Database connection established");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  console.log(`🚀 Dar Zitoun starting in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`📍 Site URL: ${process.env.SITE_URL || "http://localhost:3000"}`);

  // Graceful shutdown listeners
  const shutdown = (signal: string) => {
    console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

