"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
};

type TabsProps<T extends string = string> = {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
};

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = "",
}: TabsProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`flex items-center gap-1 border-b border-[var(--border-default)] overflow-x-auto scrollbar-none ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors outline-none whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] ${
              isActive
                ? "text-[var(--text-primary)] font-semibold"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.icon && (
              <span
                className={`transition-colors ${
                  isActive ? "text-[var(--color-brand-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                }`}
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-medium ${
                  isActive
                    ? "bg-[var(--color-brand-primary-tint)] text-[var(--color-brand-primary)]"
                    : "bg-[var(--border-subtle)] text-[var(--text-tertiary)]"
                }`}
              >
                {tab.badge}
              </span>
            )}

            {/* Active Brand Green Underline */}
            {isActive && (
              <motion.div
                layoutId={shouldReduceMotion ? undefined : "active-tab-underline"}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute bottom-0 inset-x-2 h-[2.5px] rounded-full pointer-events-none"
                style={{
                  backgroundColor: "var(--color-brand-primary)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}