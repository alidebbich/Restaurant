/**
 * Time, Timezone & Reservation Formatting Utilities
 * Venue-aware time conversions, reference code generators, and phone normalizers.
 */
import crypto from "node:crypto";

/**
 * Converts "HH:MM" string to minutes from midnight.
 * Supports after-midnight service notation up to 28:00 (1680 min).
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to "HH:MM" format.
 * If minutes >= 1440, formats as next-day time (e.g. 1470 -> "00:30 (+1)").
 */
export function minutesToTimeString(
  minutes: number,
  includeNextDayIndicator = false
): string {
  const isNextDay = minutes >= 1440;
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const str = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  if (isNextDay && includeNextDayIndicator) {
    return `${str} (+1)`;
  }
  return str;
}

/**
 * Normalizes phone numbers with special focus on Tunisian (+216) standards.
 * Handles:
 * - "20 123 456" -> "+21620123456"
 * - "+216 20 123 456" -> "+21620123456"
 * - "0021620123456" -> "+21620123456"
 * - International numbers e.g. "+33 6 12 34 56 78" -> "+33612345678"
 */
export function normalizePhoneNumber(
  rawPhone: string,
  defaultCountryCode = "216"
): { valid: boolean; e164?: string; formatted?: string; error?: string } {
  if (!rawPhone) return { valid: false, error: "Phone number is required" };

  // Remove whitespace, dashes, dots, parentheses
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "").trim();

  // Replace leading 00 with +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // If local Tunisian 8-digit number (starts with 2, 3, 4, 5, 7, 9)
  if (/^[234579]\d{7}$/.test(cleaned)) {
    cleaned = `+${defaultCountryCode}${cleaned}`;
  }

  // Validate E.164 pattern (+ followed by 8 to 15 digits)
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Numéro de téléphone invalide. Format attendu : 8 chiffres ou avec indicatif pays (+216).",
    };
  }

  // Pretty format for display (e.g. +216 20 123 456)
  let formatted = cleaned;
  if (cleaned.startsWith("+216") && cleaned.length === 12) {
    formatted = `+216 ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  return {
    valid: true,
    e164: cleaned,
    formatted,
  };
}

/**
 * Generates human-friendly, non-ambiguous reference code.
 * Format: "RZ-XXXX" (e.g. "RZ-7K4M").
 * Excludes confusing characters: 0, O, 1, I, L, 8, B (easily mixed on mobile).
 */
export function generateReferenceCode(prefix = "RZ"): string {
  const CHARS = "2345679ACDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return `${prefix}-${code}`;
}

/**
 * Generates an unguessable 64-char crypto manage token.
 */
export function generateManageToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * SHA-256 hashes a manage token before SQLite storage.
 */
export function hashManageToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Gets the current venue-local date and minute in the given timezone (default Africa/Tunis).
 */
export function getVenueLocalNow(timeZone = "Africa/Tunis"): {
  date: string; // YYYY-MM-DD
  minute: number; // 0 - 1439
  iso: string;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";

  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const h = parseInt(get("hour"), 10);
  const m = parseInt(get("minute"), 10);
  const minute = h * 60 + m;

  return {
    date,
    minute,
    iso: now.toISOString(),
  };
}

/**
 * Checks if interval [startA, startA + durA) overlaps with [startB, startB + durB).
 * Back-to-back bookings (startA + durA === startB) do NOT overlap.
 */
export function intervalsOverlap(
  startA: number,
  durA: number,
  startB: number,
  durB: number
): boolean {
  return startA < startB + durB && startB < startA + durA;
}

