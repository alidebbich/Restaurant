import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

const db = new DatabaseSync("data/restaurant.sqlite");
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Safe Alter helper
const tryAlter = (sql) => {
  try { db.exec(sql); } catch (e) { /* ignore */ }
};

// Reservations Professional Upgrade Migration
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

const DEFAULT_RESERVATION_RULES = {
  venueTimezone: "Africa/Tunis",
  capacityMode: "covers",
  maxCoversConcurrent: 40,
  maxCoversPerSlot: 12,
  slotIntervalMinutes: 15,
  minLeadMinutes: 60,
  maxAdvanceDays: 60,
  cancelCutoffMinutes: 120,
  largePartyThreshold: 7,
  requireConfirmation: true,
  autoConfirmOnline: true,
  defaultTurnMinutes: 90,
  durationRules: [
    { minParty: 1, maxParty: 2, durationMinutes: 75 },
    { minParty: 3, maxParty: 4, durationMinutes: 90 },
    { minParty: 5, maxParty: 8, durationMinutes: 120 },
    { minParty: 9, maxParty: 99, durationMinutes: 150 },
  ],
  serviceShifts: [
    { id: "lunch", nameFr: "Déjeuner", nameAr: "غداء", nameEn: "Lunch", startMinute: 720, endMinute: 960 },
    { id: "dinner", nameFr: "Dîner", nameAr: "عشاء", nameEn: "Dinner", startMinute: 1140, endMinute: 1410 },
  ],
  dayOverrides: [],
};

const rulesCount = db.prepare("SELECT COUNT(*) as count FROM reservation_rules").get();
if (rulesCount.count === 0) {
  db.prepare("INSERT INTO reservation_rules (id, rules_json) VALUES (1, ?)").run(JSON.stringify(DEFAULT_RESERVATION_RULES));
  console.log("Seeded default reservation rules.");
}

console.log("Migration executed successfully!");

