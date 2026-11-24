"use client";

// Arch-shaped frame for images — Tunisian Mediterranean arch motif

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ease, viewport } from "@/lib/motion";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function ArchFrame({ src, alt, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ borderRadius: "999px 999px 0 0" }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width:1024px) 30vw, 80vw"
        className="object-cover"
      />
    </div>
  );
}

/** Arch frame with animated reveal */
export function ArchFrameReveal({ src, alt, className = "" }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{ borderRadius: "999px 999px 0 0" }}
      initial={reduce ? false : { opacity: 0.4, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "600px 0px 600px 0px" }}
      transition={{ duration: 0.8, ease: ease.outExpo }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width:1024px) 30vw, 80vw"
        className="object-cover"
      />
    </motion.div>
  );
}

