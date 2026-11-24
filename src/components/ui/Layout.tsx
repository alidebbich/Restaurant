import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Full-width section wrapper with consistent vertical padding */
export function Section({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("py-20 md:py-32", className)}
      {...props}
    >
      {children}
    </section>
  );
}

/** Centered, max-width container */
export function Container({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Display heading using Cormorant Garamond */
type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3" | "h4";
  size?: "sm" | "md" | "lg" | "xl" | "display";
};

const sizeMap = {
  sm:      "text-2xl md:text-3xl",
  md:      "text-3xl md:text-4xl",
  lg:      "text-4xl md:text-5xl",
  xl:      "text-5xl md:text-6xl",
  display: "text-[clamp(3rem,9vw,8rem)]",
};

export function Heading({
  as: Tag = "h2",
  size = "lg",
  className,
  children,
  ...props
}: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display font-semibold leading-tight tracking-tight",
        sizeMap[size],
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

