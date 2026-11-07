import { describe, expect, it } from "vitest";
import {
  convertSectionsToInitialHtml,
  convertHtmlToRawText,
  parseDocumentSections,
  generateFormattedHtml,
  type FormattingConfig,
} from "@/components/workspace/DocumentFormattingWorkflow";
import { getDefaultAssignmentMetadata } from "@/lib/assignment-types";

describe("Stage 2 — Full Document-Body Rich-Text Editor & Word Processing Toolbar", () => {
  it("converts parsed document sections into editable semantic HTML with headings, lists, and paragraphs", () => {
    const raw = `1. Introduction
This is the opening paragraph of the system proposal.

2. Architecture Overview
- Inverted page tables
- Hardware TLB caches
- Virtual memory virtualization

> Crucial architectural requirement: Ensure zero-copy buffer handoffs.`;

    const sections = parseDocumentSections(raw, "decimal");
    const html = convertSectionsToInitialHtml(sections);

    expect(html).toMatch(/<h2[^>]*>1\.0 Introduction<\/h2>/);
    expect(html).toContain("This is the opening paragraph of the system proposal.</p>");
    expect(html).toMatch(/<h2[^>]*>2\.0 Architecture Overview<\/h2>/);
    expect(html).toMatch(/<ul[^>]*>/);
    expect(html).toMatch(/<li[^>]*>Inverted page tables<\/li>/);
    expect(html).toMatch(/<li[^>]*>Hardware TLB caches<\/li>/);
    expect(html).toMatch(/<blockquote[^>]*>/);
    expect(html).toContain("Crucial architectural requirement");
  });

  it("converts rich HTML back into raw markdown text safely", () => {
    const html = `<h2>1. Project Vision</h2><p>Our goal is to build an autonomous verification agent.</p><ul><li>Accuracy</li><li>Latency</li></ul>`;
    const text = convertHtmlToRawText(html);

    expect(text).toContain("Project Vision");
    expect(text).toContain("Our goal is to build an autonomous verification agent.");
    expect(text).toContain("Accuracy");
    expect(text).toContain("Latency");
  });

  it("safely generates formatted HTML export incorporating both Page 1 Canva cover and custom rich edited body HTML", () => {
    const meta = getDefaultAssignmentMetadata();
    meta.isAssignment = true;
    meta.assignmentTitle = "Distributed Operating Systems Specification";
    meta.courseName = "CS-501 Advanced Systems";
    meta.studentName = "Elena Rostova";
    meta.coverTemplateId = "canva-split-left-modern";

    const config: FormattingConfig = {
      layoutArchetype: "academic",
      hasCoverPage: true,
      coverStyle: "academic",
      docTitle: meta.assignmentTitle,
      assignmentMetadata: meta,
      fontFamily: "sans",
      baseFontSize: "11pt",
      lineSpacing: "1.5",
      paragraphSpacing: "normal",
      headingNumbering: "decimal",
      headingCase: "title",
      headingDivider: true,
      margins: "standard",
      headerText: "CS-501 Spec",
      headerAlign: "right",
      headerRule: true,
      pageNumberPosition: "bottom-center",
      pageNumberFormat: "page-x-of-y",
      firstPageUnnumbered: true,
      includeToc: false,
      tocLevels: 2,
      tocDotLeaders: true,
    };

    const customBodyHtml = `<div class="user-edited-section">
      <h2 style="color: #2563eb;">1.0 Abstract & Problem Statement</h2>
      <p>This <strong style="color: #059669;">specific sentence was bolded and colored in emerald</strong> by the user using the word-processing toolbar.</p>
      <p style="background-color: #fef08a;">This entire phrase has yellow highlighter background styling applied independently.</p>
    </div>`;

    const rawFallback = "1.0 Abstract\nBasic fallback text";

    const exportedHtml = generateFormattedHtml(rawFallback, config, customBodyHtml);

    // Page 1 contains the Canva Cover
    expect(exportedHtml).toContain("CS-501 Advanced Systems");
    expect(exportedHtml).toContain("Elena Rostova");

    // Page 2+ contains the user's custom rich edited HTML with selection styling preserved
    expect(exportedHtml).toContain("specific sentence was bolded and colored in emerald");
    expect(exportedHtml).toContain("background-color: #fef08a");
  });
});
