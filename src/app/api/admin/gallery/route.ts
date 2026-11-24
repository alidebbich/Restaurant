import { NextRequest, NextResponse } from "next/server";
import { getGalleryImages, addGalleryImage, deleteGalleryImage } from "@/lib/db/queries";
import { withAdminAuth, adminAuth } from "@/lib/auth-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const images = getGalleryImages();
    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error("Get gallery error:", error);
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}, { requiredModule: "content" });

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { image_url, caption_fr, caption_ar, caption_en, display_order, is_featured } = body;

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const id = "gal_" + Date.now();
    addGalleryImage({
      id,
      image_url,
      caption_fr: caption_fr || null,
      caption_ar: caption_ar || null,
      caption_en: caption_en || null,
      display_order: Number(display_order) || 0,
      is_featured: is_featured ? 1 : 0,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Add gallery image error:", error);
    return NextResponse.json({ error: "Failed to add image" }, { status: 500 });
  }
}, { requiredModule: "content" });

export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    deleteGalleryImage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete gallery image error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}, { requiredModule: "content" });

