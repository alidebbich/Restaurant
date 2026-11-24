"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 pb-6 pt-1 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-default)] ${className}`}>
      <div className="space-y-1.5 min-w-0">
        {/* Optional Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href || idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-50" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[var(--color-brand-primary)] transition-colors truncate max-w-[140px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--text-secondary)] font-medium truncate max-w-[180px]">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title & Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--text-primary)]"
            style={{
              fontFamily: '"Cormorant Garamond", "Playfair Display", var(--font-display), Georgia, serif',
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </h1>
          {badge}
        </div>

        {/* Subtitle */}
        {description && (
          <p className="text-sm text-[var(--text-tertiary)] max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Right-aligned Actions */}
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}