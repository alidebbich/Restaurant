import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hardDeleteMenuItem, logActivity } from "@/lib/db/queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // Hard delete: owner only
  if (!["super_admin", "restaurant_owner"].includes(user.role)) {
    return NextResponse.json({ error: "Réservé au propriétaire" }, { status: 403 });
  }

  const { id } = await params;
  try {
    hardDeleteMenuItem(id);
    logActivity({ userId: user.id, userName: user.full_name, action: "hard_delete", entityType: "menu_item", entityId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}

