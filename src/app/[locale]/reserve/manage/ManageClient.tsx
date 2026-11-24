"use client";

import { useState, useEffect } from "react";
import { site, type Locale } from "@/config/site.config";
import { Container, Heading, Section } from "@/components/ui/Layout";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageCircle,
  Phone,
  CalendarPlus,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Trash2,
} from "lucide-react";
import { generateIcsFile, getGoogleCalendarUrl } from "@/lib/reservations/calendar";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
  initialToken?: string;
};

type ManagedReservation = {
  id: string;
  reference: string;
  serviceDate: string;
  startMinute: number;
  timeFormatted: string;
  durationMinutes: number;
  partySize: number;
  status: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestNotes?: string | null;
  occasion?: string | null;
  seatingPreference?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
};

type Permissions = {
  canModify: boolean;
  canCancel: boolean;
  cutoffReason?: string;
  cutoffMinutes?: number;
};

type TimeSlot = {
  startMinute: number;
  timeFormatted: string;
  available: boolean;
  reason: string;
};

export function ManageClient({ locale, initialToken }: Props) {
  const isRtl = locale === "ar";
  const [token, setToken] = useState<string>(initialToken || "");
  const [reservation, setReservation] = useState<ManagedReservation | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(initialToken));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modification Mode State
  const [isModifying, setIsModifying] = useState<boolean>(false);
  const [newDate, setNewDate] = useState<string>("");
  const [newPartySize, setNewPartySize] = useState<number>(2);
  const [newSlot, setNewSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [modError, setModError] = useState<string | null>(null);
  const [isSavingMod, setIsSavingMod] = useState<boolean>(false);

  // Cancellation Modal State
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isSavingCancel, setIsSavingCancel] = useState<boolean>(false);

  // Success Notice State
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchReservation = async (tokenToUse: string) => {
    if (!tokenToUse || tokenToUse.length < 16) {
      setErrorMessage("Jeton de gestion invalide.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/reservations/manage?token=${encodeURIComponent(tokenToUse)}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Réservation introuvable.");
        setReservation(null);
        return;
      }

      setReservation(data.reservation);
      setPermissions(data.permissions);

      // Pre-fill mod states
      setNewDate(data.reservation.serviceDate);
      setNewPartySize(data.reservation.partySize);
    } catch {
      setErrorMessage("Impossible de joindre le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      fetchReservation(initialToken);
    }
  }, [initialToken]);

  // When opening modification mode or changing date/party size, fetch slots
  useEffect(() => {
    if (!isModifying || !newDate) return;

    let isMounted = true;
    setIsLoadingSlots(true);

    fetch(`/api/reservations/availability?date=${newDate}&partySize=${newPartySize}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) {
          setAvailableSlots(data.slots || []);
        }
      })
      .catch(() => {
        if (isMounted) setAvailableSlots([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isModifying, newDate, newPartySize]);

  // Submit Modification
  const handleSaveModification = async () => {
    if (!newSlot || !reservation) return;

    setIsSavingMod(true);
    setModError(null);

    try {
      const res = await fetch("/api/reservations/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          serviceDate: newDate,
          startMinute: newSlot.startMinute,
          partySize: newPartySize,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModError(data.error || "Impossible de modifier la réservation sur ce créneau.");
        return;
      }

      setIsModifying(false);
      setSuccessBanner(
        locale === "ar"
          ? "تم تحديث موعد حجزك بنجاح!"
          : locale === "en"
          ? "Your reservation has been updated successfully!"
          : "Votre réservation a été mise à jour avec succès !"
      );
      // Refresh reservation
      fetchReservation(token);
    } catch {
      setModError("Erreur réseau lors de la modification.");
    } finally {
      setIsSavingMod(false);
    }
  };

  // Submit Cancellation
  const handleConfirmCancel = async () => {
    if (!reservation) return;

    setIsSavingCancel(true);

    try {
      const res = await fetch("/api/reservations/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: cancelReason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Échec de l'annulation.");
        return;
      }

      setIsCancelling(false);
      setSuccessBanner(
        locale === "ar"
          ? "تم إلغاء حجزك. شكراً لإعلامنا ونتمنى استقبالك قريباً."
          : locale === "en"
          ? "Your reservation has been cancelled. Thank you for informing us."
          : "Votre réservation a été annulée. Merci de nous avoir prévenus."
      );
      fetchReservation(token);
    } catch {
      alert("Erreur réseau lors de l'annulation.");
    } finally {
      setIsSavingCancel(false);
    }
  };

  const handleDownloadIcs = () => {
    if (!reservation) return;

    const icsContent = generateIcsFile({
      reference: reservation.reference,
      restaurantName: site.name[locale],
      restaurantAddress: `${site.address.street}, ${site.address.city}`,
      serviceDate: reservation.serviceDate,
      startMinute: reservation.startMinute,
      durationMinutes: reservation.durationMinutes || 90,
      partySize: reservation.partySize,
      notes: reservation.guestNotes,
      manageUrl: window.location.href,
    });

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reservation-${reservation.reference}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const googleCalUrl = reservation
    ? getGoogleCalendarUrl({
        reference: reservation.reference,
        restaurantName: site.name[locale],
        restaurantAddress: `${site.address.street}, ${site.address.city}`,
        serviceDate: reservation.serviceDate,
        startMinute: reservation.startMinute,
        durationMinutes: reservation.durationMinutes || 90,
        partySize: reservation.partySize,
        notes: reservation.guestNotes,
        manageUrl: typeof window !== "undefined" ? window.location.href : "",
      })
    : "#";

  return (
    <Section className="relative overflow-hidden bg-[#0B251D] py-28 md:py-36 text-cream" dir={isRtl ? "rtl" : "ltr"}>
      <Container className="relative z-10 max-w-xl">
        <Reveal className="mb-8 text-center">
          <p className="mb-2 font-display italic text-gold text-lg md:text-xl">
            {site.name[locale]}
          </p>
          <Heading as="h1" size="lg" className="text-cream tracking-tight">
            {locale === "ar"
              ? "إدارة الحجز"
              : locale === "en"
              ? "Manage Your Reservation"
              : "Gérer Votre Réservation"}
          </Heading>
        </Reveal>

        {successBanner && (
          <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center text-xs text-emerald-300">
            {successBanner}
          </div>
        )}

        {/* Token Input Form if no token or error */}
        {!reservation && !isLoading && (
          <div className="rounded-3xl border border-gold/30 bg-[#0F2E24]/90 p-8 shadow-2xl backdrop-blur-md">
            <p className="text-xs text-cream-muted mb-4 text-center">
              {locale === "ar"
                ? "أدخل رمز الرابط المرسل إليك عبر واتساب أو البريد الإلكتروني لعرض حجزك."
                : "Veuillez cliquer sur le lien reçu dans votre message de confirmation ou saisir votre jeton ci-dessous."}
            </p>
            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: 4a2bc1..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1 rounded-[var(--radius-button)] border border-stone-300 bg-surface px-4 py-3 font-mono text-xs text-ink placeholder:text-ink-muted/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => fetchReservation(token)}
              >
                Afficher
              </Button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="rounded-3xl border border-gold/30 bg-[#0F2E24]/90 p-12 text-center text-gold">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-xs">Chargement de votre réservation...</p>
          </div>
        )}

        {/* Reservation Details Card */}
        {reservation && (
          <div className="rounded-3xl border border-gold/30 bg-[#0F2E24]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            {/* Header / Status Banner */}
            <div className="flex items-center justify-between pb-4 border-b border-gold/15">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-cream-muted block">
                  Référence
                </span>
                <span className="font-mono text-xl font-bold tracking-wider text-gold">
                  {reservation.reference}
                </span>
              </div>

              <div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    reservation.status === "confirmed"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : reservation.status === "cancelled"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : reservation.status === "declined"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  {reservation.status === "confirmed"
                    ? "Confirmée"
                    : reservation.status === "cancelled"
                    ? "Annulée"
                    : reservation.status === "declined"
                    ? "Refusée"
                    : "En attente"}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border border-gold/15 bg-[#071A14]/70 p-3.5 space-y-1">
                <span className="text-cream-muted flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-gold" />
                  Date
                </span>
                <p className="font-semibold text-cream text-sm">{reservation.serviceDate}</p>
              </div>

              <div className="rounded-2xl border border-gold/15 bg-[#071A14]/70 p-3.5 space-y-1">
                <span className="text-cream-muted flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold" />
                  Heure
                </span>
                <p className="font-semibold text-cream text-sm">{reservation.timeFormatted}</p>
              </div>

              <div className="rounded-2xl border border-gold/15 bg-[#071A14]/70 p-3.5 space-y-1">
                <span className="text-cream-muted flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gold" />
                  Convives
                </span>
                <p className="font-semibold text-cream text-sm">{reservation.partySize} personnes</p>
              </div>

              <div className="rounded-2xl border border-gold/15 bg-[#071A14]/70 p-3.5 space-y-1">
                <span className="text-cream-muted">Nom</span>
                <p className="font-semibold text-cream text-sm truncate">{reservation.guestName}</p>
              </div>
            </div>

            {reservation.guestNotes && (
              <div className="rounded-2xl border border-gold/15 bg-[#071A14]/70 p-3 text-xs text-cream-muted italic">
                &ldquo;{reservation.guestNotes}&rdquo;
              </div>
            )}

            {/* Cutoff Warning if cannot modify/cancel */}
            {permissions && !permissions.canModify && reservation.status !== "cancelled" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <p className="leading-relaxed">
                    {permissions.cutoffReason ||
                      "Les modifications en ligne sont bloquées à l'approche du service. Contactez-nous par WhatsApp pour tout ajustement."}
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={`https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/90 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${site.contact.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-[#071A14] px-3 py-1.5 text-[11px] font-semibold text-cream hover:bg-gold/10"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Appeler</span>
                  </a>
                </div>
              </div>
            )}

            {/* ── MODIFICATION FORM ── */}
            {isModifying ? (
              <div className="rounded-2xl border border-gold/40 bg-[#071A14] p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-gold">Modifier le créneau ou le nombre de personnes</h3>
                  <button
                    type="button"
                    onClick={() => setIsModifying(false)}
                    className="text-xs text-cream-muted hover:text-cream"
                  >
                    Annuler
                  </button>
                </div>

                {modError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {modError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-cream-muted block mb-1">Nouvelle date</label>
                    <input
                      type="date"
                      value={newDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full rounded-xl border border-gold/25 bg-[#0F2E24] px-3 py-2 text-xs text-cream"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-cream-muted block mb-1">Nombre de convives</label>
                    <select
                      value={newPartySize}
                      onChange={(e) => setNewPartySize(Number(e.target.value))}
                      className="w-full rounded-xl border border-gold/25 bg-[#0F2E24] px-3 py-2 text-xs text-cream"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} personnes
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Slots Grid */}
                <div>
                  <label className="text-[11px] text-cream-muted block mb-1.5">
                    Sélectionner un nouveau créneau :
                  </label>
                  {isLoadingSlots ? (
                    <div className="text-xs text-gold animate-pulse">Chargement des créneaux...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-xs text-cream-muted">Aucun créneau disponible.</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1">
                      {availableSlots
                        .filter((s) => s.available)
                        .map((slot) => {
                          const isSel = newSlot?.startMinute === slot.startMinute;
                          return (
                            <button
                              key={slot.startMinute}
                              type="button"
                              onClick={() => setNewSlot(slot)}
                              className={`rounded-lg border py-1.5 px-2 text-center text-xs font-semibold ${
                                isSel
                                  ? "border-gold bg-gold text-[#071A14]"
                                  : "border-gold/20 bg-[#0F2E24] text-cream hover:border-gold"
                              }`}
                            >
                              {slot.timeFormatted}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModifying(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!newSlot || isSavingMod}
                    loading={isSavingMod}
                    onClick={handleSaveModification}
                  >
                    Enregistrer la modification
                  </Button>
                </div>
              </div>
            ) : null}

            {/* ── CANCELLATION CONFIRMATION DIALOG ── */}
            {isCancelling ? (
              <div className="rounded-2xl border border-red-500/40 bg-[#071A14] p-5 space-y-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-semibold text-sm">Confirmer l&apos;annulation</h3>
                </div>

                <p className="text-xs text-cream-muted leading-relaxed">
                  Êtes-vous sûr de vouloir annuler votre réservation chez Dar Zitoun ? Votre table sera immédiatement libérée pour d&apos;autres clients.
                </p>

                <div>
                  <label className="text-[11px] text-cream-muted block mb-1">
                    Motif de l&apos;annulation (optionnel) :
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Changement de programme, empêchement..."
                    className="w-full rounded-xl border border-red-500/30 bg-[#0F2E24] px-3 py-2 text-xs text-cream"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCancelling(false)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    loading={isSavingCancel}
                    disabled={isSavingCancel}
                    onClick={handleConfirmCancel}
                  >
                    Confirmer l&apos;annulation
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Actions Bar */}
            {!isModifying && !isCancelling && reservation.status !== "cancelled" && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline-inverse"
                    size="sm"
                    onClick={handleDownloadIcs}
                    leadingIcon={<CalendarPlus className="h-3.5 w-3.5 text-gold" />}
                    title="Ajouter au calendrier"
                  >
                    .ics
                  </Button>
                  <Button
                    href={googleCalUrl}
                    variant="outline-inverse"
                    size="sm"
                    target="_blank"
                    rel="noopener noreferrer"
                    leadingIcon={<CalendarIcon className="h-3.5 w-3.5 text-gold" />}
                    title="Google Agenda"
                  >
                    Google
                  </Button>
                </div>

                <div className="flex gap-2">
                  {permissions?.canModify && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setIsModifying(true)}
                      leadingIcon={<Edit2 className="h-3.5 w-3.5" />}
                    >
                      Modifier
                    </Button>
                  )}

                  {permissions?.canCancel && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsCancelling(true)}
                      leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gold/15 text-center">
              <a
                href={`/${locale}/reserve`}
                className="text-xs text-cream-muted hover:text-cream inline-flex items-center gap-1"
              >
                {isRtl ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                <span>Retour à la page de réservation</span>
              </a>
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
