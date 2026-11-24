import { getMessages } from "next-intl/server";
import { type Locale, site } from "@/config/site.config";
import { telLink, waLink } from "@/lib/contact";
import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
import { BrandStory } from "@/components/sections/BrandStory";
import { SignatureDishes } from "@/components/sections/SignatureDishes";
import { MenuCategories } from "@/components/sections/MenuCategories";
import { Gallery } from "@/components/sections/Gallery";
import { ReserveCta } from "@/components/sections/ReserveCta";
import { Visit } from "@/components/sections/Visit";
import { Footer } from "@/components/sections/Footer";
import {
  getRestaurantSettings,
  getHomepageContent,
  getOperatingHours,
  getGalleryImages,
} from "@/lib/db/queries";
import { getPublicMenu, getPublicSignatureDishes } from "@/lib/db/menuAdapter";

export const revalidate = 0; // Dynamic server rendering for live admin updates

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = (await getMessages()) as Record<string, Record<string, string>>;

  // Fetch dynamic database content
  const settings = getRestaurantSettings();
  const homepage = getHomepageContent();
  const menuCategories = getPublicMenu();
  const signatureDishes = getPublicSignatureDishes();
  const hours = getOperatingHours();
  const galleryImages = getGalleryImages();

  const phone = settings?.phone || site.contact.phone;
  const whatsapp = settings?.whatsapp || site.contact.whatsapp;

  return (
    <main>
      <Nav locale={locale as Locale} messages={messages} />
      <Hero
        locale={locale as Locale}
        messages={messages}
        content={homepage}
        settings={settings}
      />
      <BrandStory
        locale={locale as Locale}
        messages={messages}
        content={homepage}
      />
      <SignatureDishes
        locale={locale as Locale}
        messages={messages}
        dishes={signatureDishes}
      />
      <MenuCategories
        locale={locale as Locale}
        messages={messages}
        categories={menuCategories}
      />
      {(settings?.is_gallery_enabled ?? 1) === 1 && (
        <Gallery locale={locale as Locale} messages={messages} />
      )}
      <Visit
        locale={locale as Locale}
        messages={messages}
        settings={settings}
        hours={hours}
      />
      <ReserveCta locale={locale as Locale} messages={messages} />
      <Footer locale={locale as Locale} messages={messages} />

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[#1b4e3e]/60 bg-[#071c16]/95 backdrop-blur-md md:hidden text-ink-inverse">
        <a
          href={telLink(phone)}
          className="flex flex-1 flex-col items-center gap-0.5 py-3 font-body text-xs text-ink-inverse/80 hover:text-gold"
        >
          📞
          <span>{messages.visit?.call || "Appeler"}</span>
        </a>
        <a
          href={waLink(whatsapp, "")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 flex-col items-center gap-0.5 py-3 font-body text-xs text-ink-inverse/80 hover:text-gold"
        >
          💬
          <span>WhatsApp</span>
        </a>
        {(settings?.is_reservations_enabled ?? 1) === 1 && (
          <a
            href={`/${locale}/reserve`}
            className="flex flex-1 flex-col items-center gap-0.5 bg-cta py-3 font-body text-xs font-semibold text-cta-ink"
          >
            🗓
            <span>{messages.nav?.reserve || "Réserver"}</span>
          </a>
        )}
        {(settings?.is_ordering_enabled ?? 1) === 1 && !(settings?.is_reservations_enabled) && (
          <a
            href={`/${locale}/order`}
            className="flex flex-1 flex-col items-center gap-0.5 bg-cta py-3 font-body text-xs font-semibold text-cta-ink"
          >
            🛍️
            <span>{messages.nav?.order || "Commander"}</span>
          </a>
        )}
      </div>
    </main>
  );
}
