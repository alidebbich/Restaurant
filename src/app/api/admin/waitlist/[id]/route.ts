import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse } from "@/lib/auth";
import { updateWaitlistStatus, deleteWaitlistEntry, logActivity } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

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
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status requis" }, { status: 400 });
    }

    updateWaitlistStatus(id, status);

    logActivity({
      userId: user.id,
      userName: user.username,
      action: `waitlist_${status}`,
      entityType: "waitlist",
      entityId: id,
      details: `Statut liste d'attente mis à jour: ${status}`,
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Update waitlist error:", error);
    return NextResponse.json({ error: "Failed to update waitlist" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "reservations")) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    deleteWaitlistEntry(id);

    logActivity({
      userId: user.id,
      userName: user.username,
      action: "waitlist_delete",
      entityType: "waitlist",
      entityId: id,
      details: `Entrée de liste d'attente supprimée: ${id}`,
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Delete waitlist error:", error);
    return NextResponse.json({ error: "Failed to delete waitlist entry" }, { status: 500 });
  }
}

