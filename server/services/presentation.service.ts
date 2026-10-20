import PptxGenJS from "pptxgenjs";

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
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "DocuMind";
  pptx.company = "DocuMind — The Intelligent Paper Studio";
  pptx.title = options.title;

  const primaryHex = (options.primaryColor || "#0F172A").replace("#", "");
  const accentHex = (options.accentColor || "#2563EB").replace("#", "");
  const bgHex = (options.bgColor || "#FFFFFF").replace("#", "");

  // Slide 1: Cover
  const cover = pptx.addSlide();
  cover.background = { color: bgHex };
  cover.addShape(pptx.ShapeType.rect, {
    x: 1.0,
    y: 1.5,
    w: 1.0,
    h: 0.08,
    fill: { color: accentHex },
  });
  cover.addText((options.category || "PRESENTATION").toUpperCase(), {
    x: 1.0,
    y: 1.8,
    w: 8.0,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: accentHex,
  });
  cover.addText(options.title, {
    x: 1.0,
    y: 2.5,
    w: 9.5,
    h: 1.8,
    fontSize: 38,
    bold: true,
    color: primaryHex,
    fontFace: "Calibri",
  });
  cover.addText("Created with DocuMind — 100% Free Document Productivity Studio", {
    x: 1.0,
    y: 5.5,
    w: 9.5,
    h: 0.4,
    fontSize: 12,
    color: "777777",
  });

  // Additional Slides
  for (const [idx, s] of options.slides.entries()) {
    const slide = pptx.addSlide();
    slide.background = { color: bgHex };

    slide.addText(`0${idx + 1} // TOPIC`, {
      x: 0.8,
      y: 0.8,
      w: 6.0,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: accentHex,
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
        h: 0.4,
        fontSize: 14,
        color: "666666",
        italic: true,
      });
    }

    if (s.bullets && s.bullets.length > 0) {
      const items = s.bullets.map((b) => ({ text: b, options: { breakLine: true } }));
      slide.addText(items, {
        x: 0.8,
        y: 2.6,
        w: 9.5,
        h: 3.5,
        fontSize: 16,
        color: "333333",
        bullet: true,
        lineSpacing: 28,
      });
    }
  }

  // Export buffer
  const rawData = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer);
}
