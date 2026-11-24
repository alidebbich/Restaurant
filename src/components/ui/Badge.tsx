import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-body font-medium",
  {
    variants: {
      variant: {
        default:  "border-line text-olive bg-sand/15",
        gold:     "border-gold/50 text-[#967434] bg-gold/15",
        accent:   "border-accent/40 text-accent bg-accent/10",
        green:    "border-brand/30 text-brand bg-brand/10",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

type Props = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: Props) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
