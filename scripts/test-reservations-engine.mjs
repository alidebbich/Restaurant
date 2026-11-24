/**
 * Comprehensive Unit Test Suite for Reservation Engine
 * Table-driven tests verifying all capacity, time, and rules edge cases.
 * Run directly with: node scripts/test-reservations-engine.mjs
 */

import {
  canBookSlot,
  getAvailableSlots,
  resolveDayHours,
  findAlternativeSlots,
} from "../src/lib/reservations/availability.ts";
import {
  DEFAULT_RESERVATION_RULES,
  getDurationForPartySize,
  validateReservationRules,
} from "../src/lib/reservations/rules.ts";
import {
  timeStringToMinutes,
  minutesToTimeString,
  normalizePhoneNumber,
  generateReferenceCode,
  intervalsOverlap,
} from "../src/lib/reservations/time.ts";

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`[✓ PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[✗ FAIL] ${testName} -- ${details}`);
  }
}

console.log("==================================================");
console.log("RESERVATION ENGINE TABLE-DRIVEN UNIT TEST SUITE");
console.log("==================================================\n");

// --- 1. TIME & FORMATTING HELPERS (8 tests) ---
assert(timeStringToMinutes("12:00") === 720, "TIME-01: 12:00 converts to 720 min");
assert(timeStringToMinutes("19:30") === 1170, "TIME-02: 19:30 converts to 1170 min");
assert(timeStringToMinutes("00:00") === 0, "TIME-03: 00:00 converts to 0 min");
assert(timeStringToMinutes("25:30") === 1530, "TIME-04: 25:30 (next-day 01:30) converts to 1530 min");
assert(minutesToTimeString(720) === "12:00", "TIME-05: 720 min converts to 12:00");
assert(minutesToTimeString(1500, true) === "01:00 (+1)", "TIME-06: 1500 min converts to 01:00 (+1)");
assert(intervalsOverlap(720, 90, 800, 90) === true, "TIME-07: Overlapping intervals detected correctly");
assert(intervalsOverlap(720, 90, 810, 90) === false, "TIME-08: Back-to-back boundary (end == start) does not overlap");

// --- 2. PHONE NORMALIZATION (6 tests) ---
const p1 = normalizePhoneNumber("20 123 456");
assert(p1.valid && p1.e164 === "+21620123456", "PHONE-01: 8-digit Tunisian phone auto-prefixes +216");

const p2 = normalizePhoneNumber("+216 20 123 456");
assert(p2.valid && p2.e164 === "+21620123456", "PHONE-02: Formatted +216 phone normalized to E.164");

const p3 = normalizePhoneNumber("0021620123456");
assert(p3.valid && p3.e164 === "+21620123456", "PHONE-03: 00216 prefix normalized to +216");

const p4 = normalizePhoneNumber("+33 6 12 34 56 78");
assert(p4.valid && p4.e164 === "+33612345678", "PHONE-04: International French phone validated and normalized");

const p5 = normalizePhoneNumber("123");
assert(!p5.valid, "PHONE-05: Too short phone number rejected");

const p6 = normalizePhoneNumber("abcdefgh");
assert(!p6.valid, "PHONE-06: Non-numeric phone number rejected");

// --- 3. REFERENCE CODE GENERATION (3 tests) ---
const ref1 = generateReferenceCode();
assert(/^RZ-[2345679ACDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(ref1), "REF-01: Reference code matches RZ-XXXX pattern");
assert(!/[0O1IL8B]/.test(ref1), "REF-02: Reference code excludes ambiguous characters (0, O, 1, I, L, 8, B)");
const ref2 = generateReferenceCode();
assert(ref1 !== ref2, "REF-03: Sequential reference codes are unique");

// --- 4. DURATION MAPPING BY PARTY SIZE (5 tests) ---
assert(getDurationForPartySize(2) === 75, "DUR-01: Party of 2 maps to 75 min");
assert(getDurationForPartySize(4) === 90, "DUR-02: Party of 4 maps to 90 min");
assert(getDurationForPartySize(6) === 120, "DUR-03: Party of 6 maps to 120 min");
assert(getDurationForPartySize(10) === 150, "DUR-04: Party of 10 maps to 150 min");
assert(getDurationForPartySize(20) === 150, "DUR-05: Large party > 8 maps to 150 min default");

// --- 5. OPERATING HOURS & EXCEPTIONS RESOLUTION (6 tests) ---
const stdHours = [
  { dayOfWeek: 1, openTime: "11:00", closeTime: "23:00", isClosed: false }, // Mon
  { dayOfWeek: 2, openTime: "11:00", closeTime: "23:00", isClosed: false }, // Tue
  { dayOfWeek: 3, openTime: "11:00", closeTime: "23:00", isClosed: false }, // Wed
  { dayOfWeek: 4, openTime: "11:00", closeTime: "23:00", isClosed: false }, // Thu
  { dayOfWeek: 5, openTime: "11:00", closeTime: "01:00", isClosed: false }, // Fri (after midnight close)
  { dayOfWeek: 6, openTime: "11:00", closeTime: "01:00", isClosed: false }, // Sat
  { dayOfWeek: 0, openTime: "12:00", closeTime: "22:00", isClosed: true },  // Sun closed
];

const exceptions = [
  { startDate: "2026-03-20", endDate: "2026-03-22", isClosed: true }, // Holiday closed
  { startDate: "2026-04-01", endDate: "2026-04-30", isClosed: false, openTime: "17:30", closeTime: "02:00" }, // Ramadan
];

// 2026-11-09 is Monday
const monHours = resolveDayHours("2026-11-09", stdHours, exceptions);
assert(monHours && monHours.openMinute === 660 && monHours.closeMinute === 1380, "HOURS-01: Monday standard hours 11:00 to 23:00 resolved");

// 2026-11-13 is Friday (11:00 to 01:00 next day = 660 to 1500)
const friHours = resolveDayHours("2026-11-13", stdHours, exceptions);
assert(friHours && friHours.openMinute === 660 && friHours.closeMinute === 1500, "HOURS-02: Friday after-midnight close 01:00 resolved to 1500 min");

// 2026-11-15 is Sunday (closed)
const sunHours = resolveDayHours("2026-11-15", stdHours, exceptions);
assert(sunHours === null, "HOURS-03: Sunday marked closed returns null");

// Exception holiday (closed)
const holHours = resolveDayHours("2026-03-21", stdHours, exceptions);
assert(holHours === null, "HOURS-04: Holiday exception marked closed returns null");

// Ramadan exception (custom shortened/shifted hours)
const ramHours = resolveDayHours("2026-04-15", stdHours, exceptions);
assert(ramHours && ramHours.openMinute === 1050 && ramHours.closeMinute === 1560, "HOURS-05: Ramadan exception 17:30 to 02:00 (+1) overrides regular hours");

// Blackout date
const blackHours = resolveDayHours("2026-12-31", stdHours, exceptions, ["2026-12-31"]);
assert(blackHours === null, "HOURS-06: Blackout date returns null");

// --- 6. CORE CAPACITY & PACING INVARIANT TESTS (18 tests) ---

const baseParams = {
  date: "2026-11-09", // Monday (open 11:00 to 23:00 = 660 to 1380)
  partySize: 2, // duration 75 min
  rules: {
    ...DEFAULT_RESERVATION_RULES,
    defaultMaxCoversConcurrent: 20,
    defaultMaxCoversPerSlot: 6,
    minLeadTimeMinutes: 60,
    maxAdvanceDays: 30,
  },
  operatingHours: stdHours,
  exceptions: [],
  existingReservations: [],
  currentTimestamp: { date: "2026-11-09", minute: 600 }, // Current time 10:00 (1h before open)
};

// CAP-01: Empty restaurant normal slot succeeds
const r1 = canBookSlot(720, baseParams); // 12:00
assert(r1.canBook === true && r1.reason === "AVAILABLE", "CAP-01: Booking on empty slot succeeds");

// CAP-02: Lead time cutoff enforced (booking at 10:30 when now is 10:00 and lead time is 60m)
const r2 = canBookSlot(630, baseParams); // 10:30 < 600 + 60
assert(r2.canBook === false && (r2.reason === "TOO_SOON" || r2.reason === "CLOSED"), "CAP-02: Lead time cutoff rejects bookings too soon");

// CAP-03: Booking before opening time rejected
const r3 = canBookSlot(600, {
  ...baseParams,
  currentTimestamp: { date: "2026-11-09", minute: 480 }, // 08:00 (ample lead time before 10:00)
}); // 10:00 (opens at 11:00 = 660)
assert(r3.canBook === false && r3.reason === "CLOSED", "CAP-03: Booking before opening time rejected with CLOSED");

// CAP-04: Booking past last seating cutoff rejected (close 23:00 = 1380, last seating 23:00 - 60 = 22:00 = 1320)
const r4 = canBookSlot(1335, baseParams); // 22:15 > 1320
assert(r4.canBook === false && r4.reason === "PAST_LAST_SEATING", "CAP-04: Booking past last seating rejected with PAST_LAST_SEATING");

// CAP-05: Pacing limit hit in single slot (maxCoversPerSlot = 6, 6 already starting at 12:00)
const pacingParams = {
  ...baseParams,
  existingReservations: [
    { id: "res_p1", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 75, partySize: 6, status: "confirmed" },
  ],
};
const r5 = canBookSlot(720, pacingParams); // tries to book 2 more covers at 12:00
assert(r5.canBook === false && r5.reason === "FULL_PACING", "CAP-05: Pacing limit hit blocks new booking in same slot");

// CAP-06: Pacing limit permits booking in adjacent slot (12:15 when 12:00 is pacing-full)
const r6 = canBookSlot(735, pacingParams); // 12:15 (next slot)
assert(r6.canBook === true, "CAP-06: Adjacent slot 12:15 succeeds when 12:00 pacing is full");

// CAP-07: Concurrent capacity hit across overlapping reservations
// maxConcurrent = 20. Five bookings of 4 covers at 12:00 (duration 90 min) -> 20 covers until 13:30
const concurrentParams = {
  ...baseParams,
  existingReservations: [
    { id: "res_c1", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 90, partySize: 10, status: "confirmed" },
    { id: "res_c2", serviceDate: "2026-11-09", startMinute: 735, durationMinutes: 90, partySize: 10, status: "confirmed" },
  ],
};
// Total concurrent between 735 and 810 is 20 covers.
// A new booking of 2 covers at 12:30 (750) will overlap both and push total to 22 > 20
const r7 = canBookSlot(750, concurrentParams);
assert(r7.canBook === false && r7.reason === "FULL_CONCURRENT", "CAP-07: Concurrent capacity limit hit rejects overlapping booking");

// CAP-08: Back-to-back boundary does not consume concurrent capacity
// Booking 1 finishes at 13:00 (780). Booking 2 starts at 13:00 (780).
const b2bParams = {
  ...baseParams,
  partySize: 4,
  existingReservations: [
    { id: "res_b1", serviceDate: "2026-11-09", startMinute: 700, durationMinutes: 80, partySize: 20, status: "confirmed" }, // 700 to 780
  ],
};
// At exactly 780, res_b1 is done. Candidate starting at 780 has 20 free concurrent seats.
const r8 = canBookSlot(780, b2bParams);
assert(r8.canBook === true && r8.reason === "AVAILABLE", "CAP-08: Back-to-back booking starting when previous ends is accepted");

// CAP-09: Cancelled reservation frees capacity
const cancelledParams = {
  ...baseParams,
  existingReservations: [
    { id: "res_canc", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 90, partySize: 20, status: "cancelled" },
  ],
};
const r9 = canBookSlot(720, cancelledParams);
assert(r9.canBook === true, "CAP-09: Cancelled reservation frees capacity");

// CAP-10: No-show reservation frees capacity
const noShowParams = {
  ...baseParams,
  existingReservations: [
    { id: "res_ns", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 90, partySize: 20, status: "no_show" },
  ],
};
const r10 = canBookSlot(720, noShowParams);
assert(r10.canBook === true, "CAP-10: No-show reservation frees capacity");

// CAP-11: Declined reservation frees capacity
const declinedParams = {
  ...baseParams,
  existingReservations: [
    { id: "res_dec", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 90, partySize: 20, status: "declined" },
  ],
};
const r11 = canBookSlot(720, declinedParams);
assert(r11.canBook === true, "CAP-11: Declined reservation frees capacity");

// CAP-12: Pending reservation DOES consume capacity (hold)
const pendingParams = {
  ...baseParams,
  existingReservations: [
    { id: "res_pend", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 90, partySize: 20, status: "pending" },
  ],
};
const r12 = canBookSlot(720, pendingParams);
assert(r12.canBook === false && (r12.reason === "FULL_CONCURRENT" || r12.reason === "FULL_PACING"), "CAP-12: Pending reservation holds capacity");

// CAP-13: Seated reservation DOES consume capacity
const seatedParams = {
  ...baseParams,
  existingReservations: [
    { id: "res_seat", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 90, partySize: 20, status: "seated" },
  ],
};
const r13 = canBookSlot(720, seatedParams);
assert(r13.canBook === false && (r13.reason === "FULL_CONCURRENT" || r13.reason === "FULL_PACING"), "CAP-13: Seated reservation consumes capacity");

// CAP-14: Rescheduling/modification excludes the reservation's own usage
const modifyParams = {
  ...baseParams,
  excludeReservationId: "my_existing_res",
  existingReservations: [
    { id: "my_existing_res", serviceDate: "2026-11-09", startMinute: 720, durationMinutes: 90, partySize: 20, status: "confirmed" },
  ],
};
const r14 = canBookSlot(720, modifyParams);
assert(r14.canBook === true, "CAP-14: Self-exclusion allows modifying own reservation without blocking itself");

// CAP-15: Large party threshold -> request only
const largePartyParams = {
  ...baseParams,
  partySize: 10, // > largePartyThreshold (8)
};
const r15 = canBookSlot(720, largePartyParams);
assert(r15.canBook === true && r15.isRequestOnly === true && r15.reason === "LARGE_PARTY_REQUEST_ONLY", "CAP-15: Party of 10 returns LARGE_PARTY_REQUEST_ONLY");

// CAP-16: Exceeding max advance window rejected
const advanceParams = {
  ...baseParams,
  date: "2026-12-25", // 46 days ahead > maxAdvanceDays (30)
};
const r16 = canBookSlot(720, advanceParams);
assert(r16.canBook === false && r16.reason === "EXCEEDS_ADVANCE", "CAP-16: Date exceeding max advance window is rejected");

// CAP-17: Past date rejected
const pastDateParams = {
  ...baseParams,
  date: "2026-11-01", // in past relative to currentTimestamp 2026-11-09
};
const r17 = canBookSlot(720, pastDateParams);
assert(r17.canBook === false && r17.reason === "PAST_CUTOFF", "CAP-17: Past date is rejected");

// CAP-18: Invalid party size (0 or too large)
const invalidPartyParams = {
  ...baseParams,
  partySize: 0,
};
const r18 = canBookSlot(720, invalidPartyParams);
assert(r18.canBook === false && r18.reason === "INVALID_PARTY_SIZE", "CAP-18: Party size 0 rejected as INVALID_PARTY_SIZE");

// --- 7. AVAILABLE SLOTS GENERATION & SUGGESTIONS (5 tests) ---
const allSlots = getAvailableSlots(baseParams);
assert(allSlots.length > 0, "SLOTS-01: Available slots generated across day");
assert(allSlots.every((s) => s.startMinute % 15 === 0), "SLOTS-02: Slots follow 15-minute interval grid");

const firstSlot = allSlots[0];
assert(firstSlot.startMinute === 660, "SLOTS-03: First slot starts at opening time 11:00");

// Alternative suggestions
const altSlots = findAlternativeSlots(720, allSlots, 3);
assert(altSlots.length === 3, "SLOTS-04: Nearest alternative slots returned");
assert(altSlots[0].startMinute === 720, "SLOTS-05: Closest slot to 12:00 is 12:00 itself");

// --- 8. RULES VALIDATION (4 tests) ---
const val1 = validateReservationRules({ slotIntervalMinutes: 15 });
assert(val1.valid === true, "RULES-01: Valid slot interval 15 accepted");

const val2 = validateReservationRules({ slotIntervalMinutes: 20 });
assert(val2.valid === false && val2.errors.length > 0, "RULES-02: Invalid slot interval 20 rejected");

const val3 = validateReservationRules({ minPartySizeOnline: 10, maxPartySizeOnline: 4 });
assert(val3.valid === false, "RULES-03: Min party > Max party rejected");

const val4 = validateReservationRules({ defaultMaxCoversConcurrent: 0 });
assert(val4.valid === false, "RULES-04: Concurrent covers < 1 rejected");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (${passed + failed} TOTAL)`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
