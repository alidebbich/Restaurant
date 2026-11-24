import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { reorderMenuItems, logActivity } from "@/lib/db/queries";
import { z } from "zod";

const ReorderSchema = z.object({ ids: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!hasPermission(user.role, "menu")) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  reorderMenuItems(parsed.data.ids);
  logActivity({
    userId: user.id,
    userName: user.full_name,
    action: "menu.reorder",
    entityType: "menu_item",
    details: JSON.stringify({ count: parsed.data.ids.length }),
  });
  return NextResponse.json({ success: true });
}

