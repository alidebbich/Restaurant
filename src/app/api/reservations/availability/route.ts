import { NextRequest, NextResponse } from "next/server";
import {
  getReservationRules,
  getOperatingHours,
  getHoursExceptions,
  getReservations,
} from "@/lib/db/queries";
import {
  getAvailableSlots,
  type OperatingDay,
  type OperatingException,
  type ReservationItem,
} from "@/lib/reservations/availability";
import { getVenueLocalNow } from "@/lib/reservations/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const partySizeParam = searchParams.get("partySize");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Date valide requise (YYYY-MM-DD)", code: "INVALID_DATE" },
        { status: 400 }
      );
    }

    const partySize = parseInt(partySizeParam || "2", 10);
    if (isNaN(partySize) || partySize < 1 || partySize > 50) {
      return NextResponse.json(
        { error: "Nombre de personnes invalide (1 - 50)", code: "INVALID_PARTY_SIZE" },
        { status: 400 }
      );
    }

    const rules = getReservationRules();
    const rawHours = getOperatingHours();
    const rawExceptions = getHoursExceptions();
    const rawReservations = getReservations({ date });

    const operatingHours: OperatingDay[] = rawHours.map((h) => ({
      dayOfWeek: h.day_of_week,
      openTime: h.open_time,
      closeTime: h.close_time,
      isClosed: h.is_closed === 1,
    }));

    const exceptions: OperatingException[] = rawExceptions.map((ex) => ({
      startDate: ex.start_date,
      endDate: ex.end_date,
      isClosed: ex.is_closed === 1,
      openTime: ex.open_time,
      closeTime: ex.close_time,
    }));

    const existingReservations: ReservationItem[] = rawReservations
      .filter((r) => ["pending", "confirmed", "seated"].includes(r.status))
      .map((r) => ({
        id: r.id,
        serviceDate: r.service_date || r.reservation_date || date,
        startMinute: r.start_minute !== undefined ? r.start_minute : 720,
        durationMinutes: r.duration_minutes || 90,
        partySize: r.party_size,
        status: r.status,
      }));

    const currentTimestamp = getVenueLocalNow(rules.venueTimezone);

    const slots = getAvailableSlots({
      date,
      partySize,
      rules,
      operatingHours,
      exceptions,
      existingReservations,
      currentTimestamp,
    });

    // Sanitized slots for public consumption — never leak internal IDs or raw table data
    const publicSlots = slots.map((s) => ({
      startMinute: s.startMinute,
      timeFormatted: s.timeFormatted,
      available: s.available,
      reason: s.available ? "AVAILABLE" : s.reason,
      isRequestOnly: s.isRequestOnly,
      isNearCapacity: s.isNearCapacity,
    }));

    return NextResponse.json({
      success: true,
      date,
      partySize,
      slots: publicSlots,
      venueTimezone: rules.venueTimezone,
    });
  } catch (error) {
    console.error("[Availability API Error]:", error);
    return NextResponse.json(
      { error: "Impossible de charger les disponibilités", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

