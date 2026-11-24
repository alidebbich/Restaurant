"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { site, type Locale } from "@/config/site.config";
import { features } from "@/config/features";
import { ease, dur } from "@/lib/motion";
import { Button } from "@/components/ui/Button";

const LOCALES: Locale[] = [...site.locales];

type Props = { locale: Locale; messages: Record<string, Record<string, string>> };

export function Nav({ locale, messages }: Props) {
  const t = messages.nav;
  const ta = messages.aria;
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const lenis = useLenis();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll and pause Lenis when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      lenis?.stop();
    } else {
      lenis?.start();
    }
    return () => {
      document.body.style.overflow = "";
      lenis?.start();
    };
  }, [open, lenis]);

  const links = [
    { href: `/${locale}/menu`,    label: t.menu,    hash: "" },
    { href: `/${locale}/#story`,  label: t.story,   hash: "#story" },
    { href: `/${locale}/#menu`,   label: locale === "ar" ? "الأطباق" : "Spécialités", hash: "#menu" },
    { href: `/${locale}/#gallery`,label: t.gallery, hash: "#gallery" },
    { href: `/${locale}/#visit`,  label: t.visit,   hash: "#visit" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (hash && pathname === `/${locale}`) {
      e.preventDefault();
      lenis?.scrollTo(hash, { offset: -80, duration: 1.2 });
      setOpen(false);
    }
  };

  const switchLocale = (next: Locale) => {
    const segments = pathname.split("/");
    segments[1] = next;
    return segments.join("/");
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 transition-colors"
        animate={{
          backgroundColor: scrolled
            ? "rgba(7, 26, 20, 0.92)"
            : "rgba(0, 0, 0, 0)",
          backdropFilter: scrolled ? "blur(12px)" : "blur(0px)",
          borderBottomColor: scrolled ? "rgba(27, 78, 62, 0.5)" : "rgba(27, 78, 62, 0)",
        }}
        style={{ borderBottomWidth: 1, borderBottomStyle: "solid" }}
        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: ease.soft }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo / wordmark */}
          <Link
            href={`/${locale}`}
            className="font-display text-2xl font-semibold text-ink-inverse hover:text-gold transition-colors tracking-tight"
          >
            {site.name[locale]}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavClick(e, l.hash)}
                className="group relative font-body text-sm font-medium text-ink-inverse/80 hover:text-gold transition-colors"
              >
                {l.label}
                <span className="absolute inset-x-0 -bottom-1 h-0.5 origin-start scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100 rtl:origin-end" />
              </Link>
            ))}

            {/* Language switcher */}
            <div className="flex items-center gap-1 border-s border-[#1b4e3e] ps-4" aria-label={ta.lang_switcher}>
              {LOCALES.map((l) => (
                <Link
                  key={l}
                  href={switchLocale(l)}
                  className={`rounded-full px-2.5 py-1 text-xs font-body uppercase tracking-wider transition-colors ${
                    l === locale
                      ? "bg-gold text-deep font-bold"
                      : "text-ink-inverse/60 hover:text-gold"
                  }`}
                >
                  {l}
                </Link>
              ))}
            </div>

            {/* Order CTA */}
            {features.ordering && (
              <Button
                href={`/${locale}/order`}
                variant="outline-inverse"
                size="sm"
                className="border-gold/50 text-gold hover:bg-gold hover:text-deep"
              >
                {t.order}
              </Button>
            )}

            {/* Reserve CTA */}
            {features.reservations && (
              <Button
                href={`/${locale}/reserve`}
                variant="primary"
                size="sm"
                className="shadow-md shadow-gold/10"
              >
                {t.reserve}
              </Button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? ta.close_menu : ta.open_menu}
            aria-expanded={open}
          >
            <span
              className={`block h-0.5 w-6 bg-ink-inverse transition-transform duration-300 ${open ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 bg-ink-inverse transition-opacity duration-300 ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 bg-ink-inverse transition-transform duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col bg-[#071c16] px-6 pb-10 pt-28 text-ink-inverse"
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: "100%" }}
            transition={{ duration: dur.base, ease: ease.outExpo }}
            data-lenis-prevent
          >
            <nav className="flex flex-col gap-6">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={reduce ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.5, ease: ease.outExpo }}
                >
                  <Link
                    href={l.href}
                    className="font-display text-3xl text-ink-inverse hover:text-gold"
                    onClick={(e) => handleNavClick(e, l.hash)}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Language + Actions at bottom */}
            <div className="mt-auto flex flex-col gap-4">
              <div className="flex gap-2">
                {LOCALES.map((l) => (
                  <Link
                    key={l}
                    href={switchLocale(l)}
                    className={`rounded-full px-4 py-2 text-sm font-body uppercase ${
                      l === locale
                        ? "bg-gold text-deep font-bold"
                        : "border border-[#1b4e3e] text-ink-inverse"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {l}
                  </Link>
                ))}
              </div>
              {features.ordering && (
                <Button
                  href={`/${locale}/order`}
                  variant="outline-inverse"
                  size="md"
                  fullWidth
                  onClick={() => setOpen(false)}
                >
                  {t.order}
                </Button>
              )}
              {features.reservations && (
                <Button
                  href={`/${locale}/reserve`}
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => setOpen(false)}
                >
                  {t.reserve}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
