import { NextRequest, NextResponse } from "next/server";
import { getRestaurantSettings, updateRestaurantSettings, getOperatingHours, updateOperatingHours } from "@/lib/db/queries";
import { withAdminAuth, adminAuth } from "@/lib/auth-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const settings = getRestaurantSettings();
    const hours = getOperatingHours();

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        available_locales: JSON.parse(settings.available_locales || '["fr","ar","en"]'),
      },
      hours,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}, { requiredModule: "settings" });

export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { settings, hours } = body;

    if (settings) {
      if (Array.isArray(settings.available_locales)) {
        settings.available_locales = JSON.stringify(settings.available_locales);
      }
      updateRestaurantSettings(settings);
    }

    if (Array.isArray(hours)) {
      updateOperatingHours(hours);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}, { requiredModule: "settings" });

