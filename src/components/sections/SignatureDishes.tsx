import Image from "next/image";
import Link from "next/link";
import { signatureDishes } from "@/content/menu";
import type { PublicDish } from "@/lib/db/menuAdapter";
import { site, type Locale } from "@/config/site.config";
import { formatPrice } from "@/lib/format";
import { Section, Container, Heading } from "@/components/ui/Layout";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion/Reveal";
import { Card3D } from "@/components/ui/Card3D";
import { stagger } from "@/lib/motion";
import { Button } from "@/components/ui/Button";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
  dishes?: PublicDish[];
};

const TAG_VARIANT: Record<string, "gold" | "accent" | "green" | "default"> = {
  signature: "gold",
  spicy: "accent",
  vegetarian: "green",
  new: "gold",
  halal: "default",
};

export function SignatureDishes({ locale, messages, dishes }: Props) {
  const t = messages.signature;
  const mt = messages.menu_page;

  const displayDishes = (dishes && dishes.length > 0 ? dishes : signatureDishes).slice(0, 3);

  return (
    <Section id="signature" className="bg-surface-soft py-24 md:py-32">
      <Container>
        {/* Section header */}
        <Reveal className="mb-14 text-center">
          <p className="mb-2 font-display italic text-terracotta text-lg md:text-xl">
            {locale === "ar" ? "تذوق التميز" : locale === "en" ? "Taste of Excellence" : "L'Excellence Culinaire"}
          </p>
          <Heading as="h2" size="xl" className="text-ink font-semibold tracking-tight">
            {t.heading}
          </Heading>
          <p className="mt-3 font-body text-sm md:text-base text-ink-muted max-w-lg mx-auto">
            {t.subheading}
          </p>
        </Reveal>

        {/* Dishes grid */}
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {displayDishes.map((dish, i) => (
            <Reveal
              key={dish.id}
              as="li"
              delay={Math.min(i, 7) * stagger.base}
              className="h-full"
            >
              <Card3D maxTilt={7} className="h-full rounded-3xl border border-line bg-surface-card p-6 shadow-md transition-all hover:shadow-2xl hover:border-gold/60 flex flex-col justify-between">
                <div>
                  {/* Dish image with 3D pop */}
                  <div
                    className="relative mb-5 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-sand/20 shadow-inner"
                    style={{ transform: "translateZ(24px)", transformStyle: "preserve-3d" }}
                  >
                    <Image
                      src={dish.image ?? "/images/menu/dish-couscous.jpg"}
                      alt={dish.name[locale]}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-[--ease-soft] group-hover:scale-105"
                    />
                  </div>

                  {/* Tags with 3D float */}
                  <div
                    className="mb-2.5 flex flex-wrap gap-1.5"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    {dish.tags?.map((tag) => (
                      <Badge key={tag} variant={TAG_VARIANT[tag] ?? "default"}>
                        {mt[`tag_${tag}`] ?? tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Dish Name */}
                  <h3
                    className="font-display text-2xl font-semibold text-ink group-hover:text-brand transition-colors"
                    style={{ transform: "translateZ(20px)" }}
                  >
                    {dish.name[locale]}
                  </h3>

                  {/* Description */}
                  {dish.description && (
                    <p
                      className="mt-2 font-body text-sm leading-relaxed text-ink-muted line-clamp-2"
                      style={{ transform: "translateZ(16px)" }}
                    >
                      {dish.description[locale]}
                    </p>
                  )}
                </div>

                {/* Price & CTA */}
                <div
                  className="mt-6 border-t border-line/60 pt-4 flex items-center justify-between"
                  style={{ transform: "translateZ(22px)" }}
                >
                  <span className="font-body text-xl font-bold text-brand">
                    {formatPrice(dish.price, locale)}
                  </span>
                  <Button
                    href={`/${locale}/#menu`}
                    variant="secondary"
                    size="sm"
                  >
                    {locale === "ar" ? "اكتشف" : locale === "en" ? "Explore" : "Découvrir"}
                  </Button>
                </div>
              </Card3D>
            </Reveal>
          ))}
        </ul>

        {/* View full menu CTA */}
        <Reveal className="mt-14 text-center">
          <Button
            href={`/${locale}/#menu`}
            variant="secondary"
            size="md"
          >
            {messages.menu_section.view_full}
          </Button>
        </Reveal>
      </Container>
    </Section>
  );
}
