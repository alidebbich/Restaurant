import Image from "next/image";
import { getMessages } from "next-intl/server";
import { menu, type Locale as MenuLocale } from "@/content/menu";
import { type Locale, site } from "@/config/site.config";
import { features } from "@/config/features";
import { formatPrice } from "@/lib/format";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { Container, Heading, Section } from "@/components/ui/Layout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card3D } from "@/components/ui/Card3D";
import { Reveal } from "@/components/motion/Reveal";
import { stagger } from "@/lib/motion";
import { getPublicMenu, type PublicCategory } from "@/lib/db/menuAdapter";

const TAG_VARIANT: Record<string, "gold" | "accent" | "green" | "default"> = {
  signature: "gold",
  spicy: "accent",
  vegetarian: "green",
  new: "gold",
  halal: "default",
};

export default async function MenuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = (await getMessages()) as Record<string, Record<string, string>>;
  const mt = messages.menu_page;

  const dbMenu = getPublicMenu();
  const menuList: PublicCategory[] =
    dbMenu && dbMenu.length > 0 ? dbMenu : (menu as unknown as PublicCategory[]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <Nav locale={locale as Locale} messages={messages} />

      {/* Page Hero Header */}
      <div className="relative overflow-hidden bg-surface-dark pt-36 pb-20 text-center text-ink-inverse">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(197, 168, 105, 0.45) 0%, transparent 70%)",
          }}
        />

        <Container className="relative z-10">
          <p className="mb-2 font-display italic text-gold text-xl md:text-2xl">
            {site.name[locale as Locale]}
          </p>
          <Heading as="h1" size="xl" className="text-ink-inverse font-semibold tracking-tight">
            {mt.heading}
          </Heading>
          <p className="mt-3 font-body text-base md:text-lg text-ink-inverse/80 max-w-xl mx-auto leading-relaxed">
            {locale === "ar"
              ? "استكشف أطباقنا التونسية الأصيلة المحضرة بعناية فائقة وتوابل طازجة وزيت زيتون بكر"
              : locale === "en"
              ? "Explore our authentic Tunisian Mediterranean specialties crafted with seasonal fresh ingredients and extra virgin olive oil"
              : "Découvrez nos spécialités tunisiennes méditerranéennes préparées avec passion et huile d'olive vierge extra"}
          </p>

          {/* Quick Category Anchors (Filter pills) */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {menuList.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="rounded-full border border-gold/30 bg-forest/50 px-4 py-2 font-body text-xs sm:text-sm font-medium text-cream backdrop-blur-sm transition-all hover:border-gold hover:text-gold hover:bg-forest/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {category.title[locale as MenuLocale]}
              </a>
            ))}
          </div>

          {features.ordering && (
            <div className="mt-7">
              <Button
                href={`/${locale}/order`}
                variant="primary"
                size="md"
                className="shadow-lg shadow-black/25"
              >
                🛍️ {messages.nav?.order || "Commander"}
              </Button>
            </div>
          )}
        </Container>
      </div>

      {/* Full menu sections */}
      <Section className="py-16 md:py-24">
        <Container>
          {menuList.map((category) => (
            <div key={category.id} id={category.id} className="mb-20 scroll-mt-28 last:mb-0">
              <Reveal>
                <div className="mb-10 flex items-center gap-4 border-b border-line pb-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                  <Heading as="h2" size="lg" className="text-ink font-semibold tracking-tight">
                    {category.title[locale as MenuLocale]}
                  </Heading>
                  <span className="font-body text-xs sm:text-sm text-ink-muted ms-auto font-medium">
                    {category.dishes.length} {locale === "ar" ? "أطباق" : "plats"}
                  </span>
                </div>
              </Reveal>

              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {category.dishes.map((dish, di) => {
                  const isAvailable = dish.is_available ?? true;
                  return (
                    <Reveal
                      key={dish.id}
                      as="li"
                      delay={Math.min(di, 7) * stagger.base}
                      className="h-full"
                    >
                      <Card3D maxTilt={6} className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-6 transition-all ${
                        !isAvailable
                          ? "opacity-60 grayscale-[30%] border-stone-200 bg-sand/10"
                          : "border-line bg-surface-card shadow-sm hover:border-gold/60 hover:shadow-xl"
                      }`}>
                        <div>
                          {/* Dish Image */}
                          {dish.image && (
                            <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-sand/20 shadow-inner">
                              <Image
                                src={dish.image}
                                alt={dish.name[locale as MenuLocale]}
                                fill
                                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                                priority={di < 3}
                                className="object-cover transition-transform duration-700 ease-[--ease-soft] group-hover:scale-105"
                              />
                            </div>
                          )}

                          {/* Dietary badges & Sold out badge */}
                          <div className="mb-2.5 flex flex-wrap gap-1.5">
                            {!isAvailable && (
                              <span className="rounded-full bg-red-100 border border-red-300 px-2.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider text-red-800">
                                {locale === "ar" ? "نفذ اليوم" : locale === "en" ? "Sold Out" : "Épuisé aujourd'hui"}
                              </span>
                            )}
                            {dish.tags?.map((tag) => (
                              <Badge key={tag} variant={TAG_VARIANT[tag] ?? "default"}>
                                {mt[`tag_${tag}`] ?? tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Dish title */}
                          <h3 className={`font-display text-xl font-semibold transition-colors ${
                            !isAvailable ? "text-ink/50 line-through decoration-gold/50" : "text-ink group-hover:text-brand"
                          }`}>
                            {dish.name[locale as MenuLocale]}
                          </h3>

                          {/* Description */}
                          {dish.description && (
                            <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted line-clamp-2">
                              {dish.description[locale as MenuLocale]}
                            </p>
                          )}
                        </div>

                        {/* Price and Order CTA */}
                        <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4">
                          <span className={`font-body text-xl font-bold ${!isAvailable ? "text-ink/40" : "text-brand"}`}>
                            {formatPrice(dish.price, locale as Locale)}
                          </span>
                          {features.ordering && isAvailable && (
                            <Button
                              href={`/${locale}/order`}
                              variant="secondary"
                              size="sm"
                            >
                              {locale === "ar" ? "طلب" : "Commander"}
                            </Button>
                          )}
                        </div>
                      </Card3D>
                    </Reveal>
                  );
                })}
              </ul>
            </div>
          ))}
        </Container>
      </Section>

      <Footer locale={locale as Locale} messages={messages} />
    </div>
  );
}
