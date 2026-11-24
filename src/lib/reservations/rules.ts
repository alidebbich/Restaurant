/**
 * Reservation Rules & Configuration Schema
 * Pure TypeScript definitions and validators — zero external framework/DB dependencies.
 */

export type CapacityMode = "covers" | "tables";

export type AutoConfirmPolicy = "always" | "never" | "small_parties_only";

export type DurationRule = {
  minParty: number;
  maxParty: number;
  durationMinutes: number;
};

export type ServiceShift = {
  id: string;
  name: {
    fr: string;
    ar: string;
    en: string;
  };
  startMinute: number; // e.g., 12 * 60 = 720 (12:00)
  endMinute: number;   // e.g., 15 * 60 + 30 = 930 (15:30)
  maxCoversConcurrent: number;
  maxCoversPerSlot: number;
  minDwellMinutes?: number;
};

export type DayOverride = {
  date: string; // YYYY-MM-DD
  maxCoversConcurrent?: number;
  maxCoversPerSlot?: number;
  isClosed?: boolean;
  notes?: string;
};

export type ReservationRules = {
  venueTimezone: string;
  capacityMode: CapacityMode;
  slotIntervalMinutes: number; // 15 or 30 min
  defaultMaxCoversConcurrent: number;
  defaultMaxCoversPerSlot: number;
  durationsByPartySize: DurationRule[];
  minPartySizeOnline: number;
  maxPartySizeOnline: number;
  largePartyThreshold: number; // e.g. 8 (requests > 8 are request-only)
  minLeadTimeMinutes: number;   // e.g. 120 (must book at least 2h in advance)
  maxAdvanceDays: number;       // e.g. 60 days
  cancelCutoffMinutes: number;  // e.g. 180 (cancel cutoff 3h before)
  autoConfirmPolicy: AutoConfirmPolicy;
  autoConfirmMaxParty: number;  // if policy === "small_parties_only"
  pendingHoldExpiryMinutes: number; // e.g. 30 min hold before expiring
  noShowGraceMinutes: number;   // e.g. 20 min grace after reservation time
  shifts?: ServiceShift[];
  blackoutDates: string[];      // ["2026-12-31"]
  dayOverrides?: Record<string, DayOverride>;
  nearCapacityThreshold?: number; // e.g. <= 4 covers remaining shows "only a few left"
};

export const DEFAULT_RESERVATION_RULES: ReservationRules = {
  venueTimezone: "Africa/Tunis",
  capacityMode: "covers",
  slotIntervalMinutes: 15,
  defaultMaxCoversConcurrent: 40,
  defaultMaxCoversPerSlot: 12,
  durationsByPartySize: [
    { minParty: 1, maxParty: 2, durationMinutes: 75 },
    { minParty: 3, maxParty: 4, durationMinutes: 90 },
    { minParty: 5, maxParty: 8, durationMinutes: 120 },
    { minParty: 9, maxParty: 99, durationMinutes: 150 },
  ],
  minPartySizeOnline: 1,
  maxPartySizeOnline: 12,
  largePartyThreshold: 8,
  minLeadTimeMinutes: 120, // 2 hours
  maxAdvanceDays: 60,
  cancelCutoffMinutes: 180, // 3 hours
  autoConfirmPolicy: "small_parties_only",
  autoConfirmMaxParty: 4,
  pendingHoldExpiryMinutes: 30,
  noShowGraceMinutes: 20,
  blackoutDates: [],
  nearCapacityThreshold: 4,
};

/**
 * Derives reservation duration in minutes based on party size.
 */
export function getDurationForPartySize(
  partySize: number,
  rules: ReservationRules = DEFAULT_RESERVATION_RULES
): number {
  const durations =
    rules?.durationsByPartySize ||
    (rules as unknown as { durationRules?: DurationRule[] })?.durationRules ||
    DEFAULT_RESERVATION_RULES.durationsByPartySize;

  const match = durations?.find(
    (d: DurationRule) => partySize >= d.minParty && partySize <= d.maxParty
  );
  if (match) return match.durationMinutes;
  // Fallback if party size is higher than configured rules
  return 150;
}

/**
 * Validates a rules object and returns sanitized rules or validation errors.
 */
export function validateReservationRules(
  input: Partial<ReservationRules>
): { valid: boolean; rules?: ReservationRules; errors?: string[] } {
  const errors: string[] = [];

  if (input.slotIntervalMinutes !== undefined) {
    if (![15, 30, 45, 60].includes(input.slotIntervalMinutes)) {
      errors.push("slotIntervalMinutes must be 15, 30, 45, or 60");
    }
  }

  if (input.defaultMaxCoversConcurrent !== undefined && input.defaultMaxCoversConcurrent < 1) {
    errors.push("defaultMaxCoversConcurrent must be at least 1");
  }

  if (input.defaultMaxCoversPerSlot !== undefined && input.defaultMaxCoversPerSlot < 1) {
    errors.push("defaultMaxCoversPerSlot must be at least 1");
  }

  if (input.minPartySizeOnline !== undefined && input.maxPartySizeOnline !== undefined) {
    if (input.minPartySizeOnline > input.maxPartySizeOnline) {
      errors.push("minPartySizeOnline cannot exceed maxPartySizeOnline");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    rules: {
      ...DEFAULT_RESERVATION_RULES,
      ...input,
    },
  };
}

