/**
 * Shared Zod schemas used by both API route handlers and client-side forms.
 * Single source of truth — no duplication between client and server validation.
 */
import { z } from "zod";

// ── Localised text ──────────────────────────────────────────────────────────
// At least the French text is required; AR and EN can be empty strings.
export const L10nSchema = z.object({
  fr: z.string().min(1, "Le texte français est obligatoire"),
  ar: z.string().default(""),
  en: z.string().default(""),
});
export type L10n = z.infer<typeof L10nSchema>;

// ── Price ───────────────────────────────────────────────────────────────────
// Accepts "12.5", "12,5", "12 500" → stored as millimes integer (12500).
export const PriceMillimesSchema = z
  .string()
  .min(1, "Le prix est obligatoire")
  .transform((raw) => {
    const s = raw.trim().replace(/\s/g, "").replace(",", ".");
    const val = parseFloat(s);
    if (isNaN(val) || val < 0) throw new Error("Prix invalide");
    return Math.round(val * 1000);
  })
  .pipe(z.number().int().nonnegative());

// ── Category ────────────────────────────────────────────────────────────────
export const CategoryCreateSchema = z.object({
  name_fr: z.string().min(1, "Nom (FR) obligatoire").max(80),
  name_ar: z.string().max(80).default(""),
  name_en: z.string().max(80).default(""),
  description_fr: z.string().max(400).optional().default(""),
  description_ar: z.string().max(400).optional().default(""),
  description_en: z.string().max(400).optional().default(""),
  image: z.string().url().optional().or(z.literal("")).optional(),
  display_order: z.number().int().nonnegative().default(0),
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(1),
});
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;

// ── Menu Item ───────────────────────────────────────────────────────────────
const DishTag = z.enum(["vegetarian", "spicy", "signature", "new", "halal", "gluten_free"]);

export const MenuItemCreateSchema = z.object({
  name_fr: z.string().min(1, "Nom (FR) obligatoire").max(120),
  name_ar: z.string().max(120).default(""),
  name_en: z.string().max(120).default(""),
  description_fr: z.string().max(600).optional().default(""),
  description_ar: z.string().max(600).optional().default(""),
  description_en: z.string().max(600).optional().default(""),
  category_id: z.string().min(1, "La catégorie est obligatoire"),
  price_millimes: z.number().int().nonnegative(),
  promo_price_millimes: z.number().int().nonnegative().nullable().optional(),
  image: z.string().optional().default(""),
  additional_images: z.string().optional().default("[]"),
  is_available: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(1),
  is_featured: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(0),
  is_published: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(1),
  display_order: z.number().int().nonnegative().default(0),
  ingredients_fr: z.string().max(500).optional().default(""),
  ingredients_ar: z.string().max(500).optional().default(""),
  ingredients_en: z.string().max(500).optional().default(""),
  allergens: z.string().optional().default("[]"),    // JSON string array
  dietary_tags: z.string().optional().default("[]"), // JSON string array
});
export type MenuItemCreate = z.infer<typeof MenuItemCreateSchema>;

// ── Availability toggle ─────────────────────────────────────────────────────
export const AvailabilitySchema = z.object({
  is_available: z.boolean(),
});

// ── Settings ────────────────────────────────────────────────────────────────
const TunisianPhoneOrEmpty = z.string().refine(
  (v) => v === "" || /^\+?[0-9\s\-().]{7,20}$/.test(v),
  "Numéro de téléphone invalide"
);
const UrlOrEmpty = z.string().refine(
  (v) => v === "" || v.startsWith("http"),
  "URL invalide"
);

export const RestaurantSettingsSchema = z.object({
  name_fr: z.string().min(1).max(100),
  name_ar: z.string().max(100).default(""),
  name_en: z.string().max(100).default(""),
  tagline_fr: z.string().max(300).default(""),
  tagline_ar: z.string().max(300).default(""),
  tagline_en: z.string().max(300).default(""),
  phone: TunisianPhoneOrEmpty,
  whatsapp: TunisianPhoneOrEmpty,
  email: z.string().email().or(z.literal("")).optional().default(""),
  address_street: z.string().max(200).default(""),
  address_city: z.string().max(100).default(""),
  maps_url: UrlOrEmpty.optional().default(""),
  is_ordering_enabled: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(1),
  is_reservations_enabled: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(1),
  is_gallery_enabled: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(1),
});

// ── Operating Hours ─────────────────────────────────────────────────────────
const TimeString = z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis");
export const OperatingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  open_time: TimeString,
  close_time: TimeString,
  is_closed: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)),
});

// ── Hours Exception ─────────────────────────────────────────────────────────
export const HoursExceptionSchema = z.object({
  id: z.string().optional(),
  label_fr: z.string().max(80).optional().default(""),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_closed: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)).default(1),
  open_time: TimeString.optional(),
  close_time: TimeString.optional(),
});
export type HoursException = z.infer<typeof HoursExceptionSchema>;

// ── Reservation ─────────────────────────────────────────────────────────────
export const ReservationCreateSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: TunisianPhoneOrEmpty,
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: TimeString,
  party_size: z.number().int().min(1).max(100),
  notes: z.string().max(500).optional().default(""),
});

// ── Order ───────────────────────────────────────────────────────────────────
export const OrderItemSchema = z.object({
  menu_item_id: z.string().optional(),
  quantity: z.number().int().min(1).max(99),
  unit_price: z.number().nonnegative(), // legacy decimal from client; server re-validates from DB
  item_name: z.string().min(1).max(200),
});

export const OrderCreateSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(6).max(30),
  order_type: z.enum(["dine_in", "pickup", "delivery"]),
  notes: z.string().max(500).optional().default(""),
  items: z.array(OrderItemSchema).min(1, "La commande doit contenir au moins un article"),
});

// ── Upload ──────────────────────────────────────────────────────────────────
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

// ── Auth ────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  username: z.string().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const PasswordSchema = z
  .string()
  .min(8, "Le mot de passe doit comporter au moins 8 caractères")
  .regex(/[A-Z]/, "Doit contenir une majuscule")
  .regex(/[0-9]/, "Doit contenir un chiffre");

// ── Reorder ─────────────────────────────────────────────────────────────────
export const ReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

