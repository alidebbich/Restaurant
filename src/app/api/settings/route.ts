import { NextResponse } from "next/server";
import { getRestaurantSettings, getOperatingHours, getHomepageContent } from "@/lib/db/queries";

export async function GET() {
  try {
    const settings = getRestaurantSettings();
    const hours = getOperatingHours();
    const homepage = getHomepageContent();

    return NextResponse.json({
      success: true,
      settings,
      hours,
      homepage,
    });
  } catch (error) {
    console.error("Public settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

