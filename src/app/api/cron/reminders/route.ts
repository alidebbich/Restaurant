import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getVenueLocalNow, minutesToTimeString } from "@/lib/reservations/time";
import { dispatchNotification } from "@/lib/reservations/notifications";
import type { Reservation } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    // 1. Authorization Check (Bearer CRON_SECRET)
    const authHeader = req.headers.get("authorization") || "";
    const expectedSecret = process.env.CRON_SECRET;
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Service indisponible: CRON_SECRET non configuré sur le serveur.", code: "CONFIG_ERROR" },
        { status: 503 }
      );
    }

    const isAuthorized =
      bearerToken.length > 0 &&
      bearerToken.length === expectedSecret.length &&
      crypto.timingSafeEqual(Buffer.from(bearerToken), Buffer.from(expectedSecret));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Non autorisé: Jeton cron secret invalide.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const db = getDb();
    const venueNow = getVenueLocalNow("Africa/Tunis");
    const today = venueNow.date;
    const currentMinute = venueNow.minute;

    // Window: between 90 and 150 minutes ahead (ideal 2h reminder window)
    const minTargetMinute = currentMinute + 90;
    const maxTargetMinute = currentMinute + 150;

    // Query confirmed reservations today within this reminder window
    const candidates = db.prepare(`
      SELECT * FROM reservations
      WHERE service_date = ?
        AND status = 'confirmed'
        AND start_minute >= ?
        AND start_minute <= ?
    `).all(today, minTargetMinute, maxTargetMinute) as Reservation[];

    let sentCount = 0;
    let skippedCount = 0;

    for (const res of candidates) {
      // Check if reminder was already sent for this reservation in notification_log
      const alreadySent = db.prepare(`
        SELECT COUNT(*) as count FROM notification_log
        WHERE reservation_id = ? AND template = 'reminder_2h' AND status = 'sent'
      `).get(res.id) as { count: number };

      if (alreadySent && alreadySent.count > 0) {
        skippedCount++;
        continue;
      }

      // Dispatch notification
      const manageUrl = res.manage_token_hash
        ? `https://darzitoun.tn/${res.locale || "fr"}/reserve/manage?ref=${res.reference}`
        : undefined;

      await dispatchNotification("reminder_2h", res, { manageUrl, db });
      sentCount++;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      venueTime: `${today} ${minutesToTimeString(venueNow.minute)}`,
      processed: candidates.length,
      sent: sentCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("[Cron Reminders Error]:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement des rappels automatiques.", code: "CRON_ERROR" },
      { status: 500 }
    );
  }
}
