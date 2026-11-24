// Motion tokens — single source of truth for all animation values
export const ease = {
  outExpo: [0.16, 1, 0.3, 1] as const,  // entrances
  soft:    [0.25, 0.1, 0.25, 1] as const, // hovers, color changes
  inOut:   [0.65, 0, 0.35, 1] as const,  // layout / tab indicators
};

export const dur = {
  micro:  0.25,
  base:   0.6,
  reveal: 0.9,
  hero:   1.2,
};

export const stagger = {
  tight: 0.05,
  base:  0.08,
  loose: 0.14,
};

export const distance = { sm: 12, md: 24, lg: 40 };

export const viewport = { once: true, amount: 0.05, margin: "0px 0px 80px 0px" } as const;

