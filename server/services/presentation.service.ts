import { computeThemeTokens, type RawThemeInput } from "../../src/lib/presentation-theme";
import { renderSlideDeckToPptx } from "../../src/lib/presentation-renderer";
import type { SlidePreviewItem } from "../../src/lib/presentation-session-client";

export interface PresentationOptions {
  title: string;
  category?: string;
  themeKind?: string;
  slides: Array<{
    title: string;
    subtitle?: string;
    bullets?: string[];
  }>;
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
}

export async function generatePresentationBuffer(options: PresentationOptions): Promise<Buffer> {
  const rawTheme: RawThemeInput = {
    name: `${options.category || "General"} Theme`,
    category: options.category || "General",
    kind: options.themeKind || "business",
    colors: {
      primary: options.primaryColor || "#0F172A",
      accent: options.accentColor || "#2563EB",
      bg: options.bgColor || "#FFFFFF",
    },
  };

  const tokens = computeThemeTokens(rawTheme);

  const slides: SlidePreviewItem[] = [
    {
      id: "slide-1",
      slideNumber: 1,
      layout: "title",
      title: options.title,
      subtitle: `${options.category || "PRESENTATION"} // Executive Presentation`,
      categoryTag: options.category,
      notes: `Welcome audience to ${options.title}.`,
    },
    ...options.slides.map((s, idx) => ({
      id: `slide-${idx + 2}`,
      slideNumber: idx + 2,
      layout: "content" as const,
      title: s.title,
      subtitle: s.subtitle,
      categoryTag: options.category,
      bullets: s.bullets,
      notes: `Key insights for ${s.title}.`,
    })),
  ];

  const pptx = await renderSlideDeckToPptx(
    options.title,
    options.category || "Presentation",
    slides,
    tokens,
  );

  const rawData = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer);
}
