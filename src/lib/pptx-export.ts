import PptxGenJS from "pptxgenjs";
import type { TemplateItem } from "@/data/templates";

/**
 * Generates and downloads a genuine PowerPoint (.pptx) file from a DocuMind template.
 * 100% Free, zero watermark, full vector formatting.
 */
export async function downloadTemplatePptx(template: TemplateItem): Promise<string> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "DocuMind";
  pptx.company = "DocuMind — The Intelligent Paper Studio";
  pptx.subject = template.name;
  pptx.title = `${template.name} — DocuMind Presentation`;

  const primaryHex = (template.colors.primary || "#0F172A").replace("#", "");
  const accentHex = (template.colors.accent || "#2563EB").replace("#", "");
  const bgHex = (template.colors.bg || "#FFFFFF").replace("#", "");

  // Slide 1: Title / Cover Slide
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: bgHex };

  // Decorative header line
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 0.8,
    w: 0.8,
    h: 0.08,
    fill: { color: accentHex },
  });

  coverSlide.addText(template.category.toUpperCase(), {
    x: 0.8,
    y: 1.1,
    w: 8.0,
    h: 0.4,
    fontSize: 10,
    bold: true,
    color: accentHex,
    charSpacing: 2,
  });

  coverSlide.addText(template.name, {
    x: 0.8,
    y: 1.8,
    w: 10.0,
    h: 1.8,
    fontSize: 40,
    bold: true,
    color: primaryHex,
    fontFace: "Calibri",
  });

  coverSlide.addText(template.description, {
    x: 0.8,
    y: 3.8,
    w: 9.5,
    h: 1.2,
    fontSize: 16,
    color: "555555",
    fontFace: "Calibri",
  });

  coverSlide.addText(`Typography Pairing: ${template.fonts}  |  DocuMind Free Template Studio`, {
    x: 0.8,
    y: 6.2,
    w: 10.0,
    h: 0.4,
    fontSize: 10,
    color: "888888",
    fontFace: "Calibri",
  });

  // Slide 2: Agenda / Table of Contents
  const agendaSlide = pptx.addSlide();
  agendaSlide.background = { color: bgHex };
  agendaSlide.addText("AGENDA & STRUCTURE", {
    x: 0.8,
    y: 0.8,
    w: 6.0,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: accentHex,
    charSpacing: 2,
  });
  agendaSlide.addText("Presentation Roadmap", {
    x: 0.8,
    y: 1.3,
    w: 8.0,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: primaryHex,
  });

  const agendaItems = [
    { text: "1. Executive Summary & Context", options: { breakLine: true } },
    { text: "2. Key Findings & Data Analysis", options: { breakLine: true } },
    { text: "3. Strategic Recommendations & Metrics", options: { breakLine: true } },
    { text: "4. Execution Roadmap & Next Steps", options: { breakLine: true } },
  ];
  agendaSlide.addText(agendaItems, {
    x: 0.8,
    y: 2.4,
    w: 9.5,
    h: 3.5,
    fontSize: 16,
    color: "333333",
    bullet: true,
    lineSpacing: 32,
  });

  // Slides from template definitions
  for (const [idx, s] of template.slides.entries()) {
    const slide = pptx.addSlide();
    slide.background = { color: bgHex };

    slide.addText(`SECTION ${idx + 1}`, {
      x: 0.8,
      y: 0.8,
      w: 6.0,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: accentHex,
      charSpacing: 2,
    });

    slide.addText(s.title, {
      x: 0.8,
      y: 1.2,
      w: 10.0,
      h: 0.8,
      fontSize: 26,
      bold: true,
      color: primaryHex,
    });

    if (s.subtitle) {
      slide.addText(s.subtitle, {
        x: 0.8,
        y: 2.0,
        w: 9.5,
        h: 0.5,
        fontSize: 14,
        color: "666666",
        italic: true,
      });
    }

    if (s.bullets && s.bullets.length > 0) {
      const bulletElements = s.bullets.map((b) => ({
        text: b,
        options: { breakLine: true },
      }));
      slide.addText(bulletElements, {
        x: 0.8,
        y: 2.8,
        w: 9.5,
        h: 3.2,
        fontSize: 15,
        color: "333333",
        bullet: true,
        lineSpacing: 28,
      });
    }
  }

  // Final Slide: Conclusion
  const endSlide = pptx.addSlide();
  endSlide.background = { color: primaryHex };
  endSlide.addText(template.name, {
    x: 1.0,
    y: 2.4,
    w: 9.0,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: "FFFFFF",
    align: "center",
  });
  endSlide.addText("Created with DocuMind — 100% Free Document Productivity", {
    x: 1.0,
    y: 4.0,
    w: 9.0,
    h: 0.6,
    fontSize: 14,
    color: "E2E8F0",
    align: "center",
  });

  const fileName = `${template.id}-documind.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
}
