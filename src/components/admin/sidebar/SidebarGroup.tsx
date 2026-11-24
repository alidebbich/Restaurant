"use client";

import React from "react";

type SidebarGroupProps = {
  label: string;
  isCollapsed: boolean;
  children: React.ReactNode;
  showDivider?: boolean;
};

export function SidebarGroup({
  label,
  isCollapsed,
  children,
  showDivider = false,
}: SidebarGroupProps) {
  return (
    <div className="flex flex-col space-y-[2px]">
      {/* Expanded Section Label with Smooth Height and Opacity Transition */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCollapsed
            ? "max-h-0 opacity-0 pointer-events-none -translate-y-1"
            : "max-h-8 opacity-100 translate-y-0 px-3 pt-4 pb-1.5"
        }`}
        aria-hidden={isCollapsed}
      >
        <span
          className="text-[11px] font-medium uppercase leading-none select-none text-[var(--sidebar-text-muted)] block truncate"
          style={{ letterSpacing: "0.12em" }}
        >
          {label}
        </span>
      </div>

      {/* Collapsed Rail Divider with Smooth Fade & Height */}
      {showDivider && (
        <div
          className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
            isCollapsed
              ? "max-h-4 opacity-60 my-2 mx-3"
              : "max-h-0 opacity-0 pointer-events-none my-0"
          }`}
          role="separator"
          aria-hidden="true"
        >
          <div
            className="h-[1px] w-full"
            style={{ backgroundColor: "var(--sidebar-border)" }}
          />
        </div>
      )}

      {/* Group Items */}
      <div className="flex flex-col space-y-[2px]" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

