"use client";

import React, { useState } from "react";
import type { SessionUser } from "@/lib/auth";

type SidebarUserMenuProps = {
  user: SessionUser | null;
  isCollapsed: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  restaurant_owner: "Propriétaire",
  manager: "Manager",
  menu_manager: "Resp. Menu",
  order_manager: "Resp. Commandes",
};

export function SidebarUserMenu({ user, isCollapsed }: SidebarUserMenuProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const roleLabel = (user?.role && ROLE_LABELS[user.role]) || "Super Admin";
  const displayName = user?.full_name || "Administrateur";
  const userInitial = displayName.charAt(0).toUpperCase() || "A";

  return (
    <div className="relative">
      {/* Collapsed State: Sleek Avatar with Online Badge */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-1">
          <div
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={displayName}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(201, 162, 75, 0.2) 0%, rgba(11, 26, 19, 0.9) 100%)",
              border: "1px solid rgba(201, 162, 75, 0.35)",
            }}
          >
            <span className="font-semibold text-xs text-[var(--sidebar-accent)]">
              {userInitial}
            </span>

            {/* Online Status Dot */}
            <span
              className="absolute -bottom-0.5 -end-0.5 flex h-2.5 w-2.5"
              aria-label="En ligne"
            >
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2ec47a] ring-2 ring-[#07120D]" />
            </span>
          </div>

          {/* Floating Tooltip */}
          {showTooltip && (
            <div
              className="absolute start-14 top-1/2 -translate-y-1/2 z-50 rounded-lg px-2.5 py-1 text-xs font-medium text-white shadow-xl pointer-events-none whitespace-nowrap animate-fadeIn"
              style={{
                background: "#0A1B14",
                border: "1px solid var(--sidebar-border)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              }}
            >
              <p className="font-semibold text-[var(--sidebar-text-primary)]">{displayName}</p>
              <p className="text-[10px] text-[var(--sidebar-accent)] font-medium mt-0.5">
                {roleLabel}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Expanded State: Clean User Card (Avatar + Name + Role Badge, No Disconnect Button) */
        <div
          className="flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            borderColor: "var(--sidebar-border)",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        >
          {/* Avatar with Status Dot */}
          <div className="relative flex-shrink-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl font-semibold text-xs"
              style={{
                background: "linear-gradient(135deg, rgba(201, 162, 75, 0.25) 0%, rgba(11, 26, 19, 0.9) 100%)",
                border: "1px solid rgba(201, 162, 75, 0.35)",
                color: "var(--sidebar-accent)",
              }}
            >
              {userInitial}
            </div>
            <span className="absolute -bottom-0.5 -end-0.5 flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2ec47a] ring-2 ring-[#07120D]" />
            </span>
          </div>

          {/* Name & Role Tag */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-[var(--sidebar-text-primary)] truncate">
              {displayName}
            </span>
            <span
              className="inline-block mt-0.5 w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: "var(--sidebar-accent-tint)",
                color: "var(--sidebar-accent)",
              }}
            >
              {roleLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
