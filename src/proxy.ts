import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { site } from "@/config/site.config";

const intlMiddleware = createMiddleware({
  locales: [...site.locales],
  defaultLocale: site.defaultLocale,
  localePrefix: "always",
});

/**
 * Generate a random nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Content Security Policy
 */
function getCSPHeader(nonce: string): string {
  const nonceAttr = `'nonce-${nonce}'`;
  const scriptSrc = [
    "'self'",
    nonceAttr,
    "'unsafe-inline'", // Required for Next.js inline scripts
    ...(process.env.NODE_ENV !== "production" ? ["'unsafe-eval'"] : []), // Required for Next.js development HMR only
  ].join(" ");

  const styleSrc = [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind/Next.js inline styles and motion
    "https://fonts.googleapis.com",
  ].join(" ");

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https:",
  ].join(" ");

  const fontSrc = [
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
  ].join(" ");

  const connectSrc = [
    "'self'",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
  ].join(" ");

  const frameAncestors = "'none'";

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `font-src ${fontSrc}`,
    `connect-src ${connectSrc}`,
    `frame-ancestors ${frameAncestors}`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join("; ");
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse, nonce: string, isAdminRoute: boolean, isApiRoute: boolean): void {
  // Content Security Policy
  response.headers.set("Content-Security-Policy", getCSPHeader(nonce));

  // HTTP Strict Transport Security (HSTS)
  const isProduction = process.env.NODE_ENV === "production";
  const forceHSTS = process.env.FORCE_HSTS === "true";
  if (isProduction || forceHSTS) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "cross-origin-isolated=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=()",
      "geolocation=()",
      "gyroscope=()",
      "hid=()",
      "identity-credentials-get=()",
      "idle-detection=()",
      "local-fonts=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "otp-credentials=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-create=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "serial=()",
      "speaker-selection=()",
      "storage-access=()",
      "usb=()",
      "web-share=()",
      "window-management=()",
      "xr-spatial-tracking=()",
    ].join(", ")
  );

  // Cross-Origin-Opener-Policy (COOP)
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  // Cross-Origin-Resource-Policy (CORP)
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // Remove server header (information disclosure)
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");

  // DNS prefetch control
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // Expect-CT (Certificate Transparency) - production only
  if (isProduction) {
    response.headers.set("Expect-CT", "max-age=86400, enforce");
  }

  // Cache control for admin and API routes
  if (isAdminRoute || isApiRoute) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // Ensure CSRF token cookie exists for client-side forms and API calls
  if (!response.cookies.get("csrf_token")) {
    response.cookies.set("csrf_token", nonce + generateNonce(), {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isApiRoute = pathname.startsWith("/api/");
  const isDevRoute = pathname.startsWith("/dev");

  // Generate nonce for CSP
  const nonce = generateNonce();

  // Bypass i18n for /dev routes
  if (isDevRoute) {
    const response = NextResponse.next();
    addSecurityHeaders(response, nonce, false, false);
    return response;
  }

  // Bypass i18n for /api routes
  if (isApiRoute) {
    const response = NextResponse.next();
    addSecurityHeaders(response, nonce, false, true);
    return response;
  }

  // 1. Admin Route Protection
  if (isAdminRoute) {
    const token = request.cookies.get("restaurant_admin_token")?.value;
    const isLoginPage = pathname === "/admin/login";

    // Unauthenticated visitor trying to access protected admin page
    if (!token && !isLoginPage) {
      const loginUrl = new URL("/admin/login", request.url);
      if (pathname !== "/admin") {
        loginUrl.searchParams.set("next", pathname);
      }
      const response = NextResponse.redirect(loginUrl);
      addSecurityHeaders(response, nonce, isAdminRoute, isApiRoute);
      return response;
    }

    // If arriving with expired=1, clear dead cookie and display login page
    const isExpired = request.nextUrl.searchParams.get("expired") === "1";
    if (isLoginPage && isExpired) {
      const response = NextResponse.next();
      response.cookies.delete("restaurant_admin_token");
      addSecurityHeaders(response, nonce, isAdminRoute, isApiRoute);
      return response;
    }

    // Authenticated user trying to access login page (without expired flag)
    if (token && isLoginPage) {
      const adminUrl = new URL("/admin", request.url);
      const response = NextResponse.redirect(adminUrl);
      addSecurityHeaders(response, nonce, isAdminRoute, isApiRoute);
      return response;
    }

    const response = NextResponse.next();
    addSecurityHeaders(response, nonce, isAdminRoute, isApiRoute);
    return response;
  }

  // 2. Public site multilingual routing (next-intl)
  const response = intlMiddleware(request);
  addSecurityHeaders(response, nonce, isAdminRoute, isApiRoute);
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!api|_next|_vercel|uploads|.*\\..*).*)",
  ],
};
