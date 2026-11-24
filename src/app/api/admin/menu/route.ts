import { NextRequest, NextResponse } from "next/server";
import { getMenuItems, createMenuItem, saveMenuItemOptions } from "@/lib/db/queries";
import { withAdminAuth, adminAuth } from "@/lib/auth-middleware";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const isAvailableParam = searchParams.get("isAvailable");
    const isAvailable = isAvailableParam !== null ? isAvailableParam === "true" : undefined;
    const isFeaturedParam = searchParams.get("isFeatured");
    const isFeatured = isFeaturedParam !== null ? isFeaturedParam === "true" : undefined;
    const search = searchParams.get("search") || undefined;

    const items = getMenuItems({
      categoryId,
      isAvailable,
      isFeatured,
      search,
    });

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Get menu items error:", error);
    return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 });
  }
}, { requiredModule: "menu" });

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const {
      name_fr,
      name_ar,
      name_en,
      category_id,
      description_fr,
      description_ar,
      description_en,
      price,
      promo_price,
      image,
      additional_images,
      is_available,
      is_featured,
      is_published,
      display_order,
      ingredients_fr,
      ingredients_ar,
      ingredients_en,
      allergens,
      dietary_tags,
      options,
    } = body;

    const effectivePriceMillimes = body.price_millimes !== undefined && body.price_millimes !== null
      ? Number(body.price_millimes)
      : (price !== undefined && price !== null ? Math.round(Number(price) * 1000) : null);

    if (!name_fr || !category_id || effectivePriceMillimes === null || isNaN(effectivePriceMillimes)) {
      return NextResponse.json(
        { error: "Name, category, and price (or price_millimes) are required" },
        { status: 400 }
      );
    }

    const effectivePrice = effectivePriceMillimes / 1000;
    const effectivePromoPriceMillimes = body.promo_price_millimes !== undefined && body.promo_price_millimes !== null
      ? Number(body.promo_price_millimes)
      : (promo_price !== undefined && promo_price !== null ? Math.round(Number(promo_price) * 1000) : null);
    const effectivePromoPrice = effectivePromoPriceMillimes !== null ? effectivePromoPriceMillimes / 1000 : null;

    const id = body.id || "dish_" + Date.now();
    const slug = body.slug || name_fr.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    createMenuItem({
      id,
      category_id,
      slug,
      name_fr: name_fr.trim(),
      name_ar: (name_ar || name_fr).trim(),
      name_en: (name_en || name_fr).trim(),
      description_fr: description_fr?.trim() || null,
      description_ar: description_ar?.trim() || null,
      description_en: description_en?.trim() || null,
      price: effectivePrice,
      promo_price: effectivePromoPrice,
      price_millimes: effectivePriceMillimes,
      promo_price_millimes: effectivePromoPriceMillimes,
      image: image || "/images/menu/dish-couscous.jpg",
      additional_images: Array.isArray(additional_images) ? JSON.stringify(additional_images) : (additional_images || "[]"),
      is_available: is_available !== undefined ? Number(is_available) : 1,
      is_featured: is_featured !== undefined ? Number(is_featured) : 0,
      is_published: is_published !== undefined ? Number(is_published) : 1,
      display_order: Number(display_order) || 0,
      ingredients_fr: ingredients_fr || null,
      ingredients_ar: ingredients_ar || null,
      ingredients_en: ingredients_en || null,
      allergens: Array.isArray(allergens) ? JSON.stringify(allergens) : (allergens || "[]"),
      dietary_tags: Array.isArray(dietary_tags) ? JSON.stringify(dietary_tags) : (dietary_tags || "[]"),
    });

    if (Array.isArray(options) && options.length > 0) {
      saveMenuItemOptions(id, options);
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Create menu item error:", error);
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}, { requiredModule: "menu" });

