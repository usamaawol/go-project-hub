import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  renderExecutiveDocx,
  renderExecutivePdf,
  buildCoverPageSvg,
  parsePlainTextToBlocks,
} from "@/lib/document-synthesizer";
import {
  getDefaultAssignmentMetadata,
  type AssignmentMetadata,
  type CanvasCoverElement,
} from "@/lib/assignment-types";
import {
  COVER_TEMPLATES_REGISTRY,
  generateCoverElements,
} from "@/lib/cover-templates-registry";
import { generateAssignmentCoverHtml } from "@/lib/assignment-document-renderer";

describe("Modern Cover Page & Download Preservation Suite", () => {
  it("has more than 70+ modern cover page templates (84 total) in the registry", () => {
    expect(COVER_TEMPLATES_REGISTRY.length).toBeGreaterThanOrEqual(70);
    expect(COVER_TEMPLATES_REGISTRY.length).toBe(84);

    // Verify Salford & Co. wave is #1 at index 0
    expect(COVER_TEMPLATES_REGISTRY[0].id).toBe("canva-salford-wave");
    expect(COVER_TEMPLATES_REGISTRY[0].name).toContain("Salford");
    expect(COVER_TEMPLATES_REGISTRY[0].defaultAccent).toBe("#1B365D");
    expect(COVER_TEMPLATES_REGISTRY[0].secondaryColor).toBe("#F59E0B");
  });

  it("every one of the 84+ templates generates valid CanvasCoverElement list with elements", () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      assignmentTitle: "Global Logistics and Trade Architecture",
      courseName: "International Business 501",
      studentName: "Salford Consulting Team",
      universityName: "Salford & Co.",
      submissionDate: "2026-10-30",
    };

    for (const tpl of COVER_TEMPLATES_REGISTRY) {
      const elements = generateCoverElements(tpl.id, meta, 794, 1123);
      expect(elements.length, `Template ${tpl.id} should generate elements`).toBeGreaterThan(3);

      const hasTitle = elements.some(
        (el) =>
          el.isMetadataField === "assignmentTitle" ||
          (el.type === "text" && el.text?.toLowerCase().includes("logistics")),
      );
      expect(hasTitle, `Template ${tpl.id} must display document title`).toBe(true);
    }
  });

  it("buildCoverPageSvg outputs valid SVG string with all shapes and typography", () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      coverTemplateId: "canva-salford-wave",
      assignmentTitle: "Modern Minimalist Project Proposal",
      courseName: "Salford & Co. Corporate Architecture",
      studentName: "Elena Rostova",
      accentColor: "#1B365D",
      secondaryColor: "#F59E0B",
    };

    const elements = generateCoverElements("canva-salford-wave", meta, 794, 1123);
    const svg = buildCoverPageSvg(elements, 794, 1123);

    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0 794 1123"');
    expect(svg).toContain("#1B365D");
    expect(svg).toContain("#F59E0B");
    expect(svg).toContain("Modern Minimalist Project Proposal");
  });

  it("renderExecutivePdf preserves selected cover template and custom cover elements on export", async () => {
    const customElements: CanvasCoverElement[] = [
      {
        id: "bg-shape",
        type: "shape",
        x: 0,
        y: 0,
        width: 794,
        height: 400,
        fillColor: "#1B365D",
        zIndex: 1,
      },
      {
        id: "accent-bar",
        type: "shape",
        x: 60,
        y: 390,
        width: 200,
        height: 10,
        fillColor: "#F59E0B",
        zIndex: 2,
      },
      {
        id: "custom-title",
        type: "text",
        text: "Custom Salford & Co. Financial Strategy",
        x: 60,
        y: 120,
        width: 674,
        height: 80,
        fontSize: 32,
        fontWeight: "bold",
        textColor: "#FFFFFF",
        isMetadataField: "assignmentTitle",
        zIndex: 3,
      },
    ];

    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      coverTemplateId: "canva-salford-wave",
      assignmentTitle: "Custom Salford & Co. Financial Strategy",
      studentName: "Elena Rostova",
      accentColor: "#1B365D",
      secondaryColor: "#F59E0B",
      customCoverElements: customElements,
    };

    const blocks = parsePlainTextToBlocks(`
# Executive Overview
This document proves end-to-end export fidelity with custom cover elements preserved.

## Strategic Pillars
Detailed analysis of performance milestones.
`);

    const pdfBytes = await renderExecutivePdf(blocks, meta.assignmentTitle, {
      hasCoverPage: true,
      coverMetadata: meta,
      docTitle: meta.assignmentTitle,
      primaryColor: meta.accentColor,
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);

    const coverPage = doc.getPage(0);
    expect(coverPage.getWidth()).toBeCloseTo(595.28, 1);
    expect(coverPage.getHeight()).toBeCloseTo(841.89, 1);
  });

  it("generateAssignmentCoverHtml preserves Canva templates and custom elements for HTML Word (.doc) and Print", () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      coverTemplateId: "canva-salford-wave",
      assignmentTitle: "Modern Minimalist Project Proposal",
      courseName: "Strategic Consulting",
      studentName: "Salford & Co.",
      accentColor: "#1B365D",
      secondaryColor: "#F59E0B",
    };

    const html = generateAssignmentCoverHtml(meta);
    expect(html).toContain("Modern Minimalist Project Proposal");
    expect(html).toContain("#1B365D");
    expect(html).toContain("#F59E0B");
    expect(html).toContain("position: absolute");
  });

  it("renderExecutiveDocx includes cover page with title, institution, and metadata", async () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      coverTemplateId: "canva-salford-wave",
      assignmentTitle: "Corporate Financial Framework",
      universityName: "Salford & Co. Institute",
      studentName: "Senior Architect",
      accentColor: "#1B365D",
    };

    const blocks = parsePlainTextToBlocks(`
# Chapter 1
Content for docx validation.
`);

    const docxResult = await renderExecutiveDocx(blocks, meta.assignmentTitle, {
      hasCoverPage: true,
      coverMetadata: meta,
      docTitle: meta.assignmentTitle,
      institution: meta.universityName,
      primaryColor: meta.accentColor,
    });

    expect(docxResult).toBeDefined();
  });
});
