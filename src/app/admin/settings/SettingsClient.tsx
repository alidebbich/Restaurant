"use client";

import { useState } from "react";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Settings as SettingsIcon,
  Sliders,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import type { RestaurantSettings, OperatingHour } from "@/lib/db/queries";
import type { ReservationRules, DurationRule } from "@/lib/reservations/rules";
import { minutesToTimeString } from "@/lib/reservations/time";

type Props = {
  initialSettings: RestaurantSettings;
  initialHours: OperatingHour[];
  initialRules: ReservationRules;
};

type ActiveTab = "general" | "hours" | "reservations";

export function SettingsClient({ initialSettings, initialHours, initialRules }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const [settings, setSettings] = useState<RestaurantSettings>(initialSettings);
  const [hours, setHours] = useState<OperatingHour[]>(initialHours);
  const [rules, setRules] = useState<ReservationRules>(initialRules);

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Blackout Date Input State
  const [newBlackoutDate, setNewBlackoutDate] = useState<string>("");

  const handleHourChange = (dayIndex: number, field: keyof OperatingHour, value: string | number) => {
    setHours(hours.map((h, i) => (i === dayIndex ? { ...h, [field]: value } : h)));
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedback(null);

    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, hours }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur de sauvegarde");
      }

      toast.success("Paramètres et horaires enregistrés avec succès !");
      setFeedback({ message: "Paramètres et horaires enregistrés avec succès !", type: "success" });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement";
      toast.error(msg);
      setFeedback({ message: msg, type: "error" });
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Reservation Rules
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    setFeedback(null);

    try {
      const res = await adminFetch("/api/admin/reservation-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour des règles");
      }

      toast.success("Règles de réservation enregistrées avec succès !");
      setFeedback({ message: "Règles de réservation enregistrées avec succès !", type: "success" });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement des règles";
      toast.error(msg);
      setFeedback({ message: msg, type: "error" });
    } finally {
      setSavingRules(false);
    }
  };

  // Turn Duration table edits
  const handleDurationChange = (index: number, newMinutes: number) => {
    const nextDurations = [...rules.durationsByPartySize];
    nextDurations[index] = { ...nextDurations[index], durationMinutes: newMinutes };
    setRules({ ...rules, durationsByPartySize: nextDurations });
  };

  // Blackout dates
  const handleAddBlackout = () => {
    if (!newBlackoutDate || rules.blackoutDates.includes(newBlackoutDate)) return;
    setRules({ ...rules, blackoutDates: [...rules.blackoutDates, newBlackoutDate] });
    setNewBlackoutDate("");
  };

  const handleRemoveBlackout = (dateStr: string) => {
    setRules({ ...rules, blackoutDates: rules.blackoutDates.filter((d) => d !== dateStr) });
  };

  // Simulated live slot preview calculation for 12:00 to 14:00 (lunch)
  const simulatedSlots = [];
  const stepMin = rules.slotIntervalMinutes || 15;
  for (let m = 720; m <= 840; m += stepMin) {
    simulatedSlots.push({
      startMinute: m,
      time: minutesToTimeString(m),
      maxCovers: rules.defaultMaxCoversPerSlot,
    });
  }

  const TabButton = ({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
        active
          ? "btn-primary shadow-gold-sm"
          : "text-quaternary hover:text-primary hover:bg-brand-primary-bg/50 hover:border-brand-primary-border/50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="w-full space-y-8 pb-16 animate-fadeIn">
      {/* Top Header — Premium */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10 card-elevated group">
        <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true">
          <div className="absolute -top-1/4 -right-1/4 h-[300px] w-[300px] rounded-full" style={{ background: "var(--color-brand-primary-tint)", filter: "blur(96px)" }} />
          <div className="absolute -bottom-1/4 -left-1/4 h-[200px] w-[200px] rounded-full" style={{ background: "var(--color-success-tint)", filter: "blur(96px)", animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary-bg border border-brand-primary-border text-brand-primary shadow-gold-sm">
                <SettingsIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span>Paramètres du Restaurant</span>
            </h2>
            <p className="text-sm text-quaternary">
              Coordonnées, horaires d&apos;ouverture et moteur de réservation
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 card p-1">
            <TabButton
              active={activeTab === "general"}
              icon={SettingsIcon}
              label="Général"
              onClick={() => setActiveTab("general")}
            />
            <TabButton
              active={activeTab === "hours"}
              icon={Clock}
              label="Horaires"
              onClick={() => setActiveTab("hours")}
            />
            <TabButton
              active={activeTab === "reservations"}
              icon={Sliders}
              label="Réservations"
              onClick={() => setActiveTab("reservations")}
            />
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`card p-4 text-sm font-medium border flex items-center gap-2 ${
            feedback.type === "success"
              ? "border-status-success-border/30 bg-status-success-bg text-status-success"
              : "border-status-error-border/30 bg-status-error-bg text-status-error"
          }`}
          role="alert"
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: GENERAL & CONTACT & MODULES                         */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          {/* Identity & Name */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">1. Identité du Restaurant</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="name-fr" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Nom (Français) <span className="text-brand-primary" aria-hidden="true">*</span>
                </label>
                <input
                  id="name-fr"
                  type="text"
                  required
                  value={settings.name_fr}
                  onChange={(e) => setSettings({ ...settings, name_fr: e.target.value })}
                  className="input focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>

              <div>
                <label htmlFor="name-ar" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary font-arabic">
                  اسم المطعم (العربية) <span className="text-brand-primary" aria-hidden="true">*</span>
                </label>
                <input
                  id="name-ar"
                  type="text"
                  dir="rtl"
                  required
                  value={settings.name_ar}
                  onChange={(e) => setSettings({ ...settings, name_ar: e.target.value })}
                  className="input font-arabic focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>

              <div>
                <label htmlFor="name-en" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Name (English)
                </label>
                <input
                  id="name-en"
                  type="text"
                  value={settings.name_en}
                  onChange={(e) => setSettings({ ...settings, name_en: e.target.value })}
                  className="input focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>
          </div>

          {/* Contact & WhatsApp */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">2. Coordonnées Directes & WhatsApp</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Numéro de Téléphone
                </label>
                <input
                  id="phone"
                  type="text"
                  dir="ltr"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="input focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Numéro WhatsApp (Format international)
                </label>
                <input
                  id="whatsapp"
                  type="text"
                  dir="ltr"
                  placeholder="+216..."
                  value={settings.whatsapp}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                  className="input font-mono text-status-success focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Email de Contact
                </label>
                <input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="input focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="sm:col-span-2">
                <label htmlFor="address-street" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Adresse (Rue)
                </label>
                <input
                  id="address-street"
                  type="text"
                  value={settings.address_street}
                  onChange={(e) => setSettings({ ...settings, address_street: e.target.value })}
                  className="input focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>

              <div>
                <label htmlFor="address-city" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Ville
                </label>
                <input
                  id="address-city"
                  type="text"
                  value={settings.address_city}
                  onChange={(e) => setSettings({ ...settings, address_city: e.target.value })}
                  className="input focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>
          </div>

          {/* Modules Toggles */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">3. Activation des Modules Publics</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label htmlFor="module-ordering" className="flex items-center gap-3 card border-border-default p-4 cursor-pointer group hover:border-brand-primary-border hover:bg-brand-primary-bg/30 transition-all duration-300">
                <input
                  id="module-ordering"
                  type="checkbox"
                  checked={settings.is_ordering_enabled === 1}
                  onChange={(e) => setSettings({ ...settings, is_ordering_enabled: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 rounded border-border-default accent-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                <div>
                  <p className="text-xs font-semibold text-primary group-hover:text-brand-primary transition-colors">Commande en Ligne</p>
                  <p className="text-[11px] text-quaternary">Panier et formulaires de commande</p>
                </div>
              </label>

              <label htmlFor="module-reservations" className="flex items-center gap-3 card border-border-default p-4 cursor-pointer group hover:border-brand-primary-border hover:bg-brand-primary-bg/30 transition-all duration-300">
                <input
                  id="module-reservations"
                  type="checkbox"
                  checked={settings.is_reservations_enabled === 1}
                  onChange={(e) => setSettings({ ...settings, is_reservations_enabled: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 rounded border-border-default accent-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                <div>
                  <p className="text-xs font-semibold text-primary group-hover:text-brand-primary transition-colors">Réservation de Tables</p>
                  <p className="text-[11px] text-quaternary">Module de réservation</p>
                </div>
              </label>

              <label htmlFor="module-gallery" className="flex items-center gap-3 card border-border-default p-4 cursor-pointer group hover:border-brand-primary-border hover:bg-brand-primary-bg/30 transition-all duration-300">
                <input
                  id="module-gallery"
                  type="checkbox"
                  checked={settings.is_gallery_enabled === 1}
                  onChange={(e) => setSettings({ ...settings, is_gallery_enabled: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 rounded border-border-default accent-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                <div>
                  <p className="text-xs font-semibold text-primary group-hover:text-brand-primary transition-colors">Galerie Photos</p>
                  <p className="text-[11px] text-quaternary">Section galerie sur l&apos;accueil</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingSettings}
              leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Enregistrer Général
            </Button>
          </div>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: OPERATING HOURS                                     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "hours" && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Horaires d&apos;Ouverture Hebdomadaires</h3>
            </div>
            <p className="text-sm text-quaternary">
              Ces horaires déterminent l&apos;ouverture du restaurant ainsi que les créneaux disponibles à la réservation.
            </p>

            <div className="space-y-2 divide-y divide-border-subtle">
              {hours.map((h, i) => (
                <div key={h.day_of_week} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="w-28 font-medium text-primary">{h.day_name_fr} :</span>

                  <div className="flex items-center gap-3 flex-wrap">
                    <label htmlFor={`open-time-${h.day_of_week}`} className="sr-only">Heure d'ouverture pour {h.day_name_fr}</label>
                    <input
                      id={`open-time-${h.day_of_week}`}
                      type="time"
                      disabled={h.is_closed === 1}
                      value={h.open_time}
                      onChange={(e) => handleHourChange(i, "open_time", e.target.value)}
                      className="input input-sm w-auto focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                      aria-label={`Heure d'ouverture pour ${h.day_name_fr}`}
                    />
                    <span className="text-quaternary">à</span>
                    <label htmlFor={`close-time-${h.day_of_week}`} className="sr-only">Heure de fermeture pour {h.day_name_fr}</label>
                    <input
                      id={`close-time-${h.day_of_week}`}
                      type="time"
                      disabled={h.is_closed === 1}
                      value={h.close_time}
                      onChange={(e) => handleHourChange(i, "close_time", e.target.value)}
                      className="input input-sm w-auto focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                      aria-label={`Heure de fermeture pour ${h.day_name_fr}`}
                    />

                    <label htmlFor={`closed-${h.day_of_week}`} className="ml-3 flex items-center gap-1.5 text-quaternary cursor-pointer">
                      <input
                        id={`closed-${h.day_of_week}`}
                        type="checkbox"
                        checked={h.is_closed === 1}
                        onChange={(e) => handleHourChange(i, "is_closed", e.target.checked ? 1 : 0)}
                        className="h-3.5 w-3.5 rounded border-border-default accent-status-error focus:ring-2 focus:ring-status-error/30"
                        aria-label={`Fermer ${h.day_name_fr}`}
                      />
                      <span className="font-medium">Fermé</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingSettings}
              leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Enregistrer Horaires
            </Button>
          </div>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: RESERVATION RULES & LIVE PREVIEW                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "reservations" && (
        <form onSubmit={handleSaveRules} className="space-y-6">
          {/* Capacity & Pacing */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">1. Capacité & Cadence des Services</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="capacity-mode" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Mode de Capacité
                </label>
                <select
                  id="capacity-mode"
                  value={rules.capacityMode}
                  onChange={(e) => setRules({ ...rules, capacityMode: e.target.value as "covers" | "tables" })}
                  className="input input-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg cursor-pointer"
                >
                  <option value="covers">Couverts (personnes simultanées)</option>
                  <option value="tables">Tables (nombre de tables)</option>
                </select>
              </div>

              <div>
                <label htmlFor="max-concurrent" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Capacité Simultanée Maximale
                </label>
                <input
                  id="max-concurrent"
                  type="number"
                  min={1}
                  max={200}
                  value={rules.defaultMaxCoversConcurrent}
                  onChange={(e) => setRules({ ...rules, defaultMaxCoversConcurrent: Number(e.target.value) })}
                  className="input input-sm font-bold focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                <span className="text-[10px] text-quaternary">Couverts en salle au même moment</span>
              </div>

              <div>
                <label htmlFor="max-per-slot" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Cadence par Créneau (Pacing)
                </label>
                <input
                  id="max-per-slot"
                  type="number"
                  min={1}
                  max={rules.defaultMaxCoversConcurrent}
                  value={rules.defaultMaxCoversPerSlot}
                  onChange={(e) => setRules({ ...rules, defaultMaxCoversPerSlot: Number(e.target.value) })}
                  className="input input-sm font-bold text-status-success focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                <span className="text-[10px] text-quaternary">Max personnes débutant sur le même quart d&apos;heure</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div>
                <label htmlFor="slot-interval" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Intervalle des Créneaux
                </label>
                <select
                  id="slot-interval"
                  value={rules.slotIntervalMinutes}
                  onChange={(e) => setRules({ ...rules, slotIntervalMinutes: Number(e.target.value) })}
                  className="input input-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg cursor-pointer"
                >
                  <option value={15}>15 minutes (Recommandé)</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div>
                <label htmlFor="min-lead-time" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Délai Minimum avant Service
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="min-lead-time"
                    type="number"
                    min={0}
                    max={1440}
                    value={rules.minLeadTimeMinutes}
                    onChange={(e) => setRules({ ...rules, minLeadTimeMinutes: Number(e.target.value) })}
                    className="input input-sm w-full focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                  />
                  <span className="text-xs text-quaternary whitespace-nowrap">min</span>
                </div>
                <span className="text-[10px] text-quaternary">Ex: 120 min = 2 heures</span>
              </div>

              <div>
                <label htmlFor="cancel-cutoff" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Limite d&apos;Annulation Client (Cutoff)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="cancel-cutoff"
                    type="number"
                    min={0}
                    max={1440}
                    value={rules.cancelCutoffMinutes}
                    onChange={(e) => setRules({ ...rules, cancelCutoffMinutes: Number(e.target.value) })}
                    className="input input-sm w-full focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                  />
                  <span className="text-xs text-quaternary whitespace-nowrap">min</span>
                </div>
                <span className="text-[10px] text-quaternary">Bloque annulation self-service</span>
              </div>
            </div>
          </div>

          {/* Group Policies & Turn Durations */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">2. Politiques de Groupes & Durée à Table (Turn Duration)</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="auto-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Politique de Confirmation
                </label>
                <select
                  id="auto-confirm"
                  value={rules.autoConfirmPolicy}
                  onChange={(e) => setRules({ ...rules, autoConfirmPolicy: e.target.value as "always" | "small_parties_only" | "never" })}
                  className="input input-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg cursor-pointer"
                >
                  <option value="small_parties_only">Automatique pour petits groupes</option>
                  <option value="always">Toujours confirmer automatiquement</option>
                  <option value="never">Toujours en attente de validation staff</option>
                </select>
              </div>

              <div>
                <label htmlFor="large-party-threshold" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Seuil Grand Groupe (Sur Devis)
                </label>
                <input
                  id="large-party-threshold"
                  type="number"
                  min={2}
                  max={30}
                  value={rules.largePartyThreshold}
                  onChange={(e) => setRules({ ...rules, largePartyThreshold: Number(e.target.value) })}
                  className="input input-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                <span className="text-[10px] text-quaternary">À partir de X pers. = demande spéciale</span>
              </div>

              <div>
                <label htmlFor="max-advance" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                  Anticipation Maximale (Jours)
                </label>
                <input
                  id="max-advance"
                  type="number"
                  min={1}
                  max={365}
                  value={rules.maxAdvanceDays}
                  onChange={(e) => setRules({ ...rules, maxAdvanceDays: Number(e.target.value) })}
                  className="input input-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>
            {/* Turn Durations Table */}
            <div className="pt-2">
              <label className="mb-2 block text-xs font-semibold text-quaternary">
                Durée d&apos;occupation de table par taille de groupe :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {rules.durationsByPartySize.map((d, index) => (
                  <div key={d.minParty} className="card border-border-default p-2.5 space-y-1 group hover:border-brand-primary-border hover:bg-brand-primary-bg/30 transition-all duration-300">
                    <span className="text-[10px] text-quaternary block">
                      {d.minParty} à {d.maxParty > 50 ? "Plus" : d.maxParty} personnes
                    </span>
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`duration-${index}`} className="sr-only">
                        Durée pour {d.minParty} à {d.maxParty > 50 ? "Plus" : d.maxParty} personnes
                      </label>
                      <input
                        id={`duration-${index}`}
                        type="number"
                        min={30}
                        max={300}
                        step={15}
                        value={d.durationMinutes}
                        onChange={(e) => handleDurationChange(index, Number(e.target.value))}
                        className="w-16 input input-sm text-status-success font-bold focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                        aria-label={`Durée pour ${d.minParty} à ${d.maxParty > 50 ? "Plus" : d.maxParty} personnes`}
                      />
                      <span className="text-xs text-quaternary">min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Blackout Dates */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">3. Dates Bloquées (Blackout Dates)</h3>
            </div>
            <p className="text-sm text-quaternary">
              Jours où aucune réservation en ligne n&apos;est acceptée (fêtes privées, maintenance, inventaire).
            </p>

            <div className="flex flex-col gap-2 max-w-sm">
              <label htmlFor="new-blackout-date" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-quaternary">
                Nouvelle date à bloquer
              </label>
              <div className="flex gap-2">
                <input
                  id="new-blackout-date"
                  type="date"
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  className="input input-sm flex-1 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddBlackout}
                  disabled={!newBlackoutDate}
                >
                  Bloquer cette date
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {rules.blackoutDates.length === 0 ? (
                <span className="text-xs text-quaternary italic">Aucune date bloquée.</span>
              ) : (
                rules.blackoutDates.map((dateStr) => (
                  <span
                    key={dateStr}
                    className="inline-flex items-center gap-1.5 badge badge-error border-status-error-border/30"
                  >
                    <span className="text-xs">{dateStr}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlackout(dateStr)}
                      className="hover:text-on-error"
                      title="Supprimer le blocage"
                      aria-label={`Supprimer le blocage pour ${dateStr}`}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Live Preview Simulator */}
          <div className="card p-6 space-y-3 border-l-4 border-status-success">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-status-success flex items-center gap-2">
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span>Aperçu en Direct de la Cadence (Grille simulée)</span>
              </h3>
              <span className="text-[11px] text-quaternary">
                Pacing : {rules.defaultMaxCoversPerSlot} couv./créneau | Intervalle : {rules.slotIntervalMinutes} min
              </span>
            </div>

            <p className="text-xs text-quaternary">
              Exemple de distribution des créneaux sur le service du déjeuner (12:00 - 14:00) :
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
              {simulatedSlots.map((slot) => (
                <div
                  key={slot.startMinute}
                  className="card border-border-default p-2 text-center group hover:border-brand-primary-border hover:bg-brand-primary-bg/20 transition-all duration-300"
                >
                  <span className="font-mono text-xs font-bold text-primary block">{slot.time}</span>
                  <span className="text-[10px] text-status-success block mt-0.5">Max {slot.maxCovers}p</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingRules}
              leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Enregistrer les Règles de Réservation
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}