import { NextResponse } from "next/server";
import { getCategories, getMenuItems } from "@/lib/db/queries";

export async function GET() {
  try {
    const categories = getCategories(false); // active only
    const items = getMenuItems({ isPublishedOnly: true, isAvailable: true });

    return NextResponse.json({
      success: true,
      categories,
      items,
    });
  } catch (error) {
    console.error("Public menu error:", error);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}

