import { Pool } from "pg";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const connectionString: string = process.env.DATABASE_URL || "";
if (!connectionString) {
  console.error("❌ ERREUR SÉCURITÉ: Variable d'environnement DATABASE_URL manquante.");
  console.error("Veuillez définir DATABASE_URL dans votre fichier .env ou dans votre environnement système avant d'exécuter la migration.");
  process.exit(1);
}
const pool = new Pool({ connectionString });

async function migrate() {
  console.log("Connecting to PostgreSQL at:", connectionString.replace(/:[^:@]+@/, ":***@"));
  const client = await pool.connect();

  try {
    console.log("Creating tables in PostgreSQL darzitoun database...");
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'manager',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS operating_hours (
        id SERIAL PRIMARY KEY,
        day_of_week INTEGER NOT NULL UNIQUE,
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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        deleted_at TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        price NUMERIC(10,3) NOT NULL,
        promo_price NUMERIC(10,3),
        price_millimes INTEGER,
        promo_price_millimes INTEGER,
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
        dietary_tags TEXT DEFAULT '[]',
        deleted_at TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS menu_item_options (
        id TEXT PRIMARY KEY,
        menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        name_fr TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        option_type TEXT NOT NULL DEFAULT 'single',
        is_required INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS menu_item_option_values (
        id TEXT PRIMARY KEY,
        option_id TEXT NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
        name_fr TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        price_modifier NUMERIC(10,3) NOT NULL DEFAULT 0,
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        order_type TEXT NOT NULL DEFAULT 'dine_in',
        table_or_time TEXT,
        delivery_address TEXT,
        notes TEXT,
        subtotal NUMERIC(10,3) NOT NULL,
        total NUMERIC(10,3) NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        payment_method TEXT NOT NULL DEFAULT 'cod',
        is_paid INTEGER NOT NULL DEFAULT 0,
        internal_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
        item_name TEXT NOT NULL,
        unit_price NUMERIC(10,3) NOT NULL,
        unit_price_millimes INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price NUMERIC(10,3) NOT NULL,
        total_price_millimes INTEGER,
        selected_options_json TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        note TEXT,
        changed_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        reference TEXT,
        service_date TEXT,
        start_minute INTEGER,
        duration_minutes INTEGER DEFAULT 90,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        reservation_date TEXT NOT NULL,
        reservation_time TEXT NOT NULL,
        party_size INTEGER NOT NULL DEFAULT 2,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        internal_notes TEXT,
        source TEXT DEFAULT 'web',
        guest_id TEXT,
        guest_name TEXT,
        guest_phone TEXT,
        guest_email TEXT,
        guest_notes TEXT,
        occasion TEXT,
        seating_preference TEXT,
        idempotency_key TEXT,
        manage_token_hash TEXT,
        confirmed_at TEXT,
        cancelled_at TEXT,
        cancel_reason TEXT,
        seated_at TEXT,
        completed_at TEXT,
        locale TEXT DEFAULT 'fr',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reservation_status_history (
        id SERIAL PRIMARY KEY,
        reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        changed_by TEXT NOT NULL DEFAULT 'system',
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reservation_rules (
        id INTEGER PRIMARY KEY,
        rules_json TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notification_log (
        id TEXT PRIMARY KEY,
        reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        template TEXT NOT NULL,
        locale TEXT NOT NULL DEFAULT 'fr',
        status TEXT NOT NULL DEFAULT 'sent',
        provider_response TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

    await client.query("COMMIT");
    console.log("PostgreSQL schema successfully created.");

    // Migrate data from SQLite if present
    const sqlitePath = path.join(process.cwd(), "data", "restaurant.sqlite");
    if (fs.existsSync(sqlitePath)) {
      console.log("Migrating data from SQLite:", sqlitePath);
      const sqlite = new DatabaseSync(sqlitePath);

      const tablesToMigrate = [
        "restaurant_settings",
        "operating_hours",
        "homepage_content",
        "categories",
        "menu_items",
        "menu_item_options",
        "menu_item_option_values",
        "gallery_images",
        "reservation_rules",
        "admin_users",
        "hours_exceptions",
        "reservations",
        "guests",
        "orders",
        "order_items",
        "waitlist"
      ];

      for (const table of tablesToMigrate) {
        try {
          const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
          if (rows.length === 0) continue;

          console.log(`Copying ${rows.length} rows for table: ${table}...`);
          for (const row of rows) {
            const cols = Object.keys(row);
            const vals = cols.map(c => row[c]);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
            const colList = cols.join(", ");

            await client.query(
              `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              vals
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`Warning copying ${table}:`, msg);
        }
      }
      console.log("Data migration from SQLite completed!");
    }

    const { rows: tableRows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Tables in darzitoun database:", tableRows.map(r => r.table_name));

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

