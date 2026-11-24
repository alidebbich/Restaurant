/**
 * Button — Dar Zitoun unified button component
 *
 * Single source of truth for every button in the app.
 * All sizing and color come from semantic design tokens in globals.css.
 *
 * Usage:
 *   <Button variant="primary" size="lg">Réserver</Button>
 *   <Button variant="secondary" size="md" href="/menu">Voir le menu</Button>
 *   <Button variant="ghost" size="icon" aria-label="Fermer"><X /></Button>
 *   <Button variant="primary" loading>Envoi…</Button>
 */

"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

// ─────────────────────────────────────────────
// 1. CVA recipe  (all tokens, no raw hex)
// ─────────────────────────────────────────────
const buttonVariants = cva(
  // ── Base ─────────────────────────────────────────────────────────────
  [
    // layout
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    // font
    "font-body font-semibold leading-none tracking-[0.01em]",
    // radius — single token for every button
    "rounded-[var(--radius-button)]",
    // motion
    "transition-[background-color,border-color,box-shadow,transform,color] duration-150 ease-out",
    // focus
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    // disabled
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
    // RTL direction
    "rtl:tracking-normal",
    // reduced motion
    "motion-reduce:transition-none",
    // data attribute for auditing
    "data-[ui=Button]:not-[x]",
  ],
  {
    variants: {
      // ── Variants ─────────────────────────────────────────────────────
      variant: {
        /**
         * primary — Gold bg, Deep Green text (≈8:1)
         * One primary per view region.
         */
        primary: [
          "bg-cta text-cta-ink shadow-[0_2px_10px_rgba(197,168,105,0.28)]",
          "hover:bg-gold-light hover:shadow-[0_4px_14px_rgba(197,168,105,0.35)] hover:-translate-y-px",
          "active:translate-y-0 active:shadow-none",
          "focus-visible:ring-gold",
        ],
        /**
         * secondary — Crisp elevated card surface, subtle border, readable ink text
         * For SaaS toolbars, secondary actions, and table buttons
         */
        secondary: [
          "bg-white text-ink border border-line shadow-sm",
          "hover:bg-surface-soft hover:border-gold/50 hover:text-brand hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-forest",
        ],
        /**
         * forest — Deep Forest Green solid with cream text
         */
        forest: [
          "bg-forest text-cream shadow-sm",
          "hover:bg-deep hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-forest",
        ],
        /**
         * outline — Transparent, 1px ink border, hover = raised surface
         */
        outline: [
          "border border-ink/20 text-ink bg-transparent",
          "hover:bg-ink/5 hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-ink",
        ],
        /**
         * ghost — Transparent, ink text, no border
         */
        ghost: [
          "text-ink bg-transparent",
          "hover:bg-ink/8 hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-ink",
        ],
        /**
         * destructive — Dark Terracotta (#8B3A1E) + Cream text.
         * Plain Terracotta #C27350 fails 4.5:1; this token passes (≈5.6:1).
         */
        destructive: [
          "bg-danger text-cream shadow-sm",
          "hover:opacity-90 hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-danger",
        ],
        /**
         * link — Text only, underline on hover
         */
        link: [
          "text-brand bg-transparent underline-offset-4",
          "hover:underline hover:text-gold",
          "focus-visible:ring-gold",
        ],
        /**
         * outline-inverse — For use on dark backgrounds (hero, ReserveCta, mobile drawer)
         */
        "outline-inverse": [
          "border border-cream/40 text-cream bg-black/25 backdrop-blur-md",
          "hover:border-gold hover:text-gold hover:bg-black/40 hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-gold",
        ],
      },

      // ── Sizes ────────────────────────────────────────────────────────
      size: {
        /**
         * sm — 36px height, compact for toolbars, table rows, and modals
         */
        sm: "h-9 px-3.5 text-xs font-medium",
        /**
         * md — 40px height, standard balanced default
         */
        md: "h-10 px-4 text-sm font-medium",
        /**
         * lg — 44px height, refined luxury proportion for hero and key CTAs
         */
        lg: "h-11 px-6 text-sm font-medium",
        /**
         * icon — 36px square button, no padding, requires aria-label
         */
        icon: "h-9 w-9 p-0 text-sm",
        "icon-sm": "h-8 w-8 p-0 text-xs",
        "icon-lg": "h-11 w-11 p-0 text-sm",
      },

      fullWidth: {
        true: "w-full",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// ─────────────────────────────────────────────
// 2. Types
// ─────────────────────────────────────────────
type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type ButtonOwnProps = {
  /** Show spinner and block interaction */
  loading?: boolean;
  /** Icon before the label */
  leadingIcon?: ReactNode;
  /** Icon after the label */
  trailingIcon?: ReactNode;
  /**
   * Renders an <a> / Next.js <Link> instead of <button>.
   * Keep type, onClick, etc. — they still work on anchors.
   */
  href?: string;
  /** Stretch to container width */
  fullWidth?: boolean;
  /** Anchor target (e.g. '_blank') when href is provided */
  target?: string;
  /** Anchor rel (e.g. 'noopener noreferrer') when href is provided */
  rel?: string;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps &
  ButtonOwnProps;

// ─────────────────────────────────────────────
// 3. Inner content (shared between button/link)
// ─────────────────────────────────────────────
function ButtonContent({
  loading,
  leadingIcon,
  trailingIcon,
  children,
}: Pick<ButtonOwnProps, "loading" | "leadingIcon" | "trailingIcon"> & {
  children?: ReactNode;
}) {
  return (
    <>
      {loading ? (
        <Loader2 className="size-[1.1em] animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon && (
          <span className="flex shrink-0 items-center" aria-hidden="true">
            {leadingIcon}
          </span>
        )
      )}
      {children && <span>{children}</span>}
      {!loading && trailingIcon && (
        <span className="flex shrink-0 items-center" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// 4. Component
// ─────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leadingIcon,
      trailingIcon,
      href,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const classes = twMerge(
      buttonVariants({ variant, size, fullWidth }),
      className
    );

    const isDisabled = disabled || loading;

    // ── Link variant ──────────────────────────────────────────────────
    if (href) {
      return (
        <Link
          href={href}
          className={classes}
          aria-disabled={isDisabled || undefined}
          data-ui="Button"
          data-variant={variant ?? "primary"}
          data-size={size ?? "md"}
          tabIndex={isDisabled ? -1 : undefined}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          <ButtonContent
            loading={loading}
            leadingIcon={leadingIcon}
            trailingIcon={trailingIcon}
          >
            {children}
          </ButtonContent>
        </Link>
      );
    }

    // ── Native button ─────────────────────────────────────────────────
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={classes}
        data-ui="Button"
        data-variant={variant ?? "primary"}
        data-size={size ?? "md"}
        {...props}
      >
        <ButtonContent
          loading={loading}
          leadingIcon={leadingIcon}
          trailingIcon={trailingIcon}
        >
          {children}
        </ButtonContent>
      </button>
    );
  }
);

Button.displayName = "Button";
export { buttonVariants };
