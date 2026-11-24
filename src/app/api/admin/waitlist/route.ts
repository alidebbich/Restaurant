import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse } from "@/lib/auth";
import { getWaitlist, createWaitlistEntry, logActivity } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "reservations")) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;

    const list = getWaitlist(date);
    return NextResponse.json({ success: true, waitlist: list });
  } catch (error) {
    console.error("Fetch waitlist error:", error);
    return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "reservations")) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { serviceDate, startMinute, partySize, customerName, customerPhone, customerEmail, notes } = body;

    if (!serviceDate || startMinute === undefined || !partySize || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: "Champs requis manquants pour la liste d'attente.", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const entry = createWaitlistEntry({
      serviceDate,
      startMinute: Number(startMinute),
      partySize: Number(partySize),
      customerName,
      customerPhone,
      customerEmail,
      notes,
    });

    logActivity({
      userId: user.id,
      userName: user.username,
      action: "waitlist_add",
      entityType: "waitlist",
      entityId: entry.id,
      details: `Ajout en liste d'attente: ${customerName} (${partySize} pers.) pour le ${serviceDate}.`,
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("Create waitlist entry error:", error);
    return NextResponse.json({ error: "Failed to add to waitlist" }, { status: 500 });
  }
}

