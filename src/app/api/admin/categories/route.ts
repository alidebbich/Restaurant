import { NextRequest, NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/db/queries";
import { withAdminAuth, adminAuth } from "@/lib/auth-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const categories = getCategories(true); // include inactive for admin
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}, { requiredModule: "menu" });

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { name_fr, name_ar, name_en, description_fr, description_ar, description_en, image, display_order, is_active } = body;

    if (!name_fr) {
      return NextResponse.json({ error: "French category name is required" }, { status: 400 });
    }

    const id = body.id || "cat_" + Date.now();
    const slug = body.slug || name_fr.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    createCategory({
      id,
      slug,
      name_fr: name_fr.trim(),
      name_ar: (name_ar || name_fr).trim(),
      name_en: (name_en || name_fr).trim(),
      description_fr: description_fr?.trim() || null,
      description_ar: description_ar?.trim() || null,
      description_en: description_en?.trim() || null,
      image: image || null,
      display_order: Number(display_order) || 0,
      is_active: is_active !== undefined ? Number(is_active) : 1,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}, { requiredModule: "menu" });

