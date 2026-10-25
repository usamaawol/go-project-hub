import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import {
  paginateSectionsIntoA4Pages,
  parseDocumentSections,
  renderDocBlock,
  type FormattingConfig,
  type DocBlock,
} from "@/components/workspace/DocumentFormattingWorkflow";
import { COVER_TEMPLATES, getDefaultAssignmentMetadata } from "@/lib/assignment-types";

describe("Document Studio Verification", () => {
  it("matches route for /document-studio without falling back to root or not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/document-studio");

    expect(matches.at(-1)?.routeId).toBe("/document-studio");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("safely handles null/empty text without throwing", () => {
    const emptySecs = parseDocumentSections("");
    expect(emptySecs.length).toBeGreaterThan(0);

    const undefinedSecs = parseDocumentSections(undefined as unknown as string);
    expect(undefinedSecs.length).toBeGreaterThan(0);
  });

  it("safely paginates sections into A4 pages with academic cover", () => {
    const metadata = getDefaultAssignmentMetadata();
    metadata.isAssignment = true;
    metadata.studentName = "Alex Johnson";
    metadata.studentId = "STU-2025-01";
    metadata.courseName = "Operating Systems";
    metadata.instructorName = "Dr. Eleanor Vance";
    metadata.coverTemplateId = "classic-university";

    const config: FormattingConfig = {
      layoutArchetype: "academic",
      hasCoverPage: true,
      coverStyle: "academic",
      docTitle: "Operating Systems Final Project",
      docSubtitle: "Kernel Memory Management",
      authorName: "Alex Johnson",
      institution: "Stanford University",
      dateStr: "October 2026",
      assignmentMetadata: metadata,
      fontFamily: "serif",
      baseFontSize: "11pt",
      lineSpacing: "1.5",
      paragraphSpacing: "normal",
      headingNumbering: "decimal",
      headingCase: "title",
      headingDivider: true,
      margins: "academic",
      headerText: "Stanford CS",
      headerAlign: "right",
      headerRule: true,
      pageNumberPosition: "bottom-center",
      pageNumberFormat: "page-x-of-y",
      firstPageUnnumbered: true,
      includeToc: true,
      tocLevels: 2,
      tocDotLeaders: true,
    };

    const text = `1.0 Introduction\nVirtual memory provides an idealized abstraction.\n\n2.0 Architecture\nPage tables translate virtual addresses to physical frames.\n\n2.1 Inverted Page Tables\nOptimized for 64-bit architectures.`;
    const sections = parseDocumentSections(text, config.headingNumbering);
    expect(sections.length).toBe(3);

    const pages = paginateSectionsIntoA4Pages(sections, config);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages[0]?.isCover).toBe(true);
  });

  it("contains all 10 cover template definitions with valid properties", () => {
    expect(COVER_TEMPLATES.length).toBe(10);
    for (const t of COVER_TEMPLATES) {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.defaultAccent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.category).toBeDefined();
    }
  });

  it("safely generates assignment cover HTML with undefined or partial metadata", async () => {
    const { generateAssignmentCoverHtml } = await import("@/lib/assignment-document-renderer");
    const html1 = generateAssignmentCoverHtml(undefined);
    expect(html1).toContain("Individual Course Assignment");
    expect(html1).toContain("Submitted By");

    const html2 = generateAssignmentCoverHtml({} as any);
    expect(html2).toContain("Individual Course Assignment");
  });

  it("safely renders document blocks without reference error for lineSpacing or lineHeight", () => {
    const paragraphBlock: DocBlock = {
      type: "paragraph",
      content: "This is a regular paragraph verifying that lineSpacing renders without any ReferenceError.",
    };

    const rendered = renderDocBlock(paragraphBlock, 0, "standard", "1.6");
    expect(rendered).toBeDefined();
    expect(rendered.type).toBe("p");
    expect(rendered.props.style.lineHeight).toBe("1.6");

    const darkRendered = renderDocBlock(paragraphBlock, 1, "dark", "2.0");
    expect(darkRendered).toBeDefined();
    expect(darkRendered.props.style.lineHeight).toBe("2.0");

    const listBlock: DocBlock = {
      type: "list",
      content: "",
      listItems: ["Point 1", "Point 2"],
    };
    const renderedList = renderDocBlock(listBlock, 2, "standard", "1.5");
    expect(renderedList).toBeDefined();
    expect(renderedList.type).toBe("ul");
  });
});
