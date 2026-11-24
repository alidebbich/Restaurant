import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { anonymizeOldReservations, logActivity } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleAnonymize(req);
}

export async function POST(req: NextRequest) {
  return handleAnonymize(req);
}

async function handleAnonymize(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "730", 10);

    const result = anonymizeOldReservations(days);

    logActivity({
      action: "data_retention_anonymize",
      entityType: "privacy",
      details: `Traitement de rétention PII: ${result.anonymized} réservations de plus de ${days} jours anonymisées.`,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      retentionDays: days,
      processed: result.processed,
      anonymized: result.anonymized,
    });
  } catch (error) {
    console.error("[Cron Anonymize Error]:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement d'anonymisation.", code: "ANONYMIZE_ERROR" },
      { status: 500 }
    );
  }
}

