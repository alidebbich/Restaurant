import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse } from "@/lib/auth";
import {
  getWaitlist,
  updateWaitlistStatus,
  createReservationAtomic,
  logActivity,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "reservations")) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const capacityOverride = Boolean(body.capacityOverride);

    const allWaitlist = getWaitlist();
    const entry = allWaitlist.find((w) => w.id === id);

    if (!entry) {
      return NextResponse.json({ error: "Entrée liste d'attente introuvable", code: "NOT_FOUND" }, { status: 404 });
    }

    // Attempt to create reservation atomically
    const createRes = createReservationAtomic({
      serviceDate: entry.service_date,
      startMinute: entry.start_minute,
      partySize: entry.party_size,
      guestName: entry.customer_name,
      guestPhone: entry.customer_phone,
      guestEmail: entry.customer_email,
      guestNotes: entry.notes ? `[Promu de liste d'attente] ${entry.notes}` : "[Promu de liste d'attente]",
      source: "phone",
      capacityOverride,
      staffUserId: user.id,
    });

    if (!createRes.success) {
      return NextResponse.json(
        {
          error: "Capacité insuffisante pour promouvoir ce client sans dérogation.",
          code: createRes.reason || "CAPACITY_FULL",
        },
        { status: 409 }
      );
    }

    // Mark waitlist entry as seated / promoted
    updateWaitlistStatus(id, "seated");

    logActivity({
      userId: user.id,
      userName: user.username,
      action: "waitlist_promote",
      entityType: "waitlist",
      entityId: id,
      details: `Client ${entry.customer_name} promu en réservation confirmée réf: ${createRes.reservation?.reference}.`,
    });

    return NextResponse.json({
      success: true,
      reservation: createRes.reservation,
      rawManageToken: createRes.rawManageToken,
    });
  } catch (error) {
    console.error("Promote waitlist error:", error);
    return NextResponse.json({ error: "Failed to promote waitlist entry" }, { status: 500 });
  }
}

