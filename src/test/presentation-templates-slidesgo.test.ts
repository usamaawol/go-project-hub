import { describe, expect, it } from "vitest";
import React from "react";
import fs from "fs";
import { renderToString } from "react-dom/server";
import { TEMPLATES, TEMPLATE_CATEGORIES, templateToPresentationOutline } from "@/data/templates";
import { ThemeThumb } from "@/components/landing/ThemeThumb";
import { downloadTemplatePptx } from "@/lib/pptx-export";

describe("Slidesgo Minimalist 100+ Presentation Templates Suite", () => {
  it("contains more than 100+ presentation templates (130 total) in the catalog", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(100);
    expect(TEMPLATES.length).toBe(130);
  });

  it("contains all 20 bespoke Slidesgo Minimalist templates matching the reference screenshots", () => {
    const expectedSlidesgoIds = [
      "slidesgo-minimalist-grayscale",
      "slidesgo-minimalist-business",
      "slidesgo-korean-aesthetic",
      "slidesgo-minimal-gradient",
      "slidesgo-lead-funnel",
      "slidesgo-interior-design",
      "slidesgo-minimalist-pitch",
      "slidesgo-work-life",
      "slidesgo-thesis-defense",
      "slidesgo-minimal-charm",
      "slidesgo-industrial-project",
      "slidesgo-engineering-proposal",
      "slidesgo-oncology-breakthrough",
      "slidesgo-clean-portfolio",
      "slidesgo-green-slides",
      "slidesgo-argumentative-fallacy",
      "slidesgo-hs-planner",
      "slidesgo-elegant-thesis",
      "slidesgo-case-report",
      "slidesgo-formal-portfolio",
    ];

    for (const id of expectedSlidesgoIds) {
      const template = TEMPLATES.find((t) => t.id === id);
      expect(template, `Template with id ${id} must exist in catalog`).toBeDefined();
      expect(template?.isFree).toBe(true);
      expect(template?.slides.length).toBeGreaterThanOrEqual(3);
      expect(template?.colors.primary).toBeDefined();
      expect(template?.colors.accent).toBeDefined();
      expect(template?.colors.bg).toBeDefined();
    }
  });

  it("prioritizes Minimalist Grayscale Pitch Deck and Minimalist Business Slides at index 0 and 1", () => {
    expect(TEMPLATES[0].id).toBe("slidesgo-minimalist-grayscale");
    expect(TEMPLATES[0].name).toBe("Minimalist Grayscale Pitch Deck");
    expect(TEMPLATES[0].aspectRatio).toBe("16:9");

    expect(TEMPLATES[1].id).toBe("slidesgo-minimalist-business");
    expect(TEMPLATES[1].name).toBe("Minimalist Business Slides");
    expect(TEMPLATES[1].category).toBe("Minimal");
  });

  it("renders genuine Slidesgo visual layouts for all 4 slide states via ThemeThumb", () => {
    const grayscaleTpl = TEMPLATES.find((t) => t.id === "slidesgo-minimalist-grayscale")!;
    const businessTpl = TEMPLATES.find((t) => t.id === "slidesgo-minimalist-business")!;

    // Check all 4 slide states (0: Title, 1: Agenda, 2: Data, 3: Summary)
    for (let slideIdx = 0; slideIdx <= 3; slideIdx++) {
      const grayscaleHtml = renderToString(
        React.createElement(ThemeThumb, {
          template: grayscaleTpl,
          slide: slideIdx as any,
        })
      );
      expect(grayscaleHtml).toContain("aspect-video");

      const businessHtml = renderToString(
        React.createElement(ThemeThumb, {
          template: businessTpl,
          slide: slideIdx as any,
        })
      );
      expect(businessHtml).toContain("aspect-video");
    }

    // Verify slide 0 contains specific visual hallmarks
    const businessCover = renderToString(
      React.createElement(ThemeThumb, {
        template: businessTpl,
        slide: 0,
      })
    );
    expect(businessCover).toContain("Minimalist");
    expect(businessCover).toContain("Business Slides");
    expect(businessCover).toContain("svg"); // organic curves

    const grayscaleCover = renderToString(
      React.createElement(ThemeThumb, {
        template: grayscaleTpl,
        slide: 0,
      })
    );
    expect(grayscaleCover).toContain("MINIMALIST");
    expect(grayscaleCover).toContain("GRAYSCALE");
    expect(grayscaleCover).toContain("polygon"); // diagonal polygon cutout
  });

  it("renders modern dynamic template thumbnails for any catalog template without crashing", () => {
    const executiveTpl = TEMPLATES.find((t) => t.id === "executive-brief")!;
    const html = renderToString(
      React.createElement(ThemeThumb, {
        template: executiveTpl,
        slide: 0,
      })
    );
    expect(html).toContain("Executive Brief");
    expect(html).toContain("16:9");
  });

  it("generates a genuine PowerPoint (.pptx) file for Slidesgo templates via downloadTemplatePptx", async () => {
    const grayscaleTpl = TEMPLATES.find((t) => t.id === "slidesgo-minimalist-grayscale")!;
    const outline = templateToPresentationOutline(grayscaleTpl);
    expect(outline).toContain("MINIMALIST GRAYSCALE PITCH DECK");

    const pptxName = await downloadTemplatePptx(grayscaleTpl);
    expect(pptxName).toContain("Minimalist_Grayscale_Pitch_Deck.pptx");
    if (fs.existsSync(pptxName)) {
      fs.unlinkSync(pptxName);
    }
  });
});
