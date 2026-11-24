"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { SidebarBadge } from "./SidebarBadge";

type SidebarItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed: boolean;
  count?: number;
  badgeLabel?: string;
  isDestructive?: boolean;
  showSeparatorBefore?: boolean;
};

export function SidebarItem({
  href,
  label,
  icon: Icon,
  isActive,
  isCollapsed,
  count = 0,
  badgeLabel,
  isDestructive = false,
  showSeparatorBefore = false,
}: SidebarItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseEnter = () => {
    if (isCollapsed) {
      const timer = setTimeout(() => setShowTooltip(true), 150);
      setTooltipTimer(timer);
    }
  };

  const handleMouseLeave = () => {
    if (tooltipTimer) clearTimeout(tooltipTimer);
    setShowTooltip(false);
  };

  return (
    <>
      {showSeparatorBefore && (
        <div
          className="h-[1px] my-2 mx-3 opacity-60"
          style={{ backgroundColor: "var(--sidebar-border)" }}
          role="separator"
          aria-hidden="true"
        />
      )}

      <div className="relative px-2">
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleMouseEnter}
          onBlur={handleMouseLeave}
          style={{
            color: isActive
              ? "#FFFFFF"
              : isDestructive
              ? "#A8BCAE"
              : "#C8D8CE",
          }}
          className={`group relative flex h-10 w-full items-center rounded-xl text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F2A1D] active:scale-[0.98] ${
            isCollapsed ? "justify-center px-0" : "px-3"
          } ${
            isDestructive
              ? "hover:!text-[#FF7B72] hover:bg-[rgba(255,123,114,0.12)]"
              : isActive
              ? "!text-white font-semibold"
              : "hover:!text-white hover:bg-white/[0.06]"
          }`}
        >
          {/* Active State Background & 3px Gold Bar */}
          {isActive && !isDestructive && (
            <>
              {/* Background Tint */}
              <motion.div
                layoutId={shouldReduceMotion ? undefined : "sidebar-active-bg"}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className="absolute inset-0 rounded-[10px] pointer-events-none"
                style={{
                  backgroundColor: "var(--sidebar-accent-tint)",
                }}
              />

              {/* 3px Gold Bar on the left/inline-start */}
              <motion.div
                layoutId={shouldReduceMotion ? undefined : "sidebar-active-indicator"}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full pointer-events-none"
                style={{
                  backgroundColor: "var(--sidebar-accent)",
                  boxShadow: "0 0 8px rgba(201, 162, 75, 0.4)",
                }}
              />
            </>
          )}

          {/* Icon with Relative Badge & Micro-Nudge */}
          <div className="relative flex items-center justify-center flex-shrink-0 z-10">
            <Icon
              className={`h-[18px] w-[18px] transition-transform duration-150 group-hover:ltr:translate-x-[1px] group-hover:rtl:-translate-x-[1px] ${
                isActive && !isDestructive
                  ? "!text-[#C9A24B]"
                  : isDestructive
                  ? "text-[#A8BCAE] group-hover:text-[#FF7B72]"
                  : "text-[#A8BCAE] group-hover:text-white"
              }`}
              strokeWidth={1.6}
            />

            {/* Collapsed dot badge on the icon */}
            {isCollapsed && count > 0 && (
              <SidebarBadge count={count} label={badgeLabel} isCollapsed={true} />
            )}
          </div>

          {/* Expanded Label & Pill Badge with Smooth Morphing Width & Opacity */}
          <div
            className={`flex flex-1 items-center justify-between min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 ${
              isCollapsed
                ? "max-w-0 opacity-0 pointer-events-none -translate-x-2"
                : "max-w-[180px] opacity-100 translate-x-0 ms-3"
            }`}
          >
            <span
              className="truncate text-sm font-medium leading-none"
              style={{
                color: isActive ? "#FFFFFF" : "inherit",
              }}
            >
              {label}
            </span>

            {count > 0 && (
              <SidebarBadge count={count} label={badgeLabel} isCollapsed={false} />
            )}
          </div>
        </Link>

        {/* Tooltip for Collapsed Mode (150ms delay, right side) */}
        {isCollapsed && showTooltip && (
          <div
            className="absolute start-full ms-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xl border animate-fadeIn"
            style={{
              background: "#0E241C",
              borderColor: "var(--sidebar-border)",
              color: "var(--sidebar-text-primary)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 1px rgba(201, 162, 75, 0.3)",
            }}
            role="tooltip"
          >
            <div className="flex items-center gap-2">
              <span>{label}</span>
              {count > 0 && (
                <span
                  className="rounded px-1.5 py-0.2 text-[10px] font-mono font-medium"
                  style={{
                    backgroundColor: "var(--sidebar-accent-tint)",
                    color: "var(--sidebar-accent)",
                  }}
                >
                  {count}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

