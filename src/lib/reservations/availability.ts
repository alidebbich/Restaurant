/**
 * Pure Availability Engine for Restaurant Reservations
 * Zero DB or framework imports. Enforces:
 * 1. Pacing limit (covers starting in the same slot <= maxCoversPerSlot)
 * 2. Concurrent capacity invariant (active covers in any overlapping interval <= maxCoversConcurrent)
 * 3. Operating hours, exceptions (Ramadan, holidays), blackout dates, and day overrides
 * 4. Lead time and max advance window
 * 5. Duration mapping by party size
 * 6. Last seating cutoff
 * 7. Self-exclusion on modification
 */

import type { ReservationRules, CapacityMode } from "./rules.ts";
import {
  DEFAULT_RESERVATION_RULES,
  getDurationForPartySize,
} from "./rules.ts";
import {
  timeStringToMinutes,
  minutesToTimeString,
  intervalsOverlap,
} from "./time.ts";

export type SlotAvailabilityReason =
  | "AVAILABLE"
  | "FULL_CONCURRENT"
  | "FULL_PACING"
  | "CLOSED"
  | "BLACKOUT"
  | "TOO_SOON"
  | "PAST_CUTOFF"
  | "EXCEEDS_ADVANCE"
  | "PAST_LAST_SEATING"
  | "LARGE_PARTY_REQUEST_ONLY"
  | "INVALID_PARTY_SIZE";

export type AvailableSlot = {
  startMinute: number;
  timeFormatted: string; // "19:30" or "00:30 (+1)"
  available: boolean;
  reason: SlotAvailabilityReason;
  isRequestOnly?: boolean;
  remainingCoversInSlot?: number;
  remainingConcurrentCovers?: number;
  isNearCapacity?: boolean;
};

export type OperatingDay = {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  openTime: string;  // "11:00"
  closeTime: string; // "23:30" (or "01:00" for next day)
  isClosed: boolean;
};

export type OperatingException = {
  id?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isClosed: boolean;
  openTime?: string | null;
  closeTime?: string | null;
};

export type ReservationItem = {
  id: string;
  serviceDate: string; // YYYY-MM-DD
  startMinute: number;
  durationMinutes: number;
  partySize: number;
  status: string; // pending, confirmed, seated, cancelled, declined, no_show, completed, expired
};

export type AvailabilityParams = {
  date: string; // YYYY-MM-DD (venue-local)
  partySize: number;
  rules?: ReservationRules;
  operatingHours: OperatingDay[];
  exceptions?: OperatingException[];
  existingReservations: ReservationItem[];
  currentTimestamp?: { date: string; minute: number }; // For deterministic testing
  excludeReservationId?: string; // For reschedule / modify
};

export type CanBookResult = {
  canBook: boolean;
  reason: SlotAvailabilityReason;
  durationMinutes: number;
  isRequestOnly: boolean;
  remainingConcurrentCovers?: number;
  remainingCoversInSlot?: number;
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "seated"]);

/**
 * Resolves the operational window [openMinute, closeMinute] for a given date.
 * Returns null if the restaurant is closed.
 */
export function resolveDayHours(
  dateStr: string,
  operatingHours: OperatingDay[],
  exceptions: OperatingException[] = [],
  blackoutDates: string[] = []
): { openMinute: number; closeMinute: number } | null {
  // 1. Blackout date check
  if (blackoutDates.includes(dateStr)) {
    return null;
  }

  // 2. Exception check (holidays, Ramadan, private events)
  const matchingException = exceptions.find(
    (ex) => dateStr >= ex.startDate && dateStr <= ex.endDate
  );
  if (matchingException) {
    if (matchingException.isClosed) return null;
    if (matchingException.openTime && matchingException.closeTime) {
      let openMin = timeStringToMinutes(matchingException.openTime);
      let closeMin = timeStringToMinutes(matchingException.closeTime);
      if (closeMin <= openMin) closeMin += 1440; // After-midnight close
      return { openMinute: openMin, closeMinute: closeMin };
    }
  }

  // 3. Regular weekly operating hours
  const parts = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const dayOfWeek = dateObj.getUTCDay();

  const standard = operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!standard || standard.isClosed) {
    return null;
  }

  let openMin = timeStringToMinutes(standard.openTime);
  let closeMin = timeStringToMinutes(standard.closeTime);
  if (closeMin <= openMin) {
    closeMin += 1440; // After midnight (e.g. 18:00 to 01:00 is 1080 to 1500)
  }

  return { openMinute: openMin, closeMinute: closeMin };
}

/**
 * Computes availability for a single candidate booking slot.
 */
export function canBookSlot(
  candidateStartMinute: number,
  params: AvailabilityParams
): CanBookResult {
  const rules = params.rules || DEFAULT_RESERVATION_RULES;
  const { partySize, date, existingReservations, excludeReservationId } = params;

  // 1. Party size bounds validation
  if (partySize < rules.minPartySizeOnline || partySize > rules.maxPartySizeOnline) {
    return {
      canBook: false,
      reason: "INVALID_PARTY_SIZE",
      durationMinutes: 0,
      isRequestOnly: false,
    };
  }

  const durationMinutes = getDurationForPartySize(partySize, rules);
  const isRequestOnly = partySize > rules.largePartyThreshold;

  // 2. Lead time, past date & max advance window check (checked before hours)
  if (params.currentTimestamp) {
    const { date: nowDate, minute: nowMinute } = params.currentTimestamp;

    if (date < nowDate) {
      return { canBook: false, reason: "PAST_CUTOFF", durationMinutes, isRequestOnly };
    }

    if (date === nowDate && candidateStartMinute < nowMinute + rules.minLeadTimeMinutes) {
      return { canBook: false, reason: "TOO_SOON", durationMinutes, isRequestOnly };
    }

    // Check max advance window
    const targetDate = new Date(`${date}T00:00:00Z`).getTime();
    const currentDate = new Date(`${nowDate}T00:00:00Z`).getTime();
    const diffDays = (targetDate - currentDate) / (1000 * 60 * 60 * 24);
    if (diffDays > rules.maxAdvanceDays) {
      return { canBook: false, reason: "EXCEEDS_ADVANCE", durationMinutes, isRequestOnly };
    }
  }

  // 3. Day hours resolution
  const hours = resolveDayHours(
    date,
    params.operatingHours,
    params.exceptions,
    rules.blackoutDates
  );
  if (!hours) {
    return {
      canBook: false,
      reason: rules.blackoutDates.includes(date) ? "BLACKOUT" : "CLOSED",
      durationMinutes,
      isRequestOnly,
    };
  }

  // 4. Last seating cutoff
  const minDwell = Math.min(60, durationMinutes);
  const lastSeatingMinute = hours.closeMinute - minDwell;
  if (candidateStartMinute > lastSeatingMinute || candidateStartMinute < hours.openMinute) {
    return {
      canBook: false,
      reason: candidateStartMinute > lastSeatingMinute ? "PAST_LAST_SEATING" : "CLOSED",
      durationMinutes,
      isRequestOnly,
    };
  }

  // 5. Large party request flow: allowed to submit request if restaurant is open
  if (isRequestOnly) {
    return {
      canBook: true,
      reason: "LARGE_PARTY_REQUEST_ONLY",
      durationMinutes,
      isRequestOnly: true,
    };
  }

  // 5. Day override capacity values if set
  const dayOverride = rules.dayOverrides?.[date];
  const maxCoversConcurrent = dayOverride?.maxCoversConcurrent ?? rules.defaultMaxCoversConcurrent;
  const maxCoversPerSlot = dayOverride?.maxCoversPerSlot ?? rules.defaultMaxCoversPerSlot;

  // 6. Filter active reservations on this service date, excluding itself on modification
  const activeReservations = existingReservations.filter((r) => {
    if (r.id === excludeReservationId) return false;
    if (r.serviceDate !== date) return false;
    return ACTIVE_STATUSES.has(r.status);
  });

  // 7. Pacing Check: Covers starting in this exact time slot
  const slotStartingCovers = activeReservations
    .filter((r) => r.startMinute === candidateStartMinute)
    .reduce((sum, r) => sum + r.partySize, 0);

  const remainingCoversInSlot = Math.max(0, maxCoversPerSlot - slotStartingCovers);
  if (slotStartingCovers + partySize > maxCoversPerSlot) {
    return {
      canBook: false,
      reason: "FULL_PACING",
      durationMinutes,
      isRequestOnly,
      remainingCoversInSlot,
    };
  }

  // 8. Concurrent Capacity Invariant:
  // For every minute during [candidateStartMinute, candidateStartMinute + durationMinutes),
  // total active covers + partySize must be <= maxCoversConcurrent.
  const candidateEndMinute = candidateStartMinute + durationMinutes;

  // Discrete time checkpoints: the start minute, plus the start of any overlapping reservation
  const checkMinutes = new Set<number>([candidateStartMinute]);
  for (const r of activeReservations) {
    if (intervalsOverlap(candidateStartMinute, durationMinutes, r.startMinute, r.durationMinutes)) {
      if (r.startMinute >= candidateStartMinute && r.startMinute < candidateEndMinute) {
        checkMinutes.add(r.startMinute);
      }
    }
  }

  let minRemainingConcurrent = maxCoversConcurrent;

  for (const minute of checkMinutes) {
    const concurrentCovers = activeReservations
      .filter((r) => r.startMinute <= minute && minute < r.startMinute + r.durationMinutes)
      .reduce((sum, r) => sum + r.partySize, 0);

    const availableConcurrent = maxCoversConcurrent - concurrentCovers;
    if (availableConcurrent < minRemainingConcurrent) {
      minRemainingConcurrent = availableConcurrent;
    }

    if (concurrentCovers + partySize > maxCoversConcurrent) {
      return {
        canBook: false,
        reason: "FULL_CONCURRENT",
        durationMinutes,
        isRequestOnly,
        remainingConcurrentCovers: Math.max(0, availableConcurrent),
        remainingCoversInSlot,
      };
    }
  }

  return {
    canBook: true,
    reason: isRequestOnly ? "LARGE_PARTY_REQUEST_ONLY" : "AVAILABLE",
    durationMinutes,
    isRequestOnly,
    remainingConcurrentCovers: Math.max(0, minRemainingConcurrent - partySize),
    remainingCoversInSlot: Math.max(0, remainingCoversInSlot - partySize),
  };
}

/**
 * Computes all available slots for a given date and party size.
 */
export function getAvailableSlots(params: AvailabilityParams): AvailableSlot[] {
  const rules = params.rules || DEFAULT_RESERVATION_RULES;
  const hours = resolveDayHours(
    params.date,
    params.operatingHours,
    params.exceptions,
    rules.blackoutDates
  );

  if (!hours) {
    return [];
  }

  const slots: AvailableSlot[] = [];
  const interval = rules.slotIntervalMinutes || 15;
  const lastSeatingMinute = hours.closeMinute - Math.min(60, getDurationForPartySize(params.partySize, rules));

  for (let minute = hours.openMinute; minute <= lastSeatingMinute; minute += interval) {
    const check = canBookSlot(minute, params);
    const isNearCapacity =
      check.canBook &&
      check.remainingConcurrentCovers !== undefined &&
      check.remainingConcurrentCovers <= (rules.nearCapacityThreshold ?? 4);

    slots.push({
      startMinute: minute,
      timeFormatted: minutesToTimeString(minute, true),
      available: check.canBook,
      reason: check.reason,
      isRequestOnly: check.isRequestOnly,
      remainingCoversInSlot: check.remainingCoversInSlot,
      remainingConcurrentCovers: check.remainingConcurrentCovers,
      isNearCapacity,
    });
  }

  return slots;
}

/**
 * Finds the nearest alternative available slots if the requested time is taken.
 */
export function findAlternativeSlots(
  requestedMinute: number,
  allSlots: AvailableSlot[],
  limit = 4
): AvailableSlot[] {
  const availableOnly = allSlots.filter((s) => s.available);
  if (availableOnly.length === 0) return [];

  return availableOnly
    .map((s) => ({
      slot: s,
      distance: Math.abs(s.startMinute - requestedMinute),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.slot);
}
