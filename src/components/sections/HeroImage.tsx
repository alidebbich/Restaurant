"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ease } from "@/lib/motion";

type Props = {
  src: string;
  alt: string;
};

export function HeroImage({ src, alt }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="absolute inset-0 z-0 overflow-hidden"
      initial={reduce ? false : { scale: 1.08 }}
      animate={{ scale: 1 }}
      transition={{ duration: 1.6, ease: ease.outExpo }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        loading="eager"
        sizes="100vw"
        className="object-cover"
      />
    </motion.div>
  );
}

