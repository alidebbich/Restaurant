import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getRestaurantSettings } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  try {
    const settings = getRestaurantSettings();
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const defaultLocale = settings?.default_locale || "fr";

    // Stable public menu URL
    const menuUrl = `${proto}://${host}/${defaultLocale}/menu`;

    const format = url.searchParams.get("format") || "json";

    if (format === "png") {
      const buffer = await QRCode.toBuffer(menuUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: "#0a231c",
          light: "#ffffff",
        },
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="restaurant-qr-menu.png"',
          "Cache-Control": "no-store",
        },
      });
    }

    // Default JSON with data URL
    const dataUrl = await QRCode.toDataURL(menuUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#0a231c",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      success: true,
      menuUrl,
      qrDataUrl: dataUrl,
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
