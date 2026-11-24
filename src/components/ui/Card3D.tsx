"use client";

import React, { useRef, useState, useCallback } from "react";
import { useReducedMotion } from "motion/react";

type Props = {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  glare?: boolean;
};

export function Card3D({
  children,
  className = "",
  maxTilt = 7,
  scale = 1.02,
  glare = true,
}: Props) {
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>(
    "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
  );
  const [glareStyle, setGlareStyle] = useState<{
    opacity: number;
    background: string;
  }>({
    opacity: 0,
    background: "none",
  });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      // Normalized coordinates (-1 to 1)
      const normX = (x / width) * 2 - 1;
      const normY = (y / height) * 2 - 1;

      // Invert Y for standard natural 3D tilt
      const rotX = -normY * maxTilt;
      const rotY = normX * maxTilt;

      setTransform(
        `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      if (glare) {
        const glareX = (x / width) * 100;
        const glareY = (y / height) * 100;
        setGlareStyle({
          opacity: 0.35,
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 65%)`,
        });
      }
    },
    [reduce, maxTilt, scale, glare]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTransform(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
    );
    setGlareStyle({
      opacity: 0,
      background: "none",
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{
        transformStyle: "preserve-3d",
        transform,
        transition: isHovered
          ? "transform 0.12s cubic-bezier(0.25, 0.1, 0.25, 1)"
          : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease",
        willChange: "transform",
      }}
    >
      {children}

      {/* Realistic Glare Reflection */}
      {glare && !reduce && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-20"
          style={{
            ...glareStyle,
            mixBlendMode: "overlay",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
