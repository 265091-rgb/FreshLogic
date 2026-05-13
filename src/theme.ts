// ─── FreshLogic Design Tokens ────────────────────────────────────────────────

export const Colors = {
  // ── Text hierarchy ────────────────────────────────────────────────────────
  heading:  '#1C2B18',   // very dark forest green — all titles
  body:     '#485244',   // sage-grey — body text, labels
  muted:    '#7C9676',   // light sage — placeholders, metadata
  onDark:   '#FFFFFF',   // text on coloured backgrounds

  // ── Brand greens (dark → light) ───────────────────────────────────────────
  forest:   '#2E4A28',   // deep forest — badges, strong accents
  canopy:   '#3D5E35',   // rich dark green — icon fills, section ink
  primary:  '#587A4C',   // main CTA — buttons, active states, sliders
  sage:     '#7A9A6E',   // secondary / disabled
  sagePale: '#9BB490',   // muted elements, light icons

  // ── Surface greens (light → very light) ──────────────────────────────────
  glass:    '#EAF3E4',   // input backgrounds, active pill fills
  mist:     '#DCE9D5',   // section headers, subtle separators
  fog:      '#F0F6ED',   // screen background

  // ── Neutral surface ───────────────────────────────────────────────────────
  card:     '#FFFFFF',

  // ── Borders ───────────────────────────────────────────────────────────────
  borderLight:  '#D5E6CA',
  borderMedium: '#BBCFB3',

  // ── Status ────────────────────────────────────────────────────────────────
  danger:       '#C94040',
  dangerBg:     '#FDEDEE',
  dangerBorder: '#EDADAD',
  dangerText:   '#7A2424',
  warning:      '#C07830',
  warningBg:    '#FEF5EA',
  warningBorder: '#E5C4A0',
  warningText:  '#7A4820',
};

export const Radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  full: 999,
};

export const Shadow = {
  card: {
    shadowColor: '#1C2B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#1C2B18',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 4,
  },
};
