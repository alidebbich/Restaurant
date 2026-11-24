import { NextRequest, NextResponse } from "next/server";
import { getGuests } from "@/lib/db/queries";
import { withAdminAuth, adminAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const guests = getGuests(search);
    return NextResponse.json({ success: true, guests });
  } catch (error) {
    console.error("Fetch guests error:", error);
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
  }
}, { customCheck: (user) => user.role === "super_admin" || user.role === "restaurant_owner" || hasPermission(user.role, "reservations") || hasPermission(user.role, "orders") });

