"use client";
import { motion, useReducedMotion } from "motion/react";
import { ease, dur, stagger } from "@/lib/motion";

export function SplitWords({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-bottom pb-[0.1em]"
          aria-hidden
        >
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: 0 }}
            transition={{
              duration: dur.hero,
              delay: 0.15 + i * stagger.base,
              ease: ease.outExpo,
            }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

