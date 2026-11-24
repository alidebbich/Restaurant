/**
 * Centralized Authorization Middleware
 *
 * Provides consistent authentication and authorization for all admin API routes.
 * All admin routes should use this middleware to ensure:
 * 1. User is authenticated (valid session)
 * 2. User has required permissions for the module
 * 3. Consistent error responses
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse, forbiddenResponse, type UserRole } from "./auth";

export type AdminModule = "menu" | "orders" | "reservations" | "settings" | "users" | "content";

export interface AuthMiddlewareOptions {
  /** Required module permission (e.g., "menu", "orders", etc.) */
  requiredModule?: AdminModule;
  /** Custom permission check function */
  customCheck?: (user: { role: UserRole }) => boolean;
  /** Whether to allow unauthenticated access (for public endpoints) */
  allowUnauthenticated?: boolean;
}

/**
 * Creates an authorization middleware for admin API routes
 *
 * @param options - Authorization options
 * @returns Middleware function that returns NextResponse if unauthorized/forbidden, or null if authorized
 */
export async function requireAdminAuth(
  req: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<NextResponse | null> {
  const { requiredModule, customCheck, allowUnauthenticated = false } = options;

  try {
    const user = await getCurrentUser();

    // Not authenticated
    if (!user) {
      if (allowUnauthenticated) {
        return null;
      }
      return unauthorizedResponse();
    }

    // Check if user is active
    if (!user.is_active) {
      return forbiddenResponse("Compte désactivé");
    }

    // Custom permission check
    if (customCheck && !customCheck(user)) {
      return forbiddenResponse();
    }

    // Module-based permission check
    if (requiredModule && !hasPermission(user.role, requiredModule)) {
      return forbiddenResponse();
    }

    // Attach user to request for downstream use
    (req as NextRequest & { adminUser: typeof user }).adminUser = user;

    return null; // Authorized
  } catch (error) {
    console.error("[Auth Middleware Error]:", error);
    return unauthorizedResponse("Erreur d'authentification");
  }
}

/**
 * Higher-order function to wrap API route handlers with auth middleware
 *
 * @param handler - The API route handler function
 * @param options - Authorization options
 * @returns Wrapped handler with auth check
 */
export function withAdminAuth(
  handler: (req: NextRequest, user: Awaited<ReturnType<typeof getCurrentUser>>) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdminAuth(req, options);
    if (authResult) {
      return authResult;
    }

    const user = (req as NextRequest & { adminUser: Awaited<ReturnType<typeof getCurrentUser>> }).adminUser;
    return handler(req, user!);
  };
}

/**
 * Convenience middleware for common admin modules
 */
export const adminAuth = {
  /** Require super_admin or restaurant_owner role */
  superAdmin: (req: NextRequest) => requireAdminAuth(req, {
    customCheck: (user) => user.role === "super_admin" || user.role === "restaurant_owner",
  }),

  /** Require menu management permission */
  menu: (req: NextRequest) => requireAdminAuth(req, { requiredModule: "menu" }),

  /** Require orders management permission */
  orders: (req: NextRequest) => requireAdminAuth(req, { requiredModule: "orders" }),

  /** Require reservations management permission */
  reservations: (req: NextRequest) => requireAdminAuth(req, { requiredModule: "reservations" }),

  /** Require settings management permission */
  settings: (req: NextRequest) => requireAdminAuth(req, { requiredModule: "settings" }),

  /** Require users management permission (super_admin only) */
  users: (req: NextRequest) => requireAdminAuth(req, { requiredModule: "users" }),

  /** Require content management permission */
  content: (req: NextRequest) => requireAdminAuth(req, { requiredModule: "content" }),

  /** Require stats permission (any admin role) */
  stats: (req: NextRequest) => requireAdminAuth(req, { requiredModule: "menu" }), // any admin can see stats

  /** Any authenticated admin user */
  any: (req: NextRequest) => requireAdminAuth(req),
};

/**
 * Get the authenticated admin user from request (after middleware)
 */
export function getAdminUser(req: NextRequest): Awaited<ReturnType<typeof getCurrentUser>> | null {
  return (req as NextRequest & { adminUser: Awaited<ReturnType<typeof getCurrentUser>> }).adminUser || null;
}