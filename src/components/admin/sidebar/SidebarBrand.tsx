"use client";

import React from "react";
import Link from "next/link";
import { X } from "lucide-react";

type SidebarBrandProps = {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
};

export function SidebarBrand({
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
}: SidebarBrandProps) {
  return (
    <div
      className={`group/header relative flex items-center h-16 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
        isCollapsed ? "px-2 justify-center" : "px-4 justify-between"
      }`}
      style={{
        borderBottom: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Brand Identity */}
      <Link
        href="/admin"
        className="group flex items-center min-w-0 rounded-lg p-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
        title="Dar Zitoun — Administration"
        aria-label="Dar Zitoun Administration"
      >
        {/* Compact Logo (34px, rounded-xl, subtle gold ring) */}
        <div
          className="relative flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{
            background: "linear-gradient(135deg, rgba(201, 162, 75, 0.25) 0%, rgba(11, 26, 19, 0.8) 100%)",
            border: "1px solid rgba(201, 162, 75, 0.35)",
            boxShadow: "0 0 12px rgba(201, 162, 75, 0.15)",
          }}
        >
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{
              fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              color: "#C9A24B",
            }}
          >
            DZ
          </span>
        </div>

        {/* Brand Text with smooth sliding width & opacity */}
        <div
          className={`flex flex-col min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCollapsed
              ? "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
              : "max-w-[180px] opacity-100 translate-x-0 ms-3"
          }`}
        >
          <span
            className="text-[19px] font-medium leading-none tracking-wide text-white truncate"
            style={{
              fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              letterSpacing: "0.02em",
            }}
          >
            Dar Zitoun
          </span>
          <span
            className="text-[10px] font-medium tracking-wider uppercase mt-1 leading-none text-[#A8BCAE]"
            style={{
              letterSpacing: "0.08em",
            }}
          >
            Gestion du restaurant
          </span>
        </div>
      </Link>

      {/* Mobile Close Button (only displayed on mobile drawer) */}
      {isMobile && (
        <button
          id="btn-sidebar-close"
          type="button"
          onClick={onCloseMobile}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A8BCAE] hover:text-white hover:bg-white/[0.06] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] flex-shrink-0"
          aria-label="Fermer la barre latérale"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
