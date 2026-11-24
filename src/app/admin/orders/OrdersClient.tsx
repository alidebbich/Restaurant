"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Filter,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  LayoutGrid,
  List,
  RefreshCw,
  Download,
} from "lucide-react";
import { StatusPill } from "@/components/admin/ui/StatusPill";
import { adminFetch } from "@/lib/apiClient";
import { toast } from "sonner";
import type { Order } from "@/lib/db/queries";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";

type Props = {
  initialOrders: Order[];
};

const STATUS_LABELS: Record<Order["status"], { label: string; variant: "pending" | "info" | "success" | "warning" | "error" | "neutral" }> = {
  new: { label: "Nouvelle", variant: "pending" },
  accepted: { label: "Acceptée", variant: "info" },
  preparing: { label: "En préparation", variant: "warning" },
  ready: { label: "Prête", variant: "success" },
  out_for_delivery: { label: "En livraison", variant: "info" },
  completed: { label: "Terminée & Payée", variant: "success" },
  cancelled: { label: "Annulée", variant: "error" },
};

const STATUS_TRANSITIONS: Record<Order["status"], Order["status"][]> = {
  new: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const STATUS_ICONS: Record<Order["status"], React.ComponentType<{ className?: string }>> = {
  new: Sparkles,
  accepted: CheckCircle2,
  preparing: AlertCircle,
  ready: CheckCircle2,
  out_for_delivery: ChevronRight,
  completed: CheckCircle2,
  cancelled: X,
};

export function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesSearch =
        search === "" ||
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_phone.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  // Order type labels
  const getOrderTypeLabel = (type: Order["order_type"]) => {
    const labels: Record<Order["order_type"], string> = {
      dine_in: "Sur place",
      takeaway: "À emporter",
      delivery: "Livraison",
    };
    return labels[type] || type;
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== "cancelled");
    const newCount = orders.filter((o) => o.status === "new").length;
    const activeCount = orders.filter((o) => ["accepted", "preparing", "ready", "out_for_delivery"].includes(o.status)).length;
    const completedCount = orders.filter((o) => o.status === "completed").length;
    const totalRevenue = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrderValue = completedCount > 0 ? totalRevenue / completedCount : 0;

    return {
      newCount,
      activeCount,
      completedCount,
      totalRevenue,
      avgOrderValue,
    };
  }, [orders]);

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    setUpdatingId(orderId);
    try {
      const res = await adminFetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Erreur de mise à jour");

      setOrders(
        orders.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, is_paid: newStatus === "completed" ? 1 : o.is_paid }
            : o
        )
      );
      const statusLabel = STATUS_LABELS[newStatus]?.label || newStatus;
      toast.success(`Commande passée en « ${statusLabel} »`);

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus,
          is_paid: newStatus === "completed" ? 1 : selectedOrder.is_paid,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = [
      "N° Commande",
      "Date",
      "Client",
      "Téléphone",
      "Type",
      "Table / Créneau",
      "Montant",
      "Statut",
      "Notes",
    ];
    const rows = filteredOrders.map((o) => [
      `"${o.order_number}"`,
      `"${o.created_at}"`,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"${o.customer_phone}"`,
      `"${getOrderTypeLabel(o.order_type)}"`,
      `"${o.table_or_time || ""}"`,
      formatPrice(o.total, "fr").replace(" ", ""),
      `"${STATUS_LABELS[o.status]?.label || o.status}"`,
      `"${(o.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,﻿" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `commandes-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn">
      {/* PRINT-ONLY STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          header, nav, aside, .no-print, button, input, select, .print-only { display: block !important; }
          .no-print { display: none !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; font-size: 9pt !important; }
          .print-table th, .print-table td { border: 1px solid #333 !important; padding: 4px 6px !important; }
          .print-table th { background: #eee !important; font-weight: bold !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}} />

      {/* PRINT-ONLY TABLE */}
      <div className="print-only">
        <h1 className="text-xl font-bold text-text-primary mb-2">Dar Zitoun — Liste des Commandes</h1>
        <p className="text-sm text-text-secondary mb-4">Total: {orders.length} commandes | CA: {formatPrice(metrics.totalRevenue, "fr")}</p>
        <table className="print-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Client</th>
              <th>Tél</th>
              <th>Type</th>
              <th>Table</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Émargement</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id}>
                <td className="font-mono">{o.order_number}</td>
                <td>{o.created_at}</td>
                <td className="font-bold">{o.customer_name}</td>
                <td>{o.customer_phone}</td>
                <td>{getOrderTypeLabel(o.order_type)}</td>
                <td>{o.table_or_time || "-"}</td>
                <td className="text-right tabular-nums">{formatPrice(o.total, "fr")}</td>
                <td>{STATUS_LABELS[o.status]?.label || o.status}</td>
                <td>[ ]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SCREEN DASHBOARD */}
      <div className="no-print space-y-6">

        {/* ── PREMIUM HEADER ── */}
        <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10" style={{
          background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface-elevated) 100%)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-card)",
        }}>
          <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true">
            <div className="absolute -top-1/4 -right-1/4 h-[300px] w-[300px] rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" style={{ animation: "pulse-slow 4s ease-in-out infinite" }} />
            <div className="absolute -bottom-1/4 -left-1/4 h-[200px] w-[200px] rounded-full bg-[var(--status-success)]/10 blur-3xl" style={{ animation: "pulse-slow 4s ease-in-out infinite", animationDelay: "1s" }} />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 badge badge-success px-2.5 py-1 text-[10px] font-bold shadow-[var(--shadow-success-sm)]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Cuisine en Direct</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3" style={{
                fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                letterSpacing: "0.01em",
              }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)] shadow-[var(--shadow-gold-md)]">
                  <ShoppingBag className="h-5.5 w-5.5" aria-hidden="true" />
                </div>
                <span>Gestion des Commandes</span>
              </h2>
              <p className="text-sm text-[var(--text-quaternary)] leading-relaxed">
                {orders.length} commandes enregistrées • {metrics.newCount} nouvelles • {metrics.activeCount} en cours
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOrders(initialOrders);
                  toast.success("Données actualisées");
                }}
                title="Actualiser"
                aria-label="Actualiser les données"
                leadingIcon={<RefreshCw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" aria-hidden="true" />}
              />

              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                leadingIcon={<Printer className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Imprimer
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                leadingIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Export CSV
              </Button>

              <Button
                variant="primary"
                size="sm"
                href="/admin/orders/new"
                leadingIcon={<PlusCircle className="h-4 w-4" aria-hidden="true" />}
              >
                Nouvelle commande
              </Button>
            </div>
          </div>
        </section>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-pending)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-pending)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">Nouvelles</span>
            <p className="text-xl font-bold text-[var(--status-pending)] mt-1">{metrics.newCount}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-warning)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-warning)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--status-warning)] block">En Cours</span>
            <p className="text-xl font-bold text-[var(--status-warning)] mt-1">{metrics.activeCount}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-success)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-success)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--status-success)] block">Terminées</span>
            <p className="text-xl font-bold text-[var(--status-success)] mt-1">{metrics.completedCount}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-gold)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--color-brand-gold)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-gold)] block">Chiffre d'Affaires</span>
            <p className="text-xl font-bold text-[var(--color-brand-gold)] mt-1 tabular-nums">{formatPrice(metrics.totalRevenue, "fr")}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-primary)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--color-brand-primary)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-primary)] block">Panier Moyen</span>
            <p className="text-xl font-bold text-[var(--color-brand-primary)] mt-1 tabular-nums">{formatPrice(metrics.avgOrderValue, "fr")}</p>
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div className="flex overflow-x-auto gap-2 border-b border-[var(--border-subtle)] pb-3" role="tablist" aria-label="Filtrer par statut">
          {[
            { id: "all", label: "Toutes", icon: null },
            { id: "new", label: "Nouvelles", icon: Sparkles },
            { id: "accepted", label: "Acceptées", icon: CheckCircle2 },
            { id: "preparing", label: "En Cuisine", icon: AlertCircle },
            { id: "ready", label: "Prêtes", icon: CheckCircle2 },
            { id: "out_for_delivery", label: "En Livraison", icon: ChevronRight },
            { id: "completed", label: "Terminées", icon: CheckCircle2 },
            { id: "cancelled", label: "Annulées", icon: X },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              role="tab"
              aria-selected={statusFilter === tab.id}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "btn-primary shadow-[var(--shadow-gold-sm)]"
                  : "text-[var(--text-quaternary)] hover:text-[var(--text-primary)] hover:bg-[var(--color-brand-primary-tint)] hover:border-[var(--color-brand-primary-border)]/50"
              }`}
            >
              {tab.icon && <tab.icon className="h-3 w-3" aria-hidden="true" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── SEARCH & VIEW MODE ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
            <label htmlFor="orders-search" className="sr-only">Rechercher dans les commandes</label>
            <input
              id="orders-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par n° de commande, nom ou téléphone..."
              className="input ps-9 focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
              aria-label="Rechercher dans les commandes"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl p-1 bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)]" role="group" aria-label="Mode d'affichage">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === "kanban"
                    ? "bg-[var(--bg-surface)] text-[var(--color-brand-primary)] font-semibold shadow-sm"
                    : "text-[var(--text-quaternary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-[var(--bg-surface)] text-[var(--color-brand-primary)] font-semibold shadow-sm"
                    : "text-[var(--text-quaternary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tableau</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── KANBAN VIEW ── */}
        {viewMode === "kanban" && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              { id: "new", title: "Nouvelles", statuses: ["new"], color: "border-[var(--color-brand-gold)]/30 bg-[var(--color-brand-gold)]/4", pillVariant: "gold" as const },
              { id: "prep", title: "En Préparation", statuses: ["accepted", "preparing"], color: "border-[var(--status-warning)]/30 bg-[var(--status-warning)]/4", pillVariant: "warning" as const },
              { id: "ready", title: "Prêtes / Livraison", statuses: ["ready", "out_for_delivery"], color: "border-[var(--status-info)]/30 bg-[var(--status-info)]/4", pillVariant: "info" as const },
              { id: "done", title: "Terminées & Payées", statuses: ["completed"], color: "border-[var(--status-success)]/30 bg-[var(--status-success)]/4", pillVariant: "success" as const },
            ].map((col) => {
              const colOrders = filteredOrders.filter((o) => col.statuses.includes(o.status));
              return (
                <div
                  key={col.id}
                  className={`rounded-2xl border ${col.color} p-4 flex flex-col min-h-[460px] shadow-sm ${reduceMotion ? "transition-none" : ""}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
                    <div className="flex items-center gap-2">
                      <StatusPill label={col.title} variant={col.pillVariant} />
                      <span className="font-mono text-xs text-[var(--text-quaternary)]">({colOrders.length})</span>
                    </div>
                  </div>

                  {/* Column Orders List */}
                  <div className="space-y-3 flex-1 overflow-y-auto admin-scrollbar">
                    {colOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--text-quaternary)]">
                        Aucune commande
                      </div>
                    ) : (
                      colOrders.map((ord, index) => (
                        <div
                          key={ord.id}
                          onClick={() => setSelectedOrder(ord)}
                          className={`group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 hover:border-[var(--color-brand-primary)]/30 hover:shadow-md hover:-translate-y-0.5 cursor-pointer shadow-sm transition-all duration-300 ${reduceMotion ? "transition-none" : ""}`}
                          style={{ animationDelay: `${index * 30}ms` }}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedOrder(ord); } }}
                          role="button"
                          aria-label={`Commande ${ord.order_number}, ${ord.customer_name}, ${formatPrice(ord.total, "fr")}`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-mono font-bold text-[var(--color-brand-primary)]">
                              {ord.order_number}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-quaternary)]">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {ord.created_at?.slice(11, 16) || "Récemment"}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {ord.customer_name}
                          </p>
                          <p className="text-[11px] text-[var(--text-quaternary)] mt-0.5">
                            {getOrderTypeLabel(ord.order_type)} {ord.table_or_time ? `· ${ord.table_or_time}` : ""}
                          </p>

                          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[var(--border-subtle)] text-xs">
                            <span className="font-mono font-bold text-[var(--color-brand-primary)] tabular-nums">
                              {formatPrice(ord.total, "fr")}
                            </span>
                            <span className="text-[10px] text-[var(--color-brand-primary)] group-hover:underline flex items-center gap-1">
                              Détails
                              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {viewMode === "table" && (
          <section className="card overflow-hidden relative" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-bg)]/50 border border-[var(--color-brand-primary-border)]/50 text-[var(--color-brand-primary)] shadow-[var(--shadow-gold-sm)]">
                  <ShoppingBag className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Aucune commande trouvée</p>
                <p className="text-xs text-[var(--text-quaternary)] mt-1">
                  Essayez de modifier vos filtres de recherche.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start" role="table" aria-label="Liste des commandes">
                  <thead className="bg-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="py-3.5 px-4" scope="col">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">N° Commande</span>
                      </th>
                      <th className="py-3.5 px-4" scope="col">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Date & Heure</span>
                      </th>
                      <th className="py-3.5 px-4" scope="col">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Client</span>
                      </th>
                      <th className="py-3.5 px-4" scope="col">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Type & Table</span>
                      </th>
                      <th className="py-3.5 px-4" scope="col">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Montant Total</span>
                      </th>
                      <th className="py-3.5 px-4 text-center" scope="col">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Statut</span>
                      </th>
                      <th className="py-3.5 px-4 text-end" scope="col">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filteredOrders.map((ord, index) => (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className={`cursor-pointer hover:bg-[var(--color-brand-primary-tint)] transition-all duration-200 group ${reduceMotion ? "transition-none" : ""}`}
                        style={{ animationDelay: `${index * 20}ms` }}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedOrder(ord); } }}
                        role="button"
                        aria-label={`Commande ${ord.order_number}, ${ord.customer_name}, ${STATUS_LABELS[ord.status]?.label || ord.status}`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                          {ord.order_number}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                          {ord.created_at}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[var(--text-primary)]">{ord.customer_name}</p>
                          <p className="text-[11px] text-[var(--text-quaternary)]">{ord.customer_phone}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-brand-primary-bg)]/50 border border-[var(--color-brand-primary-border)]/50 text-[var(--color-brand-primary)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-primary)]" aria-hidden="true" />
                            {getOrderTypeLabel(ord.order_type)}
                          </span>
                          {ord.table_or_time && (
                            <span className="block mt-0.5 text-[11px] text-[var(--status-success)] font-medium">
                              {ord.table_or_time}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[var(--text-primary)] text-end tabular-nums">
                          {formatPrice(ord.total, "fr")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            ord.status === "completed" ? "badge-success" :
                            ord.status === "new" ? "badge-pending" :
                            ord.status === "preparing" ? "badge-warning" :
                            ord.status === "ready" ? "badge-success" :
                            "badge-neutral"
                          }`}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{
                              background: ord.status === "completed" ? "var(--status-success)" :
                                          ord.status === "new" ? "var(--status-pending)" :
                                          ord.status === "preparing" ? "var(--status-warning)" :
                                          ord.status === "ready" ? "var(--status-success)" :
                                          "var(--text-quaternary)"
                            }} aria-hidden="true" />
                            {STATUS_LABELS[ord.status]?.label || ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <Link
                            href={`/admin/orders/${ord.id}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-primary-bg)]/50 border border-[var(--color-brand-primary-border)]/50 text-[var(--color-brand-primary)] transition-all duration-300 group-hover:bg-[var(--color-brand-primary)] group-hover:text-[var(--text-on-gold)] group-hover:shadow-[var(--shadow-gold-md)]"
                            aria-label={`Voir commande ${ord.order_number}`}
                          >
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── ORDER DETAIL MODAL ── */}
        {selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
          >
            <div className="modal modal-lg" style={{
              background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-3xl)",
              boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
                <div>
                  <span className="text-xs font-mono text-[var(--color-brand-primary)] font-bold block">
                    {selectedOrder.order_number}
                  </span>
                  <h3 id="order-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
                    Commande de {selectedOrder.customer_name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="btn-ghost btn-sm p-1.5 rounded-xl hover:bg-[var(--bg-surface)]"
                    title="Imprimer le ticket"
                    aria-label="Imprimer le ticket"
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="btn-ghost btn-sm p-1.5 rounded-xl hover:bg-[var(--bg-surface)]"
                    aria-label="Fermer la fenêtre"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Customer Details & Contact */}
              <div className="grid gap-4 sm:grid-cols-2 card border-[var(--border-default)] p-4 text-xs" style={{
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)",
              }}>
                <div>
                  <span className="text-[var(--text-quaternary)] block">Client</span>
                  <p className="font-medium text-[var(--text-primary)] mt-1">{selectedOrder.customer_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`tel:${selectedOrder.customer_phone}`}
                      className="inline-flex items-center gap-1 text-[var(--text-quaternary)] hover:text-[var(--color-brand-primary)]"
                    >
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      <span>{selectedOrder.customer_phone}</span>
                    </a>
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--status-success)] hover:underline"
                    >
                      <MessageCircle className="h-3 w-3" aria-hidden="true" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div>
                  <span className="text-[var(--text-quaternary)] block">Type de service</span>
                  <p className="font-medium text-[var(--text-primary)] mt-1 capitalize">
                    {getOrderTypeLabel(selectedOrder.order_type)}
                  </p>
                  {selectedOrder.table_or_time && (
                    <p className="text-[var(--status-success)] font-medium mt-1">
                      Table / Créneau : {selectedOrder.table_or_time}
                    </p>
                  )}
                  {selectedOrder.delivery_address && (
                    <p className="text-[var(--text-quaternary)] mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" aria-hidden="true" />
                      <span>{selectedOrder.delivery_address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-quaternary)]">
                  Articles Commandés
                </h4>
                <div className="card border-[var(--border-default)] overflow-hidden divide-y divide-[var(--border-subtle)] text-xs" style={{
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-xl)",
                }}>
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 hover:bg-[var(--color-brand-primary-tint)] transition-colors">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{item.item_name}</p>
                        <p className="text-[11px] text-[var(--text-quaternary)]">
                          {formatPrice(item.unit_price, "fr")} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">
                        {formatPrice(item.total_price, "fr")}
                      </span>
                    </div>
                  ))}
                  {/* Total Row */}
                  <div className="flex justify-between items-center p-3.5 text-sm font-semibold border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
                    <span className="text-[var(--text-secondary)]">Total à encaisser :</span>
                    <span className="text-[var(--status-success)] font-bold text-base tabular-nums">
                      {formatPrice(selectedOrder.total, "fr")}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="card border-[var(--border-default)] p-3 text-xs" style={{
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-xl)",
                  }}>
                    <span className="text-[var(--text-quaternary)] font-medium block">Instructions client :</span>
                    <p className="text-[var(--text-secondary)] mt-1 italic">&ldquo;{selectedOrder.notes}&rdquo;</p>
                  </div>
                )}

                {/* Status Transition Control Buttons */}
                <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
                  <span className="text-xs font-semibold text-[var(--text-quaternary)] block">
                    Changer le statut de la commande :
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Changer le statut">
                    {STATUS_TRANSITIONS[selectedOrder.status]?.map((btnStatus) => {
                      const btn = STATUS_LABELS[btnStatus];
                      const variantMap: Record<string, string> = {
                        pending: "btn-warning",
                        info: "btn-info",
                        success: "btn-success",
                        warning: "btn-warning",
                        error: "btn-danger",
                        neutral: "btn-secondary",
                      };
                      const isCurrent = btnStatus === selectedOrder.status;
                      const Icon = STATUS_ICONS[btnStatus];
                      return (
                        <Button
                          key={btnStatus}
                          type="button"
                          variant={btnStatus === "cancelled" ? "destructive" : "secondary"}
                          size="sm"
                          disabled={updating || updatingId === selectedOrder.id || isCurrent}
                          onClick={() => handleStatusChange(selectedOrder.id, btnStatus)}
                          leadingIcon={Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : undefined}
                        >
                          {btn?.label || btnStatus}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
          .animate-fadeIn { animation: fadeIn 300ms ease-out; }
          @media (prefers-reduced-motion: reduce) {
            .animate-pulse-slow,
            .animate-fadeIn {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}