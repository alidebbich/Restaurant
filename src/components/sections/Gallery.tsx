import Image from "next/image";
import { site, type Locale } from "@/config/site.config";
import { Section, Container, Heading } from "@/components/ui/Layout";
import { Reveal } from "@/components/motion/Reveal";
import { Card3D } from "@/components/ui/Card3D";
import { stagger } from "@/lib/motion";

const ASPECT_RATIOS = [
  "aspect-[4/5]",
  "aspect-[3/2]",
  "aspect-[4/5]",
  "aspect-[3/2]",
  "aspect-[4/5]",
  "aspect-[3/2]",
];

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
};

export function Gallery({ locale, messages }: Props) {
  const t = messages.gallery;

  return (
    <Section id="gallery" className="relative overflow-hidden bg-surface py-24 md:py-32 text-ink">
      {/* Ambient warm glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, rgba(197, 168, 105, 0.3) 0%, transparent 60%)",
        }}
      />

      <Container className="relative z-10">
        <Reveal className="mb-12 text-center">
          <p className="mb-2 font-display italic text-terracotta text-lg md:text-xl">
            {locale === "ar" ? "أجواء دار الزيتون" : locale === "en" ? "Atmosphere & Moments" : "Atmosphère & Moments"}
          </p>
          <Heading as="h2" size="lg" className="mb-3 text-ink font-semibold tracking-tight">
            {t.heading}
          </Heading>
          <p className="font-body text-ink-muted max-w-md mx-auto">{t.subheading}</p>
        </Reveal>

        {/* Varied aspect-ratio masonry grid with 3D cards */}
        <div className="columns-2 gap-4 md:columns-3">
          {site.images.gallery.map((src, i) => (
            <Reveal
              key={src}
              delay={Math.min(i, 7) * stagger.base}
              className="mb-4"
            >
              <Card3D maxTilt={5} className="group overflow-hidden rounded-2xl border border-sand/40 bg-surface-card shadow-sm transition-all hover:border-gold hover:shadow-xl">
                <div className={`relative ${ASPECT_RATIOS[i % ASPECT_RATIOS.length]}`}>
                  <Image
                    src={src}
                    alt={`${site.name[locale]} — photo ${i + 1}`}
                    fill
                    sizes="(min-width:768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-[--ease-soft] group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              </Card3D>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
