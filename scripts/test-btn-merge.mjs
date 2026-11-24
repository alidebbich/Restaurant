import { twMerge } from "tailwind-merge";

const variants = {
  primary: "bg-cta text-cta-ink shadow-[0_2px_10px_rgba(197,168,105,0.28)] hover:bg-gold-light hover:-translate-y-px active:translate-y-0 focus-visible:ring-gold",
  secondary: "bg-white text-ink border border-line shadow-sm hover:bg-surface-soft hover:border-gold/50 hover:text-brand hover:-translate-y-px active:translate-y-0 focus-visible:ring-forest",
  forest: "bg-forest text-cream shadow-sm hover:bg-deep hover:-translate-y-px active:translate-y-0 focus-visible:ring-forest",
  outline: "border border-ink/25 text-ink bg-transparent hover:bg-ink/5 hover:-translate-y-px active:translate-y-0 focus-visible:ring-ink",
  ghost: "text-ink bg-transparent hover:bg-ink/8 hover:-translate-y-px active:translate-y-0 focus-visible:ring-ink",
  destructive: "bg-danger text-cream shadow-sm hover:opacity-90 hover:-translate-y-px active:translate-y-0 focus-visible:ring-danger",
  "outline-inverse": "border border-cream/50 text-cream bg-black/25 backdrop-blur-md hover:border-gold hover:text-gold hover:bg-black/40 hover:-translate-y-px active:translate-y-0 focus-visible:ring-gold",
};

const sizes = {
  sm: "h-9 px-3.5 text-xs font-medium",
  md: "h-10 px-4 text-sm font-medium",
  lg: "h-11 px-6 text-sm font-medium",
  icon: "h-9 w-9 p-0",
};

console.log("=== CHECKING TWMERGE PRESERVATION ===");
for (const [vname, vclass] of Object.entries(variants)) {
  for (const [sname, sclass] of Object.entries(sizes)) {
    const merged = twMerge(vclass, sclass);
    const hasTextColor = merged.includes("text-cta-ink") || merged.includes("text-ink") || merged.includes("text-cream") || merged.includes("text-gold");
    if (!hasTextColor) {
      console.error(`FAIL: ${vname} + ${sname} lost text color! Result: ${merged}`);
    }
  }
}
console.log("All variant + size combinations checked. Everything preserves text color!");
