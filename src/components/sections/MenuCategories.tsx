"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { menu, type Dish, type Locale as MenuLocale } from "@/content/menu";
import type { PublicCategory, PublicDish } from "@/lib/db/menuAdapter";
import { type Locale } from "@/config/site.config";
import { formatPrice } from "@/lib/format";
import { Container, Heading } from "@/components/ui/Layout";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion/Reveal";
import { Card3D } from "@/components/ui/Card3D";
import { ease, dur } from "@/lib/motion";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
  categories?: PublicCategory[];
};

const TAG_VARIANT: Record<string, "gold" | "accent" | "green" | "default"> = {
  signature: "gold",
  spicy: "accent",
  vegetarian: "green",
  new: "gold",
  halal: "default",
};

export function MenuCategories({ locale, messages, categories }: Props) {
  const t = messages.menu_section;
  const mt = messages.menu_page;
  const reduce = useReducedMotion();

  const menuList = categories && categories.length > 0 ? categories : (menu as unknown as PublicCategory[]);

  const [activeCatId, setActiveCatId] = useState<string>(menuList[0]?.id ?? "");
  const activeCategory = menuList.find((c) => c.id === activeCatId) ?? menuList[0];

  const [selectedDish, setSelectedDish] = useState<PublicDish | Dish>(
    activeCategory?.dishes[0] ?? menuList[0]?.dishes[0]
  );

  const handleCategoryChange = (catId: string) => {
    setActiveCatId(catId);
    const cat = menuList.find((c) => c.id === catId);
    if (cat && cat.dishes.length > 0) {
      setSelectedDish(cat.dishes[0]);
    }
  };

  return (
    <section id="menu" className="relative overflow-hidden bg-surface py-24 md:py-36 text-ink">
      {/* Delicate warm ambient lighting */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 30% 40%, rgba(197, 168, 105, 0.15) 0%, transparent 65%), radial-gradient(ellipse at 80% 70%, rgba(18, 60, 48, 0.05) 0%, transparent 60%)",
        }}
      />

      <Container className="relative z-10">
        {/* Section Header */}
        <div className="mb-14 text-center">
          <Reveal>
            <p className="mb-2 font-display italic text-terracotta text-lg md:text-xl">
              {locale === "ar" ? "قائمتنا المختارة" : locale === "en" ? "Artisanal Selection" : "Notre Carte Raffinée"}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Heading as="h2" size="xl" className="text-ink tracking-tight font-semibold">
              {t.heading}
            </Heading>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-3 font-body text-sm md:text-base text-ink-muted max-w-lg mx-auto">
              {locale === "ar"
                ? "رحلة في فن الطهي التونسي مع لمسات بحر أبيض متوسطي راقية"
                : locale === "en"
                ? "An authentic culinary journey through traditional Tunisian Mediterranean flavours"
                : "Un voyage culinaire authentique à travers les saveurs de la Tunisie méditerranéenne"}
            </p>
          </Reveal>
        </div>

        {/* ── Main Showcase: Large Circular Plate (Left) + Editorial Menu Panel (Right) ── */}
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Big Interactive Overhead Plate with 3D Tilt */}
          <div className="flex flex-col items-center justify-center lg:col-span-6">
            <Card3D maxTilt={9} scale={1.02} className="relative aspect-square w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[460px]">
              {/* Soft realistic drop shadow under the plate */}
              <div
                className="absolute inset-4 -bottom-6 rounded-full blur-2xl opacity-40"
                style={{
                  background:
                    "radial-gradient(circle, rgba(18, 60, 48, 0.45) 20%, transparent 70%)",
                }}
              />

              {/* Decorative delicate gold ambient rim */}
              <div className="absolute inset-0 rounded-full border border-gold/40 scale-[1.03] pointer-events-none" />

              {/* Animated Plate Container */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDish.id}
                  initial={reduce ? undefined : { opacity: 0, scale: 0.94, rotate: -4 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.94, rotate: 4 }}
                  transition={{ duration: 0.5, ease: ease.outExpo }}
                  className="relative h-full w-full overflow-hidden rounded-full border-4 border-sand/70 shadow-[0_25px_50px_rgba(18,60,48,0.2)] bg-surface-card"
                  style={{ transform: "translateZ(25px)", transformStyle: "preserve-3d" }}
                >
                  <Image
                    src={selectedDish.image ?? "/images/menu/dish-couscous.jpg"}
                    alt={selectedDish.name[locale as MenuLocale]}
                    fill
                    sizes="(min-width: 1024px) 460px, 90vw"
                    className="object-cover transition-transform duration-700 ease-[--ease-soft] hover:scale-105"
                    priority
                    loading="eager"
                  />
                  {/* Subtle vignette over the plate rim */}
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(18,60,48,0.25)] pointer-events-none" />
                </motion.div>
              </AnimatePresence>

              {/* Scattered culinary spice / herb accent dots */}
              <div className="absolute -bottom-4 -end-4 h-3 w-3 rounded-full bg-accent/80 blur-[0.5px]" />
              <div className="absolute -top-3 -start-2 h-2.5 w-2.5 rounded-full bg-gold/80 blur-[0.5px]" />
              <div className="absolute top-1/2 -start-6 h-2 w-2 rounded-full bg-olive/80" />
            </Card3D>

            {/* Dish caption beneath the hero plate */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDish.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: dur.micro, ease: ease.soft }}
                className="mt-6 text-center"
              >
                <div className="mb-2 flex justify-center gap-1.5">
                  {selectedDish.tags?.map((tag) => (
                    <Badge key={tag} variant={TAG_VARIANT[tag] ?? "default"}>
                      {mt[`tag_${tag}`] ?? tag}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-display text-2xl font-semibold text-brand">
                  {selectedDish.name[locale as MenuLocale]}
                </h3>
                <p className="mt-1 font-body text-xl font-bold text-gold">
                  {formatPrice(selectedDish.price, locale)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Editorial Menu Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-line bg-surface-card p-6 sm:p-8 shadow-xl shadow-stone-900/5">
              {/* Category tabs */}
              <div
                className="mb-6 flex overflow-x-auto gap-2 border-b border-line/60 pb-3"
                data-lenis-prevent
              >
                {menuList.map((cat) => {
                  const isActive = activeCatId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`relative flex-shrink-0 rounded-full px-4 py-2 font-body text-xs sm:text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                        isActive
                          ? "bg-brand text-white font-semibold shadow-md"
                          : "text-ink-muted hover:text-brand hover:bg-sand/30"
                      }`}
                    >
                      {cat.title[locale as MenuLocale]}
                    </button>
                  );
                })}
              </div>

              {/* Dish List inside the card */}
              <AnimatePresence mode="wait">
                <motion.ul
                  key={activeCatId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: dur.micro, ease: ease.soft }}
                  className="space-y-3 max-h-[420px] overflow-y-auto pe-2"
                  data-lenis-prevent
                >
                  {activeCategory.dishes.map((dish) => {
                    const isSelected = selectedDish.id === dish.id;
                    const isAvailable = (dish as PublicDish).is_available ?? true;
                    return (
                      <li
                        key={dish.id}
                        onClick={() => setSelectedDish(dish)}
                        onMouseEnter={() => setSelectedDish(dish)}
                        className={`group relative flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-3.5 transition-all ${
                          !isAvailable
                            ? "opacity-60 grayscale-[40%] border-transparent bg-sand/10"
                            : isSelected
                            ? "border-gold/70 bg-surface-soft/80 shadow-sm ring-1 ring-gold/40"
                            : "border-transparent bg-white hover:border-sand/60 hover:bg-surface-soft/40"
                        }`}
                      >
                        {/* Miniature dish thumbnail */}
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-gold/40 shadow-sm bg-sand/20">
                          <Image
                            src={dish.image ?? "/images/menu/dish-couscous.jpg"}
                            alt={dish.name[locale as MenuLocale]}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>

                        {/* Title and ingredients */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`font-display text-base sm:text-lg font-medium truncate ${
                                !isAvailable
                                  ? "text-ink-muted line-through decoration-gold/50"
                                  : isSelected
                                  ? "text-brand font-semibold"
                                  : "text-ink group-hover:text-brand"
                              }`}
                            >
                              {dish.name[locale as MenuLocale]}
                            </h4>
                            {dish.tags?.includes("signature") && (
                              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                            )}
                            {!isAvailable && (
                              <span className="rounded-full bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                {locale === "ar" ? "نفذ" : locale === "en" ? "Sold out" : "Épuisé"}
                              </span>
                            )}
                          </div>
                          {dish.description && (
                            <p className="mt-0.5 line-clamp-1 font-body text-xs text-ink-muted">
                              {dish.description[locale as MenuLocale]}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-end flex-shrink-0">
                          <span
                            className={`font-body text-sm font-bold ${
                              !isAvailable
                                ? "text-ink-muted"
                                : isSelected
                                ? "text-brand"
                                : "text-brand/80 group-hover:text-brand"
                            }`}
                          >
                            {formatPrice(dish.price, locale)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </motion.ul>
              </AnimatePresence>

              {/* View Full Menu CTA */}
              <div className="mt-6 border-t border-line/60 pt-4 text-center">
                <Link
                  href={`/${locale}/menu`}
                  className="inline-flex items-center gap-2 rounded-full border border-brand bg-brand/5 hover:bg-brand hover:text-white px-6 py-2.5 font-body text-sm font-semibold text-brand transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span>{t.view_full}</span>
                  <span className="transition-transform duration-200 hover:translate-x-1 rtl:-scale-x-100">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Showcase: Duo Plates Presentation ── */}
        <div className="mt-28 border-t border-line/60 pt-20">
          <Reveal className="mb-12 text-center">
            <p className="font-display italic text-terracotta text-lg">
              {locale === "ar" ? "أطباقنا المميزة" : locale === "en" ? "Chef's Specials" : "Les Créations du Chef"}
            </p>
            <h3 className="mt-1 font-display text-2xl md:text-3xl font-semibold text-ink">
              {locale === "ar" ? "إبداعات الطهي التونسي" : locale === "en" ? "Tunisian Culinary Art" : "L'Art Culinaire Tunisien"}
            </h3>
          </Reveal>

          <div className="relative mx-auto flex max-w-4xl flex-col items-center justify-center gap-8 md:flex-row md:gap-14">
            {/* Left Plate: Royal Lamb Couscous with 3D Tilt */}
            <Reveal className="flex flex-col items-center text-center">
              <Card3D maxTilt={7} className="relative aspect-square w-64 sm:w-72 overflow-hidden rounded-full border-4 border-sand/70 shadow-[0_20px_45px_rgba(18,60,48,0.15)] bg-surface-card">
                <Image
                  src="/images/menu/dish-couscous.jpg"
                  alt="Tunisian Couscous"
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
              </Card3D>
              <h4 className="mt-4 font-display text-xl font-semibold text-ink">
                {locale === "ar" ? "كسكسي بالكتف والبهارات" : locale === "en" ? "Royal Lamb Couscous" : "Couscous Royal à l'Agneau"}
              </h4>
              <p className="mt-0.5 font-body text-xs text-ink-muted max-w-xs">
                {locale === "ar"
                  ? "سميد مبخر ببطء مع كتف غنم طري وخضروات موسمية"
                  : locale === "en"
                  ? "Steamed golden semolina with tender braised lamb and garden vegetables"
                  : "Semoule fine cuite à la vapeur, agneau confit et légumes"}
              </p>
              <span className="mt-2 font-body text-base font-bold text-brand">32,000 DT</span>
            </Reveal>

            {/* Center Decorative Vintage Silverware / Fork Divider */}
            <div className="hidden md:flex flex-col items-center justify-center px-4 py-2">
              <div className="h-10 w-px bg-gradient-to-b from-transparent via-gold/40 to-gold/70" />
              <div className="my-4 relative">
                {/* Vintage Fork SVG with realistic drop shadow */}
                <svg
                  width="22"
                  height="120"
                  viewBox="0 0 24 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gold drop-shadow-[0_4px_8px_rgba(18,60,48,0.25)]"
                  aria-hidden="true"
                >
                  <line x1="7" y1="8" x2="7" y2="28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="10.3" y1="8" x2="10.3" y2="28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="13.7" y1="8" x2="13.7" y2="28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="17" y1="8" x2="17" y2="28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M6 26C6 32 9 35 12 35C15 35 18 32 18 26V24H6V26Z" fill="currentColor" />
                  <path d="M10.8 35H13.2V52H10.8V35Z" fill="currentColor" />
                  <path d="M11 52C9.5 62 8 82 8 98C8 108 9.8 114 12 114C14.2 114 16 108 16 98C16 82 14.5 62 13 52H11Z" fill="currentColor" />
                  <circle cx="12" cy="75" r="1.5" fill="#123C30" />
                  <circle cx="12" cy="104" r="1.5" fill="#123C30" />
                </svg>
              </div>
              <div className="h-10 w-px bg-gradient-to-b from-gold/70 via-gold/40 to-transparent" />
            </div>

            {/* Right Plate: Salade Mechouia with 3D Tilt */}
            <Reveal delay={0.2} className="flex flex-col items-center text-center">
              <Card3D maxTilt={7} className="relative aspect-square w-64 sm:w-72 overflow-hidden rounded-full border-4 border-sand/70 shadow-[0_20px_45px_rgba(18,60,48,0.15)] bg-surface-card">
                <Image
                  src="/images/menu/dish-mechouia.jpg"
                  alt="Salade Mechouia"
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
              </Card3D>
              <h4 className="mt-4 font-display text-xl font-semibold text-ink">
                {locale === "ar" ? "سلطة مشوية على الحطب" : locale === "en" ? "Wood-Fired Mechouia" : "Salade Mechouia Grillée"}
              </h4>
              <p className="mt-0.5 font-body text-xs text-ink-muted max-w-xs">
                {locale === "ar"
                  ? "فلفل وطماطم مشوية مع زيت زيتون بكر وتونة وبيض"
                  : locale === "en"
                  ? "Charred wood-grilled peppers, tomatoes, garlic, flaked tuna and olive oil"
                  : "Poivrons et tomates grillés au feu de bois, thon et huile d'olive"}
              </p>
              <span className="mt-2 font-body text-base font-bold text-brand">9,000 DT</span>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
