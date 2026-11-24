import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "node:crypto";
import { z } from "zod";

/**
 * Secure first-admin bootstrap endpoint.
 *
 * Creates the initial super_admin account ONLY when:
 * 1. No admin users exist in the database
 * 2. ADMIN_BOOTSTRAP_SECRET environment variable is set and matches the provided secret
 * 3. Request body passes validation
 *
 * This endpoint should be disabled/removed after first use in production.
 *
 * Usage:
 * POST /api/auth/bootstrap
 * Headers: Content-Type: application/json
 * Body: { "secret": "your-bootstrap-secret", "username": "admin", "email": "admin@example.com", "password": "SecurePass123!", "full_name": "Restaurant Owner" }
 */

const bootstrapSchema = z.object({
  secret: z.string().min(1, "Bootstrap secret is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Valid email is required"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  full_name: z.string().min(2, "Full name is required").max(100),
});

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: only allow bootstrap once
    const db = getDb();
    const userCount = db.prepare("SELECT COUNT(*) as count FROM admin_users").get() as { count: number };

    if (userCount.count > 0) {
      return NextResponse.json(
        { error: "Bootstrap already completed. Admin user exists.", code: "BOOTSTRAP_COMPLETED" },
        { status: 409 }
      );
    }

    // Check if bootstrap secret is configured
    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Bootstrap not configured. Set ADMIN_BOOTSTRAP_SECRET env var.", code: "BOOTSTRAP_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    // Validate request body
    const body = await req.json();
    const parsed = bootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { secret, username, email, password, full_name } = parsed.data;

    // Verify bootstrap secret (timing-safe comparison)
    const expectedBuffer = Buffer.from(expectedSecret);
    const providedBuffer = Buffer.from(secret);
    if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      return NextResponse.json(
        { error: "Invalid bootstrap secret", code: "INVALID_BOOTSTRAP_SECRET" },
        { status: 401 }
      );
    }

    // Check if username or email already exists (defensive)
    const existingUser = db.prepare("SELECT id FROM admin_users WHERE username = ? OR email = ?").get(username, email);
    if (existingUser) {
      return NextResponse.json(
        { error: "Username or email already exists", code: "USER_EXISTS" },
        { status: 409 }
      );
    }

    // Create the first super_admin
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const userId = "usr_" + crypto.randomUUID().slice(0, 8);

    db.prepare(`
      INSERT INTO admin_users (id, username, email, password_hash, salt, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 'super_admin', 1)
    `).run(userId, username, email, passwordHash, salt, full_name);

    // Log the bootstrap action
    db.prepare(`
      INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, full_name, "bootstrap", "admin_users", userId, `First super_admin created: ${username}`);

    return NextResponse.json({
      success: true,
      message: "First admin account created successfully",
      user: { id: userId, username, email, full_name, role: "super_admin" },
    });
  } catch (error) {
    console.error("[Bootstrap Error]:", error);
    return NextResponse.json(
      { error: "Failed to bootstrap admin account", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}