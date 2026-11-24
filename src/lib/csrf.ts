/**
 * CSRF Protection using Double-Submit Cookie Pattern
 *
 * This implements the double-submit cookie pattern for CSRF protection:
 * 1. Server generates a random CSRF token and sets it in a cookie (httpOnly: false, sameSite: "lax")
 * 2. Client reads the token from the cookie and includes it in requests (header or form field)
 * 3. Server validates that the token in the request matches the token in the cookie
 *
 * This works because:
 * - The cookie is sent automatically with requests (same-site)
 * - But the attacker cannot READ the cookie value to include it in their forged request
 * - SameSite=lax prevents the cookie from being sent on cross-site POST requests
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/** Generate a new CSRF token */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Hash a CSRF token for storage (optional, for extra security) */
export function hashCsrfToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Get the CSRF token from the cookie */
export async function getCsrfTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/** Set the CSRF token cookie */
export async function setCsrfTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false, // Must be readable by JavaScript for double-submit pattern
    secure: isProduction,
    sameSite: "lax" as const, // lax allows the cookie on top-level navigation, strict blocks on all cross-site
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
  cookieStore.set(cookieOptions);
}

/** Delete the CSRF token cookie */
export async function deleteCsrfTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}

/** Validate CSRF token from request against cookie */
export async function validateCsrfToken(req: NextRequest, explicitToken?: string): Promise<boolean> {
  // Get token from cookie
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return false;
  }

  // Get token from header (preferred) or explicit parameter (e.g. from JSON body)
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  const requestToken = explicitToken || headerToken;

  if (!requestToken) {
    return false;
  }

  // Timing-safe comparison
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(requestToken);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Middleware to ensure CSRF token exists (creates if missing) */
export async function ensureCsrfToken(): Promise<string> {
  let token = await getCsrfTokenFromCookie();
  if (!token) {
    token = generateCsrfToken();
    await setCsrfTokenCookie(token);
  }
  return token;
}

/** Create a response with CSRF token set */
export function withCsrfToken(response: NextResponse, token: string): NextResponse {
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

/** CSRF protection middleware for API routes */
export async function csrfProtection(req: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return null;
  }

  const isValid = await validateCsrfToken(req);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid CSRF token", code: "CSRF_INVALID" },
      { status: 403 }
    );
  }

  return null; // Valid, continue
}

/** Client-side helper: get CSRF token from cookie (for use in fetch requests) */
export function getCsrfTokenFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return value;
    }
  }
  return null;
}

/** Client-side: add CSRF token to fetch options */
export function addCsrfToFetchOptions(options: RequestInit = {}): RequestInit {
  const token = getCsrfTokenFromDocumentCookie();
  if (!token) return options;

  const headers = new Headers(options.headers);
  headers.set(CSRF_HEADER_NAME, token);
  return { ...options, headers };
}