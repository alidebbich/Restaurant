import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getHoursExceptions, createHoursException, logActivity } from "@/lib/db/queries";
import { z } from "zod";

const HoursExceptionSchema = z.object({
  label_fr: z.string().max(100).optional(),
  label_ar: z.string().max(100).optional(),
  label_en: z.string().max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_closed: z.number().int().min(0).max(1).default(1),
  open_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  close_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(getHoursExceptions());
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!hasPermission(user.role, "settings")) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = HoursExceptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const id = createHoursException(parsed.data as Parameters<typeof createHoursException>[0]);
  logActivity({ userId: user.id, userName: user.full_name, action: "create", entityType: "hours_exception", entityId: id });
  return NextResponse.json({ success: true, id }, { status: 201 });
}

