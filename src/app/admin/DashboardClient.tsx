"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DollarSign,
  ShoppingBag,
  CalendarCheck,
  TrendingUp,
  PlusCircle,
  QrCode,
  ArrowRight,
  Download,
  Users,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Image as ImageIcon,
  ChefHat,
  BellRing,
  ExternalLink,
} from "lucide-react";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusPill } from "@/components/admin/ui/StatusPill";
import { Button } from "@/components/admin/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/admin/ui/Card";
import { adminFetch } from "@/lib/apiClient";
import { toast } from "sonner";
import type { Order, Reservation } from "@/lib/db/queries";

type DashboardStats = {
  totalItems: number;
  activeItems: number;
  unavailableItems: number;
  totalCategories: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  confirmedRevenue: number;
  pendingReservations: number;
};

type Props = {
  stats: DashboardStats;
  initialOrders: Order[];
  initialReservations: Reservation[];
  topDishes: Array<{
    id: string;
    name: string;
    category: string;
    price?: number;
    count: number;
    image?: string | null;
  }>;
};

// Format currency as Tunisian Dinar (e.g., "2 450,000 TND")
function formatTND(amountInMillimesOrDT: number, isMillimes = true): string {
  const dt = isMillimes ? amountInMillimesOrDT / 1000 : amountInMillimesOrDT;
  return new Intl.NumberFormat("fr-TN", {
    style: "decimal",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(dt) + " TND";
}

// Sparkline data type
type SparklineData = {
  label: string;
  revenue: number;
  orders: number;
};

export function DashboardClient({
  stats,
  initialOrders,
  initialReservations,
  topDishes,
}: Props) {
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d">("today");
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");
  const [ordersList, setOrdersList] = useState<Order[]>(initialOrders);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Time-aware greeting in French
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bonjour, Directeur";
    if (hour >= 12 && hour < 18) return "Bon après-midi, Directeur";
    return "Bonsoir, Directeur";
  }, []);

  const todayDateFormatted = useMemo(() => {
    return new Intl.DateTimeFormat("fr-TN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  // Multiplier depending on selected date range
  const multiplier = dateRange === "today" ? 1 : dateRange === "7d" ? 6.2 : 24.5;
  const currentRevenue = Math.round(stats.confirmedRevenue * (dateRange === "today" ? 1 : multiplier * 0.8));
  const currentOrders = Math.round(stats.totalOrders * (dateRange === "today" ? 1 : multiplier * 0.75));
  const currentReservations = Math.round(stats.pendingReservations * (dateRange === "today" ? 1 : multiplier * 0.6));
  const totalClients = Math.round(currentOrders * 2.4 + currentReservations * 3.2);

  // Chart data points
  const chartData = useMemo((): SparklineData[] => {
    const days =
      dateRange === "today"
        ? ["12h", "13h", "14h", "18h", "19h", "20h", "21h", "22h"]
        : dateRange === "7d"
        ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
        : ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];

    const baseRev = [350, 680, 520, 410, 940, 1420, 1180, 890];
    const baseOrd = [8, 16, 12, 10, 22, 34, 28, 20];

    return days.map((label, idx) => ({
      label,
      revenue: Math.round(baseRev[idx % baseRev.length] * (dateRange === "today" ? 1 : 4.5)),
      orders: Math.round(baseOrd[idx % baseOrd.length] * (dateRange === "today" ? 1 : 3.8)),
    }));
  }, [dateRange]);

  // Advance order status
  const handleAdvanceStatus = async (orderId: string, currentStatus: Order["status"]) => {
    const nextStatusMap: Record<string, Order["status"]> = {
      new: "preparing",
      accepted: "preparing",
      preparing: "ready",
      ready: "completed",
    };
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    setAdvancingId(orderId);
    try {
      const res = await adminFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
        toast.success(`Statut mis à jour : ${nextStatus}`);
      } else {
        toast.error("Erreur de mise à jour");
      }
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setAdvancingId(null);
    }
  };

  // Export CSV
  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Indicateur,Valeur\nRevenu TND," +
      currentRevenue / 1000 +
      "\nCommandes," +
      currentOrders +
      "\nRéservations," +
      currentReservations +
      "\nClients," +
      totalClients;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dar-zitoun-rapport-${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rapport exporté avec succès");
  };

  // Mock activity feed (icon-badged events with relative time)
  const recentActivities = [
    {
      id: "act-1",
      title: "Nouvelle réservation",
      desc: "Table pour 4 personnes · 20:30 (M. Ben Salem)",
      time: "il y a 3 min",
      icon: CalendarCheck,
      color: "bg-[var(--color-brand-primary-tint)] text-[var(--color-brand-primary)]",
    },
    {
      id: "act-2",
      title: "Commande reçue en cuisine",
      desc: "2x Couscous à l'Agneau, 1x Brik à l'Œuf",
      time: "il y a 12 min",
      icon: ChefHat,
      color: "bg-[var(--color-brand-gold-tint)] text-[var(--color-brand-gold)]",
    },
    {
      id: "act-3",
      title: "Plat mis à jour",
      desc: "Prix du Tajine Malsouka révisé",
      time: "il y a 45 min",
      icon: UtensilsCrossed,
      color: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
    },
    {
      id: "act-4",
      title: "Table fermée & payée",
      desc: "Addition de 185,500 TND réglée",
      time: "il y a 1h",
      icon: DollarSign,
      color: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
    },
  ];

  // Compute chart coordinates for SVG
  const chartCoords = useMemo(() => {
    const vals = chartData.map((d) => (chartMetric === "revenue" ? d.revenue : d.orders));
    const min = Math.min(...vals) * 0.75;
    const max = Math.max(...vals) * 1.15 || 1;
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * 680 + 10;
      const y = 200 - ((v - min) / (max - min)) * 165;
      return { x, y, v, item: chartData[i] };
    });
  }, [chartData, chartMetric]);

  const lineD = useMemo(() => {
    return chartCoords.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x},${curr.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y}`;
    }, "");
  }, [chartCoords]);

  const areaD = useMemo(() => {
    return `${lineD} L ${chartCoords[chartCoords.length - 1].x},220 L ${chartCoords[0].x},220 Z`;
  }, [lineD, chartCoords]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn">
      {/* 1. SLIM GREETING BANNER (~120-130px) WITH SUBTLE FOOD PHOTO ACCENT */}
      <section
        className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 sm:p-6 shadow-[var(--shadow-card)]"
        aria-label="En-tête du tableau de bord"
      >
        {/* Subtle Olive-Leaf & Food Photo Accent on the Right (fades softly into cream) */}
        <div
          className="pointer-events-none absolute inset-y-0 end-0 w-80 opacity-20 sm:opacity-30 overflow-hidden"
          style={{
            maskImage: "linear-gradient(to left, rgba(0,0,0,1) 30%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 30%, transparent 100%)",
          }}
          aria-hidden="true"
        >
          <Image
            src="/images/hero-main.jpg"
            alt=""
            fill
            sizes="320px"
            className="object-cover object-center"
            priority
          />
        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--text-primary)]"
                style={{
                  fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                  letterSpacing: "0.01em",
                }}
              >
                {greeting}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium bg-[var(--color-brand-primary-tint)] text-[var(--color-brand-primary)] border border-[var(--color-brand-primary-border)]">
                <span className={`h-1.5 w-1.5 rounded-full bg-[var(--color-brand-primary)] ${reduceMotion ? "" : "animate-pulse"}`} aria-hidden="true" />
                Service en direct
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-tertiary)]">
              <span className="capitalize">{todayDateFormatted}</span> ·{" "}
              <strong className="text-[var(--text-primary)] font-semibold">{stats.pendingOrders} commandes</strong> aujourd'hui ·{" "}
              <strong className="text-[var(--text-primary)] font-semibold">{stats.pendingReservations} réservations</strong> ce soir
            </p>
          </div>

          {/* Date range segmented control + Export button */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <div
              className="inline-flex rounded-xl p-1 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[inset_0_1px_2px_var(--border-subtle)]"
              role="group"
              aria-label="Période d'analyse"
            >
              {(["today", "7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    dateRange === r
                      ? "bg-[var(--bg-surface)] text-[var(--color-brand-primary)] font-semibold shadow-[var(--shadow-sm)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-pressed={dateRange === r}
                >
                  {r === "today" ? "Aujourd'hui" : r === "7d" ? "7 jours" : "30 jours"}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              icon={<Download className="h-3.5 w-3.5 text-[var(--color-brand-primary)]" />}
              aria-label="Exporter le rapport de la période sélectionnée"
            >
              Exporter
            </Button>
          </div>
        </div>
      </section>

      {/* 2. KPI ROW (4 STATCARDS: RÉSERVATIONS, COMMANDES, REVENU, CLIENTS) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="region" aria-label="Indicateurs clés de performance">
        {/* KPI 1: RÉSERVATIONS */}
        <StatCard
          title="Réservations"
          value={currentReservations.toLocaleString("fr-TN")}
          rawValue={currentReservations}
          deltaPercent={12.4}
          deltaLabel="vs. période préc."
          sparkline={[14, 16, 15, 19, 24, 22, currentReservations]}
          icon={CalendarCheck}
        />

        {/* KPI 2: COMMANDES */}
        <StatCard
          title="Commandes"
          value={currentOrders.toLocaleString("fr-TN")}
          rawValue={currentOrders}
          deltaPercent={8.7}
          deltaLabel="vs. période préc."
          sparkline={[18, 22, 20, 28, 35, 32, currentOrders]}
          icon={ShoppingBag}
        />

        {/* KPI 3: CHIFFRE D'AFFAIRES (HERO METRIC WITH SUBTLE GOLD GLOW) */}
        <StatCard
          title="Chiffre d'Affaires"
          value={formatTND(currentRevenue, true)}
          rawValue={Math.round(currentRevenue / 1000)}
          suffix="DT"
          deltaPercent={15.8}
          deltaLabel="vs. période préc."
          sparkline={[3200, 3900, 4100, 4800, 5600, 5300, currentRevenue / 1000]}
          icon={DollarSign}
          isHero={true}
        />

        {/* KPI 4: CLIENTS ESTIMÉS */}
        <StatCard
          title="Clients Accueillis"
          value={totalClients.toLocaleString("fr-TN")}
          rawValue={totalClients}
          deltaPercent={6.3}
          deltaLabel="taux de remplissage 84%"
          sparkline={[42, 54, 50, 68, 76, 72, totalClients]}
          icon={Users}
        />
      </div>

      {/* 3. BENTO GRID: SMOOTH GREEN AREA CHART (8 COLS) + TOP DISHES (4 COLS) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Aperçu des revenus — Large Smooth Green Area Chart */}
        <Card className="lg:col-span-8 flex flex-col justify-between p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2
                className="text-lg font-medium text-[var(--text-primary)]"
                style={{
                  fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                }}
              >
                Aperçu des Revenus & Flux
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Courbe d'activité lissée avec infobulle interactive
              </p>
            </div>

            {/* Metric Toggle */}
            <div className="inline-flex rounded-xl p-0.5 bg-[var(--bg-surface)] border border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setChartMetric("revenue")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  chartMetric === "revenue"
                    ? "bg-[var(--color-brand-primary)] text-white font-semibold shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                aria-pressed={chartMetric === "revenue"}
              >
                Revenu (TND)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("orders")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  chartMetric === "orders"
                    ? "bg-[var(--color-brand-primary)] text-white font-semibold shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                aria-pressed={chartMetric === "orders"}
              >
                Commandes
              </button>
            </div>
          </div>

          {/* SVG Smooth Green Area Chart */}
          <div
            ref={chartContainerRef}
            className="relative h-64 sm:h-72 w-full pt-4"
            role="img"
            aria-label={`Graphique d'activité: ${chartMetric === "revenue" ? "Revenus en TND" : "Nombre de commandes"} sur la période ${dateRange === "today" ? "d'aujourd'hui" : dateRange === "7d" ? "des 7 derniers jours" : "des 30 derniers jours"}`}
          >
            <svg
              viewBox="0 0 700 240"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="revenueGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.28" />
                  <stop offset="60%" stopColor="var(--color-brand-primary)" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Hairline Grid Lines */}
              {[40, 90, 140, 190].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="700"
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area & Smooth Line */}
              <path d={areaD} fill="url(#revenueGreenGrad)" />
              <path
                d={lineD}
                fill="none"
                stroke="var(--color-brand-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Interactive Points & Vertical Crosshair */}
              {chartCoords.map((c, i) => (
                <g key={i}>
                  {hoveredChartIndex === i && (
                    <line
                      x1={c.x}
                      y1={30}
                      x2={c.x}
                      y2={210}
                      stroke="var(--color-brand-primary)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                  )}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={hoveredChartIndex === i ? 6 : 4}
                    fill={hoveredChartIndex === i ? "var(--color-brand-gold)" : "var(--color-brand-primary)"}
                    stroke="var(--color-canvas)"
                    strokeWidth="2.5"
                    className={`transition-all duration-150 cursor-pointer shadow-sm ${reduceMotion ? "transition-none" : ""}`}
                  />
                  {/* Hover trigger zone */}
                  <rect
                    x={c.x - 30}
                    y="0"
                    width="60"
                    height="240"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartIndex(i)}
                    onMouseLeave={() => setHoveredChartIndex(null)}
                  />
                </g>
              ))}
            </svg>

            {/* Custom Tooltip Card on Hover */}
            {hoveredChartIndex !== null && chartData[hoveredChartIndex] && (
              <div
                className="absolute top-2 start-1/2 -translate-x-1/2 pointer-events-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-modal)] px-3.5 py-2 text-xs shadow-lg transition-all animate-fadeIn"
                role="tooltip"
              >
                <div className="font-semibold text-[var(--color-brand-primary)]">
                  {chartData[hoveredChartIndex].label}
                </div>
                <div className="flex items-center gap-3 text-[var(--text-tertiary)] mt-0.5">
                  <span>
                    Revenu :{" "}
                    <strong className="text-[var(--text-primary)] font-mono">
                      {chartData[hoveredChartIndex].revenue} DT
                    </strong>
                  </span>
                  <span>
                    Commandes :{" "}
                    <strong className="text-[var(--text-primary)] font-mono">
                      {chartData[hoveredChartIndex].orders}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom X-Axis Labels */}
          <div className="flex justify-between text-xs font-mono text-[var(--text-tertiary)] pt-3 border-t border-[var(--border-subtle)]" aria-hidden="true">
            {chartData.map((d) => (
              <span key={d.label}>{d.label}</span>
            ))}
          </div>
        </Card>

        {/* Side Widget: Plats les plus vendus (4 cols) with Real Food Photos (4:3, hover zoom 1.04) */}
        <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
              <h2
                className="text-base font-medium text-[var(--text-primary)]"
                style={{
                  fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                }}
              >
                Plats les Plus Vendus
              </h2>
              <Link href="/admin/menu" className="text-xs text-[var(--color-brand-primary)] font-medium hover:underline">
                Voir menu
              </Link>
            </div>

            <div className="space-y-3" role="list" aria-label="Top 4 des plats les plus vendus">
              {topDishes.slice(0, 4).map((dish) => {
                const dishImg =
                  dish.image ||
                  (dish.name.toLowerCase().includes("couscous")
                    ? "/images/menu/dish-couscous.jpg"
                    : dish.name.toLowerCase().includes("tajine")
                    ? "/images/menu/dish-tajine.jpg"
                    : dish.name.toLowerCase().includes("brik")
                    ? "/images/menu/dish-brik.jpg"
                    : dish.name.toLowerCase().includes("mechouia")
                    ? "/images/menu/dish-mechouia.jpg"
                    : "/images/menu/dish-baklawa.jpg");

                const dishPriceTND = dish.price
                  ? `${dish.price.toFixed(3)} TND`
                  : "18,500 TND";

                return (
                  <div
                    key={dish.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-all group"
                    role="listitem"
                  >
                    {/* 4:3 Food Photo with 1.04 Zoom on Hover */}
                    <div className="relative h-12 w-16 rounded-lg overflow-hidden bg-[var(--bg-surface)] flex-shrink-0 border border-[var(--border-subtle)]">
                      <Image
                        src={dishImg}
                        alt={dish.name}
                        fill
                        sizes="64px"
                        className={`object-cover group-hover:scale-105 transition-transform duration-300 ${reduceMotion ? "transition-none" : ""}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--color-brand-primary)] transition-colors">
                        {dish.name}
                      </h4>
                      <div className="flex items-center justify-between mt-0.5 text-[11px]">
                        <span className="text-[var(--color-brand-gold)] font-medium">{dishPriceTND}</span>
                        <span className="font-mono text-[var(--text-tertiary)] bg-[var(--bg-surface)] px-1.5 py-0.2 rounded border border-[var(--border-subtle)]">
                          {dish.count} ventes
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="pt-3.5 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <span>Spécialités de la carte</span>
            <span className="font-medium text-[var(--color-brand-primary)]">
              {stats.activeItems} plats disponibles
            </span>
          </div>
        </Card>
      </div>

      {/* 4. ACTIVITY & LIVE OPS: ACTIVITÉ RÉCENTE (4 COLS) + COMMANDES EN DIRECT (5 COLS) + RÉSERVATIONS D'AUJOURD'HUI (3 COLS) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Activité Récente (4 cols) */}
        <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
              <div className="flex items-center gap-2">
                <h2
                  className="text-base font-medium text-[var(--text-primary)]"
                  style={{
                    fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                  }}
                >
                  Activité Récente
                </h2>
                <BellRing className="h-4 w-4 text-[var(--color-brand-gold)]" aria-hidden="true" />
              </div>
              <Link href="/admin/orders" className="text-xs text-[var(--color-brand-primary)] hover:underline font-medium">
                Voir tout
              </Link>
            </div>

            <div className="space-y-3" role="list" aria-label="Dernières activités">
              {recentActivities.map((act) => {
                const Icon = act.icon;
                return (
                  <div key={act.id} className="flex items-start gap-3" role="listitem">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${act.color} flex-shrink-0 mt-0.5`} aria-hidden="true">
                      <Icon className="h-4 w-4" strokeWidth={1.6} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{act.title}</p>
                        <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{act.time}</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">{act.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] text-center">
            <span className="text-[11px] text-[var(--text-tertiary)]">Journal d'activité synchronisé</span>
          </div>
        </Card>

        {/* Commandes en cours (5 cols) with Elapsed Time & One-Tap Advance */}
        <Card className="lg:col-span-5 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
            <div className="flex items-center gap-2">
              <h2
                className="text-base font-medium text-[var(--text-primary)]"
                style={{
                  fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                }}
              >
                Commandes en Cours
              </h2>
              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-brand-primary)] animate-ping" aria-label="Commandes en cours" aria-hidden="true" />
            </div>
            <Link
              href="/admin/orders"
              className="text-xs text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Vue Kanban</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          <div className="space-y-2.5" role="list" aria-label="Commandes en cours">
            {ordersList.slice(0, 4).map((order, idx) => {
              const statusVariant =
                order.status === "completed"
                  ? "success"
                  : order.status === "ready"
                  ? "info"
                  : order.status === "preparing"
                  ? "warning"
                  : "gold";

              const statusFr =
                order.status === "completed"
                  ? "Terminée"
                  : order.status === "ready"
                  ? "Prête"
                  : order.status === "preparing"
                  ? "En préparation"
                  : "Nouvelle";

              // Mock elapsed time chips: turns amber past 15 min threshold
              const elapsedMinutes = 6 + idx * 5;
              const isAmber = elapsedMinutes >= 15;

              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all shadow-[var(--shadow-xs)]"
                  role="listitem"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono text-xs font-semibold border border-[var(--border-subtle)] flex-shrink-0">
                      #{order.order_number?.slice(-3) || "01"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {order.customer_name}
                        </span>
                        <StatusPill
                          label={statusFr}
                          variant={statusVariant}
                          pulse={order.status === "new" || order.status === "preparing"}
                        />
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-mono font-medium ${
                            isAmber
                              ? "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                              : "bg-[var(--border-subtle)] text-[var(--text-tertiary)]"
                          }`}
                        >
                          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                          {elapsedMinutes}m
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate mt-0.5">
                        Total : <strong className="text-[var(--color-brand-primary)] font-mono font-semibold">{formatTND(order.total, false)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* One-tap advance action */}
                  {order.status !== "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={advancingId === order.id}
                      onClick={() => handleAdvanceStatus(order.id, order.status)}
                      className="text-xs flex-shrink-0"
                    >
                      {order.status === "new"
                        ? "En cuisine →"
                        : order.status === "preparing"
                        ? "Prête →"
                        : "Terminer ✓"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Réservations d'aujourd'hui (3 cols) — Timeline by hour */}
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
            <h2
              className="text-base font-medium text-[var(--text-primary)]"
              style={{
                fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              }}
            >
              Réservations d'Aujourd'hui
            </h2>
            <Link
              href="/admin/reservations"
              className="text-xs text-[var(--color-brand-primary)] hover:underline font-medium"
            >
              Planning
            </Link>
          </div>

          <div className="space-y-2.5" role="list" aria-label="Réservations d'aujourd'hui">
            {initialReservations.slice(0, 4).map((res, i) => (
              <div
                key={res.id || i}
                className={`p-3 rounded-xl border transition-all ${
                  i === 0
                    ? "border-[var(--color-brand-gold-border)] bg-[var(--color-brand-gold-tint)] shadow-[var(--shadow-gold-md)]"
                    : "border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface)]"
                }`}
                role="listitem"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[var(--color-brand-primary)]">
                      {res.reservation_time || "19:30"}
                    </span>
                    <span className="font-medium text-[var(--text-primary)] truncate max-w-[100px]">
                      {res.customer_name || res.guest_name}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {res.party_size}p
                  </span>
                </div>
                {i === 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-[var(--color-brand-gold)] font-semibold uppercase tracking-wider">
                      ★ Prochaine tablée
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Table 04</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. ACTIONS RAPIDES — 4 TILES WITH LEAF-GREEN ICONS & HOVER LIFT */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2" role="list" aria-label="Actions rapides">
        {[
          {
            label: "Ajouter une réservation",
            desc: "Nouvelle table au planning",
            href: "/admin/reservations",
            icon: CalendarCheck,
          },
          {
            label: "Gérer le menu",
            desc: "Mise à jour plats et tarifs",
            href: "/admin/menu",
            icon: UtensilsCrossed,
          },
          {
            label: "Voir les commandes",
            desc: "Tableau de bord de service",
            href: "/admin/orders",
            icon: ShoppingBag,
          },
          {
            label: "Publier une photo",
            desc: "Enrichir la galerie d'ambiance",
            href: "/admin/gallery",
            icon: ImageIcon,
          },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3.5 p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] hover:border-[var(--color-brand-primary-border)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all group"
              role="listitem"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-primary-tint)] text-[var(--color-brand-primary)] group-hover:bg-[var(--color-brand-primary)] group-hover:text-white transition-all flex-shrink-0" aria-hidden="true">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                  {action.label}
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                  {action.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn { animation: none !important; }
        }
      `}</style>
    </div>
  );
}