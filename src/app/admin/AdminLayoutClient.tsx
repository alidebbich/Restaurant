"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronRight, Search, ExternalLink, LogOut, Bell } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { SessionUser } from "@/lib/auth";
import { adminFetch } from "@/lib/apiClient";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NotificationsPopover } from "@/components/admin/ui/NotificationsPopover";

type Props = {
  user: SessionUser | null;
  children: React.ReactNode;
};

export function AdminLayoutClient({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeBreadcrumbs, setActiveBreadcrumbs] = useState<Array<{ label: string; href?: string }>>([]);
  const [mounted, setMounted] = useState(false);
  const [sidebarInitialized, setSidebarInitialized] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Mount detection for SSR hydration safety
  useEffect(() => {
    setMounted(true);

    // Initialize sidebar state from localStorage (client-only)
    try {
      const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
      if (savedCollapsed !== null) {
        setSidebarCollapsed(JSON.parse(savedCollapsed));
      }
      const savedMobileOpen = localStorage.getItem('admin-sidebar-mobile-open');
      if (savedMobileOpen !== null) {
        setSidebarOpen(JSON.parse(savedMobileOpen));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    setSidebarInitialized(true);
  }, []);

  // Persist sidebar collapsed state
  useEffect(() => {
    if (sidebarInitialized) {
      localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed, sidebarInitialized]);

  // Persist mobile sidebar open state
  useEffect(() => {
    if (sidebarInitialized) {
      localStorage.setItem('admin-sidebar-mobile-open', JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen, sidebarInitialized]);

  // Body scroll lock when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [sidebarOpen]);

  // Handle session expiry / redirect to login
  useEffect(() => {
    if (!user && pathname !== "/admin/login") {
      document.cookie = "restaurant_admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.replace(`/admin/login?expired=1`);
    }
  }, [user, pathname, router]);

  // Build breadcrumbs based on current path
  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: Array<{ label: string; href?: string }> = [{ label: "Tableau de bord", href: "/admin" }];

    if (segments.length >= 2 && segments[0] === "admin" && segments[1] !== "login") {
      // We'll need the nav items - could import from a shared location
      const adminNavItems = [
        { href: "/admin", label: "Tableau de bord" },
        { href: "/admin/menu", label: "Plats & Menu" },
        { href: "/admin/categories", label: "Catégories" },
        { href: "/admin/orders", label: "Commandes" },
        { href: "/admin/reservations", label: "Réservations" },
        { href: "/admin/content", label: "Page d'accueil" },
        { href: "/admin/gallery", label: "Galerie Photos" },
        { href: "/admin/qr", label: "Menu QR Code" },
        { href: "/admin/settings", label: "Paramètres" },
        { href: "/admin/trash", label: "Corbeille" },
      ];
      const item = adminNavItems.find((i) => i.href === `/admin/${segments[1]}`);
      if (item) {
        crumbs.push({ label: item.label, href: item.href });
      }
    }

    if (segments.length > 2) {
      const actionMap: Record<string, string> = {
        new: "Nouveau",
        edit: "Modifier",
        view: "Voir",
      };
      const action = actionMap[segments[segments.length - 1]];
      if (action) {
        crumbs.push({ label: action });
      }
    }

    setActiveBreadcrumbs(crumbs);
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Handle logout request from sidebar
  useEffect(() => {
    const handleLogoutRequest = () => {
      setShowLogoutConfirm(true);
    };
    window.addEventListener("admin-logout-requested", handleLogoutRequest);
    return () => window.removeEventListener("admin-logout-requested", handleLogoutRequest);
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    setShowLogoutConfirm(false);
    try {
      // 1. Immediately wipe cookie client-side
      document.cookie = "restaurant_admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      // 2. Destroy server session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      // 3. Hard redirect to login page (wipes all React cache & in-memory state)
      window.location.href = "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    }
  }, []);

  // If on login page, render children full-screen
  if (pathname === "/admin/login") {
    return (
      <div className="admin-shell min-h-screen bg-base text-primary font-sans">
        <Toaster
          position="top-right"
          toastOptions={{
            className: "bg-surface border-border-default text-primary shadow-xl",
            style: {
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
            },
          }}
        />
        {children}
      </div>
    );
  }

  // If no user session, show loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center text-primary font-sans">
        <Toaster position="top-right" />
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-border-subtle border-t-brand-primary" />
            <div className="absolute inset-0 animate-ping rounded-full border-3 border-brand-primary opacity-20" />
          </div>
          <p className="text-sm text-quaternary">Session requise. Redirection vers la page de connexion…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-screen font-sans bg-base">
      {/* Sonner toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "bg-surface border-border-default text-primary shadow-xl",
          style: {
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-xl)",
          },
        }}
      />

      {/* Mobile Sidebar Overlay with Smooth Fade In/Out */}
      <div
        className={`fixed inset-0 z-40 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm lg:hidden transition-all duration-300 ease-out ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      {/* Premium Sidebar — Auto opens on hover on desktop */}
      <AdminSidebar
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        pathname={pathname}
        router={router}
      />

      {/* Main Content Area — Adjusts smoothly with sidebar width */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-base text-primary">
        {/* Top Header — Ivoire & Olive Cream Glass */}
        <header
          className="sticky top-0 z-40 flex h-[58px] items-center justify-between px-4 sm:px-6 lg:px-8 backdrop-blur-xl border-b border-[var(--border-default)] transition-all"
          style={{
            zIndex: 40,
            background: "var(--bg-surface-elevated)",
            boxShadow: "var(--shadow-sm)",
          }}
          role="banner"
        >
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle (only on mobile screens) */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary hover:text-primary bg-surface hover:bg-surface-hover border border-border-subtle shadow-xs transition-all lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center gap-2 flex-1 min-w-0" aria-label="Fil d'Ariane" role="navigation">
              <ol className="flex items-center gap-1.5 flex-wrap">
                {activeBreadcrumbs.map((crumb, index) => (
                  <li key={crumb.href || index} className="flex items-center gap-1.5">
                    {index > 0 && (
                      <ChevronRight className="h-3 w-3 text-tertiary opacity-50 flex-shrink-0" aria-hidden="true" />
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-xs font-medium text-tertiary hover:text-brand-primary transition-colors truncate max-w-[150px]"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-primary truncate max-w-[150px]">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Global Search — ⌘K shortcut pill with direct reservation & order search */}
            <button
              type="button"
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                window.dispatchEvent(event);
              }}
              className="hidden sm:flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs text-secondary hover:text-primary bg-surface hover:bg-surface-hover border border-border-subtle shadow-xs transition-all"
              title="Rechercher une réservation, commande, plat… (⌘K)"
              aria-label="Rechercher"
            >
              <Search className="h-3.5 w-3.5 text-tertiary" />
              <span className="hidden md:inline text-tertiary">Rechercher…</span>
              <kbd className="hidden lg:inline-flex items-center text-[10px] font-mono text-tertiary bg-surface-hover px-1.5 py-0.5 rounded border border-border-subtle">⌘K</kbd>
            </button>

            {/* "Voir le site public" button in navbar */}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-secondary hover:text-primary bg-surface hover:bg-surface-hover border border-border-subtle shadow-xs transition-all"
              title="Voir le site public (nouvel onglet)"
            >
              <ExternalLink className="h-3.5 w-3.5 text-brand-primary" />
              <span>Voir le site</span>
            </Link>

            {/* Live Notifications Popover */}
            <NotificationsPopover />

            {/* Direct Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary hover:text-status-error bg-surface hover:bg-status-error-bg/30 border border-border-subtle hover:border-status-error-border/40 shadow-xs transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut className={`h-4 w-4 ${loggingOut ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Page Body — Centered full-width container */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
          data-lenis-prevent
          role="main"
        >
          <div className="w-full max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-overlay bg-modal-backdrop backdrop-blur-sm animate-fadeIn" onClick={() => setShowLogoutConfirm(false)} aria-hidden="true" />
      )}

      {showLogoutConfirm && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-modal w-[420px] max-w-[90vw] animate-slideUp" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-desc">
          <div className="relative overflow-hidden" style={{
            background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-3xl)",
            boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
            {/* Top gold accent */}
            <div className="absolute top-0 inset-inline-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" aria-hidden="true" />

            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-error-bg)", border: "1px solid var(--status-error-border)" }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--status-error)", boxShadow: "var(--shadow-error-sm)" }}>
                    <X className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <h2 id="logout-title" className="text-xl font-semibold text-primary mb-2">
                  Confirmer la déconnexion
                </h2>
                <p id="logout-desc" className="text-secondary mb-6">
                  Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à l'administration.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="btn-secondary btn-md"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="btn-danger btn-md"
                  >
                    {loggingOut ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                          <path className="opacity-75" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                        </svg>
                        Déconnexion…
                      </>
                    ) : (
                      "Se déconnecter"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn,
          .animate-slideUp {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}