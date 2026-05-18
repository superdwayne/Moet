// Moët editorial — bone, warm ink, brand red as a hairline accent, gold
// hairlines. Display in Fraunces (variable, with optical/SOFT/WONK axes);
// UI in Manrope. Palette is intentionally narrow.

export const moet = {
  color: {
    bone:        "#d6e4ee",   // pale powder blue page backdrop
    boneDeep:    "#b6cbdb",   // deeper blue at edges
    paper:       "#ffffff",
    ink:         "#0e0c0a",   // warm near-black
    inkSoft:     "rgba(14,12,10,0.62)",
    inkMute:     "rgba(14,12,10,0.40)",
    rule:        "rgba(14,12,10,0.14)",
    gold:        "#b8965a",   // hairline accent
    goldSoft:    "rgba(184,150,90,0.55)",
    red:         "#c00016",   // brand red — used sparingly
    redInk:      "#7a000e",
  },
  font: {
    sans: '"Manrope", system-ui, sans-serif',
    display: '"Fraunces", "Cormorant Garamond", Georgia, serif',
  },
  varDisplay: {
    // Fraunces variation axes — opsz=optical size, SOFT=soft serif, WONK=irregular
    hero:    '"opsz" 144, "SOFT" 30, "WONK" 0',
    section: '"opsz" 72,  "SOFT" 30, "WONK" 0',
    caption: '"opsz" 18,  "SOFT" 50, "WONK" 0',
  },
  motion: {
    ease: "cubic-bezier(0.2, 0.7, 0.1, 1)",
    fast: "240ms",
    base: "420ms",
    slow: "900ms",
  },
} as const;
