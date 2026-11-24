// ─────────────────────────────────────────────────────────────────────────────
// CLIENT CONFIG — All client-specific data lives here.
// Nothing in this file should ever be hard-coded into a component.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  name: {
    fr: "Dar Zitoun",        // ← SAMPLE — replace with real name
    ar: "دار الزيتون",
    en: "Dar Zitoun",
  },
  tagline: {
    fr: "Cuisine tunisienne authentique — Tunis depuis 2015",
    ar: "مطبخ تونسي أصيل — تونس منذ 2015",
    en: "Authentic Tunisian cuisine — Tunis since 2015",
  },
  locales: ["fr", "ar", "en"] as const,
  defaultLocale: "fr" as const,

  currency: "TND",

  contact: {
    phone:     "+216 71 000 000",        // ← SAMPLE
    whatsapp:  "+21671000000",           // ← SAMPLE
    email:     "contact@darzitoun.tn",  // ← SAMPLE
    instagram: "https://instagram.com/darzitoun",  // ← SAMPLE
    facebook:  "https://facebook.com/darzitoun",   // ← SAMPLE
  },

  address: {
    street:   "12 Rue de la Kasbah",    // ← SAMPLE
    city:     "Tunis 1006",             // ← SAMPLE
    mapsUrl:  "https://maps.google.com/?q=Tunis+Medina", // ← SAMPLE
    lat:      36.7987,
    lng:      10.1707,
  },

  hours: [
    { days: [1, 2, 3, 4, 5], open: "12:00", close: "23:00" }, // Mon–Fri
    { days: [6, 0],           open: "11:00", close: "00:00" }, // Sat–Sun
  ],

  images: {
    hero:    "/images/hero-main.jpg",
    story:   "/images/story-main.jpg",
    gallery: [
      "/images/gal-1.jpg",
      "/images/gal-2.jpg",
      "/images/gal-3.jpg",
      "/images/gal-4.jpg",
      "/images/gal-5.jpg",
      "/images/gal-6.jpg",
    ],
  },

  theme: "default",
} as const;

export type Locale = (typeof site.locales)[number];

