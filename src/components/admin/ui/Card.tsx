"use client";

import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  elevated?: boolean;
};

export function Card({
  children,
  className = "",
  interactive = false,
  elevated = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        interactive
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--border-strong)] active:scale-[0.99]"
          : ""
      } ${className}`}
      style={{
        backgroundColor: elevated ? "var(--bg-card)" : "var(--bg-card)",
        borderColor: "var(--border-default)",
        boxShadow: elevated
          ? "var(--shadow-xl)"
          : "var(--shadow-card)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-between p-5 border-b border-[var(--border-subtle)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base font-semibold text-[var(--text-primary)] leading-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-xs text-[var(--text-tertiary)] mt-0.5 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}