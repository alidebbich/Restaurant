import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { site } from "@/config/site.config";
import { menu, signatureDishes } from "@/content/menu";
import { DEFAULT_RESERVATION_RULES } from "../reservations/rules";

export function initDatabase(db: DatabaseSync) {
  // 1. Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'manager', -- super_admin, restaurant_owner, manager, menu_manager, order_manager
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restaurant_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name_fr TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      tagline_fr TEXT,
      tagline_ar TEXT,
      tagline_en TEXT,
      description_fr TEXT,
      description_ar TEXT,
      description_en TEXT,
      logo TEXT,
      cover_image TEXT,
      phone TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT NOT NULL,
      address_street TEXT NOT NULL,
      address_city TEXT NOT NULL,
      maps_url TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TND',
      default_locale TEXT NOT NULL DEFAULT 'fr',
      available_locales TEXT NOT NULL DEFAULT '["fr","ar","en"]',
      is_ordering_enabled INTEGER NOT NULL DEFAULT 1,
      is_reservations_enabled INTEGER NOT NULL DEFAULT 1,
      is_gallery_enabled INTEGER NOT NULL DEFAULT 1,
      maintenance_mode INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operating_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL UNIQUE, -- 0=Sunday, 1=Monday ... 6=Saturday
      day_name_fr TEXT NOT NULL,
      day_name_ar TEXT NOT NULL,
      day_name_en TEXT NOT NULL,
      open_time TEXT NOT NULL DEFAULT '12:00',
      close_time TEXT NOT NULL DEFAULT '23:00',
      is_closed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS homepage_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hero_title_fr TEXT,
      hero_title_ar TEXT,
      hero_title_en TEXT,
      hero_description_fr TEXT,
      hero_description_ar TEXT,
      hero_description_en TEXT,
      hero_image TEXT,
      story_heading_fr TEXT,
      story_heading_ar TEXT,
      story_heading_en TEXT,
      story_body_fr TEXT,
      story_body_ar TEXT,
      story_body_en TEXT,
      story_image TEXT,
      story_secondary_image TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_fr TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_fr TEXT,
      description_ar TEXT,
      description_en TEXT,
      image TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      slug TEXT NOT NULL,
      name_fr TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_fr TEXT,
      description_ar TEXT,
      description_en TEXT,
      price REAL NOT NULL,
      promo_price REAL,
      image TEXT,
      additional_images TEXT DEFAULT '[]',
      is_available INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      ingredients_fr TEXT,
      ingredients_ar TEXT,
      ingredients_en TEXT,
      allergens TEXT DEFAULT '[]',
      dietary_tags TEXT DEFAULT '[]', -- vegetarian, spicy, halal, signature, new
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_item_options (
      id TEXT PRIMARY KEY,
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      name_fr TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      option_type TEXT NOT NULL DEFAULT 'single', -- single, multiple
      is_required INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_item_option_values (
      id TEXT PRIMARY KEY,
      option_id TEXT NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
      name_fr TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      price_modifier REAL NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gallery_images (
      id TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      caption_fr TEXT,
      caption_ar TEXT,
      caption_en TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'dine_in', -- dine_in, takeaway, delivery
      table_or_time TEXT,
      delivery_address TEXT,
      notes TEXT,
      subtotal REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', -- new, accepted, preparing, ready, out_for_delivery, completed, cancelled
      payment_method TEXT NOT NULL DEFAULT 'cod', -- cod, cash_restaurant, online
      is_paid INTEGER NOT NULL DEFAULT 0,
      internal_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
      item_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_price REAL NOT NULL,
      selected_options_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      changed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      reservation_date TEXT NOT NULL,
      reservation_time TEXT NOT NULL,
      party_size INTEGER NOT NULL DEFAULT 2,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, rejected, cancelled
      internal_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Run idempotent migrations (ALTER TABLE — safe to call repeatedly)
  runMigrations(db);

  // 3. Seed initial data if tables are empty
  seedIfEmpty(db);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

// ─── MIGRATIONS ───────────────────────────────────────────────────────────────
// All ALTER TABLE calls are wrapped in try/catch — SQLite throws if column already exists.
// This runs every startup and is completely idempotent.
function runMigrations(db: DatabaseSync) {
  const tryAlter = (sql: string) => {
    try { db.exec(sql); } catch { /* column already exists — ignore */ }
  };

  // soft-delete on categories
  tryAlter("ALTER TABLE categories ADD COLUMN deleted_at TEXT");

  // soft-delete on menu_items
  tryAlter("ALTER TABLE menu_items ADD COLUMN deleted_at TEXT");

  // millimes pricing on menu_items (integer column alongside legacy REAL)
  tryAlter("ALTER TABLE menu_items ADD COLUMN price_millimes INTEGER");
  tryAlter("ALTER TABLE menu_items ADD COLUMN promo_price_millimes INTEGER");

  // back-fill millimes from REAL (runs only on rows where price_millimes is still NULL)
  db.exec(`
    UPDATE menu_items
    SET price_millimes = ROUND(price * 1000)
    WHERE price_millimes IS NULL AND price IS NOT NULL;

    UPDATE menu_items
    SET promo_price_millimes = ROUND(promo_price * 1000)
    WHERE promo_price_millimes IS NULL AND promo_price IS NOT NULL;
  `);

  // millimes on order_items
  tryAlter("ALTER TABLE order_items ADD COLUMN unit_price_millimes INTEGER");
  tryAlter("ALTER TABLE order_items ADD COLUMN total_price_millimes INTEGER");

  db.exec(`
    UPDATE order_items
    SET unit_price_millimes = ROUND(unit_price * 1000)
    WHERE unit_price_millimes IS NULL AND unit_price IS NOT NULL;

    UPDATE order_items
    SET total_price_millimes = ROUND(total_price * 1000)
    WHERE total_price_millimes IS NULL AND total_price IS NOT NULL;
  `);

  // hours_exceptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hours_exceptions (
      id TEXT PRIMARY KEY,
      label_fr TEXT,
      label_ar TEXT,
      label_en TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_closed INTEGER NOT NULL DEFAULT 1,
      open_time TEXT,
      close_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Reservations Professional Upgrade Migration ──
  // Non-destructively expand reservations columns
  tryAlter("ALTER TABLE reservations ADD COLUMN reference TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN service_date TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN start_minute INTEGER");
  tryAlter("ALTER TABLE reservations ADD COLUMN duration_minutes INTEGER DEFAULT 90");
  tryAlter("ALTER TABLE reservations ADD COLUMN source TEXT DEFAULT 'web'");
  tryAlter("ALTER TABLE reservations ADD COLUMN guest_id TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN guest_name TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN guest_phone TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN guest_email TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN guest_notes TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN occasion TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN seating_preference TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN idempotency_key TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN manage_token_hash TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN confirmed_at TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN cancelled_at TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN cancel_reason TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN seated_at TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN completed_at TEXT");
  tryAlter("ALTER TABLE reservations ADD COLUMN locale TEXT DEFAULT 'fr'");

  // Backfill legacy reservations with computed fields & normalize status
  db.exec(`
    UPDATE reservations
    SET
      reference = COALESCE(reference, 'RZ-' || UPPER(SUBSTR(HEX(RANDOMBLOB(2)), 1, 4))),
      service_date = COALESCE(service_date, reservation_date),
      start_minute = COALESCE(
        start_minute,
        CASE
          WHEN reservation_time LIKE '%:%' THEN
            (CAST(SUBSTR(reservation_time, 1, INSTR(reservation_time, ':') - 1) AS INTEGER) * 60 +
             CAST(SUBSTR(reservation_time, INSTR(reservation_time, ':') + 1, 2) AS INTEGER))
          ELSE 720
        END
      ),
      duration_minutes = COALESCE(duration_minutes, 90),
      guest_name = COALESCE(guest_name, customer_name),
      guest_phone = COALESCE(guest_phone, customer_phone),
      guest_notes = COALESCE(guest_notes, notes),
      idempotency_key = COALESCE(idempotency_key, 'legacy_' || id),
      status = CASE WHEN status = 'rejected' THEN 'declined' ELSE status END
    WHERE reference IS NULL OR service_date IS NULL;
  `);

  // Supporting tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by TEXT NOT NULL DEFAULT 'system',
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservation_rules (
      id INTEGER PRIMARY KEY,
      rules_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      total_visits INTEGER NOT NULL DEFAULT 0,
      no_show_count INTEGER NOT NULL DEFAULT 0,
      cancellation_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      marketing_consent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      service_date TEXT NOT NULL,
      start_minute INTEGER NOT NULL,
      party_size INTEGER NOT NULL DEFAULT 2,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      notified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification_log (
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      template TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'fr',
      status TEXT NOT NULL DEFAULT 'sent',
      provider_response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_res_service_date_minute ON reservations (service_date, start_minute);
    CREATE INDEX IF NOT EXISTS idx_res_guest_phone ON reservations (guest_phone);
    CREATE INDEX IF NOT EXISTS idx_res_status ON reservations (status);
    CREATE INDEX IF NOT EXISTS idx_res_reference ON reservations (reference);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_res_idempotency ON reservations (idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_res_hist_res_id ON reservation_status_history (reservation_id);
    CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests (phone);
    CREATE INDEX IF NOT EXISTS idx_waitlist_date ON waitlist (service_date);
  `);
}

function seedIfEmpty(db: DatabaseSync) {
  // Admin user is NOT seeded automatically.
  // Use the secure bootstrap endpoint: POST /api/auth/bootstrap with ADMIN_BOOTSTRAP_SECRET
  // to create the first super_admin account.

  // Check if settings exist
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM restaurant_settings").get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO restaurant_settings (
        id, name_fr, name_ar, name_en, tagline_fr, tagline_ar, tagline_en,
        description_fr, description_ar, description_en, logo, cover_image,
        phone, whatsapp, email, address_street, address_city, maps_url,
        currency, default_locale, available_locales, is_ordering_enabled,
        is_reservations_enabled, is_gallery_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      site.name.fr,
      site.name.ar,
      site.name.en,
      site.tagline.fr,
      site.tagline.ar,
      site.tagline.en,
      "Cuisine tunisienne authentique et méditerranéenne raffinée.",
      "مطبخ تونسي أصيل ونكهات متوسطية راقية في قلب المدينة.",
      "Authentic Tunisian and refined Mediterranean culinary experience.",
      "/images/logo.png",
      "/images/hero-main.jpg",
      site.contact.phone,
      site.contact.whatsapp,
      site.contact.email,
      site.address.street,
      site.address.city,
      site.address.mapsUrl,
      site.currency,
      site.defaultLocale,
      JSON.stringify(site.locales),
      1,
      1,
      1
    );
  }

  // Operating hours
  const hoursCount = db.prepare("SELECT COUNT(*) as count FROM operating_hours").get() as { count: number };
  if (hoursCount.count === 0) {
    const days = [
      { d: 1, fr: "Lundi", ar: "الإثنين", en: "Monday", o: "12:00", c: "23:00", closed: 0 },
      { d: 2, fr: "Mardi", ar: "الثلاثاء", en: "Tuesday", o: "12:00", c: "23:00", closed: 0 },
      { d: 3, fr: "Mercredi", ar: "الأربعاء", en: "Wednesday", o: "12:00", c: "23:00", closed: 0 },
      { d: 4, fr: "Jeudi", ar: "الخميس", en: "Thursday", o: "12:00", c: "23:00", closed: 0 },
      { d: 5, fr: "Vendredi", ar: "الجمعة", en: "Friday", o: "12:00", c: "23:00", closed: 0 },
      { d: 6, fr: "Samedi", ar: "السبت", en: "Saturday", o: "11:00", c: "00:00", closed: 0 },
      { d: 0, fr: "Dimanche", ar: "الأحد", en: "Sunday", o: "11:00", c: "00:00", closed: 0 },
    ];
    for (const h of days) {
      db.prepare(`
        INSERT INTO operating_hours (day_of_week, day_name_fr, day_name_ar, day_name_en, open_time, close_time, is_closed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(h.d, h.fr, h.ar, h.en, h.o, h.c, h.closed);
    }
  }

  // Homepage content
  const homeCount = db.prepare("SELECT COUNT(*) as count FROM homepage_content").get() as { count: number };
  if (homeCount.count === 0) {
    db.prepare(`
      INSERT INTO homepage_content (
        id, hero_title_fr, hero_title_ar, hero_title_en,
        hero_description_fr, hero_description_ar, hero_description_en,
        hero_image, story_heading_fr, story_heading_ar, story_heading_en,
        story_body_fr, story_body_ar, story_body_en,
        story_image, story_secondary_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      site.tagline.fr,
      site.tagline.ar,
      site.tagline.en,
      "Savourez l'excellence de la gastronomie tunisienne dans un cadre historique au cœur de la médina.",
      "تذوق أرقى النكهات التونسية في قلب المدينة العتيقة حيث تلتقي التقاليد مع الرقي المتوسطي.",
      "Experience authentic Tunisian Mediterranean flavours in an intimate and historic medina setting.",
      "/images/hero-main.jpg",
      "Une cuisine enracinée dans la tradition",
      "مطبخ متجذر في الأصالة",
      "A cuisine rooted in tradition",
      "Depuis 2015, nous célébrons les saveurs authentiques de la Tunisie — ingrédients soigneusement sélectionnés, recettes transmises de génération en génération, dans un cadre chaleureux au cœur de la médina.",
      "منذ عام 2015، نحتفي بالنكهات التونسية الأصيلة بمكونات طازجة مختارة بعناية ووصفات عائلية متوارثة في أجواء حميمة وسط المدينة العتيقة.",
      "Since 2015, we celebrate the authentic flavours of Tunisia — carefully selected seasonal ingredients, heritage family recipes, in a warm setting at the heart of the historic medina.",
      "/images/story-main.jpg",
      "/images/gal-1.jpg"
    );
  }

  // Categories & Menu Items
  const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (catCount.count === 0) {
    let catOrder = 0;
    for (const c of menu) {
      db.prepare(`
        INSERT INTO categories (id, slug, name_fr, name_ar, name_en, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(
        c.id,
        c.id,
        c.title.fr,
        c.title.ar,
        c.title.en,
        catOrder++
      );

      let itemOrder = 0;
      for (const d of c.dishes) {
        const isFeatured = signatureDishes.some((s) => s.id === d.id) ? 1 : 0;
        db.prepare(`
          INSERT INTO menu_items (
            id, category_id, slug, name_fr, name_ar, name_en,
            description_fr, description_ar, description_en,
            price, image, is_available, is_featured, is_published,
            display_order, dietary_tags
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?)
        `).run(
          d.id,
          c.id,
          d.id,
          d.name.fr,
          d.name.ar,
          d.name.en,
          d.description?.fr || "",
          d.description?.ar || "",
          d.description?.en || "",
          d.price,
          d.image || "/images/menu/dish-couscous.jpg",
          isFeatured,
          itemOrder++,
          JSON.stringify(d.tags || [])
        );

        // Add sample customization options for Couscous / Main courses
        if (d.id === "couscous-agneau") {
          const optId = "opt_" + d.id + "_portion";
          db.prepare(`
            INSERT INTO menu_item_options (id, menu_item_id, name_fr, name_ar, name_en, option_type, is_required, display_order)
            VALUES (?, ?, ?, ?, ?, 'single', 1, 0)
          `).run(optId, d.id, "Portion", "الحجم", "Portion Size");

          db.prepare(`
            INSERT INTO menu_item_option_values (id, option_id, name_fr, name_ar, name_en, price_modifier, is_default, display_order)
            VALUES (?, ?, ?, ?, ?, 0, 1, 0)
          `).run(optId + "_std", optId, "Normale", "عادي", "Standard", 0, 1, 0);

          db.prepare(`
            INSERT INTO menu_item_option_values (id, option_id, name_fr, name_ar, name_en, price_modifier, is_default, display_order)
            VALUES (?, ?, ?, ?, ?, 12, 0, 1)
          `).run(optId + "_dbl", optId, "Double Agneau (+12 DT)", "لحم مضاعف (+12 د)", "Double Lamb (+12 DT)", 12, 0, 1);
        }
      }
    }
  }

  // Gallery images
  const galCount = db.prepare("SELECT COUNT(*) as count FROM gallery_images").get() as { count: number };
  if (galCount.count === 0 && site.images.gallery) {
    site.images.gallery.forEach((url, i) => {
      db.prepare(`
        INSERT INTO gallery_images (id, image_url, caption_fr, caption_ar, caption_en, display_order, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        "gal_" + (i + 1),
        url,
        `Atmosphère ${i + 1}`,
        `أجواء المطعم ${i + 1}`,
        `Atmosphere ${i + 1}`,
        i,
        i < 3 ? 1 : 0
      );
    });
  }

  // Reservation rules
  const rulesCount = db.prepare("SELECT COUNT(*) as count FROM reservation_rules").get() as { count: number };
  if (rulesCount.count === 0) {
    db.prepare(`
      INSERT INTO reservation_rules (id, rules_json)
      VALUES (1, ?)
    `).run(JSON.stringify(DEFAULT_RESERVATION_RULES));
  }
}

