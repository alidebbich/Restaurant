"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl";
};

const emptySubscribe = () => () => {};

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = "lg",
}: DrawerProps) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isClient || !isOpen) return null;

  const widthClasses = {
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-2xl",
  }[width];

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex justify-end bg-[var(--bg-modal-backdrop)] backdrop-blur-sm transition-opacity animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${widthClasses} h-full flex flex-col bg-[var(--bg-modal)] border-s border-[var(--border-default)] shadow-[var(--shadow-2xl)] transition-transform animate-slideInRight`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/70">
          <div className="space-y-0.5 min-w-0 pe-4">
            <h2
              className="text-lg font-medium text-[var(--text-primary)] truncate"
              style={{
                fontFamily: '"Cormorant Garamond", "Playfair Display", var(--font-display), Georgia, serif',
              }}
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[var(--text-tertiary)] truncate">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
            aria-label="Fermer le panneau"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 admin-scrollbar space-y-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/70">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}