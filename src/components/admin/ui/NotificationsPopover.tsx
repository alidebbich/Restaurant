"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check, ShoppingBag, CalendarCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useSidebarCounts } from "@/lib/hooks/useSidebarCounts";

export function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [read, setRead] = useState(false);
  const { orders, reservations } = useSidebarCounts();
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);

  const totalUnread = read ? 0 : orders + reservations;

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHasAnimatedIn(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setHasAnimatedIn(false);
        buttonRef.current?.focus();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Trigger animation on open
  useEffect(() => {
    if (isOpen) {
      setHasAnimatedIn(true);
    }
  }, [isOpen]);

  return (
    <div className="relative z-50" ref={popoverRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Notifications${totalUnread > 0 ? `, ${totalUnread} nouvelle${totalUnread > 1 ? "s" : ""}` : "aucune notification"}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] shadow-[var(--shadow-xs)] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2"
      >
        <Bell className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} strokeWidth={1.6} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -end-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[var(--color-brand-gold)] text-[10px] font-bold text-[var(--text-on-gold)] shadow-sm animate-bounce-in">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute end-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-modal)] shadow-[var(--shadow-2xl)] p-2 z-50 ${hasAnimatedIn ? "animate-slide-down" : ""}`}
          role="dialog"
          aria-label="Centre de notifications"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Notifications</span>
              {totalUnread > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-mono font-medium bg-[var(--color-brand-gold-tint)] text-[var(--color-brand-gold)]">
                  {totalUnread} nouvelle{totalUnread > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {totalUnread > 0 && (
              <button
                type="button"
                onClick={() => setRead(true)}
                className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--color-brand-primary)] transition-colors font-medium"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="space-y-1 max-h-72 overflow-y-auto admin-scrollbar py-1">
            {orders > 0 && (
              <Link
                href="/admin/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors duration-150 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-primary-tint)] text-[var(--color-brand-primary)] flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {orders} commande{orders > 1 ? "s" : ""} en attente
                    </p>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Récemment</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                    Nouvelles commandes à accepter en cuisine
                  </p>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--status-success)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden="true" />
              </Link>
            )}

            {reservations > 0 && (
              <Link
                href="/admin/reservations"
                onClick={() => setIsOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors duration-150 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-gold-tint)] text-[var(--color-brand-gold)] flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {reservations} réservation{reservations > 1 ? "s" : ""} pour ce soir
                    </p>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Aujourd'hui</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                    Vérifier l'attribution des tables
                  </p>
                </div>
                <Clock className="h-3.5 w-3.5 text-[var(--color-brand-gold)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden="true" />
              </Link>
            )}

            {totalUnread === 0 && (
              <div className="py-6 text-center text-xs text-[var(--text-tertiary)]">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1.5 text-[var(--status-success)]" />
                Toutes les notifications sont à jour
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-1.5 mt-1 border-t border-[var(--border-subtle)]">
            <Link
              href="/admin/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-brand-primary)] hover:underline font-medium"
            >
              <span>Voir le flux complet des commandes</span>
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-slide-down { animation: slide-down 200ms var(--ease-standard); }
        .animate-bounce-in { animation: bounce-in 300ms var(--ease-standard); }
        @media (prefers-reduced-motion: reduce) {
          .animate-slide-down,
          .animate-bounce-in {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}