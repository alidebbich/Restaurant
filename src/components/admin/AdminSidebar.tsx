"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  ShoppingBag,
  CalendarCheck,
  FileText,
  Image as ImageIcon,
  QrCode,
  Settings,
  Trash2,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { useSidebarCounts } from "@/lib/hooks/useSidebarCounts";
import { SidebarBrand } from "./sidebar/SidebarBrand";
import { SidebarSearch } from "./sidebar/SidebarSearch";
import { SidebarGroup } from "./sidebar/SidebarGroup";
import { SidebarItem } from "./sidebar/SidebarItem";
import { SidebarUserMenu } from "./sidebar/SidebarUserMenu";

type Props = {
  user: SessionUser | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  pathname: string;
  router: ReturnType<typeof useRouter>;
};

export function AdminSidebar({
  user,
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  pathname,
}: Props) {
  const { orders: ordersCount, reservations: reservationsCount } = useSidebarCounts();
  const [isHovered, setIsHovered] = useState(false);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-expand smoothly when cursor enters sidebar
  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsHovered(true);
  }, []);

  // Auto-collapse smoothly when cursor leaves (160ms grace period so sweeping or diagonal moves don't flicker)
  const handleMouseLeave = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 160);
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // On desktop, the sidebar is a sleek 72px rail that expands to 264px automatically on hover.
  // On mobile drawer, when opened, it is always full width.
  const isCollapsed = sidebarOpen ? false : !isHovered;

  // Auto-collapse below 1024px and handle keyboard shortcut (⌘B to toggle)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsHovered((prev) => !prev);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarCollapsed, setSidebarCollapsed]);

  // Check active route
  const isItemActive = useCallback(
    (href: string) => {
      if (href === "/admin") {
        return pathname === "/admin";
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  return (
    <>
      {/* Main Sidebar Element — Sticky flex item on desktop so page content shifts with it */}
      <aside
        id="mobile-sidebar"
        data-sidebar="admin-sidebar"
        aria-label="Menu d'administration"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}


        className={`z-50 flex flex-col h-screen max-h-screen flex-shrink-0 transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,transform] overflow-hidden ${
          sidebarOpen
            ? "fixed inset-y-0 start-0 translate-x-0 w-[264px]"
            : "fixed inset-y-0 start-0 -translate-x-full lg:relative lg:inset-auto lg:translate-x-0 lg:sticky lg:top-0"
        } ${!sidebarOpen ? (isCollapsed ? "lg:w-[72px]" : "lg:w-[264px]") : ""}`}
        style={{
          background: "linear-gradient(180deg, var(--sidebar-bg-from) 0%, var(--sidebar-bg-to) 100%)",
        }}
      >
        {/* Subtle Right Edge Gradient Border */}
        <div
          className="absolute top-0 bottom-0 end-0 w-[1px] pointer-events-none"
          style={{
            background: "var(--sidebar-border-gradient)",
          }}
          aria-hidden="true"
        />

        {/* Faint Grain / Noise Texture (2-3% opacity) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />

        {/* 1. Header / Brand block */}
        <SidebarBrand
          isCollapsed={isCollapsed}
          isMobile={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* 2. Command Palette / Search Trigger */}
        <SidebarSearch isCollapsed={isCollapsed} />

        {/* 3. Navigation Groups (Scrollable, hidden scrollbar) */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 px-1 space-y-4 sidebar-scrollbar"
          aria-label="Menu principal"
        >
          {/* Group 1: Aperçu */}
          <SidebarGroup label="Aperçu" isCollapsed={isCollapsed}>
            <SidebarItem
              href="/admin"
              label="Tableau de bord"
              icon={LayoutDashboard}
              isActive={isItemActive("/admin")}
              isCollapsed={isCollapsed}
            />
          </SidebarGroup>

          {/* Group 2: Gestion Restaurant */}
          <SidebarGroup label="Gestion Restaurant" isCollapsed={isCollapsed} showDivider>
            <SidebarItem
              href="/admin/menu"
              label="Plats & Menu"
              icon={UtensilsCrossed}
              isActive={isItemActive("/admin/menu")}
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/admin/categories"
              label="Catégories"
              icon={FolderTree}
              isActive={isItemActive("/admin/categories")}
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/admin/orders"
              label="Commandes"
              icon={ShoppingBag}
              isActive={isItemActive("/admin/orders")}
              isCollapsed={isCollapsed}
              count={ordersCount}
              badgeLabel="nouvelles commandes"
            />
            <SidebarItem
              href="/admin/reservations"
              label="Réservations"
              icon={CalendarCheck}
              isActive={isItemActive("/admin/reservations")}
              isCollapsed={isCollapsed}
              count={reservationsCount}
              badgeLabel="en attente"
            />
          </SidebarGroup>

          {/* Group 3: Contenu & Marque */}
          <SidebarGroup label="Contenu & Marque" isCollapsed={isCollapsed} showDivider>
            <SidebarItem
              href="/admin/content"
              label="Page d'accueil"
              icon={FileText}
              isActive={isItemActive("/admin/content")}
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/admin/gallery"
              label="Galerie Photos"
              icon={ImageIcon}
              isActive={isItemActive("/admin/gallery")}
              isCollapsed={isCollapsed}
            />
          </SidebarGroup>

          {/* Group 4: Configuration */}
          <SidebarGroup label="Configuration" isCollapsed={isCollapsed} showDivider>
            <SidebarItem
              href="/admin/qr"
              label="Menu QR Code"
              icon={QrCode}
              isActive={isItemActive("/admin/qr")}
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/admin/settings"
              label="Paramètres"
              icon={Settings}
              isActive={isItemActive("/admin/settings")}
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/admin/trash"
              label="Corbeille"
              icon={Trash2}
              isActive={isItemActive("/admin/trash")}
              isCollapsed={isCollapsed}
              isDestructive={true}
              showSeparatorBefore={true}
            />
          </SidebarGroup>
        </nav>

        {/* 4. Footer Area */}
        <div
          className="flex-shrink-0 flex flex-col p-2 transition-all"
          style={{
            borderTop: "1px solid var(--sidebar-border)",
            background: "linear-gradient(180deg, rgba(7, 18, 13, 0.4) 0%, rgba(11, 26, 19, 0.95) 100%)",
          }}
        >
          {/* User Profile Card */}
          <SidebarUserMenu user={user} isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
}
