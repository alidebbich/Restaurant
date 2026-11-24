import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { z } from "zod";
import { logActivity } from "@/lib/db/queries";
import { loginRateLimiter } from "@/lib/rate-limit";
import { validateCsrfToken, ensureCsrfToken, withCsrfToken } from "@/lib/csrf";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Zod schema ───────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  username: z.string().min(1, "Username required").max(100),
  password: z.string().min(1, "Password required").max(200),
  _csrf: z.string().optional(), // Accept CSRF token from form field as fallback
});

// ── GET: Provide CSRF token for login form ──────────────────────────────────
export async function GET() {
  const token = await ensureCsrfToken();
  const response = NextResponse.json({ success: true, csrfToken: token });
  return withCsrfToken(response, token);
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // CSRF validation
  const csrfValid = await validateCsrfToken(req);
  if (!csrfValid) {
    return NextResponse.json(
      { error: "Token CSRF invalide. Veuillez rafraîchir la page et réessayer.", code: "CSRF_INVALID" },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const limiter = loginRateLimiter();

  // Rate limit check
  const rateLimitResult = await limiter.limit(ip);
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[login 400 payload]:", body, parsed.error.flatten());
      return NextResponse.json(
        { error: "Nom d'utilisateur et mot de passe requis." },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const user = authenticateUser(username.trim(), password);

    if (!user) {
      logActivity({
        action: "login_failed",
        entityType: "auth",
        details: `Failed login for username: ${username} from IP: ${ip}`,
      });
      return NextResponse.json(
        { error: "Identifiants invalides (nom d'utilisateur ou mot de passe incorrect)" },
        { status: 401 }
      );
    }

    // Success - reset rate limit for this IP
    await limiter.reset(ip);
    await createSession(user.id);
    logActivity({
      userId: user.id,
      userName: user.full_name,
      action: "login_success",
      entityType: "auth",
      entityId: user.id,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la connexion" },
      { status: 500 }
    );
  }
}
