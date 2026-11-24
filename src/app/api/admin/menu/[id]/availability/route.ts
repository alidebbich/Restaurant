import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { toggleMenuItemAvailability } from "@/lib/db/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!hasPermission(user.role, "menu")) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { is_available } = body;

    toggleMenuItemAvailability(id, Boolean(is_available));

    return NextResponse.json({ success: true, is_available: Boolean(is_available) });
  } catch (error) {
    console.error("Toggle availability error:", error);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}

