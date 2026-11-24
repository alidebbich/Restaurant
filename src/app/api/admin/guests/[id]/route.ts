import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse } from "@/lib/auth";
import { getGuestById, updateGuest, logActivity } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "reservations")) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const guest = getGuestById(id);
    if (!guest) {
      return NextResponse.json({ error: "Client introuvable", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("Fetch guest details error:", error);
    return NextResponse.json({ error: "Failed to fetch guest details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "reservations")) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await req.json();
    const { notes, tags } = body;

    const updated = updateGuest(id, { notes, tags });
    if (!updated) {
      return NextResponse.json({ error: "Client introuvable", code: "NOT_FOUND" }, { status: 404 });
    }

    logActivity({
      userId: user.id,
      userName: user.username,
      action: "guest_update",
      entityType: "guest",
      entityId: id,
      details: `Fiche client ${updated.name} mise à jour (tags / notes).`,
    });

    return NextResponse.json({ success: true, guest: updated });
  } catch (error) {
    console.error("Update guest error:", error);
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}

