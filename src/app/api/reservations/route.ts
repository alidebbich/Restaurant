import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse } from "@/lib/auth";
import { reservationRateLimiter } from "@/lib/rate-limit";
import {
  getReservations,
  createReservationAtomic,
  getReservationRules,
  getOperatingHours,
  getHoursExceptions,
} from "@/lib/db/queries";
import {
  normalizePhoneNumber,
  timeStringToMinutes,
  minutesToTimeString,
  getVenueLocalNow,
} from "@/lib/reservations/time";
import {
  getAvailableSlots,
  findAlternativeSlots,
  type OperatingDay,
  type OperatingException,
  type ReservationItem,
} from "@/lib/reservations/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "reservations")) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const date = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;

    const reservations = getReservations({ status, date, search });
    return NextResponse.json({ success: true, reservations });
  } catch (error) {
    console.error("Fetch reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 0. Anti-abuse: Rate Limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
    const limiter = reservationRateLimiter();
    const rlResult = await limiter.limit(ip);
    if (!rlResult.allowed) {
      return NextResponse.json(
        { error: "Trop de demandes de réservation depuis cette adresse. Veuillez réessayer plus tard.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rlResult.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": rlResult.limit.toString(),
            "X-RateLimit-Remaining": rlResult.remaining.toString(),
          },
        }
      );
    }

    const body = await req.json();

    // 1. Anti-abuse: Honeypot check
    if (body.website || body.company || body.hp) {
      // Silently return success to bot without creating a reservation
      return NextResponse.json({ success: true, reference: "RZ-OK" });
    }

    // Support both new field names and legacy field names
    const guestName = (body.guestName || body.customer_name || "").trim();
    const rawPhone = (body.guestPhone || body.customer_phone || "").trim();
    const serviceDate = body.serviceDate || body.reservation_date;
    const rawTime = body.reservation_time;
    let startMinute = body.startMinute !== undefined ? Number(body.startMinute) : undefined;

    if (startMinute === undefined && rawTime) {
      startMinute = timeStringToMinutes(rawTime);
    }

    const partySize = parseInt(body.partySize || body.party_size || "2", 10);
    const guestEmail = (body.guestEmail || body.email || "").trim() || null;
    const guestNotes = (body.guestNotes || body.notes || "").trim() || null;
    const occasion = body.occasion?.trim() || null;
    const seatingPreference = body.seatingPreference || body.seating_preference || null;
    const locale = body.locale || "fr";
    const idempotencyKey = body.idempotencyKey || req.headers.get("x-idempotency-key") || undefined;

    // 2. Input Validation
    if (!guestName || guestName.length < 2) {
      return NextResponse.json(
        { error: "Veuillez indiquer votre nom complet.", code: "INVALID_NAME" },
        { status: 400 }
      );
    }

    const normPhone = normalizePhoneNumber(rawPhone);
    if (!normPhone.valid) {
      return NextResponse.json(
        { error: normPhone.error || "Numéro de téléphone invalide.", code: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    if (!serviceDate || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      return NextResponse.json(
        { error: "Date de réservation invalide.", code: "INVALID_DATE" },
        { status: 400 }
      );
    }

    if (startMinute === undefined || isNaN(startMinute) || startMinute < 0) {
      return NextResponse.json(
        { error: "Heure de réservation invalide.", code: "INVALID_TIME" },
        { status: 400 }
      );
    }

    if (isNaN(partySize) || partySize < 1 || partySize > 30) {
      return NextResponse.json(
        { error: "Nombre de convives invalide (1 - 30).", code: "INVALID_PARTY_SIZE" },
        { status: 400 }
      );
    }

    // Check staff permissions for manual overrides
    const currentUser = await getCurrentUser();
    const isStaff = Boolean(currentUser && hasPermission(currentUser.role, "reservations"));
    const capacityOverride = isStaff && Boolean(body.capacityOverride);
    const source = isStaff ? (body.source || "admin") : "web";

    // 3. Atomic Reservation Creation
    const result = createReservationAtomic({
      serviceDate,
      startMinute,
      partySize,
      guestName,
      guestPhone: normPhone.e164!,
      guestEmail,
      guestNotes,
      occasion,
      seatingPreference,
      locale,
      idempotencyKey,
      source,
      capacityOverride,
      staffUserId: isStaff && currentUser ? currentUser.id : undefined,
    });

    if (!result.success) {
      // If slot is taken, compute and return nearest alternative slots
      if (result.reason === "FULL_CONCURRENT" || result.reason === "FULL_PACING") {
        const rules = getReservationRules();
        const rawHours = getOperatingHours();
        const rawExceptions = getHoursExceptions();
        const rawReservations = getReservations({ date: serviceDate });

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
            serviceDate: r.service_date || serviceDate,
            startMinute: r.start_minute,
            durationMinutes: r.duration_minutes,
            partySize: r.party_size,
            status: r.status,
          }));

        const slots = getAvailableSlots({
          date: serviceDate,
          partySize,
          rules,
          operatingHours,
          exceptions,
          existingReservations,
          currentTimestamp: getVenueLocalNow(rules.venueTimezone),
        });

        const alternatives = findAlternativeSlots(startMinute, slots, 4).map((s) => ({
          startMinute: s.startMinute,
          timeFormatted: s.timeFormatted,
        }));

        return NextResponse.json(
          {
            error: "Le créneau sélectionné vient d'être réservé.",
            code: "SLOT_TAKEN",
            reason: result.reason,
            alternativeSlots: alternatives,
          },
          { status: 409 }
        );
      }

      if (result.reason === "DUPLICATE_BOOKING") {
        return NextResponse.json(
          {
            error: "Une réservation existe déjà pour ce numéro à cette date.",
            code: "DUPLICATE_BOOKING",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Réservation impossible sur ce créneau.",
          code: result.reason || "BOOKING_REJECTED",
        },
        { status: 400 }
      );
    }

    const res = result.reservation!;
    const manageUrl = result.rawManageToken
      ? `/${locale}/reserve/manage?token=${result.rawManageToken}`
      : undefined;

    return NextResponse.json({
      success: true,
      reservation: {
        id: res.id,
        reference: res.reference,
        serviceDate: res.service_date,
        timeFormatted: minutesToTimeString(res.start_minute),
        partySize: res.party_size,
        status: res.status,
        guestName: res.guest_name,
        guestPhone: res.guest_phone,
      },
      manageUrl,
      rawManageToken: result.rawManageToken,
      isDuplicate: result.isDuplicate || false,
    });
  } catch (error) {
    console.error("[Create Reservation Error]:", error);
    return NextResponse.json(
      { error: "Échec de l'enregistrement de la réservation.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
