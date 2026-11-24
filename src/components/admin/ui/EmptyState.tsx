"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Sparkles,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] ${className}`}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4 border border-[var(--color-brand-primary-border)] bg-[var(--color-brand-primary-tint)] text-[var(--color-brand-primary)]"
      >
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>

      <h3
        className="text-lg font-medium text-[var(--text-primary)] mb-1"
        style={{
          fontFamily: '"Cormorant Garamond", "Playfair Display", var(--font-display), Georgia, serif',
        }}
      >
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-[var(--text-tertiary)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-skeleton rounded-xl ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
      }}
    />
  );
}