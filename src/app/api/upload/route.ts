import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { uploadRateLimiter } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function detectImageFormat(buf: Buffer): "jpeg" | "png" | "webp" | "avif" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";
  // AVIF: ....ftypavif
  if (buf.length >= 16) {
    const ftyp = buf.toString("ascii", 4, 8);
    const brand = buf.toString("ascii", 8, 12);
    if (ftyp === "ftyp" && (brand === "avif" || brand === "avis")) return "avif";
  }
  return null;
}

function stripJpegExif(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const chunks: Buffer[] = [buf.subarray(0, 2)]; // SOI marker (FF D8)
  let offset = 2;
  while (offset < buf.length - 4) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    // SOS (Start of Scan) or EOI (End of Image) -> copy rest and finish
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buf.subarray(offset));
      break;
    }
    const len = buf.readUInt16BE(offset + 2);
    if (offset + 2 + len > buf.length) break;
    // Skip APP1 marker (0xFF, 0xE1) which carries EXIF metadata
    if (marker !== 0xe1) {
      chunks.push(buf.subarray(offset, offset + 2 + len));
    }
    offset += 2 + len;
  }
  return Buffer.concat(chunks);
}

/**
 * Get client identifier for rate limiting
 * Uses IP + user ID if authenticated
 */
function getClientId(req: NextRequest, user: Awaited<ReturnType<typeof getCurrentUser>> | null): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return user ? `${user.id}:${ip}` : `ip:${ip}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Rate limiting: 10 uploads per minute per user
    const limiter = uploadRateLimiter();
    const clientId = getClientId(req, user);
    const rateLimitResult = await limiter.limit(clientId);

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de téléversements. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Validate filename to prevent path traversal
    const originalName = file.name;
    if (originalName.includes("..") || originalName.includes("/") || originalName.includes("\\")) {
      return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse la limite de 5 Mo" },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const detectedFormat = detectImageFormat(rawBuffer);

    if (!detectedFormat) {
      return NextResponse.json(
        { error: "Type de fichier invalide. Signature magique non reconnue (seuls JPEG, PNG, WEBP, AVIF sont acceptés)." },
        { status: 400 }
      );
    }

    // Sanitize buffer / strip EXIF for JPEG
    const finalBuffer = detectedFormat === "jpeg" ? stripJpegExif(rawBuffer) : rawBuffer;
    const ext = detectedFormat === "jpeg" ? ".jpg" : `.${detectedFormat}`;
    const filename = `img_${crypto.randomUUID()}${ext}`;

    // Store in data/uploads (outside public directory) for security
    const uploadsDir = path.join(process.cwd(), "data", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, finalBuffer);

    // Return URL that will be served by the secure uploads route
    return NextResponse.json({
      success: true,
      url: `/api/uploads/${filename}`,
      filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Échec du téléversement" }, { status: 500 });
  }
}

