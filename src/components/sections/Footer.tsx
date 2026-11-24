import Link from "next/link";
import { site, type Locale } from "@/config/site.config";
import { Container } from "@/components/ui/Layout";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
};

export function Footer({ locale, messages }: Props) {
  const t = messages.footer;
  const tn = messages.nav;
  const ta = messages.aria;
  const year = new Date().getFullYear();

  const navLinks = [
    { href: `/${locale}/menu`,    label: tn.menu },
    { href: `/${locale}/#story`,  label: tn.story },
    { href: `/${locale}/#menu`,   label: locale === "ar" ? "الأطباق" : "Spécialités" },
    { href: `/${locale}/#gallery`,label: tn.gallery },
    { href: `/${locale}/#visit`,  label: tn.visit },
  ];

  return (
    <footer className="border-t border-[#1b4e3e]/60 bg-[#061712] py-16 text-ink-inverse">
      <Container>
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link
              href={`/${locale}`}
              className="mb-3 block font-display text-2xl md:text-3xl font-semibold text-ink-inverse hover:text-gold transition-colors tracking-tight"
            >
              {site.name[locale]}
            </Link>
            <p className="font-body text-sm text-ink-inverse/60 leading-relaxed max-w-xs">
              {site.tagline[locale]}
            </p>
          </div>

          {/* Nav */}
          <nav aria-label="Footer navigation">
            <ul className="space-y-2.5">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="font-body text-sm text-ink-inverse/70 hover:text-gold transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Socials + language */}
          <div>
            <div className="mb-6 flex gap-3">
              {site.contact.instagram && (
                <a
                  href={site.contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={ta.social_instagram}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1b4e3e] text-gold transition-colors hover:border-gold hover:bg-gold/10"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              )}
              {site.contact.facebook && (
                <a
                  href={site.contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={ta.social_facebook}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1b4e3e] text-gold transition-colors hover:border-gold hover:bg-gold/10"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
            </div>

            {/* Language switcher */}
            <div className="flex gap-1.5">
              {[...site.locales].map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  className={`rounded-full px-3 py-1 text-xs font-body uppercase tracking-wider transition-colors ${
                    l === locale
                      ? "bg-gold text-deep font-bold"
                      : "border border-[#1b4e3e] text-ink-inverse/60 hover:text-gold"
                  }`}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#1b4e3e]/40 pt-6">
          <p className="font-body text-xs text-ink-inverse/40">
            © {year} {site.name[locale]}. {t.rights}
          </p>
          <Link
            href="#"
            className="font-body text-xs text-ink-inverse/40 hover:text-gold transition-colors"
          >
            {t.legal}
          </Link>
        </div>
      </Container>
    </footer>
  );
}
