/**
 * Centralized API client for all Admin Dashboard requests.
 * Enforces:
 * 1. credentials: "include" so cookies are transmitted across tunnels, previews, and origins.
 * 2. Automatic 401 handling: redirects to /admin/login when session is missing or expired.
 * 3. Consistent JSON error formatting.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  // Do not set Content-Type if uploading FormData (browser must set boundary)
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Extract csrf_token from cookie if available in browser for state-mutating requests
  if (typeof document !== "undefined") {
    const method = (init?.method || "GET").toUpperCase();
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
      if (match && match[1] && !headers.has("X-CSRF-Token")) {
        headers.set("X-CSRF-Token", decodeURIComponent(match[1]));
      }
    }
  }

  const options: RequestInit = {
    ...init,
    headers,
    credentials: "include",
  };

  try {
    const res = await fetch(input, options);

    if (res.status === 401 && typeof window !== "undefined") {
      // Clear dead cookie client-side to prevent redirect loops
      document.cookie = "restaurant_admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      if (window.location.pathname !== "/admin/login") {
        window.location.href = `/admin/login?expired=1`;
      }
    }

    return res;
  } catch (error) {
    console.error("[adminFetch] Network or CORS failure:", error);
    throw error;
  }
}

