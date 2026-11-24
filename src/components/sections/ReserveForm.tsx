"use client";

import { useState, useEffect } from "react";
import { site, type Locale } from "@/config/site.config";
import { Container, Heading, Section } from "@/components/ui/Layout";
import { Reveal } from "@/components/motion/Reveal";
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  CalendarPlus,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { generateIcsFile, getGoogleCalendarUrl } from "@/lib/reservations/calendar";
import { Button } from "@/components/ui/Button";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
};

type TimeSlot = {
  startMinute: number;
  timeFormatted: string;
  available: boolean;
  reason: string;
  isRequestOnly?: boolean;
  isNearCapacity?: boolean;
};

type ConfirmedReservation = {
  reference: string;
  serviceDate: string;
  timeFormatted: string;
  partySize: number;
  status: string;
  guestName: string;
  rawManageToken?: string;
  manageUrl?: string;
};

const COUNTRY_CODES = [
  { code: "+216", flag: "🇹🇳", country: "Tunisie" },
  { code: "+33", flag: "🇫🇷", country: "France" },
  { code: "+1", flag: "🇺🇸", country: "USA/Canada" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+49", flag: "🇩🇪", country: "Allemagne" },
  { code: "+39", flag: "🇮🇹", country: "Italie" },
  { code: "+34", flag: "🇪🇸", country: "Espagne" },
  { code: "+971", flag: "🇦🇪", country: "Émirats" },
  { code: "+966", flag: "🇸🇦", country: "Arabie S." },
  { code: "+213", flag: "🇩🇿", country: "Algérie" },
  { code: "+212", flag: "🇲🇦", country: "Maroc" },
];

export function ReserveForm({ locale, messages }: Props) {
  const t = (messages && messages.reserve_page) || {};
  const tc = (messages && messages.common) || {};
  const optionalLabel = tc.optional
    ? `(${tc.optional.toLowerCase()})`
    : locale === "ar"
    ? "(اختياري)"
    : locale === "en"
    ? "(optional)"
    : "(optionnel)";
  const isRtl = locale === "ar";

  // Step state: 1 = Party, 2 = Date & Slot, 3 = Details, 4 = Confirmed
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Inputs
  const [partySize, setPartySize] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Contact Inputs
  const [countryCode, setCountryCode] = useState<string>("+216");
  const [phone, setPhone] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [occasion, setOccasion] = useState<string>("");
  const [seatingPreference, setSeatingPreference] = useState<string>("main");
  const [honeypot, setHoneypot] = useState<string>(""); // anti-spam

  // Slots Loading & Alternatives
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedData, setConfirmedData] = useState<ConfirmedReservation | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // Initialize today's date (or tomorrow if late evening)
  useEffect(() => {
    const now = new Date();
    // Default to today in YYYY-MM-DD
    const todayStr = now.toISOString().split("T")[0];
    setSelectedDate(todayStr);
  }, []);

  // Fetch slots whenever selectedDate or partySize changes
  useEffect(() => {
    if (!selectedDate) return;

    let isMounted = true;
    setIsLoadingSlots(true);
    setSlotsError(null);
    setSelectedSlot(null);

    fetch(`/api/reservations/availability?date=${selectedDate}&partySize=${partySize}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Impossible de charger les disponibilités");
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setSlots(data.slots || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setSlotsError(err.message || "Erreur de disponibilité");
          setSlots([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, partySize]);

  // Group slots by Shift: Lunch (< 1000 min, i.e. ~16:40) and Dinner (>= 1000 min)
  const lunchSlots = slots.filter((s) => s.startMinute < 1000);
  const dinnerSlots = slots.filter((s) => s.startMinute >= 1000);

  // Handle final reservation submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedDate || !name.trim() || !phone.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build full phone with country code if not already included
      let fullPhone = phone.trim();
      if (!fullPhone.startsWith("+")) {
        fullPhone = countryCode + fullPhone.replace(/^0+/, "");
      }

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        },
        body: JSON.stringify({
          guestName: name.trim(),
          guestPhone: fullPhone,
          guestEmail: email.trim() || undefined,
          serviceDate: selectedDate,
          startMinute: selectedSlot.startMinute,
          partySize,
          guestNotes: notes.trim() || undefined,
          occasion: occasion || undefined,
          seatingPreference,
          locale,
          website: honeypot || undefined, // honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.alternativeSlots) {
          setSubmitError(
            (data.error || "Ce créneau n'est plus disponible.") +
              " Alternatives proposées : " +
              data.alternativeSlots.map((s: { timeFormatted: string }) => s.timeFormatted).join(", ")
          );
        } else {
          setSubmitError(data.error || "Une erreur est survenue lors de la réservation.");
        }
        return;
      }

      setConfirmedData({
        reference: data.reservation.reference,
        serviceDate: data.reservation.serviceDate,
        timeFormatted: data.reservation.timeFormatted,
        partySize: data.reservation.partySize,
        status: data.reservation.status,
        guestName: data.reservation.guestName,
        rawManageToken: data.rawManageToken,
        manageUrl: data.manageUrl,
      });

      setStep(4);
    } catch {
      setSubmitError("Connexion impossible avec le serveur. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download .ics calendar file
  const handleDownloadIcs = () => {
    if (!confirmedData || !selectedSlot) return;

    const icsContent = generateIcsFile({
      reference: confirmedData.reference,
      restaurantName: site.name[locale],
      restaurantAddress: `${site.address.street}, ${site.address.city}`,
      serviceDate: confirmedData.serviceDate,
      startMinute: selectedSlot.startMinute,
      durationMinutes: 90,
      partySize: confirmedData.partySize,
      notes,
      manageUrl: confirmedData.manageUrl
        ? `${window.location.origin}${confirmedData.manageUrl}`
        : undefined,
    });

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reservation-${confirmedData.reference}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Calendar Link
  const googleCalendarUrl =
    confirmedData && selectedSlot
      ? getGoogleCalendarUrl({
          reference: confirmedData.reference,
          restaurantName: site.name[locale],
          restaurantAddress: `${site.address.street}, ${site.address.city}`,
          serviceDate: confirmedData.serviceDate,
          startMinute: selectedSlot.startMinute,
          durationMinutes: 90,
          partySize: confirmedData.partySize,
          notes,
          manageUrl: confirmedData.manageUrl
            ? `${typeof window !== "undefined" ? window.location.origin : ""}${confirmedData.manageUrl}`
            : undefined,
        })
      : "#";

  // Pre-filled WhatsApp Link for Confirmation
  const whatsappBookingUrl = confirmedData
    ? `https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        locale === "ar"
          ? `مرحباً دار زيتون، حجز رقم ${confirmedData.reference} بتاريخ ${confirmedData.serviceDate} على الساعة ${confirmedData.timeFormatted} (${confirmedData.partySize} أشخاص) باسم ${confirmedData.guestName}.`
          : locale === "en"
          ? `Hello Dar Zitoun, reservation ${confirmedData.reference} on ${confirmedData.serviceDate} at ${confirmedData.timeFormatted} (${confirmedData.partySize} guests) under ${confirmedData.guestName}.`
          : `Bonjour Dar Zitoun, réservation ${confirmedData.reference} le ${confirmedData.serviceDate} à ${confirmedData.timeFormatted} (${confirmedData.partySize} pers.) au nom de ${confirmedData.guestName}.`
      )}`
    : "#";

  const copyReference = () => {
    if (!confirmedData) return;
    navigator.clipboard.writeText(confirmedData.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const fieldClass =
    "w-full rounded-2xl border border-gold/25 bg-[#071A14]/90 px-4 py-3.5 font-body text-sm text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all";

  return (
    <Section className="relative overflow-hidden bg-[#0B251D] py-24 md:py-32 text-cream" dir={isRtl ? "rtl" : "ltr"}>
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background: "radial-gradient(circle at 50% 15%, rgba(197, 168, 105, 0.3) 0%, transparent 60%)",
        }}
      />

      <Container className="relative z-10 max-w-2xl">
        <Reveal className="mb-10 text-center">
          <p className="mb-2 font-display italic text-gold text-lg md:text-xl">
            {site.name[locale]}
          </p>
          <Heading as="h1" size="lg" className="text-cream tracking-tight">
            {t.heading || "Réserver une Table"}
          </Heading>
          <p className="mt-3 font-body text-sm md:text-base text-cream-muted max-w-md mx-auto">
            {locale === "ar"
              ? "اختر عدد الضيوف، الموعد المناسب، واستمتع بتجربة طهي أصيلة في قلب المدينة العتيقة."
              : locale === "en"
              ? "Select party size, date and preferred slot for an authentic culinary experience."
              : "Choisissez vos convives, la date et le créneau idéal pour une expérience culinaire raffinée."}
          </p>
        </Reveal>

        {/* Stepper Progress */}
        {step < 4 && (
          <div className="mb-8 flex items-center justify-between px-2 sm:px-6">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= 1
                    ? "bg-gold text-[#071A14] ring-4 ring-gold/20"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                1
              </div>
              <span className="mt-1 text-[11px] font-medium text-cream-muted">
                {t.step_party || "Convives"}
              </span>
            </div>

            <div
              className={`h-0.5 flex-1 mx-2 sm:mx-4 transition-all ${
                step >= 2 ? "bg-gold/60" : "bg-slate-800"
              }`}
            />

            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= 2
                    ? "bg-gold text-[#071A14] ring-4 ring-gold/20"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                2
              </div>
              <span className="mt-1 text-[11px] font-medium text-cream-muted">
                {t.step_date || "Date & Heure"}
              </span>
            </div>

            <div
              className={`h-0.5 flex-1 mx-2 sm:mx-4 transition-all ${
                step >= 3 ? "bg-gold/60" : "bg-slate-800"
              }`}
            />

            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= 3
                    ? "bg-gold text-[#071A14] ring-4 ring-gold/20"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                3
              </div>
              <span className="mt-1 text-[11px] font-medium text-cream-muted">
                {t.step_details || "Coordonnées"}
              </span>
            </div>
          </div>
        )}

        <Reveal delay={0.1}>
          <div className="rounded-3xl border border-gold/30 bg-[#0F2E24]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
            {/* ────────────────────────────────────────────────────────── */}
            {/* STEP 1: PARTY SIZE SELECTOR                                */}
            {/* ────────────────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gold" />
                  <h2 className="font-display text-lg text-cream font-semibold">
                    {t.party || "Pour combien de personnes ?"}
                  </h2>
                </div>

                {/* Quick Party Size Buttons */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((num) => {
                    const isSelected = partySize === num;
                    const isLarge = num >= 8;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPartySize(num)}
                        className={`relative flex flex-col items-center justify-center py-3 rounded-2xl border text-sm font-semibold transition-all ${
                          isSelected
                            ? "border-gold bg-gold text-[#071A14] shadow-lg shadow-gold/20 scale-[1.02]"
                            : "border-gold/20 bg-[#071A14]/70 text-cream hover:border-gold/50 hover:bg-[#071A14]"
                        }`}
                      >
                        <span className="text-base">{num}</span>
                        <span className="text-[10px] opacity-80">
                          {num === 1 ? (locale === "ar" ? "شخص" : "pers.") : (locale === "ar" ? "أشخاص" : "pers.")}
                        </span>
                        {isLarge && (
                          <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-500/90 px-1 py-0.2 text-[8px] font-bold text-slate-950">
                            ★
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Large Party Banner */}
                {partySize >= 8 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
                    <Sparkles className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-200">
                        {t.largeParty_badge || (locale === "ar" ? "حجز مجموعة (على الطلب)" : "Réservation de groupe")}
                      </p>
                      <p className="mt-0.5 text-amber-300/80 leading-relaxed">
                        {t.large_party_notice ||
                          (locale === "ar"
                            ? "للمجموعات من 8 أشخاص فما فوق، سيتولى المشرف مراجعة وتأكيد الحجز شخصياً لضمان توفير أفضل طاولة وخدمة ممتازة."
                            : "Pour les groupes de 8 personnes ou plus, notre équipe examine la disposition des tables et valide votre demande sous 2 heures.")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button
                    id="btn-step1-next"
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => setStep(2)}
                    trailingIcon={isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  >
                    {t.next_step || "Continuer vers la date"}
                  </Button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* STEP 2: DATE & TIME SLOT PICKER                            */}
            {/* ────────────────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gold" />
                    <h2 className="font-display text-lg text-cream font-semibold">
                      {t.select_date || "Date & Heure du service"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-gold hover:underline"
                  >
                    {partySize} {locale === "ar" ? "أشخاص" : "personnes"} (modifier)
                  </button>
                </div>

                {/* Date Input */}
                <div>
                  <label
                    htmlFor="res-date"
                    className="block text-xs font-medium text-cream-muted mb-1.5"
                  >
                    {t.date || "Date souhaitée"}
                  </label>
                  <input
                    id="res-date"
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split("T")[0]}
                    max={
                      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={`${fieldClass} cursor-pointer`}
                  />
                </div>

                {/* Slots Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cream-muted">
                      {t.select_slot || "Créneaux disponibles"}
                    </span>
                    {isLoadingSlots && (
                      <span className="text-xs text-gold animate-pulse flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-spin" />
                        Chargement...
                      </span>
                    )}
                  </div>

                  {slotsError ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{slotsError}</span>
                    </div>
                  ) : slots.length === 0 && !isLoadingSlots ? (
                    <div className="rounded-2xl border border-gold/20 bg-[#071A14]/50 p-6 text-center text-xs text-cream-muted">
                      {t.no_slots_date || "Aucun créneau disponible pour cette date. Essayez un autre jour."}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Lunch Shift */}
                      {lunchSlots.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-gold/80 mb-2">
                            ☀️ {t.shift_lunch || "Déjeuner"} (12:00 - 15:30)
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {lunchSlots.map((slot) => {
                              const isSelected = selectedSlot?.startMinute === slot.startMinute;
                              return (
                                <button
                                  key={slot.startMinute}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`relative rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all ${
                                    isSelected
                                      ? "border-gold bg-gold text-[#071A14] font-bold shadow-md shadow-gold/20 scale-105"
                                      : slot.available
                                      ? "border-gold/25 bg-[#071A14]/80 text-cream hover:border-gold hover:bg-[#071A14]"
                                      : "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed line-through"
                                  }`}
                                >
                                  <div>{slot.timeFormatted}</div>
                                  {slot.isNearCapacity && slot.available && (
                                    <span className="text-[9px] block text-amber-400 font-normal">
                                      {t.few_seats_left || "Places limitées"}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dinner Shift */}
                      {dinnerSlots.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[11px] font-bold text-gold/80 mb-2">
                            🌙 {t.shift_dinner || "Dîner"} (19:00 - 23:00)
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {dinnerSlots.map((slot) => {
                              const isSelected = selectedSlot?.startMinute === slot.startMinute;
                              return (
                                <button
                                  key={slot.startMinute}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`relative rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all ${
                                    isSelected
                                      ? "border-gold bg-gold text-[#071A14] font-bold shadow-md shadow-gold/20 scale-105"
                                      : slot.available
                                      ? "border-gold/25 bg-[#071A14]/80 text-cream hover:border-gold hover:bg-[#071A14]"
                                      : "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed line-through"
                                  }`}
                                >
                                  <div>{slot.timeFormatted}</div>
                                  {slot.isNearCapacity && slot.available && (
                                    <span className="text-[9px] block text-amber-400 font-normal">
                                      {t.few_seats_left || "Places limitées"}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gold/15">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream transition-colors"
                  >
                    {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    <span>{t.back_step || "Retour"}</span>
                  </button>

                  <button
                    id="btn-step2-next"
                    type="button"
                    disabled={!selectedSlot}
                    onClick={() => setStep(3)}
                    className="flex items-center gap-2 rounded-full bg-gold px-7 py-3 font-body text-xs font-bold text-[#071A14] shadow-md transition-all hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                  >
                    <span>{t.next_step || "Continuer vers les détails"}</span>
                    {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* STEP 3: CONTACT & PREFERENCES                              */}
            {/* ────────────────────────────────────────────────────────── */}
            {step === 3 && (
              <form onSubmit={handleSubmitBooking} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg text-cream font-semibold">
                    {t.step_details || "Vos Coordonnées"}
                  </h2>
                  <div className="text-xs text-gold">
                    {selectedDate} à {selectedSlot?.timeFormatted} ({partySize} pers.)
                  </div>
                </div>

                {submitError && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="res-name" className="block text-xs font-medium text-cream mb-1">
                    {t.name || "Nom et Prénom"} <span className="text-gold">*</span>
                  </label>
                  <input
                    id="res-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={locale === "ar" ? "أنيس العبيدي" : "Anis Laabidi"}
                    className={fieldClass}
                  />
                </div>

                {/* Phone with Country Code */}
                <div>
                  <label htmlFor="res-phone" className="block text-xs font-medium text-cream mb-1">
                    {t.phone || "Numéro de téléphone"} <span className="text-gold">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="rounded-2xl border border-gold/25 bg-[#071A14]/90 px-3 py-3.5 font-body text-xs text-cream focus:border-gold focus:outline-none"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-[#071A14] text-cream">
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      id="res-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98 000 000"
                      dir="ltr"
                      className={`${fieldClass} flex-1`}
                    />
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label htmlFor="res-email" className="block text-xs font-medium text-cream mb-1">
                    {t.email || "Adresse e-mail"} <span className="text-cream-muted text-[10px]">{optionalLabel}</span>
                  </label>
                  <input
                    id="res-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@exemple.tn"
                    dir="ltr"
                    className={fieldClass}
                  />
                </div>

                {/* Seating Preference */}
                <div>
                  <label className="block text-xs font-medium text-cream mb-1.5">
                    {t.seating || "Préférence d'emplacement"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "main", label: t.seating_main || "Salle principale" },
                      { id: "terrace", label: t.seating_terrace || "Terrasse" },
                      { id: "patio", label: t.seating_patio || "Patio calme" },
                    ].map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => setSeatingPreference(seat.id)}
                        className={`py-2 px-2.5 rounded-xl border text-center text-xs transition-all ${
                          seatingPreference === seat.id
                            ? "border-gold bg-gold/15 text-gold font-semibold"
                            : "border-gold/20 bg-[#071A14]/60 text-cream-muted hover:border-gold/40"
                        }`}
                      >
                        {seat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion */}
                <div>
                  <label htmlFor="res-occasion" className="block text-xs font-medium text-cream mb-1">
                    {t.occasion || "Occasion spéciale"} <span className="text-cream-muted text-[10px]">{optionalLabel}</span>
                  </label>
                  <select
                    id="res-occasion"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="" className="bg-[#071A14] text-cream">
                      {locale === "ar" ? "بدون مناسبة خاصة" : "Repas ordinaire"}
                    </option>
                    <option value="anniversary" className="bg-[#071A14] text-cream">
                      🎉 {locale === "ar" ? "عيد ميلاد" : "Anniversaire"}
                    </option>
                    <option value="romantic" className="bg-[#071A14] text-cream">
                      🌹 {locale === "ar" ? "عشاء رومانسي" : "Dîner en amoureux"}
                    </option>
                    <option value="business" className="bg-[#071A14] text-cream">
                      💼 {locale === "ar" ? "غداء / عشاء عمل" : "Repas d'affaires"}
                    </option>
                    <option value="family" className="bg-[#071A14] text-cream">
                      👨‍👩‍👧‍👦 {locale === "ar" ? "لمة عائلية" : "Réunion de famille"}
                    </option>
                  </select>
                </div>

                {/* Notes & Allergies */}
                <div>
                  <label htmlFor="res-notes" className="block text-xs font-medium text-cream mb-1">
                    {t.notes || "Allergies ou remarques particulières"} <span className="text-cream-muted text-[10px]">{optionalLabel}</span>
                  </label>
                  <textarea
                    id="res-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      locale === "ar"
                        ? "هل لديك حساسية تجاه مكوّن معين؟ أو رغبة في كرسي أطفال؟"
                        : "Allergies, intolérances, besoin d'une chaise haute..."
                    }
                    className={fieldClass}
                  />
                </div>

                {/* Honeypot field (hidden from screen reader & real users) */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gold/15">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(2)}
                    leadingIcon={isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    className="text-cream/80 hover:text-gold hover:bg-white/5"
                  >
                    {t.back_step || "Retour"}
                  </Button>

                  <Button
                    id="btn-step3-submit"
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    disabled={isSubmitting || !name.trim() || !phone.trim()}
                    trailingIcon={isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    className="shadow-lg shadow-gold/20"
                  >
                    {partySize >= 8
                      ? t.submit_request || "Envoyer ma demande"
                      : t.submit || "Confirmer la réservation"}
                  </Button>
                </div>
              </form>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* STEP 4: CONFIRMATION & CALENDAR ACTIONS                    */}
            {/* ────────────────────────────────────────────────────────── */}
            {step === 4 && confirmedData && (
              <div className="space-y-6 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div>
                  <h2 className="font-display text-2xl text-gold font-bold">
                    {confirmedData.status === "confirmed"
                      ? t.confirmed_title || "Réservation confirmée !"
                      : t.pending_title || "Demande de réservation reçue !"}
                  </h2>
                  <p className="mt-2 text-xs md:text-sm text-cream-muted max-w-md mx-auto leading-relaxed">
                    {confirmedData.status === "confirmed"
                      ? t.confirmed_msg ||
                        "Votre table est réservée. Un e-mail ou SMS de confirmation vous a été envoyé."
                      : t.pending_msg ||
                        "Votre demande a été transmise à notre équipe. Nous vous contacterons par WhatsApp sous peu."}
                  </p>
                </div>

                {/* Reference Code Card */}
                <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 max-w-sm mx-auto">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gold/80 block mb-1">
                    {t.booking_ref || "Numéro de référence"}
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-2xl font-bold tracking-widest text-cream">
                      {confirmedData.reference}
                    </span>
                    <button
                      type="button"
                      onClick={copyReference}
                      className="rounded-lg bg-gold/20 p-1.5 text-gold hover:bg-gold/30 transition-colors"
                      title="Copier le code"
                    >
                      {copiedRef ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="rounded-2xl border border-gold/20 bg-[#071A14]/70 p-4 text-xs text-cream-muted space-y-2 text-left max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span>Date & Heure :</span>
                    <span className="font-semibold text-cream">
                      {confirmedData.serviceDate} à {confirmedData.timeFormatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Convives :</span>
                    <span className="font-semibold text-cream">
                      {confirmedData.partySize} personnes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nom :</span>
                    <span className="font-semibold text-cream">{confirmedData.guestName}</span>
                  </div>
                </div>

                {/* Integration Actions */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                  {/* .ics Download */}
                  <Button
                    type="button"
                    variant="outline-inverse"
                    size="md"
                    onClick={handleDownloadIcs}
                    leadingIcon={<CalendarPlus className="h-4 w-4 text-gold" />}
                  >
                    {t.add_to_calendar || "Télécharger (.ics)"}
                  </Button>

                  {/* Google Calendar */}
                  <Button
                    href={googleCalendarUrl}
                    variant="outline-inverse"
                    size="md"
                    target="_blank"
                    rel="noopener noreferrer"
                    leadingIcon={<CalendarIcon className="h-4 w-4 text-gold" />}
                  >
                    {t.google_calendar || "Google Agenda"}
                  </Button>

                  {/* Direct WhatsApp */}
                  <Button
                    href={whatsappBookingUrl}
                    variant="primary"
                    size="md"
                    fullWidth
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                    leadingIcon={<MessageCircle className="h-4 w-4" />}
                  >
                    {t.chat_whatsapp || "Envoyer sur WhatsApp pour confirmation"}
                  </Button>

                  {/* Self-Service Manage Link */}
                  {confirmedData.manageUrl && (
                    <a
                      href={confirmedData.manageUrl}
                      className="sm:col-span-2 text-xs text-gold underline hover:text-gold-light py-1"
                    >
                      {t.manage_booking || "Modifier ou annuler cette réservation en ligne"}
                    </a>
                  )}
                </div>

                <div className="pt-4 border-t border-gold/15">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setConfirmedData(null);
                      setSelectedSlot(null);
                    }}
                    className="text-xs text-cream-muted hover:text-cream transition-colors"
                  >
                    {t.new_booking || "Effectuer une autre réservation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
