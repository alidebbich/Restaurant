import { type Locale } from "@/config/site.config";
import { features } from "@/config/features";
import { Section, Container, Heading } from "@/components/ui/Layout";
import { Reveal } from "@/components/motion/Reveal";
import { ZelligePattern } from "@/components/patterns/ZelligePattern";
import { Button } from "@/components/ui/Button";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
};

export function ReserveCta({ locale, messages }: Props) {
  const t = messages.cta;

  return (
    <Section className="relative overflow-hidden bg-surface-dark text-ink-inverse py-28 md:py-36">
      {/* Zellige pattern at ~6% opacity */}
      <div className="pointer-events-none absolute inset-0 text-gold opacity-[0.06]">
        <ZelligePattern />
      </div>

      {/* Warm radiant gold ambient glow in center */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(197, 168, 105, 0.35) 0%, transparent 60%)",
        }}
      />

      <Container className="relative z-10 text-center">
        <Reveal>
          <p className="mb-3 font-display italic text-gold text-lg md:text-xl">
            {locale === "ar" ? "تجربة لا تُنسى" : locale === "en" ? "An Unforgettable Journey" : "Une Expérience Inoubliable"}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <Heading as="h2" size="xl" className="mb-4 text-ink-inverse font-semibold tracking-tight">
            {t.heading}
          </Heading>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mb-10 max-w-xl font-body text-base md:text-lg text-ink-inverse/80 leading-relaxed">
            {t.subheading}
          </p>
        </Reveal>
        <Reveal delay={0.3} className="flex flex-wrap justify-center items-center gap-4">
          {features.reservations && (
            <Button
              href={`/${locale}/reserve`}
              variant="primary"
              size="lg"
              className="shadow-xl shadow-black/30 focus-visible:ring-offset-surface-dark"
              trailingIcon={<span className="rtl:-scale-x-100">→</span>}
            >
              {t.reserve}
            </Button>
          )}
          {features.ordering && (
            <Button
              href={`/${locale}/order`}
              variant="outline-inverse"
              size="lg"
              className="focus-visible:ring-offset-surface-dark"
            >
              {t.order}
            </Button>
          )}
          {!features.ordering && (
            <Button
              href={`/${locale}/#menu`}
              variant="outline-inverse"
              size="lg"
              className="focus-visible:ring-offset-surface-dark"
            >
              {messages.menu_section.view_full}
            </Button>
          )}
        </Reveal>
      </Container>
    </Section>
  );
}
