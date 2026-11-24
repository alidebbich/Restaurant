import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { restoreCategory, logActivity } from "@/lib/db/queries";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!hasPermission(user.role, "menu")) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  try {
    restoreCategory(id);
    logActivity({ userId: user.id, userName: user.full_name, action: "restore", entityType: "category", entityId: id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur restauration" }, { status: 500 });
  }
}

