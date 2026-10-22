import type { TemplateItem } from "@/data/templates";
import { computeThemeTokens, type RawThemeInput } from "./presentation-theme";
import { renderSlideDeckToPptx } from "./presentation-renderer";
import type { SlidePreviewItem } from "./presentation-session-client";

/**
 * Generates and downloads a genuine PowerPoint (.pptx) file from a DocuMind template.
 * 100% Free, zero watermark, full vector formatting.
 */
export async function downloadTemplatePptx(template: TemplateItem): Promise<string> {
  const rawTheme: RawThemeInput = {
    id: template.id,
    name: template.name,
    category: template.category,
    kind: template.kind,
    colors: template.colors,
    fonts: template.fonts,
    tier: template.tier,
  };

  const tokens = computeThemeTokens(rawTheme);

  const slides: SlidePreviewItem[] = [
    {
      id: "slide-1",
      slideNumber: 1,
      layout: "title",
      title: template.name,
      subtitle: template.description,
      categoryTag: template.category,
      notes: `Welcome the audience to ${template.name}.`,
    },
    {
      id: "slide-2",
      slideNumber: 2,
      layout: "agenda",
      title: "Presentation Roadmap",
      subtitle: "Strategic roadmap and agenda topics",
      categoryTag: "AGENDA",
      bullets: [
        "1. Executive Context & Objectives",
        "2. Key Findings & Data Analysis",
        "3. Core Operational Metrics",
        "4. Strategic Roadmap & Execution",
      ],
      notes: "Walk through the agenda.",
    },
    ...template.slides.map((s, idx) => ({
      id: `slide-${idx + 3}`,
      slideNumber: idx + 3,
      layout: s.layout as SlidePreviewItem["layout"],
      title: s.title,
      subtitle: s.subtitle,
      categoryTag: template.category,
      bullets: s.bullets,
      notes: `Discussion notes for ${s.title}.`,
    })),
    {
      id: `slide-${template.slides.length + 3}`,
      slideNumber: template.slides.length + 3,
      layout: "conclusion",
      title: "Key Takeaways & Forward Actions",
      subtitle: "Summary synthesis and operational roadmap",
      categoryTag: "CONCLUSION",
      bullets: [
        "Decisive insights aligned across stakeholders.",
        "Resource allocation and execution timeline approved.",
        "Immediate follow-up checkpoints established.",
      ],
      notes: "Conclude presentation and open floor for discussion.",
    },
  ];

  const pptx = await renderSlideDeckToPptx(template.name, template.category, slides, tokens);

  const cleanFilename = `${template.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "presentation"}.pptx`;
  await pptx.writeFile({ fileName: cleanFilename });
  return cleanFilename;
}
