import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import {
  getReservationById,
  updateReservationStatus,
  modifyReservationAtomic,
  logActivity,
  type ReservationStatus,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!hasPermission(user.role, "reservations")) {
      return NextResponse.json({ error: "Action non autorisée", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const res = getReservationById(id);
    if (!res) {
      return NextResponse.json({ error: "Réservation introuvable", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ success: true, reservation: res });
  } catch (error) {
    console.error("Fetch reservation error:", error);
    return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!hasPermission(user.role, "reservations")) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const current = getReservationById(id);
    if (!current) {
      return NextResponse.json({ error: "Réservation introuvable", code: "NOT_FOUND" }, { status: 404 });
    }

    // 1. Status Update
    if (body.status) {
      const targetStatus: ReservationStatus = body.status;
      const note = body.internal_notes || body.reason || `Changement de statut vers ${targetStatus}`;
      updateReservationStatus(id, targetStatus, note, user.username);

      logActivity({
        userId: user.id,
        userName: user.username,
        action: `reservation_${targetStatus}`,
        entityType: "reservation",
        entityId: id,
        details: `Statut changé de ${current.status} à ${targetStatus}. Réf: ${current.reference || id}. Note: ${note}`,
      });

      return NextResponse.json({ success: true, status: targetStatus });
    }

    // 2. Details Update (Party Size, Date, Time, Notes)
    if (body.serviceDate || body.startMinute !== undefined || body.partySize !== undefined) {
      const mod = modifyReservationAtomic(
        id,
        {
          serviceDate: body.serviceDate || current.service_date,
          startMinute: body.startMinute !== undefined ? Number(body.startMinute) : current.start_minute,
          partySize: body.partySize !== undefined ? Number(body.partySize) : current.party_size,
          guestNotes: body.guestNotes !== undefined ? body.guestNotes : current.guest_notes,
        },
        user.username
      );

      if (!mod.success) {
        return NextResponse.json({ error: "Créneau non disponible", code: mod.reason }, { status: 409 });
      }

      logActivity({
        userId: user.id,
        userName: user.username,
        action: "reservation_modified",
        entityType: "reservation",
        entityId: id,
        details: `Modification réservation réf ${current.reference}.`,
      });

      return NextResponse.json({ success: true, reservation: mod.reservation });
    }

    return NextResponse.json({ error: "Aucun champ valide à mettre à jour" }, { status: 400 });
  } catch (error) {
    console.error("Update reservation error:", error);
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
  }
}
