import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { deleteHoursException, logActivity } from "@/lib/db/queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!hasPermission(user.role, "settings")) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  deleteHoursException(id);
  logActivity({ userId: user.id, userName: user.full_name, action: "delete", entityType: "hours_exception", entityId: id });
  return NextResponse.json({ success: true });
}

