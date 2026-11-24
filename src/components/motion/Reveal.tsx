"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ease, dur } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "p" | "span";
};

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as = "div",
}: Props) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Safety timer ensuring content is always revealed even if scroll observer misses
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const Tag = motion[as] as typeof motion.div;

  if (reduce || mounted) {
    return (
      <Tag
        className={className}
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur.reveal, delay, ease: ease.outExpo }}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "600px 0px 600px 0px" }}
      transition={{ duration: dur.reveal, delay, ease: ease.outExpo }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </Tag>
  );
}

