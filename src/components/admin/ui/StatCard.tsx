"use client";

import React, { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type StatCardProps = {
  title: string;
  value: number | string;
  rawValue?: number;
  suffix?: string;
  prefix?: string;
  subtitle?: string;
  icon?: LucideIcon;
  deltaPercent?: number;
  deltaLabel?: string;
  sparkline?: number[];
  isHero?: boolean;
  className?: string;
};

export function StatCard({
  title,
  value,
  rawValue,
  suffix = "",
  prefix = "",
  subtitle,
  icon: Icon,
  deltaPercent,
  deltaLabel = "vs. période préc.",
  sparkline,
  isHero = false,
  className = "",
}: StatCardProps) {
  // Numeric display value
  const [displayValue, setDisplayValue] = useState<number | string>(
    typeof rawValue === "number" ? rawValue.toLocaleString("fr-TN") : value
  );

  useEffect(() => {
    if (typeof rawValue !== "number") {
      setDisplayValue(value);
      return;
    }

    const start = 0;
    const end = rawValue;
    const duration = 800; // ms
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * easeProgress);

      setDisplayValue(current.toLocaleString("fr-TN"));

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(end.toLocaleString("fr-TN"));
      }
    };

    const frame = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(frame);
  }, [rawValue, value]);

  // Compute SVG sparkline path
  const sparklineSvgPath = React.useMemo(() => {
    if (!sparkline || sparkline.length < 2) return null;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;
    const width = 100;
    const height = 36;

    const points = sparkline.map((val, idx) => {
      const x = (idx / (sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    });

    const d = `M ${points.join(" L ")}`;
    const areaD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

    return { line: d, area: areaD };
  }, [sparkline]);

  const isPositiveDelta = typeof deltaPercent === "number" && deltaPercent >= 0;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-200 border group hover:-translate-y-0.5 active:scale-[0.99] ${
        isHero
          ? "border-[var(--color-brand-gold-border)] shadow-[var(--shadow-gold-md)] hover:border-[var(--color-brand-gold)]"
          : "border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-[var(--shadow-card)]"
      } ${className}`}
      style={{
        backgroundColor: "var(--bg-card)",
        boxShadow: isHero
          ? "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 24px rgba(198, 161, 91, 0.12)"
          : "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 4px 16px rgba(23, 61, 50, 0.05)",
      }}
    >
      {/* Top Gold Shimmer on Hero */}
      {isHero && (
        <div
          className="absolute top-0 inset-x-0 h-[2.5px]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, var(--color-brand-gold) 50%, transparent 100%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Header: Label + Round Tinted Icon */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span
          className="text-xs uppercase tracking-wider font-semibold text-[var(--text-tertiary)]"
          style={{ letterSpacing: "0.06em" }}
        >
          {title}
        </span>
        {Icon && (
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
              isHero
                ? "bg-[var(--color-brand-gold-tint)] border-[var(--color-brand-gold-border)] text-[var(--color-brand-gold)]"
                : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--color-brand-primary)] group-hover:bg-[var(--color-brand-primary)] group-hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.6} />
          </div>
        )}
      </div>

      {/* Big KPI Number (Tabular) */}
      <div className="flex items-baseline gap-1 my-1">
        {prefix && <span className="text-xl font-light text-[var(--text-tertiary)]">{prefix}</span>}
        <span className="text-3xl sm:text-4xl font-semibold tracking-tight font-mono tabular-nums text-[var(--text-primary)]">
          {typeof rawValue === "number" ? displayValue : value}
        </span>
        {suffix && <span className="text-sm font-medium text-[var(--color-brand-gold)] ms-1">{suffix}</span>}
      </div>

      {/* Subtitle & Delta Pill */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
        {typeof deltaPercent === "number" ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold ${
                isPositiveDelta
                  ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                  : "bg-[var(--status-error-bg)] text-[var(--status-error)]"
              }`}
            >
              {isPositiveDelta ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>{Math.abs(deltaPercent)}%</span>
            </span>
            <span className="text-[var(--text-tertiary)] text-[11px] truncate">{deltaLabel}</span>
          </div>
        ) : subtitle ? (
          <span className="text-[var(--text-tertiary)] text-[11px] truncate">{subtitle}</span>
        ) : null}

        {/* Tiny Sparkline */}
        {sparklineSvgPath && (
          <div className="h-6 w-20 flex-shrink-0" aria-hidden="true">
            <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id={`sparkline-grad-${title.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isHero ? "var(--color-brand-gold)" : "var(--color-brand-primary)"} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={isHero ? "var(--color-brand-gold)" : "var(--color-brand-primary)"} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={sparklineSvgPath.area}
                fill={`url(#sparkline-grad-${title.replace(/[^a-zA-Z0-9]/g, "")})`}
              />
              <path
                d={sparklineSvgPath.line}
                fill="none"
                stroke={isHero ? "var(--color-brand-gold)" : "var(--color-brand-primary)"}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </article>
  );
}