"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/apiClient";

export type SidebarCounts = {
  orders: number;
  reservations: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * useSidebarCounts
 * Fetches live pending counts for orders and reservations from /api/admin/stats.
 * Polls at a configurable interval and provides a manual refresh trigger.
 */
export function useSidebarCounts(pollIntervalMs = 30000): SidebarCounts {
  const [counts, setCounts] = useState<{ orders: number; reservations: number }>({
    orders: 0,
    reservations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/stats");
      if (res && res.ok) {
        const data = await res.json();
        if (data?.stats) {
          setCounts({
            orders: Number(data.stats.pendingOrders ?? 0),
            reservations: Number(data.stats.pendingReservations ?? 0),
          });
          setError(null);
        }
      }
    } catch (err) {
      // Graceful fallback — do not break UI on network/auth transitions
      console.warn("Sidebar counts fetch notice:", err);
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const executeFetch = async () => {
      try {
        const res = await adminFetch("/api/admin/stats");
        if (res && res.ok && isMounted) {
          const data = await res.json();
          if (data?.stats && isMounted) {
            setCounts({
              orders: Number(data.stats.pendingOrders ?? 0),
              reservations: Number(data.stats.pendingReservations ?? 0),
            });
            setError(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Run initial fetch asynchronously without triggering sync setState in effect
    void Promise.resolve().then(executeFetch);

    let interval: NodeJS.Timeout | undefined;
    if (pollIntervalMs > 0) {
      interval = setInterval(() => {
        void executeFetch();
      }, pollIntervalMs);
    }

    const handleSync = () => {
      void executeFetch();
    };
    window.addEventListener("admin-refresh-counts", handleSync);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      window.removeEventListener("admin-refresh-counts", handleSync);
    };
  }, [pollIntervalMs]);

  return {
    orders: counts.orders,
    reservations: counts.reservations,
    loading,
    error,
    refresh: fetchCounts,
  };
}
