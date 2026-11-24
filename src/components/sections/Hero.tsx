import Image from "next/image";
import { site, type Locale } from "@/config/site.config";
import { features } from "@/config/features";
import { SplitWords } from "@/components/motion/SplitWords";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import type { HomepageContent, RestaurantSettings } from "@/lib/db/queries";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
  content?: HomepageContent;
  settings?: RestaurantSettings;
};

export function Hero({ locale, messages, content, settings }: Props) {
  const t = messages.hero;
  const headline = (content && content[`hero_title_${locale}` as keyof HomepageContent] as string) || site.tagline[locale];
  const heroImage = content?.hero_image || site.images.hero;
  const restaurantName = (settings && settings[`name_${locale}` as keyof RestaurantSettings] as string) || site.name[locale];

  return (
    <section className="relative flex min-h-screen items-end overflow-hidden bg-surface-dark pb-20 md:pb-28">
      {/* Background photo — LCP, priority, never gated behind opacity-0 */}
      <Image
        src={heroImage}
        alt={restaurantName}
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ zIndex: 0 }}
      />

      {/* Dark gradient overlay for contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(9,37,31,0.92) 0%, rgba(9,37,31,0.45) 55%, rgba(9,37,31,0.2) 100%)",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        style={{ zIndex: 2 }}
      >
        {/* Restaurant name flourish */}
        <Reveal delay={0.2}>
          <p className="mb-4 font-display text-lg italic text-gold md:text-2xl">
            {restaurantName}
          </p>
        </Reveal>

        {/* Headline */}
        <h1 className="mb-8 max-w-4xl font-display text-[clamp(2.5rem,5.2vw,5.25rem)] font-semibold leading-[1.08] text-ink-inverse tracking-tight">
          <SplitWords text={headline} />
        </h1>

        {/* CTAs */}
        <Reveal delay={0.6} className="flex flex-wrap items-center gap-4">
          {features.reservations && (
            <Button
              href={`/${locale}/reserve`}
              variant="primary"
              size="md"
              className="h-11 px-7 text-sm font-semibold tracking-wide shadow-lg shadow-black/25 focus-visible:ring-offset-forest"
            >
              {t.cta_reserve}
            </Button>
          )}
          <Button
            href={`/${locale}/#menu`}
            variant="outline-inverse"
            size="md"
            className="h-11 px-7 text-sm font-semibold tracking-wide focus-visible:ring-offset-forest"
          >
            {t.cta_menu}
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
