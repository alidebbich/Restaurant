"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { menu, type Dish, type Locale as MenuLocale } from "@/content/menu";
import type { PublicCategory, PublicDish } from "@/lib/db/menuAdapter";
import { site, type Locale } from "@/config/site.config";
import { formatPrice } from "@/lib/format";
import { waLink, orderWaMessage } from "@/lib/contact";
import { Container, Heading, Section } from "@/components/ui/Layout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card3D } from "@/components/ui/Card3D";
import { Reveal } from "@/components/motion/Reveal";
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
  initialCategories?: PublicCategory[];
};

type CartItem = {
  dish: PublicDish | Dish;
  quantity: number;
};

const TAG_VARIANT: Record<string, "gold" | "accent" | "green" | "default"> = {
  signature: "gold",
  spicy: "accent",
  vegetarian: "green",
  new: "gold",
  halal: "default",
};

export function OrderView({ locale, messages, initialCategories }: Props) {
  const t = messages.order_page;
  const mt = messages.menu_page;

  const categories = useMemo(() => {
    if (initialCategories && initialCategories.length > 0) {
      return initialCategories;
    }
    return menu as unknown as PublicCategory[];
  }, [initialCategories]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartOpen, setCartOpen] = useState(false);

  // Form fields
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [tableOrTime, setTableOrTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allDishes = useMemo(() => {
    return categories.flatMap((c) => c.dishes);
  }, [categories]);

  const filteredDishes = useMemo(() => {
    if (activeCategory === "all") return allDishes;
    const cat = categories.find((c) => c.id === activeCategory);
    return cat ? cat.dishes : allDishes;
  }, [activeCategory, allDishes, categories]);

  const cartList = useMemo(() => Object.values(cart), [cart]);

  const totalItemsCount = useMemo(() => {
    return cartList.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartList]);

  const totalPrice = useMemo(() => {
    return cartList.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  }, [cartList]);

  const addToCart = (dish: PublicDish | Dish) => {
    setCart((prev) => {
      const existing = prev[dish.id];
      const quantity = existing ? existing.quantity + 1 : 1;
      return { ...prev, [dish.id]: { dish, quantity } };
    });
  };

  const updateQuantity = (dishId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[dishId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[dishId];
        return copy;
      }
      return { ...prev, [dishId]: { ...existing, quantity: newQty } };
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartList.length === 0 || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name || (locale === "ar" ? "عميل محترم" : "Client"),
          customer_phone: phone || "-",
          order_type: orderType,
          table_number: orderType === "dine_in" ? tableOrTime : null,
          pickup_time: orderType === "takeaway" ? tableOrTime : null,
          notes: notes || null,
          total_amount: totalPrice,
          items: cartList.map((item) => ({
            menu_item_id: item.dish.id,
            quantity: item.quantity,
            unit_price: item.dish.price,
            item_name: item.dish.name[locale as MenuLocale],
          })),
        }),
      });
    } catch (err) {
      console.error("Failed to save order to database:", err);
    } finally {
      setIsSubmitting(false);
    }

    // Open WhatsApp for customer notification
    const message = orderWaMessage(locale, {
      name: name || (locale === "ar" ? "عميل محترم" : "Client"),
      phone: phone || "-",
      orderType,
      tableOrTime: tableOrTime || undefined,
      items: cartList.map((item) => ({
        name: item.dish.name[locale as MenuLocale],
        quantity: item.quantity,
        price: item.dish.price,
      })),
      total: totalPrice,
      notes: notes || undefined,
    });

    window.open(waLink(site.contact.whatsapp, message), "_blank");
    setSubmitted(true);
  };

  const fieldClass =
    "w-full rounded-[var(--radius-button)] border border-stone-200 bg-surface px-4 py-3 font-body text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all";

  return (
    <Section className="relative overflow-hidden bg-surface pt-32 pb-32 text-ink">
      <Container className="relative z-10">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <Reveal>
            <p className="mb-2 font-display italic text-gold text-lg md:text-xl">
              {site.name[locale]}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Heading as="h1" size="xl" className="text-ink font-semibold tracking-tight">
              {t.heading}
            </Heading>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-3 font-body text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
              {t.subheading}
            </p>
          </Reveal>
        </div>

        {/* Category Filter Pills */}
        <div
          className="mb-8 flex overflow-x-auto gap-2 pb-2 no-scrollbar"
          data-lenis-prevent
        >
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`flex-shrink-0 rounded-full px-5 py-2 text-xs sm:text-sm font-body font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              activeCategory === "all"
                ? "bg-brand text-cream shadow-md"
                : "border border-line bg-surface-card text-ink hover:border-brand hover:text-brand"
            }`}
          >
            {t.all}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 rounded-full px-5 py-2 text-xs sm:text-sm font-body font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                activeCategory === cat.id
                  ? "bg-brand text-cream shadow-md"
                  : "border border-line bg-surface-card text-ink hover:border-brand hover:text-brand"
              }`}
            >
              {cat.title[locale as MenuLocale]}
            </button>
          ))}
        </div>

        {/* Two-column layout on desktop: dishes list + sticky cart panel */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Dishes column */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {filteredDishes.map((dish) => {
                const inCartQty = cart[dish.id]?.quantity ?? 0;
                return (
                  <Card3D
                    key={dish.id}
                    maxTilt={5}
                    className="flex flex-col justify-between rounded-3xl border border-line bg-surface-card p-5 shadow-sm transition-all hover:border-gold/60 hover:shadow-xl"
                  >
                    <div>
                      {dish.image && (
                        <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-sand/20 shadow-inner">
                          <Image
                            src={dish.image}
                            alt={dish.name[locale as MenuLocale]}
                            fill
                            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-700 ease-[--ease-soft] hover:scale-105"
                          />
                        </div>
                      )}

                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {dish.tags?.map((tag) => (
                          <Badge key={tag} variant={TAG_VARIANT[tag] ?? "default"}>
                            {mt[`tag_${tag}`] ?? tag}
                          </Badge>
                        ))}
                      </div>

                      <h3 className="font-display text-lg font-semibold text-ink">
                        {dish.name[locale as MenuLocale]}
                      </h3>

                      {dish.description && (
                        <p className="mt-1 font-body text-xs text-ink-muted line-clamp-2 leading-relaxed">
                          {dish.description[locale as MenuLocale]}
                        </p>
                      )}
                    </div>

                    {/* Price and Add/Quantity control */}
                    <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3">
                      <span className="font-body font-bold text-brand text-lg">
                        {formatPrice(dish.price, locale)}
                      </span>

                      {inCartQty === 0 ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          leadingIcon={<Plus className="size-4" />}
                          onClick={() => addToCart(dish)}
                        >
                          {t.add_to_cart}
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-brand/20 bg-sand/20 px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(dish.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-brand hover:bg-brand/10 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="min-w-[1.2rem] text-center font-body text-sm font-bold text-brand">
                            {inCartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(dish.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-brand hover:bg-brand/10 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card3D>
                );
              })}
            </div>
          </div>

          {/* Desktop Cart Sidebar */}
          <div className="hidden lg:col-span-5 lg:block xl:col-span-4 sticky top-28">
            <div className="rounded-3xl border border-line bg-surface-card p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 font-display text-xl font-semibold text-brand">
                  <ShoppingBag className="size-5 text-gold" />
                  <h2>{t.cart_title}</h2>
                </div>
                {cartList.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="font-body text-xs text-ink-muted hover:text-danger underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                    <span>{t.clear_cart}</span>
                  </button>
                )}
              </div>

              {cartList.length === 0 ? (
                <div className="py-12 text-center font-body text-sm text-ink-muted">
                  <ShoppingBag className="size-10 mx-auto text-sand mb-2 opacity-50" />
                  <p>{t.empty_cart}</p>
                </div>
              ) : (
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  {/* Cart Items list */}
                  <ul className="max-h-60 space-y-3 overflow-y-auto pe-1" data-lenis-prevent>
                    {cartList.map(({ dish, quantity }) => (
                      <li
                        key={dish.id}
                        className="flex items-center justify-between gap-2 border-b border-line/60 pb-2 text-sm"
                      >
                        <div className="flex-1 truncate">
                          <p className="font-body font-medium text-ink truncate">
                            {dish.name[locale as MenuLocale]}
                          </p>
                          <p className="font-body text-xs text-brand font-semibold">
                            {formatPrice(dish.price, locale)} × {quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(dish.id, -1)}
                            className="h-7 w-7 rounded-lg border border-line text-ink hover:bg-sand/30 flex items-center justify-center transition-colors"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-5 text-center font-body text-xs font-semibold text-ink">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(dish.id, 1)}
                            className="h-7 w-7 rounded-lg border border-line text-ink hover:bg-sand/30 flex items-center justify-center transition-colors"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Subtotal / Total */}
                  <div className="border-t border-line pt-3 flex justify-between font-body text-base font-semibold text-ink">
                    <span>{t.total}</span>
                    <span className="text-brand font-bold text-xl">{formatPrice(totalPrice, locale)}</span>
                  </div>

                  {/* Order Type Toggle */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block font-body text-xs font-medium text-ink-muted">
                      {t.order_type}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType("dine_in")}
                        className={`rounded-[var(--radius-button)] py-2.5 text-xs font-body font-semibold transition-all cursor-pointer ${
                          orderType === "dine_in"
                            ? "bg-brand text-cream shadow-sm"
                            : "border border-line bg-surface text-ink hover:bg-sand/20"
                        }`}
                      >
                        🍽️ {t.dine_in}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType("takeaway")}
                        className={`rounded-[var(--radius-button)] py-2.5 text-xs font-body font-semibold transition-all cursor-pointer ${
                          orderType === "takeaway"
                            ? "bg-brand text-cream shadow-sm"
                            : "border border-line bg-surface text-ink hover:bg-sand/20"
                        }`}
                      >
                        🛍️ {t.takeaway}
                      </button>
                    </div>
                  </div>

                  {/* Table # or Pickup time */}
                  <div>
                    <label className="mb-1 block font-body text-xs font-medium text-ink-muted" htmlFor="side-table-time">
                      {orderType === "dine_in" ? t.table_number : t.pickup_time}
                    </label>
                    <input
                      id="side-table-time"
                      type="text"
                      placeholder={orderType === "dine_in" ? "Ex: 4" : "Ex: 19:30"}
                      className={fieldClass}
                      value={tableOrTime}
                      onChange={(e) => setTableOrTime(e.target.value)}
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="mb-1 block font-body text-xs font-medium text-ink-muted" htmlFor="side-name">
                      {t.name}
                    </label>
                    <input
                      id="side-name"
                      type="text"
                      required
                      autoComplete="name"
                      className={fieldClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-1 block font-body text-xs font-medium text-ink-muted" htmlFor="side-phone">
                      {t.phone}
                    </label>
                    <input
                      id="side-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      dir="ltr"
                      autoComplete="tel"
                      className={fieldClass}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-1 block font-body text-xs font-medium text-ink-muted" htmlFor="side-notes">
                      {t.notes}
                    </label>
                    <textarea
                      id="side-notes"
                      rows={2}
                      className={`${fieldClass} resize-none`}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    className="shadow-md shadow-gold/20"
                  >
                    💬 {isSubmitting ? "Envoi..." : t.submit}
                  </Button>

                  {submitted && (
                    <p className="rounded-xl bg-emerald-50 border border-emerald-300 p-2.5 text-center font-body text-xs text-emerald-800 font-medium">
                      ✓ {t.success}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sticky Cart Bar */}
        <AnimatePresence>
          {totalItemsCount > 0 && !cartOpen && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="fixed bottom-4 inset-x-4 z-40 lg:hidden"
            >
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="w-full rounded-[var(--radius-button)] bg-brand p-4 font-body font-semibold text-cream shadow-2xl flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs text-deep font-bold">
                    {totalItemsCount}
                  </span>
                  <span>{t.cart_title}</span>
                </div>
                <span className="text-gold font-bold">{formatPrice(totalPrice, locale)} →</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </Section>
  );
}
