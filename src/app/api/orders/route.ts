import { NextRequest, NextResponse } from "next/server";
import { getOrders, createOrder, getMenuItemById } from "@/lib/db/queries";
import { withAdminAuth } from "@/lib/auth-middleware";
import { orderRateLimiter } from "@/lib/rate-limit";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const orders = getOrders({ status, search });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}, { requiredModule: "orders" });

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
    const limiter = orderRateLimiter();
    const rlResult = await limiter.limit(ip);
    if (!rlResult.allowed) {
      return NextResponse.json(
        { error: "Trop de commandes envoyées depuis cette adresse. Veuillez réessayer plus tard." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rlResult.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": rlResult.limit.toString(),
            "X-RateLimit-Remaining": rlResult.remaining.toString(),
          },
        }
      );
    }

    const body = await req.json();
    const { customer_name, customer_phone, order_type, table_or_time, delivery_address, notes, items } = body;

    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
      return NextResponse.json({ error: "Nom du client invalide" }, { status: 400 });
    }

    if (!customer_phone || typeof customer_phone !== "string" || customer_phone.trim().length < 6) {
      return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json(
        { error: "La commande doit contenir au moins un article valide (maximum 50 articles)." },
        { status: 400 }
      );
    }

    // Verify and calculate real server-side prices strictly from DB
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      if (!item || typeof item !== "object" || !item.dish_id || typeof item.dish_id !== "string") {
        return NextResponse.json(
          { error: "Identifiant de plat manquant ou invalide dans la commande." },
          { status: 400 }
        );
      }

      const dbItem = getMenuItemById(item.dish_id);
      if (!dbItem || dbItem.deleted_at || dbItem.is_available === 0) {
        return NextResponse.json(
          { error: `Le plat sélectionné (${item.dish_id}) n'est plus disponible.` },
          { status: 400 }
        );
      }

      const rawQuantity = Number(item.quantity);
      if (!Number.isInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > 50) {
        return NextResponse.json(
          { error: `Quantité invalide pour le plat "${dbItem.name_fr}".` },
          { status: 400 }
        );
      }

      const unitPrice = Number(dbItem.promo_price ?? dbItem.price);
      if (isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: "Prix d'article corrompu ou invalide." }, { status: 500 });
      }

      const itemTotal = unitPrice * rawQuantity;
      subtotal += itemTotal;

      verifiedItems.push({
        menu_item_id: dbItem.id,
        item_name: dbItem.name_fr || item.name || "Plat",
        unit_price: unitPrice,
        quantity: rawQuantity,
        total_price: itemTotal,
        selected_options_json: JSON.stringify(item.selected_options || []),
      });
    }

    const total = subtotal; // delivery fees can be added here if configured
    const orderNumber = `CMD-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = "ord_" + Date.now();

    const created = createOrder(
      {
        id: orderId,
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        order_type: order_type || "dine_in",
        table_or_time: table_or_time?.trim() || null,
        delivery_address: delivery_address?.trim() || null,
        notes: notes?.trim() || null,
        subtotal,
        total,
        status: "new",
        payment_method: "cod",
        is_paid: 0,
        internal_notes: null,
      },
      verifiedItems
    );

    return NextResponse.json({
      success: true,
      order: created,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}

