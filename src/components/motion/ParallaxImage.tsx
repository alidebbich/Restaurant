"use client";
import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";

type Props = {
  src: string;
  alt: string;
  strength?: number;
  className?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
};

export function ParallaxImage({
  src,
  alt,
  strength = 8,
  className,
  priority,
  loading,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`-${strength}%`, `${strength}%`]
  );

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div
        style={reduce ? undefined : { y, scale: 1.15 }}
        className="relative aspect-[4/5]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width:1024px) 40vw, 90vw"
          className="object-cover"
          priority={priority}
          loading={loading}
        />
      </motion.div>
    </div>
  );
}

