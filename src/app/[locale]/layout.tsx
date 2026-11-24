import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site, type Locale } from "@/config/site.config";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { LocaleSync } from "@/components/ui/LocaleSync";

/**
 * Get the base URL for metadata
 * Uses SITE_URL env var in production, falls back to localhost in development
 */
function getMetadataBase(): URL {
  const siteUrl = process.env.SITE_URL;
  if (siteUrl) {
    try {
      return new URL(siteUrl);
    } catch {
      // Invalid URL, fall back
    }
  }
  // Development fallback
  return new URL("http://localhost:3000");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const name = site.name[locale as Locale] ?? site.name[site.defaultLocale];
  const tagline = site.tagline[locale as Locale] ?? site.tagline[site.defaultLocale];
  const baseUrl = getMetadataBase();

  return {
    metadataBase: baseUrl,
    title: { default: name, template: `%s — ${name}` },
    description: tagline,
    openGraph: {
      title: name,
      description: tagline,
      type: "website",
      images: [{ url: site.images.hero }],
    },
    other: {
      "application/ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Restaurant",
        name: name,
        description: tagline,
        address: {
          "@type": "PostalAddress",
          streetAddress: site.address.street,
          addressLocality: site.address.city,
          addressCountry: "TN",
        },
        url: baseUrl.toString(),
        servesCuisine: "Tunisian, Mediterranean",
        hasMap: site.address.mapsUrl,
        telephone: site.contact.phone,
        email: site.contact.email,
        menu: `${baseUrl.toString()}/${locale}/menu`,
      }),
    },
  };
}

export function generateStaticParams() {
  return site.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!site.locales.includes(locale as Locale)) notFound();

  return (
    <div
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="min-h-screen w-full bg-[#0B251D] text-[#F5EFEB]"
    >
      <LocaleSync locale={locale as Locale} />
      <SmoothScroll>{children}</SmoothScroll>
    </div>
  );
}
