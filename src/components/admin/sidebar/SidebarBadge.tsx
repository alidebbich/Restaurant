"use client";

import React from "react";

type SidebarBadgeProps = {
  count: number;
  label?: string;
  isCollapsed?: boolean;
  pulse?: boolean;
};

export function SidebarBadge({
  count,
  label = "éléments",
  isCollapsed = false,
  pulse = true,
}: SidebarBadgeProps) {
  if (count <= 0) return null;

  if (isCollapsed) {
    return (
      <span
        className="absolute top-2 end-2 flex h-2 w-2"
        aria-label={`${count} ${label}`}
        title={`${count} ${label}`}
      >
        {pulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--sidebar-accent)] opacity-75" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--sidebar-accent)]" />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium font-mono tabular-nums"
      style={{
        backgroundColor: "var(--sidebar-accent-tint)",
        color: "var(--sidebar-accent)",
      }}
      aria-label={`${count} ${label}`}
    >
      {pulse && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--sidebar-accent)] animate-pulse"
          aria-hidden="true"
        />
      )}
      <span>{count > 99 ? "99+" : count}</span>
    </span>
  );
}

