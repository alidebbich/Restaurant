/**
 * Secure file serving endpoint for uploaded images
 *
 * Serves files from data/uploads directory (outside public folder)
 * with proper security headers and access control.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

// Allowed image MIME types
const ALLOWED_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename to prevent path traversal
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    if (!Object.keys(ALLOWED_MIME_TYPES).includes(ext)) {
      return new NextResponse("Invalid file type", { status: 400 });
    }

    // Construct safe file path
    const filePath = path.join(UPLOADS_DIR, filename);

    // Verify file is within uploads directory (prevent path traversal)
    const resolvedFilePath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(UPLOADS_DIR);
    if (!resolvedFilePath.startsWith(resolvedUploadsDir)) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return new NextResponse("File not found", { status: 404 });
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const mimeType = ALLOWED_MIME_TYPES[ext];

    // Return file with security headers
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable", // 1 year cache for immutable uploads
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });

    return response;
  } catch (error) {
    console.error("File serving error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}