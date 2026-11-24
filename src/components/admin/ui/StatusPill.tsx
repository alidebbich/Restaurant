"use client";

export type StatusVariant = "success" | "warning" | "danger" | "info" | "gold" | "neutral";

type StatusPillProps = {
  label: string;
  variant?: StatusVariant;
  pulse?: boolean;
  className?: string;
};

const VARIANT_CONFIGS: Record<StatusVariant, { bg: string; text: string; dot: string; border: string }> = {
  success: {
    bg: "var(--status-success-bg)",
    text: "var(--status-success)",
    dot: "var(--status-success)",
    border: "var(--status-success-border)",
  },
  warning: {
    bg: "var(--status-warning-bg)",
    text: "var(--status-warning)",
    dot: "var(--status-warning)",
    border: "var(--status-warning-border)",
  },
  danger: {
    bg: "var(--status-error-bg)",
    text: "var(--status-error)",
    dot: "var(--status-error)",
    border: "var(--status-error-border)",
  },
  info: {
    bg: "var(--status-info-bg)",
    text: "var(--status-info)",
    dot: "var(--status-info)",
    border: "var(--status-info-border)",
  },
  gold: {
    bg: "var(--color-brand-gold-tint)",
    text: "var(--color-brand-gold)",
    dot: "var(--color-brand-gold)",
    border: "var(--color-brand-gold-border)",
  },
  neutral: {
    bg: "var(--bg-surface)",
    text: "var(--text-tertiary)",
    dot: "var(--text-quaternary)",
    border: "var(--border-default)",
  },
};

export function StatusPill({
  label,
  variant = "neutral",
  pulse = false,
  className = "",
}: StatusPillProps) {
  const cfg = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${className}`}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      <span
        className="relative flex h-1.5 w-1.5 flex-shrink-0"
        aria-hidden="true"
      >
        {pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: cfg.dot }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: cfg.dot }}
        />
      </span>
      <span>{label}</span>
    </span>
  );
}