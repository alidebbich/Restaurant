import { getDb } from "./index.ts";
import crypto from "node:crypto";
import type { ReservationRules } from "../reservations/rules.ts";
import { DEFAULT_RESERVATION_RULES, getDurationForPartySize } from "../reservations/rules.ts";
import {
  timeStringToMinutes,
  minutesToTimeString,
  hashManageToken,
  generateReferenceCode,
  generateManageToken,
  normalizePhoneNumber,
} from "../reservations/time.ts";
import {
  canBookSlot,
  resolveDayHours,
  type OperatingDay,
  type OperatingException,
  type ReservationItem,
} from "../reservations/availability.ts";

export type RestaurantSettings = {
  id: number;
  name_fr: string;
  name_ar: string;
  name_en: string;
  tagline_fr: string;
  tagline_ar: string;
  tagline_en: string;
  description_fr: string;
  description_ar: string;
  description_en: string;
  logo: string | null;
  cover_image: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  address_street: string;
  address_city: string;
  maps_url: string;
  currency: string;
  default_locale: string;
  available_locales: string; // JSON string
  is_ordering_enabled: number;
  is_reservations_enabled: number;
  is_gallery_enabled: number;
  maintenance_mode: number;
  updated_at: string;
};

export type OperatingHour = {
  id: number;
  day_of_week: number;
  day_name_fr: string;
  day_name_ar: string;
  day_name_en: string;
  open_time: string;
  close_time: string;
  is_closed: number;
};

export type HomepageContent = {
  id: number;
  hero_title_fr: string | null;
  hero_title_ar: string | null;
  hero_title_en: string | null;
  hero_description_fr: string | null;
  hero_description_ar: string | null;
  hero_description_en: string | null;
  hero_image: string | null;
  story_heading_fr: string | null;
  story_heading_ar: string | null;
  story_heading_en: string | null;
  story_body_fr: string | null;
  story_body_ar: string | null;
  story_body_en: string | null;
  story_image: string | null;
  story_secondary_image: string | null;
  updated_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  description_fr: string | null;
  description_ar: string | null;
  description_en: string | null;
  image: string | null;
  display_order: number;
  is_active: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
};

export type MenuItem = {
  id: string;
  category_id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  description_fr: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  promo_price: number | null;
  price_millimes?: number | null;
  promo_price_millimes?: number | null;
  image: string | null;
  additional_images: string; // JSON array
  is_available: number;
  is_featured: number;
  is_published: number;
  display_order: number;
  ingredients_fr: string | null;
  ingredients_ar: string | null;
  ingredients_en: string | null;
  allergens: string; // JSON array
  dietary_tags: string; // JSON array
  deleted_at?: string | null;
  category_name_fr?: string;
  category_name_ar?: string;
  category_name_en?: string;
  created_at: string;
  updated_at: string;
};

export type MenuItemOption = {
  id: string;
  menu_item_id: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  option_type: "single" | "multiple";
  is_required: number;
  display_order: number;
  values?: MenuItemOptionValue[];
};

export type MenuItemOptionValue = {
  id: string;
  option_id: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  price_modifier: number;
  is_default: number;
  display_order: number;
};

export type GalleryImage = {
  id: string;
  image_url: string;
  caption_fr: string | null;
  caption_ar: string | null;
  caption_en: string | null;
  display_order: number;
  is_featured: number;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: "dine_in" | "takeaway" | "delivery";
  table_or_time: string | null;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  status: "new" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
  payment_method: string;
  is_paid: number;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  selected_options_json: string;
};

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "declined"
  | "no_show"
  | "expired";

export type Reservation = {
  id: string;
  reference: string;
  service_date: string;
  start_minute: number;
  duration_minutes: number;
  party_size: number;
  status: ReservationStatus;
  source: "web" | "phone" | "walk_in" | "admin" | "whatsapp";
  guest_id?: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email?: string | null;
  guest_notes?: string | null;
  occasion?: string | null;
  seating_preference?: string | null;
  internal_notes?: string | null;
  idempotency_key?: string | null;
  manage_token_hash?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  seated_at?: string | null;
  completed_at?: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
  // Legacy compatibility fields
  customer_name?: string;
  customer_phone?: string;
  reservation_date?: string;
  reservation_time?: string;
  notes?: string | null;
};

export type ReservationStatusHistory = {
  id: number;
  reservation_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  reason: string | null;
  created_at: string;
};

export type Guest = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  total_visits: number;
  no_show_count: number;
  cancellation_count: number;
  notes: string | null;
  tags: string; // JSON array
  marketing_consent: number;
  created_at: string;
  updated_at: string;
};

export type WaitlistEntry = {
  id: string;
  service_date: string;
  start_minute: number;
  party_size: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  status: "waiting" | "notified" | "seated" | "cancelled" | "expired";
  notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: "super_admin" | "restaurant_owner" | "manager" | "menu_manager" | "order_manager";
  is_active: number;
  created_at: string;
};

export type HoursException = {
  id: string;
  label_fr: string | null;
  label_ar: string | null;
  label_en: string | null;
  start_date: string;
  end_date: string;
  is_closed: number;
  open_time: string | null;
  close_time: string | null;
  created_at: string;
};

/* ── AUDIT LOG HELPER ─────────────────────────────────────────────────────── */

export function logActivity(params: {
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      params.userId ?? null,
      params.userName ?? null,
      params.action,
      params.entityType,
      params.entityId ?? null,
      params.details ?? null
    );
  } catch {
    // Audit logging must never crash the main request
    console.warn("[audit] Failed to write activity log");
  }
}

/* ── SETTINGS & CONTENT ── */

const ALLOWED_SETTINGS_COLUMNS = new Set([
  "name",
  "tagline_fr",
  "tagline_ar",
  "tagline_en",
  "description_fr",
  "description_ar",
  "description_en",
  "logo",
  "cover_image",
  "phone",
  "whatsapp",
  "email",
  "address_street",
  "address_city",
  "maps_url",
  "currency",
  "default_locale",
  "available_locales",
  "is_ordering_enabled",
  "is_reservations_enabled",
  "is_gallery_enabled",
  "maintenance_mode",
]);

const ALLOWED_CONTENT_COLUMNS = new Set([
  "hero_title_fr",
  "hero_title_ar",
  "hero_title_en",
  "hero_description_fr",
  "hero_description_ar",
  "hero_description_en",
  "hero_image",
  "story_heading_fr",
  "story_heading_ar",
  "story_heading_en",
  "story_body_fr",
  "story_body_ar",
  "story_body_en",
  "story_image",
  "story_secondary_image",
]);

const ALLOWED_CATEGORY_COLUMNS = new Set([
  "slug",
  "name_fr",
  "name_ar",
  "name_en",
  "description_fr",
  "description_ar",
  "description_en",
  "image",
  "display_order",
  "is_active",
  "deleted_at",
]);

const ALLOWED_MENU_ITEM_COLUMNS = new Set([
  "category_id",
  "slug",
  "name_fr",
  "name_ar",
  "name_en",
  "description_fr",
  "description_ar",
  "description_en",
  "price",
  "promo_price",
  "price_millimes",
  "promo_price_millimes",
  "image",
  "additional_images",
  "is_available",
  "is_featured",
  "is_published",
  "display_order",
  "ingredients_fr",
  "ingredients_ar",
  "ingredients_en",
  "allergens",
  "dietary_tags",
  "deleted_at",
]);

export function getRestaurantSettings(): RestaurantSettings {
  const db = getDb();
  return db.prepare("SELECT * FROM restaurant_settings WHERE id = 1").get() as RestaurantSettings;
}

export function updateRestaurantSettings(data: Partial<RestaurantSettings>) {
  const db = getDb();
  const fields = Object.keys(data).filter(
    (k) => ALLOWED_SETTINGS_COLUMNS.has(k) && /^[a-zA-Z0-9_]+$/.test(k)
  );
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(", ") + ", updated_at = datetime('now')";
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);

  db.prepare(`UPDATE restaurant_settings SET ${setClause} WHERE id = 1`).run(...values);
}

export function getOperatingHours(): OperatingHour[] {
  const db = getDb();
  return db.prepare("SELECT * FROM operating_hours ORDER BY day_of_week ASC").all() as OperatingHour[];
}

export function updateOperatingHours(hours: OperatingHour[]) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE operating_hours
    SET open_time = ?, close_time = ?, is_closed = ?
    WHERE day_of_week = ?
  `);
  for (const h of hours) {
    stmt.run(h.open_time, h.close_time, h.is_closed, h.day_of_week);
  }
}

export function getHomepageContent(): HomepageContent {
  const db = getDb();
  return db.prepare("SELECT * FROM homepage_content WHERE id = 1").get() as HomepageContent;
}

export function updateHomepageContent(data: Partial<HomepageContent>) {
  const db = getDb();
  const fields = Object.keys(data).filter(
    (k) => ALLOWED_CONTENT_COLUMNS.has(k) && /^[a-zA-Z0-9_]+$/.test(k)
  );
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(", ") + ", updated_at = datetime('now')";
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);

  db.prepare(`UPDATE homepage_content SET ${setClause} WHERE id = 1`).run(...values);
}

/* ── CATEGORIES ── */

export function getCategories(includeInactive = false): Category[] {
  const db = getDb();
  const conditions: string[] = ["c.deleted_at IS NULL"];
  if (!includeInactive) conditions.push("c.is_active = 1");

  const sql = `
    SELECT c.*, COUNT(m.id) as items_count
    FROM categories c
    LEFT JOIN menu_items m ON m.category_id = c.id AND m.deleted_at IS NULL
    WHERE ${conditions.join(" AND ")}
    GROUP BY c.id
    ORDER BY c.display_order ASC, c.name_fr ASC
  `;
  return db.prepare(sql).all() as Category[];
}

export function getCategoryById(id: string): Category | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category | undefined;
}

export function createCategory(data: Omit<Category, "created_at" | "updated_at" | "items_count">) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO categories (id, slug, name_fr, name_ar, name_en, description_fr, description_ar, description_en, image, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.slug,
    data.name_fr,
    data.name_ar,
    data.name_en,
    data.description_fr || null,
    data.description_ar || null,
    data.description_en || null,
    data.image || null,
    data.display_order ?? 0,
    data.is_active ?? 1
  );
}

export function updateCategory(id: string, data: Partial<Category>) {
  const db = getDb();
  const fields = Object.keys(data).filter(
    (k) => ALLOWED_CATEGORY_COLUMNS.has(k) && /^[a-zA-Z0-9_]+$/.test(k)
  );
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(", ") + ", updated_at = datetime('now')";
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  values.push(id);

  db.prepare(`UPDATE categories SET ${setClause} WHERE id = ?`).run(...values);
}

export function deleteCategory(id: string): { success: boolean; error?: string } {
  const db = getDb();
  // Check if non-deleted dishes belong to this category
  const countObj = db.prepare("SELECT COUNT(*) as count FROM menu_items WHERE category_id = ? AND deleted_at IS NULL").get(id) as { count: number };
  if (countObj.count > 0) {
    return { success: false, error: "Cannot delete category containing dishes. Reassign or delete dishes first." };
  }
  // Soft delete
  db.prepare("UPDATE categories SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
  return { success: true };
}

export function restoreCategory(id: string) {
  const db = getDb();
  db.prepare("UPDATE categories SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id);
}

export function hardDeleteCategory(id: string): { success: boolean; error?: string } {
  const db = getDb();
  const countObj = db.prepare("SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?").get(id) as { count: number };
  if (countObj.count > 0) {
    return { success: false, error: "Category still has dishes. Delete dishes first." };
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return { success: true };
}

export function getDeletedCategories(): Category[] {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, COUNT(m.id) as items_count
    FROM categories c
    LEFT JOIN menu_items m ON m.category_id = c.id
    WHERE c.deleted_at IS NOT NULL
    GROUP BY c.id
    ORDER BY c.deleted_at DESC
  `).all() as Category[];
}

export function reorderMenuItems(orderedIds: string[]) {
  const db = getDb();
  const stmt = db.prepare("UPDATE menu_items SET display_order = ?, updated_at = datetime('now') WHERE id = ?");
  orderedIds.forEach((id, index) => stmt.run(index, id));
}

export function reorderCategories(orderedIds: string[]) {
  const db = getDb();
  const stmt = db.prepare("UPDATE categories SET display_order = ?, updated_at = datetime('now') WHERE id = ?");
  orderedIds.forEach((id, index) => stmt.run(index, id));
}


/* ── MENU ITEMS ── */

export function getMenuItems(filters?: {
  categoryId?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  isPublishedOnly?: boolean;
  search?: string;
  includeDeleted?: boolean;
}): MenuItem[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Always exclude soft-deleted unless explicitly asked
  if (!filters?.includeDeleted) {
    conditions.push("m.deleted_at IS NULL");
  }
  if (filters?.isPublishedOnly) {
    conditions.push("m.is_published = 1");
  }
  if (filters?.categoryId && filters.categoryId !== "all") {
    conditions.push("m.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters?.isAvailable !== undefined) {
    conditions.push("m.is_available = ?");
    params.push(filters.isAvailable ? 1 : 0);
  }
  if (filters?.isFeatured !== undefined) {
    conditions.push("m.is_featured = ?");
    params.push(filters.isFeatured ? 1 : 0);
  }
  if (filters?.search) {
    conditions.push("(m.name_fr LIKE ? OR m.name_ar LIKE ? OR m.name_en LIKE ? OR m.description_fr LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT m.*, c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.name_en as category_name_en
    FROM menu_items m
    JOIN categories c ON c.id = m.category_id
    ${where}
    ORDER BY m.display_order ASC, m.name_fr ASC
  `;

  const items = db.prepare(sql).all(...params) as MenuItem[];
  return items.map((item) => ({
    ...item,
    price: (item.price_millimes ?? Math.round((item.price || 0) * 1000)) / 1000,
    promo_price: item.promo_price_millimes ? item.promo_price_millimes / 1000 : null,
  }));
}

export function getMenuItemById(id: string): MenuItem | undefined {
  const db = getDb();
  const item = db.prepare(`
    SELECT m.*, c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.name_en as category_name_en
    FROM menu_items m
    JOIN categories c ON c.id = m.category_id
    WHERE m.id = ?
  `).get(id) as MenuItem | undefined;

  if (!item) return undefined;
  return {
    ...item,
    price: (item.price_millimes ?? Math.round((item.price || 0) * 1000)) / 1000,
    promo_price: item.promo_price_millimes ? item.promo_price_millimes / 1000 : null,
  };
}

export function createMenuItem(data: Omit<MenuItem, "created_at" | "updated_at" | "category_name_fr" | "category_name_ar" | "category_name_en">) {
  const db = getDb();
  const priceMillimes = data.price_millimes ?? Math.round(data.price * 1000);
  const promoPriceMillimes = data.promo_price_millimes ?? (data.promo_price ? Math.round(data.promo_price * 1000) : null);

  return db.prepare(`
    INSERT INTO menu_items (
      id, category_id, slug, name_fr, name_ar, name_en,
      description_fr, description_ar, description_en,
      price, promo_price, price_millimes, promo_price_millimes,
      image, additional_images,
      is_available, is_featured, is_published, display_order,
      ingredients_fr, ingredients_ar, ingredients_en,
      allergens, dietary_tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.category_id,
    data.slug,
    data.name_fr,
    data.name_ar,
    data.name_en,
    data.description_fr || null,
    data.description_ar || null,
    data.description_en || null,
    data.price,
    data.promo_price || null,
    priceMillimes,
    promoPriceMillimes,
    data.image || null,
    data.additional_images || "[]",
    data.is_available ?? 1,
    data.is_featured ?? 0,
    data.is_published ?? 1,
    data.display_order ?? 0,
    data.ingredients_fr || null,
    data.ingredients_ar || null,
    data.ingredients_en || null,
    data.allergens || "[]",
    data.dietary_tags || "[]"
  );
}

export function updateMenuItem(id: string, data: Partial<MenuItem>) {
  const db = getDb();
  const enriched: Record<string, unknown> = { ...data };

  // Keep millimes and float prices synchronized
  if (data.price !== undefined && data.price_millimes === undefined) {
    enriched.price_millimes = Math.round(data.price * 1000);
  } else if (data.price_millimes !== undefined && data.price === undefined) {
    enriched.price = data.price_millimes ? data.price_millimes / 1000 : 0;
  }

  if (data.promo_price !== undefined && data.promo_price_millimes === undefined) {
    enriched.promo_price_millimes = data.promo_price ? Math.round(data.promo_price * 1000) : null;
  } else if (data.promo_price_millimes !== undefined && data.promo_price === undefined) {
    enriched.promo_price = data.promo_price_millimes ? data.promo_price_millimes / 1000 : null;
  }

  const fields = Object.keys(enriched).filter(
    (k) => ALLOWED_MENU_ITEM_COLUMNS.has(k) && /^[a-zA-Z0-9_]+$/.test(k)
  );
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(", ") + ", updated_at = datetime('now')";
  const values = fields.map((f) => enriched[f]);
  values.push(id);

  db.prepare(`UPDATE menu_items SET ${setClause} WHERE id = ?`).run(...values);
}

export function toggleMenuItemAvailability(id: string, isAvailable: boolean) {
  const db = getDb();
  db.prepare("UPDATE menu_items SET is_available = ?, updated_at = datetime('now') WHERE id = ?").run(
    isAvailable ? 1 : 0,
    id
  );
}

export function deleteMenuItem(id: string) {
  const db = getDb();
  // Soft delete — restoreable from Trash. Hard delete only via hardDeleteMenuItem (OWNER only).
  db.prepare("UPDATE menu_items SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
}

export function restoreMenuItem(id: string) {
  const db = getDb();
  db.prepare("UPDATE menu_items SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id);
}

export function hardDeleteMenuItem(id: string) {
  const db = getDb();
  // Safe: order_items.menu_item_id is SET NULL on delete
  db.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
}

export function getDeletedMenuItems(): MenuItem[] {
  const db = getDb();
  return db.prepare(`
    SELECT m.*, c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.name_en as category_name_en
    FROM menu_items m
    JOIN categories c ON c.id = m.category_id
    WHERE m.deleted_at IS NOT NULL
    ORDER BY m.deleted_at DESC
  `).all() as MenuItem[];
}

/* ── MENU ITEM OPTIONS ── */

export function getMenuItemOptions(menuItemId: string): MenuItemOption[] {
  const db = getDb();
  const options = db.prepare(`
    SELECT * FROM menu_item_options
    WHERE menu_item_id = ?
    ORDER BY display_order ASC
  `).all(menuItemId) as MenuItemOption[];

  const valStmt = db.prepare(`
    SELECT * FROM menu_item_option_values
    WHERE option_id = ?
    ORDER BY display_order ASC
  `);

  return options.map((opt) => ({
    ...opt,
    values: valStmt.all(opt.id) as MenuItemOptionValue[],
  }));
}

export function saveMenuItemOptions(menuItemId: string, options: MenuItemOption[]) {
  const db = getDb();
  // Remove existing options and cascade values
  db.prepare("DELETE FROM menu_item_options WHERE menu_item_id = ?").run(menuItemId);

  const optStmt = db.prepare(`
    INSERT INTO menu_item_options (id, menu_item_id, name_fr, name_ar, name_en, option_type, is_required, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const valStmt = db.prepare(`
    INSERT INTO menu_item_option_values (id, option_id, name_fr, name_ar, name_en, price_modifier, is_default, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  options.forEach((opt, oi) => {
    const optId = opt.id || "opt_" + crypto.randomUUID().slice(0, 8);
    const nameFr = opt.name_fr || "Option";
    const nameAr = opt.name_ar || nameFr;
    const nameEn = opt.name_en || nameFr;
    const optType = opt.option_type || "single";
    const isReq = opt.is_required ? 1 : 0;

    optStmt.run(optId, menuItemId, nameFr, nameAr, nameEn, optType, isReq, oi);
    if (Array.isArray(opt.values)) {
      opt.values.forEach((v, vi) => {
        const valId = v.id || "val_" + crypto.randomUUID().slice(0, 8);
        const vNameFr = v.name_fr || "Choix";
        const vNameAr = v.name_ar || vNameFr;
        const vNameEn = v.name_en || vNameFr;
        const priceMod = Number(v.price_modifier) || 0;
        const isDef = v.is_default ? 1 : 0;
        valStmt.run(valId, optId, vNameFr, vNameAr, vNameEn, priceMod, isDef, vi);
      });
    }
  });
}

/* ── HOURS EXCEPTIONS ── */

export function getHoursExceptions(): HoursException[] {
  const db = getDb();
  return db.prepare("SELECT * FROM hours_exceptions ORDER BY start_date ASC").all() as HoursException[];
}

export function createHoursException(data: Omit<HoursException, "id" | "created_at">) {
  const db = getDb();
  const id = "hexc_" + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO hours_exceptions (id, label_fr, label_ar, label_en, start_date, end_date, is_closed, open_time, close_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.label_fr ?? null,
    data.label_ar ?? null,
    data.label_en ?? null,
    data.start_date,
    data.end_date,
    data.is_closed,
    data.open_time ?? null,
    data.close_time ?? null
  );
  return id;
}

export function deleteHoursException(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM hours_exceptions WHERE id = ?").run(id);
}

/* ── GALLERY ── */

export function getGalleryImages(): GalleryImage[] {
  const db = getDb();
  return db.prepare("SELECT * FROM gallery_images ORDER BY display_order ASC").all() as GalleryImage[];
}

export function addGalleryImage(data: Omit<GalleryImage, "created_at">) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO gallery_images (id, image_url, caption_fr, caption_ar, caption_en, display_order, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.image_url,
    data.caption_fr || null,
    data.caption_ar || null,
    data.caption_en || null,
    data.display_order ?? 0,
    data.is_featured ?? 0
  );
}

export function deleteGalleryImage(id: string) {
  const db = getDb();
  return db.prepare("DELETE FROM gallery_images WHERE id = ?").run(id);
}

/* ── ORDERS ── */

export function getOrders(filters?: { status?: string; search?: string; limit?: number }): Order[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.status && filters.status !== "all") {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.search) {
    conditions.push("(order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  let sql = `
    SELECT * FROM orders
    ${where}
    ORDER BY created_at DESC
  `;
  if (filters?.limit) {
    sql += " LIMIT ?";
    params.push(Number(filters.limit));
  }

  const orders = db.prepare(sql).all(...params) as Order[];

  const itemsStmt = db.prepare("SELECT * FROM order_items WHERE order_id = ?");
  return orders.map((o) => ({
    ...o,
    items: itemsStmt.all(o.id) as OrderItem[],
  }));
}

export function getOrderById(id: string): Order | undefined {
  const db = getDb();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Order | undefined;
  if (!order) return undefined;

  order.items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as OrderItem[];
  return order;
}

export function createOrder(
  order: Omit<Order, "created_at" | "updated_at">,
  items: Array<Omit<OrderItem, "id" | "order_id">>
) {
  const db = getDb();

  db.prepare(`
    INSERT INTO orders (
      id, order_number, customer_name, customer_phone,
      order_type, table_or_time, delivery_address, notes,
      subtotal, total, status, payment_method, is_paid, internal_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    order.order_number,
    order.customer_name,
    order.customer_phone,
    order.order_type,
    order.table_or_time || null,
    order.delivery_address || null,
    order.notes || null,
    order.subtotal,
    order.total,
    order.status || "new",
    order.payment_method || "cod",
    order.is_paid || 0,
    order.internal_notes || null
  );

  const itemStmt = db.prepare(`
    INSERT INTO order_items (
      id, order_id, menu_item_id, item_name, unit_price, quantity, total_price, selected_options_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  items.forEach((item, index) => {
    itemStmt.run(
      `${order.id}_item_${index}`,
      order.id,
      item.menu_item_id || null,
      item.item_name,
      item.unit_price,
      item.quantity,
      item.total_price,
      item.selected_options_json || "[]"
    );
  });

  // Log status history
  db.prepare(`
    INSERT INTO order_status_history (order_id, from_status, to_status, note, changed_by)
    VALUES (?, NULL, 'new', 'Order created', 'Customer')
  `).run(order.id);

  return order;
}

export function updateOrderStatus(orderId: string, toStatus: Order["status"], note?: string, changedBy?: string) {
  const db = getDb();
  const current = db.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: string } | undefined;
  if (!current) return;

  const isPaid = toStatus === "completed" ? 1 : 0;
  db.prepare("UPDATE orders SET status = ?, is_paid = CASE WHEN ? = 1 THEN 1 ELSE is_paid END, updated_at = datetime('now') WHERE id = ?").run(
    toStatus,
    isPaid,
    orderId
  );

  db.prepare(`
    INSERT INTO order_status_history (order_id, from_status, to_status, note, changed_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(orderId, current.status, toStatus, note || null, changedBy || "Admin");
}

/* ── RESERVATIONS UPGRADED OPERATIONS ── */

export function getReservationRules(): ReservationRules {
  const db = getDb();
  const row = db.prepare("SELECT rules_json FROM reservation_rules WHERE id = 1").get() as { rules_json: string } | undefined;
  if (!row) return DEFAULT_RESERVATION_RULES;
  try {
    return JSON.parse(row.rules_json) as ReservationRules;
  } catch {
    return DEFAULT_RESERVATION_RULES;
  }
}

export function updateReservationRules(rules: ReservationRules): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO reservation_rules (id, rules_json, updated_at)
    VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      rules_json = excluded.rules_json,
      updated_at = datetime('now')
  `).run(JSON.stringify(rules));
}

function mapReservationRow(row: Record<string, unknown>): Reservation {
  const r = { ...row } as unknown as Reservation;
  // Ensure backward compatibility fields are always populated
  r.customer_name = r.guest_name || (row.customer_name as string) || "";
  r.customer_phone = r.guest_phone || (row.customer_phone as string) || "";
  r.reservation_date = r.service_date || (row.reservation_date as string) || "";
  r.reservation_time = (row.reservation_time as string) || (r.start_minute !== undefined ? minutesToTimeString(r.start_minute) : "12:00");
  r.notes = r.guest_notes || (row.notes as string) || null;
  return r;
}

export function getReservations(filters?: { status?: string; date?: string; search?: string }): Reservation[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.status && filters.status !== "all") {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.date) {
    conditions.push("(service_date = ? OR reservation_date = ?)");
    params.push(filters.date, filters.date);
  }
  if (filters?.search) {
    const q = `%${filters.search.trim()}%`;
    conditions.push("(guest_name LIKE ? OR guest_phone LIKE ? OR reference LIKE ? OR customer_name LIKE ?)");
    params.push(q, q, q, q);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`
    SELECT * FROM reservations
    ${where}
    ORDER BY COALESCE(service_date, reservation_date) DESC, COALESCE(start_minute, 720) ASC, created_at DESC
  `).all(...params) as Record<string, unknown>[];

  return rows.map(mapReservationRow);
}

export function getReservationById(id: string): Reservation | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapReservationRow(row);
}

export function getReservationByReference(reference: string): Reservation | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM reservations WHERE UPPER(reference) = UPPER(?)").get(reference.trim()) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapReservationRow(row);
}

export function getReservationByManageToken(rawToken: string): Reservation | undefined {
  const db = getDb();
  const tokenHash = hashManageToken(rawToken.trim());
  const row = db.prepare("SELECT * FROM reservations WHERE manage_token_hash = ?").get(tokenHash) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapReservationRow(row);
}

export function getReservationByIdempotencyKey(key: string): Reservation | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM reservations WHERE idempotency_key = ?").get(key.trim()) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapReservationRow(row);
}

export function getReservationHistory(reservationId: string): ReservationStatusHistory[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM reservation_status_history
    WHERE reservation_id = ?
    ORDER BY created_at ASC
  `).all(reservationId) as ReservationStatusHistory[];
}

export function getGuestByPhone(phone: string): Guest | undefined {
  const db = getDb();
  const norm = normalizePhoneNumber(phone);
  const searchPhone = norm.valid ? norm.e164! : phone.trim();
  return db.prepare("SELECT * FROM guests WHERE phone = ?").get(searchPhone) as Guest | undefined;
}

export function upsertGuest(name: string, phone: string, email?: string | null): Guest {
  const db = getDb();
  const norm = normalizePhoneNumber(phone);
  const cleanPhone = norm.valid ? norm.e164! : phone.trim();
  const existing = db.prepare("SELECT * FROM guests WHERE phone = ?").get(cleanPhone) as Guest | undefined;

  if (existing) {
    if (email && !existing.email) {
      db.prepare("UPDATE guests SET email = ?, updated_at = datetime('now') WHERE id = ?").run(email, existing.id);
      existing.email = email;
    }
    return existing;
  }

  const id = "gst_" + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO guests (id, name, phone, email, total_visits, no_show_count, cancellation_count, notes, tags, marketing_consent)
    VALUES (?, ?, ?, ?, 0, 0, 0, NULL, '[]', 0)
  `).run(id, name.trim(), cleanPhone, email?.trim() || null);

  return db.prepare("SELECT * FROM guests WHERE id = ?").get(id) as Guest;
}

export function getGuests(search?: string): Guest[] {
  const db = getDb();
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    return db.prepare(`
      SELECT * FROM guests
      WHERE LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(COALESCE(email, '')) LIKE ?
      ORDER BY total_visits DESC, updated_at DESC
    `).all(q, q, q) as Guest[];
  }
  return db.prepare("SELECT * FROM guests ORDER BY total_visits DESC, updated_at DESC").all() as Guest[];
}

export function getGuestById(id: string): (Guest & { reservations?: Reservation[] }) | undefined {
  const db = getDb();
  const guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(id) as Guest | undefined;
  if (!guest) return undefined;

  const pastReservations = db.prepare(`
    SELECT * FROM reservations
    WHERE guest_id = ? OR guest_phone = ? OR customer_phone = ?
    ORDER BY service_date DESC, start_minute DESC
  `).all(guest.id, guest.phone, guest.phone) as Reservation[];

  return {
    ...guest,
    reservations: pastReservations,
  };
}

export function updateGuest(
  id: string,
  updates: { notes?: string | null; tags?: string[] }
): Guest | undefined {
  const db = getDb();
  const current = db.prepare("SELECT * FROM guests WHERE id = ?").get(id) as Guest | undefined;
  if (!current) return undefined;

  const notes = updates.notes !== undefined ? updates.notes : current.notes;
  const tagsJson = updates.tags !== undefined ? JSON.stringify(updates.tags) : current.tags;

  db.prepare(`
    UPDATE guests
    SET notes = ?, tags = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(notes, tagsJson, id);

  return db.prepare("SELECT * FROM guests WHERE id = ?").get(id) as Guest;
}

export function anonymizeOldReservations(daysRetention = 730): { processed: number; anonymized: number } {
  const db = getDb();
  const cutoffDate = new Date(Date.now() - daysRetention * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const candidates = db.prepare(`
    SELECT id, guest_phone, customer_phone FROM reservations
    WHERE service_date < ?
      AND (guest_name != 'Client Anonyme' OR customer_name != 'Client Anonyme' OR guest_email IS NOT NULL OR guest_notes IS NOT NULL)
  `).all(cutoffDate) as { id: string; guest_phone?: string; customer_phone?: string }[];

  db.exec("BEGIN IMMEDIATE;");
  try {
    for (const r of candidates) {
      const rawPhone = r.guest_phone || r.customer_phone || "";
      const maskedPhone = rawPhone.length >= 2 ? "+216****" + rawPhone.slice(-2) : "+216****00";

      db.prepare(`
        UPDATE reservations
        SET
          guest_name = 'Client Anonyme',
          customer_name = 'Client Anonyme',
          guest_phone = ?,
          customer_phone = ?,
          guest_email = NULL,
          guest_notes = NULL,
          notes = NULL,
          manage_token_hash = NULL,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(maskedPhone, maskedPhone, r.id);
    }

    db.exec("COMMIT;");
    return { processed: candidates.length, anonymized: candidates.length };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function recordReservationStatusTransition(
  reservationId: string,
  toStatus: ReservationStatus,
  changedBy = "system",
  reason?: string | null
) {
  const db = getDb();
  const res = db.prepare("SELECT status, guest_id FROM reservations WHERE id = ?").get(reservationId) as { status: string; guest_id: string | null } | undefined;
  if (!res) return;

  const fromStatus = res.status;
  if (fromStatus === toStatus) return;

  db.prepare(`
    INSERT INTO reservation_status_history (reservation_id, from_status, to_status, changed_by, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(reservationId, fromStatus, toStatus, changedBy, reason || null);

  // Update guest counters if guest is associated
  if (res.guest_id) {
    if (toStatus === "completed" || toStatus === "seated") {
      db.prepare("UPDATE guests SET total_visits = total_visits + 1, updated_at = datetime('now') WHERE id = ?").run(res.guest_id);
    } else if (toStatus === "no_show") {
      db.prepare("UPDATE guests SET no_show_count = no_show_count + 1, updated_at = datetime('now') WHERE id = ?").run(res.guest_id);
    } else if (toStatus === "cancelled") {
      db.prepare("UPDATE guests SET cancellation_count = cancellation_count + 1, updated_at = datetime('now') WHERE id = ?").run(res.guest_id);
    }
  }
}

/**
 * Creates a reservation atomically using a strict SQLite write lock (BEGIN IMMEDIATE).
 * Guarantees zero double-booking and enforces the capacity invariant.
 * Note for Postgres: maps to SELECT FOR UPDATE or pg_advisory_xact_lock.
 */
export function createReservationAtomic(params: {
  serviceDate: string;
  startMinute: number;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestNotes?: string | null;
  occasion?: string | null;
  seatingPreference?: string | null;
  source?: "web" | "phone" | "walk_in" | "admin" | "whatsapp";
  locale?: string;
  idempotencyKey?: string;
  currentTimestamp?: { date: string; minute: number };
  capacityOverride?: boolean; // Manager-only override for walk-ins/VIPs
  staffUserId?: string;
}): {
  success: boolean;
  reservation?: Reservation;
  rawManageToken?: string;
  isDuplicate?: boolean;
  reason?: string;
} {
  const db = getDb();

  // 1. Idempotency Check (return existing if identical request retried)
  if (params.idempotencyKey) {
    const existing = getReservationByIdempotencyKey(params.idempotencyKey);
    if (existing) {
      return { success: true, reservation: existing, isDuplicate: true };
    }
  }

  // 2. Anti-Abuse: Prevent multiple active reservations from same phone on same service date
  const normPhone = normalizePhoneNumber(params.guestPhone);
  const cleanPhone = normPhone.valid ? normPhone.e164! : params.guestPhone.trim();
  const duplicate = db.prepare(`
    SELECT id FROM reservations
    WHERE guest_phone = ? AND service_date = ? AND status IN ('pending', 'confirmed', 'seated')
  `).get(cleanPhone, params.serviceDate) as { id: string } | undefined;

  if (duplicate) {
    return {
      success: false,
      reason: "DUPLICATE_BOOKING",
    };
  }

  // 3. BEGIN IMMEDIATE — acquires the SQLite write lock before reading active state
  db.exec("BEGIN IMMEDIATE;");

  try {
    const rules = getReservationRules();
    const durationMinutes = getDurationForPartySize(params.partySize, rules);

    // If capacity check is not overridden by staff
    if (!params.capacityOverride) {
      const rawHours = db.prepare("SELECT * FROM operating_hours ORDER BY day_of_week ASC").all() as {
        day_of_week: number;
        open_time: string;
        close_time: string;
        is_closed: number;
      }[];
      const operatingHours: OperatingDay[] = rawHours.map((h) => ({
        dayOfWeek: h.day_of_week,
        openTime: h.open_time,
        closeTime: h.close_time,
        isClosed: h.is_closed === 1,
      }));

      const rawExceptions = db.prepare("SELECT * FROM hours_exceptions").all() as {
        id: string;
        start_date: string;
        end_date: string;
        is_closed: number;
        open_time: string | null;
        close_time: string | null;
      }[];
      const exceptions: OperatingException[] = rawExceptions.map((ex) => ({
        startDate: ex.start_date,
        endDate: ex.end_date,
        isClosed: ex.is_closed === 1,
        openTime: ex.open_time,
        closeTime: ex.close_time,
      }));

      const activeRows = db.prepare(`
        SELECT id, service_date, start_minute, duration_minutes, party_size, status
        FROM reservations
        WHERE service_date = ? AND status IN ('pending', 'confirmed', 'seated')
      `).all(params.serviceDate) as {
        id: string;
        service_date: string;
        start_minute: number;
        duration_minutes: number;
        party_size: number;
        status: string;
      }[];

      const existingReservations: ReservationItem[] = activeRows.map((r) => ({
        id: r.id,
        serviceDate: r.service_date,
        startMinute: r.start_minute,
        durationMinutes: r.duration_minutes,
        partySize: r.party_size,
        status: r.status,
      }));

      const check = canBookSlot(params.startMinute, {
        date: params.serviceDate,
        partySize: params.partySize,
        rules,
        operatingHours,
        exceptions,
        existingReservations,
        currentTimestamp: params.currentTimestamp,
      });

      if (!check.canBook) {
        db.exec("ROLLBACK;");
        return { success: false, reason: check.reason };
      }
    }

    // Determine status according to auto-confirm policy
    let initialStatus: ReservationStatus = "pending";
    if (params.capacityOverride || params.source === "walk_in") {
      initialStatus = "confirmed";
    } else if (params.partySize > rules.largePartyThreshold) {
      initialStatus = "pending"; // Large party is always pending request
    } else if (rules.autoConfirmPolicy === "always") {
      initialStatus = "confirmed";
    } else if (rules.autoConfirmPolicy === "small_parties_only" && params.partySize <= rules.autoConfirmMaxParty) {
      initialStatus = "confirmed";
    }

    const id = "res_" + crypto.randomUUID().slice(0, 8);
    const reference = generateReferenceCode();
    const rawManageToken = generateManageToken();
    const manageTokenHash = hashManageToken(rawManageToken);

    // Upsert guest profile
    const guest = upsertGuest(params.guestName, cleanPhone, params.guestEmail);
    const nowIso = new Date().toISOString();
    const confirmedAt = initialStatus === "confirmed" ? nowIso : null;

    db.prepare(`
      INSERT INTO reservations (
        id, reference, service_date, start_minute, duration_minutes, party_size,
        status, source, guest_id, guest_name, guest_phone, guest_email,
        guest_notes, occasion, seating_preference, idempotency_key,
        manage_token_hash, confirmed_at, locale,
        customer_name, customer_phone, reservation_date, reservation_time, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      id,
      reference,
      params.serviceDate,
      params.startMinute,
      durationMinutes,
      params.partySize,
      initialStatus,
      params.source || "web",
      guest.id,
      params.guestName.trim(),
      cleanPhone,
      params.guestEmail?.trim() || null,
      params.guestNotes?.trim() || null,
      params.occasion?.trim() || null,
      params.seatingPreference?.trim() || null,
      params.idempotencyKey || "idemp_" + id,
      manageTokenHash,
      confirmedAt,
      params.locale || "fr",
      params.guestName.trim(),
      cleanPhone,
      params.serviceDate,
      minutesToTimeString(params.startMinute),
      params.guestNotes?.trim() || null
    );

    // Record initial status transition
    const creator = params.staffUserId || (params.source === "admin" ? "admin" : "guest");
    const reasonText = params.capacityOverride ? "Création staff avec dérogation capacité" : "Nouvelle réservation client";
    db.prepare(`
      INSERT INTO reservation_status_history (reservation_id, from_status, to_status, changed_by, reason)
      VALUES (?, NULL, ?, ?, ?)
    `).run(id, initialStatus, creator, reasonText);

    db.exec("COMMIT;");

    const createdRes = getReservationById(id)!;
    return {
      success: true,
      reservation: createdRes,
      rawManageToken,
    };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

/**
 * Modifies an existing reservation atomically, ensuring capacity is respected.
 */
export function modifyReservationAtomic(
  reservationId: string,
  updates: {
    serviceDate: string;
    startMinute: number;
    partySize: number;
    guestNotes?: string | null;
  },
  changedBy = "guest"
): { success: boolean; reservation?: Reservation; reason?: string } {
  const db = getDb();
  const current = getReservationById(reservationId);
  if (!current) return { success: false, reason: "NOT_FOUND" };

  if (["cancelled", "declined", "completed", "no_show"].includes(current.status)) {
    return { success: false, reason: "CANNOT_MODIFY_TERMINAL_STATE" };
  }

  db.exec("BEGIN IMMEDIATE;");

  try {
    const rules = getReservationRules();
    const durationMinutes = getDurationForPartySize(updates.partySize, rules);

    const rawHours = db.prepare("SELECT * FROM operating_hours ORDER BY day_of_week ASC").all() as {
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: number;
    }[];
    const operatingHours: OperatingDay[] = rawHours.map((h) => ({
      dayOfWeek: h.day_of_week,
      openTime: h.open_time,
      closeTime: h.close_time,
      isClosed: h.is_closed === 1,
    }));

    const rawExceptions = db.prepare("SELECT * FROM hours_exceptions").all() as {
      id: string;
      start_date: string;
      end_date: string;
      is_closed: number;
      open_time: string | null;
      close_time: string | null;
    }[];
    const exceptions: OperatingException[] = rawExceptions.map((ex) => ({
      startDate: ex.start_date,
      endDate: ex.end_date,
      isClosed: ex.is_closed === 1,
      openTime: ex.open_time,
      closeTime: ex.close_time,
    }));

    const activeRows = db.prepare(`
      SELECT id, service_date, start_minute, duration_minutes, party_size, status
      FROM reservations
      WHERE service_date = ? AND status IN ('pending', 'confirmed', 'seated')
    `).all(updates.serviceDate) as {
      id: string;
      service_date: string;
      start_minute: number;
      duration_minutes: number;
      party_size: number;
      status: string;
    }[];

    const existingReservations: ReservationItem[] = activeRows.map((r) => ({
      id: r.id,
      serviceDate: r.service_date,
      startMinute: r.start_minute,
      durationMinutes: r.duration_minutes,
      partySize: r.party_size,
      status: r.status,
    }));

    // Check capacity excluding itself
    const check = canBookSlot(updates.startMinute, {
      date: updates.serviceDate,
      partySize: updates.partySize,
      rules,
      operatingHours,
      exceptions,
      existingReservations,
      excludeReservationId: reservationId,
    });

    if (!check.canBook) {
      db.exec("ROLLBACK;");
      return { success: false, reason: check.reason };
    }

    db.prepare(`
      UPDATE reservations
      SET
        service_date = ?,
        start_minute = ?,
        duration_minutes = ?,
        party_size = ?,
        guest_notes = COALESCE(?, guest_notes),
        reservation_date = ?,
        reservation_time = ?,
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.serviceDate,
      updates.startMinute,
      durationMinutes,
      updates.partySize,
      updates.guestNotes !== undefined ? updates.guestNotes : null,
      updates.serviceDate,
      minutesToTimeString(updates.startMinute),
      updates.guestNotes !== undefined ? updates.guestNotes : null,
      reservationId
    );

    db.prepare(`
      INSERT INTO reservation_status_history (reservation_id, from_status, to_status, changed_by, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      reservationId,
      current.status,
      current.status,
      changedBy,
      `Modification: ${updates.serviceDate} à ${minutesToTimeString(updates.startMinute)}, ${updates.partySize} personnes`
    );

    db.exec("COMMIT;");
    return { success: true, reservation: getReservationById(reservationId)! };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

/**
 * Cancels a reservation atomically, updating status and guest statistics.
 */
export function cancelReservationAtomic(
  reservationId: string,
  cancelReason?: string | null,
  changedBy = "guest"
): { success: boolean; reservation?: Reservation; reason?: string } {
  const db = getDb();
  const current = getReservationById(reservationId);
  if (!current) return { success: false, reason: "NOT_FOUND" };

  if (current.status === "cancelled") {
    return { success: true, reservation: current };
  }

  db.exec("BEGIN IMMEDIATE;");
  try {
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE reservations
      SET
        status = 'cancelled',
        cancelled_at = ?,
        cancel_reason = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nowIso, cancelReason || "Annulé par le client", reservationId);

    recordReservationStatusTransition(reservationId, "cancelled", changedBy, cancelReason || "Annulation");

    db.exec("COMMIT;");
    return { success: true, reservation: getReservationById(reservationId)! };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function updateReservationStatus(
  id: string,
  status: ReservationStatus,
  internalNotes?: string,
  changedBy = "staff"
) {
  const db = getDb();
  const current = getReservationById(id);
  if (!current) return;

  const nowIso = new Date().toISOString();
  let confirmedAt = current.confirmed_at;
  let seatedAt = current.seated_at;
  let completedAt = current.completed_at;
  let cancelledAt = current.cancelled_at;

  if (status === "confirmed" && !confirmedAt) confirmedAt = nowIso;
  if (status === "seated" && !seatedAt) seatedAt = nowIso;
  if (status === "completed" && !completedAt) completedAt = nowIso;
  if (status === "cancelled" && !cancelledAt) cancelledAt = nowIso;

  if (internalNotes !== undefined) {
    db.prepare(`
      UPDATE reservations
      SET status = ?, internal_notes = ?, confirmed_at = ?, seated_at = ?, completed_at = ?, cancelled_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, internalNotes, confirmedAt, seatedAt, completedAt, cancelledAt, id);
  } else {
    db.prepare(`
      UPDATE reservations
      SET status = ?, confirmed_at = ?, seated_at = ?, completed_at = ?, cancelled_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, confirmedAt, seatedAt, completedAt, cancelledAt, id);
  }

  // Update Guest CRM stats
  const phoneToUpdate = current.guest_phone || current.customer_phone;
  if (phoneToUpdate) {
    if (status === "no_show") {
      db.prepare("UPDATE guests SET no_show_count = no_show_count + 1, updated_at = datetime('now') WHERE phone = ?").run(phoneToUpdate);
    } else if (status === "seated") {
      db.prepare("UPDATE guests SET total_visits = total_visits + 1, updated_at = datetime('now') WHERE phone = ?").run(phoneToUpdate);
    } else if (status === "cancelled" || status === "declined") {
      db.prepare("UPDATE guests SET cancellation_count = cancellation_count + 1, updated_at = datetime('now') WHERE phone = ?").run(phoneToUpdate);
    }
  }

  recordReservationStatusTransition(id, status, changedBy, internalNotes || `Mise à jour statut: ${status}`);
}

/* ── WAITLIST QUERIES ── */

export function getWaitlist(serviceDate?: string): WaitlistEntry[] {
  const db = getDb();
  if (serviceDate) {
    return db.prepare("SELECT * FROM waitlist WHERE service_date = ? ORDER BY start_minute ASC, created_at ASC").all(serviceDate) as WaitlistEntry[];
  }
  return db.prepare("SELECT * FROM waitlist ORDER BY service_date DESC, start_minute ASC, created_at ASC").all() as WaitlistEntry[];
}

export function createWaitlistEntry(params: {
  serviceDate: string;
  startMinute: number;
  partySize: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  notes?: string | null;
}): WaitlistEntry {
  const db = getDb();
  const id = "wt_" + crypto.randomUUID().slice(0, 8);
  const normPhone = normalizePhoneNumber(params.customerPhone);
  const cleanPhone = normPhone.valid ? normPhone.e164! : params.customerPhone.trim();

  db.prepare(`
    INSERT INTO waitlist (id, service_date, start_minute, party_size, customer_name, customer_phone, customer_email, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting')
  `).run(
    id,
    params.serviceDate,
    params.startMinute,
    params.partySize,
    params.customerName.trim(),
    cleanPhone,
    params.customerEmail?.trim() || null,
    params.notes?.trim() || null
  );

  return db.prepare("SELECT * FROM waitlist WHERE id = ?").get(id) as WaitlistEntry;
}

export function updateWaitlistStatus(
  id: string,
  status: WaitlistEntry["status"]
) {
  const db = getDb();
  const nowIso = new Date().toISOString();
  if (status === "notified") {
    db.prepare("UPDATE waitlist SET status = ?, notified_at = ?, updated_at = datetime('now') WHERE id = ?").run(status, nowIso, id);
  } else {
    db.prepare("UPDATE waitlist SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }
}

export function deleteWaitlistEntry(id: string) {
  const db = getDb();
  return db.prepare("DELETE FROM waitlist WHERE id = ?").run(id);
}

// Keep legacy createReservation so existing callers don't fail
export function createReservation(res: Omit<Reservation, "created_at" | "updated_at">) {
  return createReservationAtomic({
    serviceDate: res.service_date || res.reservation_date || new Date().toISOString().slice(0, 10),
    startMinute: res.start_minute || (res.reservation_time ? timeStringToMinutes(res.reservation_time) : 720),
    partySize: res.party_size || 2,
    guestName: res.guest_name || res.customer_name || "Client",
    guestPhone: res.guest_phone || res.customer_phone || "+21620123456",
    guestNotes: res.guest_notes || res.notes || null,
    source: res.source || "web",
  });
}

/* ── DASHBOARD STATS ── */

export function getDashboardStats() {
  const db = getDb();

  const totalItems = (db.prepare("SELECT COUNT(*) as count FROM menu_items").get() as { count: number }).count;
  const activeItems = (db.prepare("SELECT COUNT(*) as count FROM menu_items WHERE is_available = 1").get() as { count: number }).count;
  const totalCategories = (db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number }).count;

  const totalOrders = (db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number }).count;
  const pendingOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('new', 'accepted', 'preparing')").get() as { count: number }).count;
  const completedOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get() as { count: number }).count;

  // Real confirmed revenue (from completed orders only, not submitted orders)
  const revenueRow = db.prepare("SELECT SUM(total) as sum FROM orders WHERE status = 'completed'").get() as { sum: number | null };
  const confirmedRevenue = revenueRow.sum || 0;

  const pendingReservations = (db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'pending'").get() as { count: number }).count;
  const totalReservations = (db.prepare("SELECT COUNT(*) as count FROM reservations").get() as { count: number }).count;

  return {
    totalItems,
    activeItems,
    unavailableItems: totalItems - activeItems,
    totalCategories,
    totalOrders,
    pendingOrders,
    completedOrders,
    confirmedRevenue,
    pendingReservations,
    totalReservations,
  };
}

