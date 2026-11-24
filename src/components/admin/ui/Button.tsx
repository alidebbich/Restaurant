/**
 * Admin UI Button adapter
 * Seamlessly wraps the canonical src/components/ui/Button.tsx
 * to enforce 100% design system consistency across public & admin.
 */

"use client";

import React from "react";
import { Button as MasterButton } from "@/components/ui/Button";

export type ButtonVariant = "primary" | "secondary" | "accent" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  href?: string;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      leadingIcon,
      trailingIcon,
      className = "",
      ...props
    },
    ref
  ) => {
    // Map 'accent' to 'primary' (Gold)
    const canonicalVariant =
      variant === "accent" ? "primary" : (variant as "primary" | "secondary" | "outline" | "ghost" | "destructive");

    return (
      <MasterButton
        ref={ref}
        variant={canonicalVariant}
        size={size}
        loading={loading}
        disabled={disabled}
        leadingIcon={leadingIcon || icon}
        trailingIcon={trailingIcon}
        className={className}
        {...props}
      >
        {children}
      </MasterButton>
    );
  }
);

Button.displayName = "AdminButton";
export default Button;
