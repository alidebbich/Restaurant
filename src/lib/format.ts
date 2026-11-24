/**
 * Format Tunisian Dinar (TND) prices.
 * Tunisia uses a comma decimal separator and "DT" suffix.
 * Prices are stored as integer millimes in the DB (12500 = 12.500 DT).
 * Pass millimes (integer) → formatPrice(12500) → "12,500 DT"
 * Legacy: also accepts decimal DT for backward compat during transition.
 */
export function formatPrice(amountMillimesOrDT: number, locale: string = "fr"): string {
  // Heuristic: values ≥ 1000 are almost certainly millimes (12500 → 12.5 DT).
  // Values < 1000 are legacy decimal DT (12.5 → 12.5 DT).
  const isMillimes = Number.isInteger(amountMillimesOrDT) && amountMillimesOrDT >= 1000;
  const amountDT = isMillimes ? amountMillimesOrDT / 1000 : amountMillimesOrDT;

  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-TN" : "fr-TN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amountDT);
  return `${formatted} DT`;
}

/**
 * Convert decimal DT to integer millimes for DB storage.
 * formatPrice(parseFloat("12.5")) → store dtToMillimes(12.5) = 12500
 */
export function dtToMillimes(dt: number): number {
  return Math.round(dt * 1000);
}

/**
 * Convert millimes back to decimal DT for display inputs.
 */
export function milimesToDt(millimes: number): number {
  return millimes / 1000;
}

/**
 * Parse a price string entered by the user ("12.5", "12,5", "12 500", "12500").
 * Returns millimes integer, or null if invalid.
 */
export function parsePriceInput(raw: string): number | null {
  // Remove all spaces
  const s = raw.trim().replace(/\s/g, "");
  // Replace comma decimal separator with dot
  const normalized = s.replace(",", ".");
  const val = parseFloat(normalized);
  if (isNaN(val) || val < 0) return null;
  return Math.round(val * 1000);
}

/**
 * Format opening hours for display.
 * Returns e.g. "08:00 – 23:00"
 */
export function formatHours(open: string, close: string): string {
  return `${open} \u2013 ${close}`;
}

/**
 * Returns whether the restaurant is open right now based on hours config.
 * Uses Africa/Tunis timezone.
 */
export function isOpenNow(
  hours: Array<{ days: number[]; open: string; close: string }>
): boolean {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Tunis" })
  );
  const day = now.getDay(); // 0 = Sunday
  const hhmm =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  return hours.some(
    (slot) =>
      slot.days.includes(day) && hhmm >= slot.open && hhmm < slot.close
  );
}

/** Day names by locale */
const DAY_NAMES: Record<string, string[]> = {
  fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export function getDayName(day: number, locale: string): string {
  const names = DAY_NAMES[locale] ?? DAY_NAMES["fr"];
  return names[day] ?? "";
}
