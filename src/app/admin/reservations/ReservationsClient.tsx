"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  MessageCircle,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Printer,
  Download,
  Plus,
  Flame,
  UserCheck,
  UserX,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  List,
  Columns,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { adminFetch } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { Reservation, WaitlistEntry } from "@/lib/db/queries";
import type { ReservationRules } from "@/lib/reservations/rules";
import { minutesToTimeString, timeStringToMinutes } from "@/lib/reservations/time";

type Props = {
  initialReservations: Reservation[];
  rules: ReservationRules;
  initialWaitlist: WaitlistEntry[];
  currentUserRole: string;
};

type ViewMode = "timeline" | "list" | "waitlist";

export function ReservationsClient({
  initialReservations,
  rules,
  initialWaitlist,
  currentUserRole,
}: Props) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(initialWaitlist);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [reduceMotion, setReduceMotion] = useState(false);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Filter States
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [shiftFilter, setShiftFilter] = useState<"all" | "lunch" | "dinner">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Action States
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [declineModal, setDeclineModal] = useState<{ id: string; name: string } | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("Complet");

  const [editModal, setEditModal] = useState<Reservation | null>(null);
  const [editPartySize, setEditPartySize] = useState<number>(2);
  const [editTime, setEditTime] = useState<string>("12:30");
  const [editNotes, setEditNotes] = useState<string>("");

  const [walkinModal, setWalkinModal] = useState<boolean>(false);
  const [walkinName, setWalkinName] = useState<string>("");
  const [walkinPhone, setWalkinPhone] = useState<string>("");
  const [walkinParty, setWalkinParty] = useState<number>(2);
  const [walkinTime, setWalkinTime] = useState<string>("13:00");
  const [walkinSource, setWalkinSource] = useState<"phone" | "walk_in" | "partner">("walk_in");
  const [walkinOverride, setWalkinOverride] = useState<boolean>(false);
  const [walkinOverrideReason, setWalkinOverrideReason] = useState<string>("");

  // Waitlist Add Modal
  const [waitlistModal, setWaitlistModal] = useState<boolean>(false);
  const [wlName, setWlName] = useState<string>("");
  const [wlPhone, setWlPhone] = useState<string>("");
  const [wlParty, setWlParty] = useState<number>(2);
  const [wlTime, setWlTime] = useState<string>("13:00");
  const [wlNotes, setWlNotes] = useState<string>("");

  const isManagerOrAbove = ["super_admin", "restaurant_owner", "manager"].includes(currentUserRole);

  // Reload reservations from server
  const reloadData = async () => {
    try {
      const res = await adminFetch(`/api/reservations?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setReservations(data.reservations);
      }
      const wlRes = await adminFetch(`/api/admin/waitlist?date=${selectedDate}`);
      const wlData = await wlRes.json();
      if (wlData.success) {
        setWaitlist(wlData.waitlist);
      }
      toast.success("Données actualisées");
    } catch {
      toast.error("Erreur de synchronisation");
    }
  };

  // Date Shift Helper
  const shiftDate = (deltaDays: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const resDate = r.service_date || r.reservation_date;
      if (selectedDate && resDate !== selectedDate) return false;

      // Shift filter: lunch = startMinute < 1000, dinner = startMinute >= 1000
      const startMin = r.start_minute !== undefined ? r.start_minute : timeStringToMinutes(r.reservation_time || "12:00");
      if (shiftFilter === "lunch" && startMin >= 1000) return false;
      if (shiftFilter === "dinner" && startMin < 1000) return false;

      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.guest_name || r.customer_name || "").toLowerCase().includes(q);
        const phoneMatch = (r.guest_phone || r.customer_phone || "").includes(q);
        const refMatch = (r.reference || "").toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !refMatch) return false;
      }

      return true;
    });
  }, [reservations, selectedDate, shiftFilter, statusFilter, searchQuery]);

  // Shift KPI Metrics
  const metrics = useMemo(() => {
    const dayRows = reservations.filter((r) => (r.service_date || r.reservation_date) === selectedDate);
    const nonCancelled = dayRows.filter((r) => !["cancelled", "declined"].includes(r.status));

    const totalExpectedCovers = nonCancelled.reduce((acc, r) => acc + (r.party_size || 0), 0);
    const seatedCovers = dayRows
      .filter((r) => r.status === "seated")
      .reduce((acc, r) => acc + (r.party_size || 0), 0);
    const pendingCount = dayRows.filter((r) => r.status === "pending").length;
    const completedCount = dayRows.filter((r) => r.status === "completed").length;
    const cancelledCount = dayRows.filter((r) => ["cancelled", "declined", "no_show"].includes(r.status)).length;
    const walkinCount = dayRows.filter((r) => r.source === "walk_in").length;

    return {
      totalExpectedCovers,
      seatedCovers,
      pendingCount,
      completedCount,
      cancelledCount,
      walkinCount,
    };
  }, [reservations, selectedDate]);

  // Heat Strip calculation: 15-minute slot intervals across the shift
  const heatStripSlots = useMemo(() => {
    const slotList: { startMinute: number; time: string; covers: number; maxCovers: number; ratio: number }[] = [];
    const maxCoversPerSlot = rules.defaultMaxCoversPerSlot || 12;

    const ranges =
      shiftFilter === "lunch"
        ? [{ start: 720, end: 930 }]
        : shiftFilter === "dinner"
        ? [{ start: 1140, end: 1380 }]
        : [
            { start: 720, end: 930 },
            { start: 1140, end: 1380 },
          ];

    for (const range of ranges) {
      for (let m = range.start; m <= range.end; m += 15) {
        const coversAtSlot = reservations
          .filter(
            (r) =>
              (r.service_date || r.reservation_date) === selectedDate &&
              !["cancelled", "declined"].includes(r.status) &&
              (r.start_minute !== undefined ? r.start_minute : timeStringToMinutes(r.reservation_time || "12:00")) === m
          )
          .reduce((sum, r) => sum + (r.party_size || 0), 0);

        const ratio = Math.min(1, coversAtSlot / maxCoversPerSlot);
        slotList.push({
          startMinute: m,
          time: minutesToTimeString(m),
          covers: coversAtSlot,
          maxCovers: maxCoversPerSlot,
          ratio,
        });
      }
    }

    return slotList;
  }, [reservations, selectedDate, shiftFilter, rules]);

  // Fast Status Actions
  const handleStatusChange = async (id: string, newStatus: string, reason?: string) => {
    setUpdatingId(id);
    try {
      const res = await adminFetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, internal_notes: reason }),
      });

      if (!res.ok) throw new Error("Échec de la mise à jour");

      setReservations(reservations.map((r) => (r.id === id ? { ...r, status: newStatus as Reservation["status"] } : r)));
      toast.success(
        newStatus === "confirmed"
          ? "Réservation confirmée"
          : newStatus === "seated"
          ? "Client installé à table"
          : newStatus === "completed"
          ? "Service terminé"
          : newStatus === "no_show"
          ? "Marqué comme absent (No-show)"
          : "Statut mis à jour"
      );
    } catch {
      toast.error("Impossible de modifier le statut");
    } finally {
      setUpdatingId(null);
      setDeclineModal(null);
    }
  };

  // Submit Edit Details
  const handleSaveEdit = async () => {
    if (!editModal) return;
    setUpdatingId(editModal.id);

    try {
      const res = await adminFetch(`/api/reservations/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startMinute: timeStringToMinutes(editTime),
          partySize: editPartySize,
          guestNotes: editNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Modification impossible");
      }

      setReservations(
        reservations.map((r) =>
          r.id === editModal.id
            ? {
                ...r,
                start_minute: timeStringToMinutes(editTime),
                reservation_time: editTime,
                party_size: editPartySize,
                guest_notes: editNotes,
              }
            : r
        )
      );

      toast.success("Réservation modifiée avec succès");
      setEditModal(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setUpdatingId(null);
    }
  };

  // Submit Walk-in / Phone Fast Booking
  const handleCreateWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinName.trim() || !walkinPhone.trim()) {
      toast.error("Nom et téléphone requis");
      return;
    }

    try {
      const res = await adminFetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: walkinName.trim(),
          guestPhone: walkinPhone.trim(),
          serviceDate: selectedDate,
          startMinute: timeStringToMinutes(walkinTime),
          partySize: walkinParty,
          source: walkinSource,
          capacityOverride: walkinOverride,
          guestNotes: walkinOverrideReason ? `[Dérogation staff: ${walkinOverrideReason}]` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible d'enregistrer la réservation");
      }

      toast.success(`Réservation créée avec succès (${data.reservation.reference})`);
      setWalkinModal(false);
      setWalkinName("");
      setWalkinPhone("");
      setWalkinOverride(false);
      setWalkinOverrideReason("");
      reloadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de création");
    }
  };

  // Add to Waitlist
  const handleAddToWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wlName.trim() || !wlPhone.trim()) return;

    try {
      const res = await adminFetch("/api/admin/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: selectedDate,
          startMinute: timeStringToMinutes(wlTime),
          partySize: wlParty,
          customerName: wlName.trim(),
          customerPhone: wlPhone.trim(),
          notes: wlNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'ajout");

      setWaitlist([data.entry, ...waitlist]);
      toast.success("Client ajouté à la liste d'attente");
      setWaitlistModal(false);
      setWlName("");
      setWlPhone("");
      setWlNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  // Promote Waitlist Entry
  const handlePromoteWaitlist = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/waitlist/${id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacityOverride: isManagerOrAbove }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de promouvoir");

      toast.success(`Client promu en réservation confirmée (${data.reservation.reference})`);
      setWaitlist(waitlist.map((w) => (w.id === id ? { ...w, status: "seated" } : w)));
      reloadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  // Print Service Sheet
  const handlePrint = () => {
    window.print();
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      "Référence",
      "Date",
      "Heure",
      "Nom",
      "Téléphone",
      "Convives",
      "Statut",
      "Source",
      "Emplacement",
      "Remarques",
    ];
    const rows = filteredReservations.map((r) => [
      `"${r.reference || ""}"`,
      `"${r.service_date || r.reservation_date}"`,
      `"${r.reservation_time || minutesToTimeString(r.start_minute)}"`,
      `"${(r.guest_name || r.customer_name || "").replace(/"/g, '""')}"`,
      `"${r.guest_phone || r.customer_phone || ""}"`,
      r.party_size,
      `"${r.status}"`,
      `"${r.source || "web"}"`,
      `"${r.seating_preference || "Standard"}"`,
      `"${(r.guest_notes || r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,﻿" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reservations-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status badge variant mapping
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "badge-pending",
      confirmed: "badge-success",
      seated: "badge-info",
      completed: "badge-neutral",
      cancelled: "badge-error",
      declined: "badge-error",
      no_show: "badge-warning",
    };
    return variants[status] || "badge-neutral";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      confirmed: "Confirmée",
      seated: "Installée",
      completed: "Terminée",
      cancelled: "Annulée",
      declined: "Refusée",
      no_show: "No-show",
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* ── PRINT-ONLY STYLES & LAYOUT ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          header, nav, aside, .no-print, button, input, select { display: none !important; }
          .print-only { display: block !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; font-size: 10pt !important; }
          .print-table th, .print-table td { border: 1px solid #333 !important; padding: var(--space-1-5) var(--space-2) !important; }
          .print-table th { background: #eee !important; font-weight: bold !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}} />

      {/* PRINT-ONLY HEADER */}
      <div className="print-only">
        <h1 className="text-xl font-bold text-text-primary">Dar Zitoun — Feuille de Service</h1>
        <p className="text-sm text-text-secondary mb-4">Date : {selectedDate} | Total convives prévus : {metrics.totalExpectedCovers}</p>
        <table className="print-table">
          <thead>
            <tr>
              <th>Heure</th>
              <th>Réf</th>
              <th>Client</th>
              <th>Convives</th>
              <th>Téléphone</th>
              <th>Emplacement / Notes</th>
              <th>Statut</th>
              <th>Émargement</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((r) => (
              <tr key={r.id}>
                <td>{r.reservation_time || minutesToTimeString(r.start_minute ?? 720)}</td>
                <td className="font-mono">{r.reference || "-"}</td>
                <td className="font-bold">{r.guest_name || r.customer_name}</td>
                <td className="text-center">{r.party_size}p</td>
                <td>{r.guest_phone || r.customer_phone}</td>
                <td>{r.seating_preference ? `[${r.seating_preference}] ` : ""}{r.guest_notes || r.notes || "-"}</td>
                <td>{r.status}</td>
                <td className="w-16 text-center">[ ]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── SCREEN DASHBOARD (hidden in print) ── */}
      <div className="no-print space-y-6 animate-fadeIn">
        {/* Premium Top Header & Actions */}
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
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Service en Direct</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3" style={{
                fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                letterSpacing: "0.01em",
              }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)] shadow-[var(--shadow-gold-md)]">
                  <CalendarIcon className="h-5.5 w-5.5" aria-hidden="true" />
                </div>
                <span>Service & Réservations</span>
              </h1>
              <p className="text-sm text-[var(--text-quaternary)] leading-relaxed">
                Supervision de salle, cadence des créneaux, arrivées et liste d'attente
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={reloadData}
                className="btn-ghost btn-sm p-2 shadow-[var(--shadow-gold-sm)] group hover:bg-[var(--color-brand-primary-tint)]"
                title="Actualiser les données"
                aria-label="Actualiser les données"
              >
                <RefreshCw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn-secondary btn-sm gap-1.5 shadow-[var(--shadow-gold-sm)]"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Imprimer</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="btn-secondary btn-sm gap-1.5 shadow-[var(--shadow-gold-sm)]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setWaitlistModal(true)}
                className="btn-outline btn-sm gap-1.5 text-[var(--status-warning)] border-[var(--status-warning)]/30 bg-[var(--status-warning-bg)] hover:bg-[var(--status-warning-bg)]/50"
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>+ Liste d'attente</span>
              </button>

              <button
                type="button"
                onClick={() => setWalkinModal(true)}
                className="btn-primary btn-sm gap-1.5 shadow-[var(--shadow-gold-md)]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>+ Réservation Staff</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 ml-1" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* Date Selector & Shift Toggle */}
        <div className="card p-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl" style={{
          background: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-card)",
        }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="btn-ghost btn-sm p-1.5 shadow-[var(--shadow-gold-sm)]"
              aria-label="Jour précédent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <label htmlFor="selected-date" className="sr-only">Sélectionner la date</label>
            <input
              id="selected-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input input-sm w-auto focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
              aria-label="Sélectionner la date"
            />

            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="btn-ghost btn-sm p-1.5 shadow-[var(--shadow-gold-sm)]"
              aria-label="Jour suivant"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`btn-sm px-2.5 py-1 text-xs font-semibold transition-all shadow-[var(--shadow-gold-sm)] ${
                selectedDate === todayStr ? "btn-success" : "btn-ghost"
              }`}
            >
              Aujourd'hui
            </button>
          </div>

          {/* Shift Switcher */}
          <div className="flex items-center gap-1" role="group" aria-label="Filtrer par service">
            <button
              type="button"
              onClick={() => setShiftFilter("all")}
              className={`btn-sm px-3 py-1 text-xs font-medium transition-all shadow-[var(--shadow-gold-sm)] ${
                shiftFilter === "all" ? "btn-secondary" : "btn-ghost"
              }`}
            >
              Tous les services
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter("lunch")}
              className={`btn-sm px-3 py-1 text-xs font-medium transition-all shadow-[var(--shadow-gold-sm)] ${
                shiftFilter === "lunch" ? "btn-success" : "btn-ghost"
              }`}
            >
              <span className="inline-flex items-center gap-1">☀️ Déjeuner</span>
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter("dinner")}
              className={`btn-sm px-3 py-1 text-xs font-medium transition-all shadow-[var(--shadow-gold-sm)] ${
                shiftFilter === "dinner" ? "btn-info" : "btn-ghost"
              }`}
            >
              <span className="inline-flex items-center gap-1">🌙 Dîner</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1" role="group" aria-label="Mode d'affichage">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`btn-sm px-2.5 py-1 text-xs font-medium gap-1 shadow-[var(--shadow-gold-sm)] ${
                viewMode === "list" ? "btn-secondary" : "btn-ghost"
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Liste</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`btn-sm px-2.5 py-1 text-xs font-medium gap-1 shadow-[var(--shadow-gold-sm)] ${
                viewMode === "timeline" ? "btn-secondary" : "btn-ghost"
              }`}
            >
              <Columns className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chronologie</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("waitlist")}
              className={`btn-sm px-2.5 py-1 text-xs font-medium gap-1 shadow-[var(--shadow-gold-sm)] ${
                viewMode === "waitlist" ? "btn-outline border-[var(--status-warning)]/30 text-[var(--status-warning)] bg-[var(--status-warning-bg)]" : "btn-ghost"
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Attente ({waitlist.filter((w) => w.status === "waiting").length})</span>
            </button>
          </div>
        </div>

        {/* ── SHIFT KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-primary)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--color-brand-primary)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">Couverts Prévus</span>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{metrics.totalExpectedCovers}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-success)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-success)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--status-success)] block">En Salle (Installés)</span>
            <p className="text-xl font-bold text-[var(--status-success)] mt-1">{metrics.seatedCovers}p</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-primary-bg)]/50" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--color-brand-primary-bg)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">En Attente Validation</span>
            <p className="text-xl font-bold text-[var(--text-tertiary)] mt-1">{metrics.pendingCount}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-info)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-info)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--status-info)] block">Services Terminés</span>
            <p className="text-xl font-bold text-[var(--status-info)] mt-1">{metrics.completedCount}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-gold)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--color-brand-gold)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-gold)] block">Walk-ins (Direct)</span>
            <p className="text-xl font-bold text-[var(--color-brand-gold)] mt-1">{metrics.walkinCount}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-error)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-error)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--status-error)] block">Annulés / No-shows</span>
            <p className="text-xl font-bold text-[var(--status-error)] mt-1">{metrics.cancelledCount}</p>
          </div>
        </div>

        {/* ── PACING / HEAT STRIP ── */}
        <div className="card p-4 space-y-2 rounded-2xl shadow-sm" style={{
          background: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-card)",
        }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-[var(--color-brand-gold)]" aria-hidden="true" />
              <span>Cadence & Charge des créneaux (Pacing 15 min — max {rules.defaultMaxCoversPerSlot || 12} couv.)</span>
            </span>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)] flex-wrap">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--status-success)]" aria-hidden="true" /> {"<60% Fluide"}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--color-brand-primary)]" aria-hidden="true" /> 60-90% Dense
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--status-error)]" aria-hidden="true" /> 100% Plafond
              </span>
            </div>
          </div>

          {/* Visual Bar Strip */}
          <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-18 gap-1 pt-1 overflow-x-auto">
            {heatStripSlots.map((slot) => {
              const bgClass =
                slot.covers === 0
                  ? "bg-[var(--border-subtle)] border-[var(--border-subtle)] text-[var(--text-tertiary)]"
                  : slot.ratio >= 1
                  ? "bg-[var(--status-error)]/15 border-[var(--status-error)]/50 text-[var(--status-error)]"
                  : slot.ratio >= 0.6
                  ? "bg-[var(--color-brand-primary-tint)] border-[var(--color-brand-primary-border)]/50 text-[var(--text-tertiary)]"
                  : "bg-[var(--status-success)]/15 border-[var(--status-success)]/50 text-[var(--status-success)]";

              return (
                <div
                  key={slot.startMinute}
                  className={`rounded-lg border p-1 text-center transition-all duration-200 hover:scale-105 ${bgClass}`}
                  title={`${slot.time} : ${slot.covers} / ${slot.maxCovers} couverts`}
                  role="img"
                  aria-label={`${slot.time} : ${slot.covers} couverts sur ${slot.maxCovers} maximum`}
                >
                  <span className="text-[10px] font-mono block opacity-80">{slot.time}</span>
                  <span className="text-xs font-bold block">{slot.covers}p</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SEARCH & STATUS FILTERS (FOR LIST VIEW) ── */}
        {viewMode === "list" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
              <label htmlFor="reservations-search" className="sr-only">Rechercher dans les réservations</label>
              <input
                id="reservations-search"
                type="text"
                placeholder="Rechercher par nom, téléphone ou référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input ps-9 focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                aria-label="Rechercher dans les réservations"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtrer par statut">
              {[
                { id: "all", label: "Tous" },
                { id: "pending", label: "En attente" },
                { id: "confirmed", label: "Confirmées" },
                { id: "seated", label: "Installées" },
                { id: "completed", label: "Terminées" },
                { id: "no_show", label: "No-show" },
                { id: "declined", label: "Refusées" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`btn-sm px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shadow-[var(--shadow-gold-sm)] ${
                    statusFilter === st.id ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW 1: DENSE LIST TABLE ── */}
        {viewMode === "list" && (
          <div className="card overflow-hidden rounded-2xl shadow-sm" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <div className="overflow-x-auto">
              <table className="w-full text-start" role="grid" aria-label="Liste des réservations">
                <thead className="bg-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="py-3 px-4" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Heure & Réf</span>
                    </th>
                    <th className="py-3 px-4" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Client</span>
                    </th>
                    <th className="py-3 px-4" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Convives</span>
                    </th>
                    <th className="py-3 px-4" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Préférences & Notes</span>
                    </th>
                    <th className="py-3 px-4" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Statut</span>
                    </th>
                    <th className="py-3 px-4 text-end" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Actions Rapides</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-tertiary)]">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--text-tertiary)]">
                        Aucune réservation correspondant aux filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((res) => {
                      const timeStr = res.reservation_time || minutesToTimeString(res.start_minute);
                      const isUpdating = updatingId === res.id;

                      return (
                        <tr key={res.id} className={`hover:bg-[var(--color-brand-primary-tint)] transition-all duration-200 group ${reduceMotion ? "transition-none" : ""}`}>
                          {/* Time & Reference */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium text-[var(--text-primary)] text-sm">{timeStr}</div>
                            <span className="font-mono text-[10px] text-[var(--color-brand-gold)]/90">{res.reference || "-"}</span>
                          </td>

                          {/* Client & Contacts */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-[var(--text-primary)]">{res.guest_name || res.customer_name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                              <a href={`tel:${res.guest_phone || res.customer_phone}`} className="hover:text-[var(--color-brand-primary)]">
                                {res.guest_phone || res.customer_phone}
                              </a>
                              {(res.guest_phone || res.customer_phone) && (
                                <a
                                  href={`https://wa.me/${(res.guest_phone || res.customer_phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Bonjour ${res.guest_name || res.customer_name}, concernant votre réservation ${res.reference} chez Dar Zitoun...`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--status-success)] hover:underline inline-flex items-center gap-0.5"
                                  title="Ouvrir WhatsApp"
                                >
                                  <MessageCircle className="h-3 w-3" aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Party Size & Source */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-[var(--status-success)] text-sm">{res.party_size}p</span>
                            <span className="block text-[10px] text-[var(--text-tertiary)] capitalize">{res.source || "web"}</span>
                          </td>

                          {/* Preferences & Notes */}
                          <td className="py-3 px-4 max-w-xs">
                            {res.seating_preference && (
                              <span className="inline-block rounded-md bg-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] font-medium mr-1 mb-1">
                                📍 {res.seating_preference}
                              </span>
                            )}
                            {res.occasion && (
                              <span className="inline-block rounded-md bg-[var(--status-success)]/20 text-[var(--status-success)] px-1.5 py-0.5 text-[10px] font-medium mr-1 mb-1">
                                🎉 {res.occasion}
                              </span>
                            )}
                            {(res.guest_notes || res.notes) && (
                              <p className="text-[11px] text-[var(--text-tertiary)] italic truncate" title={res.guest_notes || res.notes || undefined}>
                                &ldquo;{res.guest_notes || res.notes}&rdquo;
                              </p>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`badge ${getStatusBadge(res.status)}`}>
                              {getStatusLabel(res.status)}
                            </span>
                          </td>

                          {/* Quick Actions */}
                          <td className="py-3 px-4 text-end whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {/* Confirm (if pending) */}
                              {res.status === "pending" && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleStatusChange(res.id, "confirmed")}
                                  className="btn-success btn-xs shadow-[var(--shadow-success-sm)]"
                                  title="Confirmer"
                                >
                                  ✓ Confirmer
                                </button>
                              )}

                              {/* Seat (if confirmed) */}
                              {res.status === "confirmed" && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleStatusChange(res.id, "seated")}
                                  className="btn-info btn-xs gap-1 shadow-[var(--shadow-success-sm)]"
                                  title="Installer à table"
                                >
                                  <UserCheck className="h-3 w-3" aria-hidden="true" />
                                  <span>Installer</span>
                                </button>
                              )}

                              {/* Complete (if seated) */}
                              {res.status === "seated" && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleStatusChange(res.id, "completed")}
                                  className="btn-secondary btn-xs"
                                  title="Terminer le service"
                                >
                                  Terminer
                                </button>
                              )}

                              {/* No-show (if confirmed and late) */}
                              {res.status === "confirmed" && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleStatusChange(res.id, "no_show")}
                                  className="btn-warning btn-xs gap-1"
                                  title="Marquer absent (No-show)"
                                >
                                  <UserX className="h-3 w-3" aria-hidden="true" />
                                  <span>No-show</span>
                                </button>
                              )}

                              {/* Edit Modal */}
                              {!["completed", "cancelled", "declined"].includes(res.status) && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => {
                                    setEditModal(res);
                                    setEditPartySize(res.party_size);
                                    setEditTime(res.reservation_time || minutesToTimeString(res.start_minute));
                                    setEditNotes(res.guest_notes || res.notes || "");
                                  }}
                                  className="btn-ghost btn-sm p-1.5 shadow-[var(--shadow-gold-sm)]"
                                  title="Modifier détails"
                                  aria-label={`Modifier la réservation ${res.reference}`}
                                >
                                  <Edit2 className="h-3 w-3" aria-hidden="true" />
                                </button>
                              )}

                              {/* Decline / Cancel (if not terminal) */}
                              {!["completed", "cancelled", "declined", "no_show"].includes(res.status) && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => setDeclineModal({ id: res.id, name: res.guest_name || res.customer_name || "Client" })}
                                  className="btn-danger btn-xs p-2 shadow-[var(--shadow-error-sm)]"
                                  title="Refuser ou annuler"
                                  aria-label={`Refuser la réservation ${res.reference}`}
                                >
                                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VIEW 2: CHRONOLOGICAL TIMELINE VIEW ── */}
        {viewMode === "timeline" && (
          <div className="space-y-4">
            {heatStripSlots
              .filter((slot) => slot.covers > 0)
              .map((slot) => {
                const slotBookings = filteredReservations.filter((r) => {
                  const m = r.start_minute !== undefined ? r.start_minute : timeStringToMinutes(r.reservation_time || "12:00");
                  return m === slot.startMinute;
                });

                return (
                  <div key={slot.startMinute} className="card p-4 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-primary)]" style={{
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-default)",
                    borderLeft: "4px solid var(--color-brand-primary)",
                    borderRadius: "var(--radius-2xl)",
                    boxShadow: "var(--shadow-card)",
                  }}>
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[var(--status-success)]" aria-hidden="true" />
                        <span className="font-mono text-base font-bold text-[var(--text-primary)]">{slot.time}</span>
                        <span className="badge badge-outline badge-sm">{slot.covers} couverts</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {slotBookings.map((r) => (
                        <div
                          key={r.id}
                          className="card border-[var(--border-subtle)] p-3 space-y-2 hover:border-[var(--color-brand-primary-border)] hover:bg-[var(--color-brand-primary-tint)] transition-all duration-300"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-[var(--text-primary)] text-sm">{r.guest_name || r.customer_name}</p>
                              <span className="font-mono text-[10px] text-[var(--color-brand-gold)]/90">{r.reference || "-"}</span>
                            </div>
                            <span className="font-bold text-[var(--status-success)] text-sm">{r.party_size} pers.</span>
                          </div>

                          <div className="text-[11px] text-[var(--text-tertiary)] flex items-center justify-between">
                            <span>{r.guest_phone || r.customer_phone}</span>
                            <span className="capitalize text-[var(--text-tertiary)]">{r.status}</span>
                          </div>

                          {(r.guest_notes || r.notes) && (
                            <p className="text-[10px] text-[var(--text-tertiary)] italic bg-[var(--border-subtle)] p-1.5 rounded truncate">
                              &ldquo;{r.guest_notes || r.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ── VIEW 3: WAITLIST TAB ── */}
        {viewMode === "waitlist" && (
          <div className="card p-6 space-y-4 rounded-2xl shadow-sm" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[var(--text-primary)] text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[var(--color-brand-gold)]" aria-hidden="true" />
                  <span>Liste d'Attente du {selectedDate}</span>
                </h2>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Clients en attente d'une table libérée. Possibilité de notifier ou promouvoir en 1 clic.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWaitlistModal(true)}
                className="btn-warning btn-sm shadow-[var(--shadow-success-sm)]"
              >
                + Inscrire un client
              </button>
            </div>

            {waitlist.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                Aucun client en liste d'attente pour cette journée.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {waitlist.map((entry) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{entry.customer_name}</span>
                        <span className="font-bold text-[var(--color-brand-gold)] text-xs">{entry.party_size} personnes</span>
                        <span className="text-[var(--text-tertiary)] text-xs">à {minutesToTimeString(entry.start_minute)}</span>
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        <a href={`tel:${entry.customer_phone}`} className="hover:text-[var(--color-brand-primary)]">
                          {entry.customer_phone}
                        </a>
                        {entry.notes && <span className="ml-2 italic">— {entry.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`badge badge-sm ${
                          entry.status === "seated"
                            ? "badge-success"
                            : entry.status === "notified"
                            ? "badge-info"
                            : "badge-pending"
                        }`}
                      >
                        {entry.status}
                      </span>

                      {entry.status === "waiting" && (
                        <>
                          <a
                            href={`https://wa.me/${entry.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Bonjour ${entry.customer_name}, une table pour ${entry.party_size} personnes est prête pour vous chez Dar Zitoun !`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-success btn-xs gap-1 shadow-[var(--shadow-success-sm)]"
                          >
                            <MessageCircle className="h-3 w-3" aria-hidden="true" />
                            <span>Notifier WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handlePromoteWaitlist(entry.id)}
                            className="btn-warning btn-xs shadow-[var(--shadow-success-sm)]"
                          >
                            Promouvoir en réservation
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL: DECLINE / CANCEL REASON ── */}
        {declineModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-modal-title"
          >
            <div className="modal modal-sm" style={{
              background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-3xl)",
              boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[var(--status-error)]">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                  <h3 id="decline-modal-title" className="font-semibold text-sm">Refuser la réservation</h3>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Refuser ou annuler la réservation pour <strong>{declineModal.name}</strong> ?
                </p>

                <div>
                  <label htmlFor="decline-reason" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Motif :</label>
                  <select
                    id="decline-reason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  >
                    <option value="Complet">Complet (capacité maximale atteinte)</option>
                    <option value="Fermeture exceptionnelle">Fermeture exceptionnelle</option>
                    <option value="Privatisation">Privatisation du restaurant</option>
                    <option value="Demande client">Annulation à la demande du client</option>
                    <option value="Autre">Autre motif</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeclineModal(null)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleStatusChange(declineModal.id, "declined", declineReason)}
                  >
                    Confirmer le refus
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: EDIT RESERVATION ── */}
        {editModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
          >
            <div className="modal modal-md" style={{
              background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-3xl)",
              boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <h3 id="edit-modal-title" className="font-semibold text-sm text-[var(--text-primary)] mb-4">Modifier la réservation — {editModal.reference}</h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label htmlFor="edit-time" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Heure</label>
                  <input
                    id="edit-time"
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-party" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Convives</label>
                  <select
                    id="edit-party"
                    value={editPartySize}
                    onChange={(e) => setEditPartySize(Number(e.target.value))}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n) => (
                      <option key={n} value={n}>
                        {n} personnes
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="edit-notes" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Remarques / Table</label>
                <textarea
                  id="edit-notes"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModal(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: STAFF WALKIN / PHONE RESERVATION ── */}
        {walkinModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="walkin-modal-title"
          >
            <form onSubmit={handleCreateWalkin} className="modal modal-md space-y-4" style={{
              background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-3xl)",
              boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <h3 id="walkin-modal-title" className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2 mb-4">
                <Plus className="h-4 w-4 text-[var(--status-success)]" aria-hidden="true" />
                <span>Création Réservation Staff ({selectedDate})</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="walkin-name" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Nom du client <span className="text-[var(--color-brand-gold)]" aria-hidden="true">*</span></label>
                  <input
                    id="walkin-name"
                    type="text"
                    required
                    placeholder="Ex: Sami Riahi"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  />
                </div>

                <div>
                  <label htmlFor="walkin-phone" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Téléphone <span className="text-[var(--color-brand-gold)]" aria-hidden="true">*</span></label>
                  <input
                    id="walkin-phone"
                    type="tel"
                    required
                    placeholder="98 000 000"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="walkin-time" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Heure</label>
                  <input
                    id="walkin-time"
                    type="time"
                    value={walkinTime}
                    onChange={(e) => setWalkinTime(e.target.value)}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  />
                </div>

                <div>
                  <label htmlFor="walkin-party" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Convives</label>
                  <select
                    id="walkin-party"
                    value={walkinParty}
                    onChange={(e) => setWalkinParty(Number(e.target.value))}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map((n) => (
                      <option key={n} value={n}>
                        {n} pers.
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="walkin-source" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Source</label>
                  <select
                    id="walkin-source"
                    value={walkinSource}
                    onChange={(e) => setWalkinSource(e.target.value as "phone" | "walk_in" | "partner")}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] cursor-pointer"
                  >
                    <option value="walk_in">Sur place</option>
                    <option value="phone">Téléphone</option>
                    <option value="partner">Hôtel / Partenaire</option>
                  </select>
                </div>
              </div>

              {/* Manager Capacity Override */}
              {isManagerOrAbove && (
                <div className="card border-[var(--status-warning)]/30 bg-[var(--status-warning-bg)]/50 p-3 space-y-2 rounded-2xl" style={{
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-2xl)",
                  boxShadow: "var(--shadow-card)",
                }}>
                  <label htmlFor="walkin-override" className="flex items-center gap-2 cursor-pointer text-xs text-[var(--status-warning)] font-semibold">
                    <input
                      id="walkin-override"
                      type="checkbox"
                      checked={walkinOverride}
                      onChange={(e) => setWalkinOverride(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                    />
                    <span>Dérogation de capacité (Manager Override)</span>
                  </label>
                  {walkinOverride && (
                    <div>
                      <label htmlFor="walkin-override-reason" className="text-[10px] text-[var(--status-warning)]/80 block mb-1">
                        Motif de la dérogation (enregistré dans le journal d'activité) :
                      </label>
                      <input
                        id="walkin-override-reason"
                        type="text"
                        required={walkinOverride}
                        placeholder="Ex: VIP propriétaire, table d'appoint ajoutée..."
                        value={walkinOverrideReason}
                        onChange={(e) => setWalkinOverrideReason(e.target.value)}
                        className="input input-sm border-[var(--status-warning)]/40 bg-[var(--border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWalkinModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Créer et confirmer
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODAL: WAITLIST QUICK ADD ── */}
        {waitlistModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="waitlist-modal-title"
          >
            <form onSubmit={handleAddToWaitlist} className="modal modal-md space-y-4" style={{
              background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-3xl)",
              boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <h3 id="waitlist-modal-title" className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-[var(--color-brand-gold)]" aria-hidden="true" />
                <span>Inscrire en Liste d'Attente</span>
              </h3>

              <div>
                <label htmlFor="wl-name" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Nom du client <span className="text-[var(--color-brand-gold)]" aria-hidden="true">*</span></label>
                <input
                  id="wl-name"
                  type="text"
                  required
                  value={wlName}
                  onChange={(e) => setWlName(e.target.value)}
                  placeholder="Ex: Karim Trabelsi"
                  className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                />
              </div>

              <div>
                <label htmlFor="wl-phone" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Téléphone <span className="text-[var(--color-brand-gold)]" aria-hidden="true">*</span></label>
                <input
                  id="wl-phone"
                  type="tel"
                  required
                  value={wlPhone}
                  onChange={(e) => setWlPhone(e.target.value)}
                  placeholder="20 000 000"
                  className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wl-time" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Heure souhaitée</label>
                  <input
                    id="wl-time"
                    type="time"
                    value={wlTime}
                    onChange={(e) => setWlTime(e.target.value)}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  />
                </div>

                <div>
                  <label htmlFor="wl-party" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Convives</label>
                  <select
                    id="wl-party"
                    value={wlParty}
                    onChange={(e) => setWlParty(Number(e.target.value))}
                    className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} pers.
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="wl-notes" className="text-[11px] text-[var(--text-tertiary)] block mb-1">Notes</label>
                <input
                  id="wl-notes"
                  type="text"
                  value={wlNotes}
                  onChange={(e) => setWlNotes(e.target.value)}
                  placeholder="Prêt à attendre au bar..."
                  className="input input-sm focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWaitlistModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Inscrire
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

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
  );
}