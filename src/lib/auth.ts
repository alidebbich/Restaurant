import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "./db";

export type UserRole = "super_admin" | "restaurant_owner" | "manager" | "menu_manager" | "order_manager";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: number;
};

const SESSION_COOKIE = "restaurant_admin_token";
// High-security session: 2 hours maximum lifetime, browser session cookie (cleared when browser closes)
const SESSION_DURATION_HOURS = 2;

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(checkHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Determine if we should use secure cookies.
 * In production: always secure.
 * In development: secure only if explicitly enabled via env var (for HTTPS local dev).
 */
async function determineCookieSecurity(): Promise<boolean> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const proto = h.get("x-forwarded-proto");
    if (proto) return proto === "https";
    const host = h.get("host") || "";
    // Allow secure cookies in dev if FORCE_SECURE_COOKIES is set (e.g., for HTTPS localhost with mkcert)
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return process.env.FORCE_SECURE_COOKIES === "true";
    }
    return process.env.NODE_ENV === "production";
  } catch {
    // Default to secure in production
    return process.env.NODE_ENV === "production";
  }
}

/**
 * Get cookie options with hardened security settings.
 * Without a multi-day expires/maxAge, the browser clears the session cookie
 * when closed, and the session expires after 2 hours for security.
 */
async function getSessionCookieOptions(expiresAt?: Date) {
  const isSecure = await determineCookieSecurity();
  const isProduction = process.env.NODE_ENV === "production";

  return {
    name: SESSION_COOKIE,
    httpOnly: true,           // Prevent XSS access to session token
    secure: isSecure,         // Only sent over HTTPS (or forced in dev)
    sameSite: isProduction ? ("strict" as const) : ("lax" as const), // Strict in prod, lax in dev
    path: "/",
    maxAge: SESSION_DURATION_HOURS * 3600, // Maximum 2 hours lifetime (never 7 days)
  };
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const id = "sess_" + crypto.randomUUID().slice(0, 8);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, tokenHash, expiresAt);

  const cookieStore = await cookies();
  const cookieOptions = await getSessionCookieOptions(new Date(expiresAt));
  cookieStore.set(cookieOptions.name, rawToken, cookieOptions);

  return rawToken;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!rawToken) return null;

    const tokenHash = hashSessionToken(rawToken);
    const db = getDb();
    const row = db.prepare(`
      SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active, s.expires_at, s.token as stored_token_hash
      FROM sessions s
      JOIN admin_users u ON u.id = s.user_id
      WHERE s.token = ? AND u.is_active = 1
    `).get(tokenHash) as (SessionUser & { expires_at: string; stored_token_hash: string }) | undefined;

    if (!row) return null;

    // Timing-safe verification of the token hash
    const a = Buffer.from(row.stored_token_hash, "hex");
    const b = Buffer.from(tokenHash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    // Check expiration - robust UTC handling for SQLite timestamps
    const expDate = new Date(
      row.expires_at.endsWith("Z")
        ? row.expires_at
        : row.expires_at.replace(" ", "T") + "Z"
    );
    if (expDate < new Date()) {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(tokenHash);
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      is_active: row.is_active,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      const db = getDb();
      db.prepare("DELETE FROM sessions WHERE token = ?").run(tokenHash);
    }
    cookieStore.delete(SESSION_COOKIE);
  } catch {
    // Ignore error
  }
}

export function authenticateUser(usernameOrEmail: string, password: string): SessionUser | null {
  const db = getDb();
  const user = db.prepare(`
    SELECT * FROM admin_users
    WHERE (username = ? OR email = ?) AND is_active = 1
  `).get(usernameOrEmail, usernameOrEmail) as {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: UserRole;
    password_hash: string;
    salt: string;
    is_active: number;
  } | undefined;

  if (!user) return null;

  if (!verifyPassword(password, user.password_hash, user.salt)) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
  };
}

export function hasPermission(role: UserRole, module: "menu" | "orders" | "reservations" | "settings" | "users" | "content"): boolean {
  if (role === "super_admin" || role === "restaurant_owner") return true;
  if (role === "manager") return module !== "users";
  if (role === "menu_manager") return module === "menu" || module === "content";
  if (role === "order_manager") return module === "orders" || module === "reservations";
  return false;
}

export function unauthorizedResponse(message = "Non authentifié") {
  const res = NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export function forbiddenResponse(message = "Action non autorisée pour ce rôle") {
  return NextResponse.json({ error: message, code: "FORBIDDEN" }, { status: 403 });
}

