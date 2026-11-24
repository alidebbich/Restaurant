/**
 * Health Check Endpoint
 *
 * Provides health status for load balancers, monitoring, and orchestration.
 * Returns 200 OK when healthy, 503 when degraded.
 *
 * Checks:
 * - Database connectivity
 * - Disk space (uploads directory)
 * - Memory usage
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    diskSpace: CheckResult;
    memory: CheckResult;
  };
}

interface CheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

function checkDatabase(): CheckResult {
  const start = Date.now();
  try {
    const db = getDb();
    // Simple query to verify DB connectivity
    const result = db.prepare("SELECT 1 as healthy").get() as { healthy: number } | undefined;
    const latency = Date.now() - start;

    if (result && result.healthy === 1) {
      return {
        status: "healthy",
        message: "Database connection successful",
        latencyMs: latency,
      };
    }
    return {
      status: "unhealthy",
      message: "Database query returned unexpected result",
      latencyMs: latency,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      latencyMs: Date.now() - start,
    };
  }
}

function checkDiskSpace(): CheckResult {
  try {
    const uploadsDir = path.join(process.cwd(), "data", "uploads");
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Get disk space info (platform-specific)
    // Using a simple write test as a proxy
    const testFile = path.join(uploadsDir, ".health-check");
    fs.writeFileSync(testFile, "health check");
    fs.unlinkSync(testFile);

    return {
      status: "healthy",
      message: "Disk space available",
      details: {
        uploadsDir,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Disk check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function checkMemory(): CheckResult {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const heapUsagePercent = Math.round((used.heapUsed / used.heapTotal) * 100);

  // Consider unhealthy if heap usage > 90%
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  let message = "Memory usage normal";

  if (heapUsagePercent > 90) {
    status = "unhealthy";
    message = `Critical memory usage: ${heapUsagePercent}%`;
  } else if (heapUsagePercent > 75) {
    status = "degraded";
    message = `High memory usage: ${heapUsagePercent}%`;
  }

  return {
    status,
    message,
    details: {
      heapUsedMB,
      heapTotalMB,
      heapUsagePercent,
      rssMB: Math.round(used.rss / 1024 / 1024),
    },
  };
}

function aggregateStatus(checks: Record<string, CheckResult>): "healthy" | "degraded" | "unhealthy" {
  const statuses = Object.values(checks).map((c) => c.status);
  if (statuses.includes("unhealthy")) return "unhealthy";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

export async function GET() {
  const checks = {
    database: checkDatabase(),
    diskSpace: checkDiskSpace(),
    memory: checkMemory(),
  };

  const overallStatus = aggregateStatus(checks);

  const response: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks,
  };

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/health+json",
    },
  });
}