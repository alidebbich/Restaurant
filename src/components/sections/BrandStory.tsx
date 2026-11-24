import Link from "next/link";
import { site, type Locale } from "@/config/site.config";
import { Section, Container, Heading } from "@/components/ui/Layout";
import { Reveal } from "@/components/motion/Reveal";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { ArchFrameReveal } from "@/components/patterns/ArchFrame";
import { Card3D } from "@/components/ui/Card3D";
import { Button } from "@/components/ui/Button";
import type { HomepageContent } from "@/lib/db/queries";

type Props = {
  locale: Locale;
  messages: Record<string, Record<string, string>>;
  content?: HomepageContent;
};

export function BrandStory({ locale, messages, content }: Props) {
  const t = messages.story;
  const heading = (content && content[`story_heading_${locale}` as keyof HomepageContent] as string) || t.heading;
  const body = (content && content[`story_body_${locale}` as keyof HomepageContent] as string) || t.body;
  const mainImage = content?.story_image || site.images.story;
  const secondaryImage = content?.story_secondary_image || site.images.gallery[0] || site.images.story;

  return (
    <Section id="story" className="bg-surface py-24 md:py-36">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 lg:items-center">
          {/* Text column */}
          <div className="max-w-lg">
            <Reveal>
              <p className="mb-3 font-display italic text-terracotta text-lg md:text-xl">
                {t.flourish ?? (locale === "ar" ? "أصالة وشغف" : locale === "en" ? "Heritage & Passion" : "Tradition & Passion")}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <Heading as="h2" size="lg" className="mb-6 text-ink font-semibold tracking-tight">
                {heading}
              </Heading>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mb-8 font-body text-base leading-relaxed text-ink-muted md:text-lg">
                {body}
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <Button
                href={`/${locale}/#menu`}
                variant="link"
                size="md"
              >
                {t.cta}
              </Button>
            </Reveal>
          </div>

          {/* Image column — asymmetrical layout with 3D depth */}
          <div className="relative grid grid-cols-2 gap-4">
            {/* Main image with 3D tilt */}
            <div className="col-span-2 md:col-span-1">
              <Card3D maxTilt={6} className="h-full">
                <ParallaxImage
                  src={mainImage}
                  alt={`${site.name[locale]} — ${heading}`}
                  strength={6}
                  className="rounded-2xl shadow-xl border border-sand/40"
                  loading="eager"
                  priority
                />
              </Card3D>
            </div>
            {/* Arch-framed second image */}
            <div className="relative mt-12 md:mt-0">
              <Card3D maxTilt={6} className="h-full">
                <ArchFrameReveal
                  src={secondaryImage}
                  alt={`${site.name[locale]} interior`}
                  className="aspect-[3/4] w-full shadow-xl border border-gold/30"
                />
              </Card3D>
              {/* Decorative warm sand outline circle */}
              <div className="absolute -bottom-6 -start-6 h-24 w-24 rounded-full border border-gold/30 pointer-events-none" />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
