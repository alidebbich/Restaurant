import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse } from "@/lib/auth";
import {
  getReservationRules,
  updateReservationRules,
  logActivity,
} from "@/lib/db/queries";
import {
  validateReservationRules,
  DEFAULT_RESERVATION_RULES,
  type ReservationRules,
} from "@/lib/reservations/rules";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (!hasPermission(user.role, "settings") && !hasPermission(user.role, "reservations"))) {
      return unauthorizedResponse();
    }

    const rules = getReservationRules();
    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error("Fetch reservation rules error:", error);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "settings")) {
      return unauthorizedResponse();
    }

    const body = await req.json();

    // Validate using pure validator
    const validation = validateReservationRules(body);
    if (!validation.valid || !validation.rules) {
      return NextResponse.json(
        {
          error: "Règles de réservation invalides",
          code: "INVALID_RULES",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const newRules: ReservationRules = {
      ...DEFAULT_RESERVATION_RULES,
      ...validation.rules,
    };

    // Logical Invariant: Pacing cannot exceed concurrent capacity
    if (newRules.defaultMaxCoversPerSlot > newRules.defaultMaxCoversConcurrent) {
      return NextResponse.json(
        {
          error: "La limite de cadence par créneau ne peut pas dépasser la capacité simultanée de la salle.",
          code: "PACING_EXCEEDS_CONCURRENT",
        },
        { status: 400 }
      );
    }

    updateReservationRules(newRules);

    logActivity({
      userId: user.id,
      userName: user.username,
      action: "update_reservation_rules",
      entityType: "settings",
      entityId: "reservation_rules",
      details: `Règles modifiées: Capacité max ${newRules.defaultMaxCoversConcurrent} couv., Cadence ${newRules.defaultMaxCoversPerSlot} couv./créneau, Intervalle ${newRules.slotIntervalMinutes}m.`,
    });

    return NextResponse.json({ success: true, rules: newRules });
  } catch (error) {
    console.error("Update reservation rules error:", error);
    return NextResponse.json({ error: "Failed to update reservation rules" }, { status: 500 });
  }
}

