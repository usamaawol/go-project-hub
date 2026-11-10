/**
 * DocuMind Central Presentation Theme Design System
 * Controls design tokens, contrast calculation, typography pairings,
 * layout rules, and visual styles across PowerPoint export and in-browser preview.
 */

export type ThemeKind =
  "academic" | "business" | "tech" | "pitch" | "research" | "education" | "creative" | "minimal";

export type SlideLayoutType =
  | "title"
  | "assignment-cover"
  | "agenda"
  | "section-header"
  | "content"
  | "two-column"
  | "three-card"
  | "hero-split"
  | "headline-hero"
  | "bento-grid"
  | "metrics"
  | "timeline"
  | "process"
  | "quote"
  | "table"
  | "text-visual"
  | "diagram-explainer"
  | "image-led"
  | "conclusion"
  | "references";

export interface ThemeColors {
  primary: string;
  accent: string;
  bg: string;
}

export interface RawThemeInput {
  id?: string;
  name: string;
  category?: string;
  kind?: string;
  colors: ThemeColors;
  fonts?: string;
  tier?: "free" | "pro";
}

export interface TypographyInput {
  fontFamily?: string;
  fontSizePreset?: "compact" | "standard" | "large" | "extra-large";
}

export interface ThemeTokens {
  name: string;
  category: string;
  kind: ThemeKind;
  isDark: boolean;
  // Backgrounds
  bg: string; // Hex with #
  bgHex: string; // Hex without #
  slideBgStyle: "solid" | "bordered" | "gradient" | "split";
  // Typography Colors
  textPrimary: string;
  textPrimaryHex: string;
  textSecondary: string;
  textSecondaryHex: string;
  textMuted: string;
  textMutedHex: string;
  // Accents
  accent: string;
  accentHex: string;
  accentSecondary: string;
  accentSecondaryHex: string;
  accentTint: string;
  accentTintHex: string;
  // Multi-surface Gamma rhythm tokens
  surfaceTint: string;
  surfaceTintHex: string;
  darkBg: string;
  darkBgHex: string;
  darkCardBg: string;
  darkCardBgHex: string;
  darkText: string;
  darkTextHex: string;
  darkMuted: string;
  darkMutedHex: string;
  // Cards & Containers
  cardBg: string;
  cardBgHex: string;
  cardBorder: string;
  cardBorderHex: string;
  cardText: string;
  cardTextHex: string;
  cardMuted: string;
  cardMutedHex: string;
  // Dividers & Accents
  dividerColor: string;
  dividerColorHex: string;
  accentStyle: "bar" | "pill" | "stripe" | "minimal" | "badge";
  // Fonts
  fontTitle: string;
  fontBody: string;
  // Sizes based on preset
  fontSizes: {
    heroTitle: number;
    slideTitle: number;
    subtitle: number;
    sectionTag: number;
    body: number;
    bodySmall: number;
    statNumber: number;
    caption: number;
  };
}

/**
 * Calculates perceived relative luminance of a hex color (0.0 to 1.0)
 */
export function getLuminance(hex: string): number {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Strips '#' from hex string
 */
export function stripHex(hex: string): string {
  return (hex || "").replace("#", "").trim().toUpperCase();
}

/**
 * Linearly blends two 6-digit hex colors (ratioB in [0, 1]).
 */
export function blendHex(hexA: string, hexB: string, ratioB: number): string {
  const a = stripHex(hexA);
  const b = stripHex(hexB);
  if (a.length !== 6 || b.length !== 6) return hexA;
  const t = Math.min(1, Math.max(0, ratioB));
  const rA = parseInt(a.slice(0, 2), 16);
  const gA = parseInt(a.slice(2, 4), 16);
  const bA = parseInt(a.slice(4, 6), 16);
  const rB = parseInt(b.slice(0, 2), 16);
  const gB = parseInt(b.slice(2, 4), 16);
  const bB = parseInt(b.slice(4, 6), 16);

  const r = Math.round(rA * (1 - t) + rB * t);
  const g = Math.round(gA * (1 - t) + gB * t);
  const bl = Math.round(bA * (1 - t) + bB * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`.toUpperCase();
}

/**
 * Lighten or darken hex color
 */
export function adjustHex(hex: string, amount: number): string {
  const clean = stripHex(hex);
  if (clean.length !== 6) return hex;
  let r = parseInt(clean.slice(0, 2), 16) + amount;
  let g = parseInt(clean.slice(2, 4), 16) + amount;
  let b = parseInt(clean.slice(4, 6), 16) + amount;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

/**
 * Computes design tokens for consistent slide styling across PPTX & Web Preview
 */
export function computeThemeTokens(
  theme: RawThemeInput,
  typography?: TypographyInput,
): ThemeTokens {
  const rawBg = theme.colors?.bg || "#FFFFFF";
  const rawPrimary = theme.colors?.primary || "#0F172A";
  const rawAccent = theme.colors?.accent || "#2563EB";

  const bgLuminance = getLuminance(rawBg);
  const isDark = bgLuminance < 0.35;

  const rawKind = (theme.kind || "business").toLowerCase();
  const validKinds: ThemeKind[] = [
    "academic",
    "business",
    "tech",
    "pitch",
    "research",
    "education",
    "creative",
    "minimal",
  ];
  const kind: ThemeKind = validKinds.includes(rawKind as ThemeKind)
    ? (rawKind as ThemeKind)
    : "business";

  // Compute text colors with guaranteed contrast against background
  let textPrimary: string;
  let textSecondary: string;
  let textMuted: string;
  let cardBg: string;
  let cardBorder: string;
  let cardText: string;
  let cardMuted: string;
  let dividerColor: string;

  if (isDark) {
    // Dark Theme: Ensure bright, crisp foregrounds
    textPrimary = "#F8FAFC";
    textSecondary = "#CBD5E1";
    textMuted = "#94A3B8";

    // Cards slightly lighter than background with subtle border
    cardBg = adjustHex(rawBg, 20);
    cardBorder = adjustHex(rawBg, 40);
    cardText = "#F1F5F9";
    cardMuted = "#94A3B8";
    dividerColor = adjustHex(rawBg, 35);
  } else {
    // Light Theme: Ensure dark, readable foregrounds
    // If primary color is dark enough, use it; otherwise force deep slate
    const primaryLum = getLuminance(rawPrimary);
    textPrimary = primaryLum < 0.25 ? rawPrimary : "#0F172A";
    textSecondary = primaryLum < 0.35 ? adjustHex(textPrimary, 40) : "#475569";
    textMuted = "#64748B";

    // Cards slightly shaded with crisp border
    if (rawBg.toUpperCase() === "#FFFFFF") {
      cardBg = "#F8FAFC";
      cardBorder = "#E2E8F0";
    } else {
      cardBg = adjustHex(rawBg, -8);
      cardBorder = adjustHex(rawBg, -28);
    }
    cardText = textPrimary;
    cardMuted = textMuted;
    dividerColor = adjustHex(rawBg, -20);
  }

  // Ensure accent has good visibility
  let accent = rawAccent;
  const accentLum = getLuminance(accent);
  if (isDark && accentLum < 0.2) {
    accent = adjustHex(accent, 60);
  } else if (!isDark && accentLum > 0.8) {
    accent = adjustHex(accent, -60);
  }
  const accentSecondary = adjustHex(accent, isDark ? -30 : 30);
  const accentTint = isDark
    ? blendHex(rawBg, accent, 0.24)
    : blendHex("#FFFFFF", accent, 0.11);
  const surfaceTint = isDark
    ? blendHex(rawBg, "#1E293B", 0.45)
    : blendHex(rawBg, accent, 0.06);
  const darkBaseCandidate =
    getLuminance(rawPrimary) < 0.14 ? rawPrimary : blendHex(rawPrimary, "#090D16", 0.65);
  const darkBg = isDark ? rawBg : darkBaseCandidate;
  const darkCardBg = adjustHex(darkBg, 18);
  const darkText = "#F8FAFC";
  const darkMuted = "#94A3B8";

  // Fonts & sizing presets
  const fontPreset = typography?.fontFamily || "Inter";
  let fontTitle = fontPreset;
  let fontBody = fontPreset;

  if (fontPreset === "Inter" || fontPreset === "Roboto" || fontPreset === "Calibri") {
    fontTitle = fontPreset;
    fontBody = fontPreset;
  } else if (fontPreset === "Playfair Display" || fontPreset === "Merriweather") {
    fontTitle = fontPreset;
    fontBody = "Calibri"; // High readability body fallback for PowerPoint
  } else if (fontPreset === "Montserrat") {
    fontTitle = "Montserrat";
    fontBody = "Calibri";
  }

  const sizePreset = typography?.fontSizePreset || "standard";
  const sizeScales = {
    compact: {
      heroTitle: 36,
      slideTitle: 26,
      subtitle: 13,
      sectionTag: 9,
      body: 13,
      bodySmall: 11,
      statNumber: 30,
      caption: 9,
    },
    standard: {
      heroTitle: 44,
      slideTitle: 30,
      subtitle: 15,
      sectionTag: 10,
      body: 15,
      bodySmall: 12,
      statNumber: 36,
      caption: 10,
    },
    large: {
      heroTitle: 50,
      slideTitle: 36,
      subtitle: 17,
      sectionTag: 11,
      body: 17,
      bodySmall: 13,
      statNumber: 42,
      caption: 11,
    },
    "extra-large": {
      heroTitle: 56,
      slideTitle: 40,
      subtitle: 19,
      sectionTag: 12,
      body: 19,
      bodySmall: 14,
      statNumber: 48,
      caption: 12,
    },
  };
  const fontSizes = sizeScales[sizePreset] || sizeScales.standard;

  // Visual accent style per theme kind
  let accentStyle: ThemeTokens["accentStyle"] = "bar";
  if (kind === "academic" || kind === "research") accentStyle = "stripe";
  else if (kind === "tech") accentStyle = "badge";
  else if (kind === "creative" || kind === "pitch") accentStyle = "pill";
  else if (kind === "minimal") accentStyle = "minimal";

  return {
    name: theme.name || "Default Theme",
    category: theme.category || "General",
    kind,
    isDark,
    bg: rawBg,
    bgHex: stripHex(rawBg),
    slideBgStyle: isDark ? "solid" : "bordered",
    textPrimary,
    textPrimaryHex: stripHex(textPrimary),
    textSecondary,
    textSecondaryHex: stripHex(textSecondary),
    textMuted,
    textMutedHex: stripHex(textMuted),
    accent,
    accentHex: stripHex(accent),
    accentSecondary,
    accentSecondaryHex: stripHex(accentSecondary),
    accentTint,
    accentTintHex: stripHex(accentTint),
    surfaceTint,
    surfaceTintHex: stripHex(surfaceTint),
    darkBg,
    darkBgHex: stripHex(darkBg),
    darkCardBg,
    darkCardBgHex: stripHex(darkCardBg),
    darkText,
    darkTextHex: stripHex(darkText),
    darkMuted,
    darkMutedHex: stripHex(darkMuted),
    cardBg,
    cardBgHex: stripHex(cardBg),
    cardBorder,
    cardBorderHex: stripHex(cardBorder),
    cardText,
    cardTextHex: stripHex(cardText),
    cardMuted,
    cardMutedHex: stripHex(cardMuted),
    dividerColor,
    dividerColorHex: stripHex(dividerColor),
    accentStyle,
    fontTitle,
    fontBody,
    fontSizes,
  };
}

/**
 * Resolves effective slide-level tokens for Gamma multi-surface contrast rhythm
 * ("base" | "tinted" | "dark" | "accent") while preserving strict WCAG contrast.
 */
export function resolveSlideSurfaceTokens(
  tokens: ThemeTokens,
  surface?: "base" | "tinted" | "dark" | "accent",
  customBgColor?: string,
): ThemeTokens {
  if (customBgColor && /^#[0-9a-fA-F]{6}$/.test(customBgColor.trim())) {
    const bg = customBgColor.trim().toUpperCase();
    const lum = getLuminance(bg);
    const dark = lum < 0.35;
    return {
      ...tokens,
      isDark: dark,
      bg,
      bgHex: stripHex(bg),
      textPrimary: dark ? "#F8FAFC" : "#0F172A",
      textPrimaryHex: dark ? "F8FAFC" : "0F172A",
      textSecondary: dark ? "#CBD5E1" : "#334155",
      textSecondaryHex: dark ? "CBD5E1" : "334155",
      textMuted: dark ? "#94A3B8" : "#64748B",
      textMutedHex: dark ? "94A3B8" : "64748B",
      cardBg: dark ? adjustHex(bg, 18) : "#FFFFFF",
      cardBgHex: stripHex(dark ? adjustHex(bg, 18) : "#FFFFFF"),
      cardBorder: dark ? adjustHex(bg, 38) : blendHex(bg, tokens.accent, 0.22),
      cardBorderHex: stripHex(dark ? adjustHex(bg, 38) : blendHex(bg, tokens.accent, 0.22)),
      cardText: dark ? "#F8FAFC" : "#0F172A",
      cardTextHex: dark ? "F8FAFC" : "0F172A",
      cardMuted: dark ? "#94A3B8" : "#475569",
      cardMutedHex: dark ? "94A3B8" : "475569",
      dividerColor: dark ? adjustHex(bg, 32) : blendHex(bg, "#0F172A", 0.14),
      dividerColorHex: stripHex(dark ? adjustHex(bg, 32) : blendHex(bg, "#0F172A", 0.14)),
      accentTint: dark ? blendHex(bg, tokens.accent, 0.25) : blendHex("#FFFFFF", tokens.accent, 0.14),
      accentTintHex: stripHex(dark ? blendHex(bg, tokens.accent, 0.25) : blendHex("#FFFFFF", tokens.accent, 0.14)),
    };
  }

  if (!surface || surface === "base") {
    return tokens;
  }

  if (surface === "dark") {
    // Switch light themes onto their rich dark surface; keep dark themes even deeper/sleeker
    const bg = tokens.isDark ? adjustHex(tokens.bg, -6) : tokens.darkBg;
    const cardBg = tokens.isDark ? adjustHex(bg, 22) : tokens.darkCardBg;
    const cardBorder = adjustHex(bg, 42);
    const brightAccent = getLuminance(tokens.accent) < 0.25 ? adjustHex(tokens.accent, 75) : tokens.accent;
    return {
      ...tokens,
      isDark: true,
      bg,
      bgHex: stripHex(bg),
      textPrimary: "#F8FAFC",
      textPrimaryHex: "F8FAFC",
      textSecondary: "#E2E8F0",
      textSecondaryHex: "E2E8F0",
      textMuted: "#94A3B8",
      textMutedHex: "94A3B8",
      accent: brightAccent,
      accentHex: stripHex(brightAccent),
      accentTint: blendHex(bg, brightAccent, 0.24),
      accentTintHex: stripHex(blendHex(bg, brightAccent, 0.24)),
      cardBg,
      cardBgHex: stripHex(cardBg),
      cardBorder,
      cardBorderHex: stripHex(cardBorder),
      cardText: "#F8FAFC",
      cardTextHex: "F8FAFC",
      cardMuted: "#CBD5E1",
      cardMutedHex: "CBD5E1",
      dividerColor: adjustHex(bg, 36),
      dividerColorHex: stripHex(adjustHex(bg, 36)),
    };
  }

  if (surface === "tinted") {
    const bg = tokens.surfaceTint;
    const lum = getLuminance(bg);
    const dark = lum < 0.35;
    const cardBg = dark ? adjustHex(bg, 18) : "#FFFFFF";
    const cardBorder = dark ? adjustHex(bg, 38) : blendHex(bg, tokens.accent, 0.24);
    return {
      ...tokens,
      isDark: dark,
      bg,
      bgHex: stripHex(bg),
      cardBg,
      cardBgHex: stripHex(cardBg),
      cardBorder,
      cardBorderHex: stripHex(cardBorder),
      cardText: dark ? "#F8FAFC" : tokens.textPrimary,
      cardTextHex: dark ? "F8FAFC" : tokens.textPrimaryHex,
      cardMuted: dark ? "#CBD5E1" : tokens.textSecondary,
      cardMutedHex: dark ? "CBD5E1" : tokens.textSecondaryHex,
    };
  }

  // "accent" surface (subtle bold accent tint for statement / callout slides)
  const accentBg = blendHex(tokens.isDark ? tokens.bg : "#FFFFFF", tokens.accent, tokens.isDark ? 0.32 : 0.14);
  const darkAccent = getLuminance(accentBg) < 0.35;
  return {
    ...tokens,
    isDark: darkAccent,
    bg: accentBg,
    bgHex: stripHex(accentBg),
    cardBg: darkAccent ? adjustHex(accentBg, 20) : "#FFFFFF",
    cardBgHex: stripHex(darkAccent ? adjustHex(accentBg, 20) : "#FFFFFF"),
    cardBorder: blendHex(accentBg, tokens.accent, 0.4),
    cardBorderHex: stripHex(blendHex(accentBg, tokens.accent, 0.4)),
  };
}

/**
 * Recommends a vibrant, domain-appropriate visual theme from a template catalog.
 * Deliberately skips generic grayscale templates as an automatic default.
 */
export function recommendThemeFromCatalog<T extends RawThemeInput>(
  domainOrText: string,
  catalog: T[],
): T | undefined {
  if (!catalog || catalog.length === 0) return undefined;
  const nonGrayscale = catalog.filter(
    (t) =>
      !t.id?.includes("grayscale") &&
      !t.name.toLowerCase().includes("grayscale") &&
      t.category?.toLowerCase() !== "minimal",
  );
  const pool = nonGrayscale.length > 0 ? nonGrayscale : catalog;

  const q = (domainOrText || "").slice(0, 10000).toLowerCase();
  const findByIds = (ids: string[]) =>
    ids.map((id) => pool.find((t) => t.id === id)).find(Boolean);

  const countMatches = (re: RegExp) => (q.match(re) || []).length;

  const scores = [
    {
      key: "technology",
      score:
        countMatches(/\b(software|algorithm|neural|microservice|database|kubernetes|programming|java|python|oop|object-oriented|polymorphism|inheritance|abstraction|encapsulation|compiler|api|distributed|consensus|byzantine|raft|cybersecurity|technology)\b/g),
      ids: ["neural-grid", "microservices-architecture", "cyber-cyan", "quantum-algorithm-brief"],
      cat: "technology",
    },
    {
      key: "research",
      score:
        countMatches(/\b(clinical|medical|biology|health|cancer|patient|genom|crispr|physics|chemistry|photosynthesis|experiment|hypothesis|lab|research|science)\b/g),
      ids: ["clinical-trial-deck", "findings-column", "public-health-epidemiology", "environmental-science-lab"],
      cat: "research",
    },
    {
      key: "education",
      score:
        countMatches(/\b(course|lecture|syllabus|curriculum|classroom|chapter|university|assignment|exam|pedagog|education|school|freshman|textbook|geography|region|horn of africa|islam|quran|hadith|academic)\b/g),
      ids: ["classroom-bright", "university-lecture-series", "interactive-stem-syllabus", "higher-ed-orientation"],
      cat: "education",
    },
    {
      key: "creative",
      score:
        countMatches(/\b(design|brand|art|story|creative|portfolio|film|ux|ui|color|fashion|typography)\b/g),
      ids: ["creative-story", "typographic-exhibition", "brand-identity-standards", "folio-contrast"],
      cat: "creative",
    },
    {
      key: "business",
      score:
        countMatches(/\b(strategy|stakeholder|market|customer|revenue|ebitda|arr|roi|valuation|fiscal|enterprise|growth|governance|business|finance)\b/g),
      ids: ["executive-brief", "corporate-strategy-2026", "commercial-banking-advisory"],
      cat: "business",
    },
  ];

  // Explicit domain string matches ("technology", "academic", "healthcare", "science", etc.)
  if (q === "healthcare" || q === "science") {
    return (
      findByIds(q === "healthcare" ? ["clinical-trial-deck", "public-health-epidemiology"] : ["findings-column", "clinical-trial-deck"]) ||
      pool.find((t) => (t.category || "").toLowerCase() === "research") ||
      pool[0]
    );
  }

  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0]!;
  if (winner.score > 0) {
    return (
      findByIds(winner.ids) ||
      pool.find((t) => (t.category || "").toLowerCase() === winner.cat) ||
      pool[0]
    );
  }

  return (
    findByIds(["executive-brief", "corporate-strategy-2026", "commercial-banking-advisory"]) ||
    pool.find((t) => (t.category || "").toLowerCase() === "business") ||
    pool[0]
  );
}
