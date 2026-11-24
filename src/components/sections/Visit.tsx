import { site, type Locale } from "@/config/site.config";
import { isOpenNow, formatHours, getDayName } from "@/lib/format";
import { telLink, waLink, mapsLink } from "@/lib/contact";
import { Section, Container, Heading } from "@/components/ui/Layout";
import { Reveal } from "@/components/motion/Reveal";
import { Card3D } from "@/components/ui/Card3D";
import type { RestaurantSettings, OperatingHour } from "@/lib/db/queries";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
  settings?: RestaurantSettings;
  hours?: OperatingHour[];
};

const DAY_RANGES: Record<Locale, (days: number[]) => string> = {
  fr: (days) => days.map((d) => getDayName(d, "fr")).join(", "),
  ar: (days) => days.map((d) => getDayName(d, "ar")).join("، "),
  en: (days) => days.map((d) => getDayName(d, "en")).join(", "),
};

export function Visit({ locale, messages, settings, hours }: Props) {
  const t = messages.visit;

  const phone = settings?.phone || site.contact.phone;
  const whatsapp = settings?.whatsapp || site.contact.whatsapp;
  const email = settings?.email || site.contact.email;
  const street = settings?.address_street || site.address.street;
  const city = settings?.address_city || site.address.city;
  const mapsUrl = settings?.maps_url || site.address.mapsUrl;

  const activeHours = hours && hours.length > 0 ? hours : (site.hours as unknown as Array<{ days: number[]; open: string; close: string }>);
  const open = isOpenNow(site.hours as unknown as Array<{ days: number[]; open: string; close: string }>);

  return (
    <Section id="visit" className="bg-surface-soft py-24 md:py-32">
      <Container>
        <Reveal className="mb-14 text-center">
          <p className="mb-2 font-display italic text-terracotta text-lg">
            {locale === "ar" ? "مرحباً بكم" : locale === "en" ? "Welcome" : "Bienvenue"}
          </p>
          <Heading as="h2" size="lg" className="text-ink font-semibold tracking-tight">
            {t.heading}
          </Heading>
        </Reveal>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Address */}
          <Reveal className="h-full">
            <Card3D maxTilt={6} className="h-full rounded-3xl border border-line bg-surface-card p-6 sm:p-8 space-y-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold text-brand">
                  {locale === "ar" ? "العنوان" : locale === "en" ? "Address" : "Adresse"}
                </h3>
                <p className="mt-3 font-body text-ink-muted leading-relaxed text-base">
                  {street}
                  <br />
                  {city}
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={mapsLink(mapsUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-brand bg-brand/5 px-5 py-2.5 font-body text-sm font-semibold text-brand transition-all hover:bg-brand hover:text-white hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span>📍 {t.directions}</span>
                  <span className="rtl:-scale-x-100">→</span>
                </a>
              </div>
            </Card3D>
          </Reveal>

          {/* Hours */}
          <Reveal delay={0.1} className="h-full">
            <Card3D maxTilt={6} className="h-full rounded-3xl border border-line bg-surface-card p-6 sm:p-8 space-y-4 shadow-md hover:shadow-xl transition-all">
              <h3 className="font-display text-2xl font-semibold text-brand">
                {locale === "ar" ? "أوقات العمل" : locale === "en" ? "Opening Hours" : "Horaires"}
              </h3>
              {/* Open/Closed badge with pulsing dot */}
              <div className="flex items-center gap-2" suppressHydrationWarning>
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${open ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${open ? "bg-emerald-600" : "bg-red-500"}`} />
                </span>
                <span className="font-body text-sm font-semibold text-ink" suppressHydrationWarning>
                  {open ? t.open_now : t.closed}
                </span>
              </div>
              <ul className="space-y-2.5 border-t border-line/60 pt-3">
                {hours && hours.length > 0 ? (
                  hours.map((h) => (
                    <li key={h.day_of_week} className="flex justify-between font-body text-sm text-ink-muted">
                      <span>{locale === "ar" ? h.day_name_ar : locale === "en" ? h.day_name_en : h.day_name_fr}</span>
                      <span dir="ltr" className="text-ink font-medium">
                        {h.is_closed ? (locale === "ar" ? "مغلق" : "Fermé") : formatHours(h.open_time, h.close_time)}
                      </span>
                    </li>
                  ))
                ) : (
                  (site.hours as unknown as Array<{ days: number[]; open: string; close: string }>).map((slot, i) => (
                    <li key={i} className="flex justify-between font-body text-sm text-ink-muted">
                      <span>{DAY_RANGES[locale](slot.days)}</span>
                      <span dir="ltr" className="text-ink font-medium">{formatHours(slot.open, slot.close)}</span>
                    </li>
                  ))
                )}
              </ul>
            </Card3D>
          </Reveal>

          {/* Contact */}
          <Reveal delay={0.2} className="h-full md:col-span-2 lg:col-span-1">
            <Card3D maxTilt={6} className="h-full rounded-3xl border border-line bg-surface-card p-6 sm:p-8 space-y-4 shadow-md hover:shadow-xl transition-all">
              <h3 className="font-display text-2xl font-semibold text-brand">
                {locale === "ar" ? "تواصل معنا" : locale === "en" ? "Contact" : "Contact"}
              </h3>
              <div className="flex flex-col gap-3 pt-1">
                <a
                  href={telLink(phone)}
                  className="inline-flex min-h-[44px] items-center gap-3 rounded-xl border border-line/70 bg-surface px-4 py-2.5 font-body text-sm text-ink transition-all hover:border-brand hover:text-brand hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span className="text-base" aria-hidden="true">📞</span>
                  <bdi dir="ltr" className="font-medium">{phone}</bdi>
                </a>
                <a
                  href={waLink(whatsapp, "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-3 rounded-xl border border-line/70 bg-surface px-4 py-2.5 font-body text-sm text-ink transition-all hover:border-brand hover:text-brand hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span className="text-base" aria-hidden="true">💬</span>
                  <span className="font-medium">WhatsApp Direct</span>
                </a>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex min-h-[44px] items-center gap-3 rounded-xl border border-line/70 bg-surface px-4 py-2.5 font-body text-sm text-ink transition-all hover:border-brand hover:text-brand hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span className="text-base" aria-hidden="true">✉️</span>
                  <span className="font-medium truncate">{email}</span>
                </a>
              </div>
            </Card3D>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
