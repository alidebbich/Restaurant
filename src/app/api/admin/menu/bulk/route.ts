import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { toggleMenuItemAvailability, deleteMenuItem, updateMenuItem, logActivity } from "@/lib/db/queries";
import { z } from "zod";

const BulkActionSchema = z.object({
  action: z.enum(["available", "unavailable", "delete", "move_category"]),
  ids: z.array(z.string()).min(1, "Au moins un plat doit être sélectionné"),
  categoryId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (!hasPermission(user.role, "menu")) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = await req.json();
    const parsed = BulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, ids, categoryId } = parsed.data;

    for (const id of ids) {
      if (action === "available") {
        toggleMenuItemAvailability(id, true);
      } else if (action === "unavailable") {
        toggleMenuItemAvailability(id, false);
      } else if (action === "delete") {
        deleteMenuItem(id);
      } else if (action === "move_category" && categoryId) {
        updateMenuItem(id, { category_id: categoryId });
      }
    }

    logActivity({
      userId: user.id,
      userName: user.full_name,
      action: `bulk_${action}`,
      entityType: "menu_item",
      details: `${ids.length} plats affectés par l'action ${action}`,
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json({ error: "Erreur lors de l'action groupée" }, { status: 500 });
  }
}

