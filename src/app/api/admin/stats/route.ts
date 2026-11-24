import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db/queries";
import { withAdminAuth, adminAuth } from "@/lib/auth-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const stats = getDashboardStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}, { requiredModule: "menu" }); // Any admin role can view stats

