import { NextRequest, NextResponse } from "next/server";
import {
  getReservationByManageToken,
  modifyReservationAtomic,
  cancelReservationAtomic,
  getReservationRules,
} from "@/lib/db/queries";
import {
  minutesToTimeString,
  getVenueLocalNow,
} from "@/lib/reservations/time";

export const dynamic = "force-dynamic";

/**
 * Checks if a reservation is within the allowed modification/cancellation window.
 */
function checkActionCutoff(
  reservation: { service_date: string; start_minute: number },
  cutoffMinutes: number,
  venueTimezone = "Africa/Tunis"
): { allowed: boolean; remainingHours?: number; reason?: string } {
  const now = getVenueLocalNow(venueTimezone);

  // If service date is in the past
  if (reservation.service_date < now.date) {
    return {
      allowed: false,
      reason: "La date de réservation est déjà passée.",
    };
  }

  // Calculate minutes difference
  const resDate = new Date(`${reservation.service_date}T00:00:00Z`).getTime();
  const nowDate = new Date(`${now.date}T00:00:00Z`).getTime();
  const daysDiff = (resDate - nowDate) / (1000 * 60 * 60 * 24);
  const minutesUntilService = daysDiff * 1440 + (reservation.start_minute - now.minute);

  if (minutesUntilService < cutoffMinutes) {
    return {
      allowed: false,
      remainingHours: Math.max(0, Math.round(minutesUntilService / 60)),
      reason: `Les modifications sont possibles jusqu'à ${Math.round(cutoffMinutes / 60)}h avant le service. Veuillez nous contacter directement par WhatsApp ou téléphone.`,
    };
  }

  return { allowed: true };
}

// ── GET: View Reservation via Manage Token ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token || token.length < 16) {
      return NextResponse.json(
        { error: "Lien de gestion invalide ou incomplet.", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    const res = getReservationByManageToken(token);
    if (!res) {
      return NextResponse.json(
        { error: "Réservation introuvable ou lien expiré.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const rules = getReservationRules();
    const cutoffCheck = checkActionCutoff(res, rules.cancelCutoffMinutes, rules.venueTimezone);
    const isTerminal = ["cancelled", "declined", "completed", "no_show"].includes(res.status);

    return NextResponse.json({
      success: true,
      reservation: {
        id: res.id,
        reference: res.reference,
        serviceDate: res.service_date,
        startMinute: res.start_minute,
        timeFormatted: minutesToTimeString(res.start_minute),
        durationMinutes: res.duration_minutes,
        partySize: res.party_size,
        status: res.status,
        guestName: res.guest_name,
        guestPhone: res.guest_phone,
        guestEmail: res.guest_email,
        guestNotes: res.guest_notes,
        occasion: res.occasion,
        seatingPreference: res.seating_preference,
        createdAt: res.created_at,
        confirmedAt: res.confirmed_at,
        cancelledAt: res.cancelled_at,
      },
      permissions: {
        canModify: !isTerminal && cutoffCheck.allowed,
        canCancel: !isTerminal && cutoffCheck.allowed,
        cutoffReason: cutoffCheck.allowed ? undefined : cutoffCheck.reason,
        cutoffMinutes: rules.cancelCutoffMinutes,
      },
    });
  } catch (error) {
    console.error("[Manage GET Error]:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer la réservation.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// ── PATCH: Modify Time, Date or Party Size ──
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, serviceDate, startMinute, partySize, guestNotes } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Jeton de gestion requis.", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    const current = getReservationByManageToken(token);
    if (!current) {
      return NextResponse.json(
        { error: "Réservation introuvable.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const rules = getReservationRules();
    const cutoffCheck = checkActionCutoff(current, rules.cancelCutoffMinutes, rules.venueTimezone);
    if (!cutoffCheck.allowed) {
      return NextResponse.json(
        { error: cutoffCheck.reason, code: "CUTOFF_PASSED" },
        { status: 403 }
      );
    }

    const targetDate = serviceDate || current.service_date;
    const targetMinute = startMinute !== undefined ? Number(startMinute) : current.start_minute;
    const targetParty = partySize !== undefined ? Number(partySize) : current.party_size;

    const modResult = modifyReservationAtomic(
      current.id,
      {
        serviceDate: targetDate,
        startMinute: targetMinute,
        partySize: targetParty,
        guestNotes,
      },
      "guest"
    );

    if (!modResult.success) {
      return NextResponse.json(
        {
          error: "Le créneau sélectionné n'est pas disponible pour cette taille de groupe.",
          code: modResult.reason || "SLOT_UNAVAILABLE",
        },
        { status: 409 }
      );
    }

    const updated = modResult.reservation!;
    return NextResponse.json({
      success: true,
      message: "Réservation modifiée avec succès.",
      reservation: {
        reference: updated.reference,
        serviceDate: updated.service_date,
        timeFormatted: minutesToTimeString(updated.start_minute),
        partySize: updated.party_size,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("[Manage PATCH Error]:", error);
    return NextResponse.json(
      { error: "Échec de la modification de la réservation.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// ── DELETE: Cancel Reservation ──
export async function DELETE(req: NextRequest) {
  try {
    let token: string | null = null;
    let reason: string | undefined = undefined;

    // Check body or query params
    try {
      const body = await req.json();
      token = body.token;
      reason = body.reason;
    } catch {
      const { searchParams } = new URL(req.url);
      token = searchParams.get("token");
      reason = searchParams.get("reason") || undefined;
    }

    if (!token) {
      return NextResponse.json(
        { error: "Jeton de gestion requis.", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    const current = getReservationByManageToken(token);
    if (!current) {
      return NextResponse.json(
        { error: "Réservation introuvable.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const rules = getReservationRules();
    const cutoffCheck = checkActionCutoff(current, rules.cancelCutoffMinutes, rules.venueTimezone);
    if (!cutoffCheck.allowed) {
      return NextResponse.json(
        { error: cutoffCheck.reason, code: "CUTOFF_PASSED" },
        { status: 403 }
      );
    }

    const cancelResult = cancelReservationAtomic(current.id, reason, "guest");
    if (!cancelResult.success) {
      return NextResponse.json(
        { error: "Impossible d'annuler cette réservation.", code: "CANCEL_FAILED" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Votre réservation a été annulée. Vous pouvez réserver un nouveau créneau à tout moment.",
      status: "cancelled",
    });
  } catch (error) {
    console.error("[Manage DELETE Error]:", error);
    return NextResponse.json(
      { error: "Échec de l'annulation.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

