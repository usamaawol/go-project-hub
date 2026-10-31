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
  | "metrics"
  | "timeline"
  | "process"
  | "quote"
  | "table"
  | "text-visual"
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
