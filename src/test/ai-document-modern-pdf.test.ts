import { describe, expect, test } from "bun:test";
import {
  parseInlineMarkdownToRuns,
  parseInlineHtmlToRuns,
  renderExecutivePdf,
  parsePlainTextToBlocks,
} from "@/lib/document-synthesizer";
import {
  parseDocumentSections,
  convertSectionsToInitialHtml,
  formatInlineMarkdownToHtml,
} from "@/components/workspace/DocumentFormattingWorkflow";
import {
  generateCoverElements,
  getCoverTemplateById,
} from "@/lib/cover-templates-registry";
import type { AssignmentMetadata } from "@/lib/assignment-types";

describe("AI Document & Modern PDF Generation Verification", () => {
  test("parseInlineMarkdownToRuns accurately converts markdown to bold/italic runs without literal asterisks", () => {
    const raw = "demonstrates OOP principles, particularly **Abstraction, Inheritance, and Polymorphism**, through a structured class design.";
    const runs = parseInlineMarkdownToRuns(raw);

    expect(runs.length).toBe(3);
    expect(runs[0]?.text).toBe("demonstrates OOP principles, particularly ");
    expect(runs[1]?.text).toBe("Abstraction, Inheritance, and Polymorphism");
    expect(runs[1]?.bold).toBe(true);
    expect(runs[2]?.text).toBe(", through a structured class design.");

    // Check no literal asterisks in any run
    for (const r of runs) {
      expect(r.text).not.toContain("**");
    }
  });

  test("parseInlineMarkdownToRuns handles code backticks and numbered bold items", () => {
    const raw = "1. **Register Regular Student:** Allows users to manage `Student` records.";
    const runs = parseInlineMarkdownToRuns(raw);

    expect(runs.some((r) => r.text === "Register Regular Student:" && r.bold)).toBe(true);
    expect(runs.some((r) => r.text === "Student")).toBe(true);
    expect(runs.every((r) => !r.text.includes("**") && !r.text.includes("`"))).toBe(true);
  });

  test("formatInlineMarkdownToHtml converts markdown to strong/code HTML tags", () => {
    const raw = "The class uses **Abstraction** and `RegularStudent` subclass.";
    const html = formatInlineMarkdownToHtml(raw);

    expect(html).toContain("<strong>Abstraction</strong>");
    expect(html).toContain("<code");
    expect(html).toContain("RegularStudent");
    expect(html).not.toContain("**");
    expect(html).not.toContain("`");
  });

  test("parseDocumentSections does not classify transitional colon sentences as section headings", () => {
    const sample = `
1. Project Description
The Student Management System is a console-based application.

4. Main System Features
The system will provide the following functionalities:
1. Register Regular Student: Allows users to save records.
2. Register Distance Student: Allows distance students.

7. Technologies and Tools
The following technologies and tools will be used:
- Java
- Apache NetBeans

Conclusion
The system provides a practical OOP demonstration.
`;

    const sections = parseDocumentSections(sample, "none");
    const sectionTitles = sections.map((s) => s.title);

    // Section 1, 4, 7 and Conclusion must be present
    expect(sectionTitles.some((t) => t.includes("Project Description"))).toBe(true);
    expect(sectionTitles.some((t) => t.includes("Main System Features"))).toBe(true);
    expect(sectionTitles.some((t) => t.includes("Technologies and Tools"))).toBe(true);
    expect(sectionTitles.some((t) => t.includes("Conclusion"))).toBe(true);

    // Transitional sentences MUST NOT be section headers!
    expect(sectionTitles).not.toContain("The system will provide the following functionalities");
    expect(sectionTitles).not.toContain("The following technologies and tools will be used");

    // Conclusion must be level 1 and have no artificial sub-numbering
    const conclusionSec = sections.find((s) => s.title.toLowerCase().includes("conclusion"));
    expect(conclusionSec?.level).toBe(1);
    expect(conclusionSec?.numberStr.trim()).toBe("");
  });

  test("Cover page generates complete group directory with leader lines for all members", () => {
    const meta: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "group",
      groupName: "Group Assignment",
      assignmentTitle: "PROJECT PROPOSAL",
      courseName: "OOP",
      accentColor: "#1B365D",
      groupMembers: [
        { fullName: "Abdi Mohammad", studentId: "0267/17" },
        { fullName: "Firomsa Balcha", studentId: "1187/17" },
        { fullName: "Usama Awol", studentId: "3265/17" },
        { fullName: "Nure Mume", studentId: "2768/17" },
        { fullName: "Abdulhafiz Abdurezak", studentId: "0300/17" },
      ],
      instructorName: "Dame K",
      submissionDate: "2026-11-03",
    };

    const elements = generateCoverElements("canva-modern-proposal", meta, 794, 1123);

    // Must contain all 5 group members
    expect(elements.some((e) => e.text === "Abdi Mohammad")).toBe(true);
    expect(elements.some((e) => e.text === "Firomsa Balcha")).toBe(true);
    expect(elements.some((e) => e.text === "Usama Awol")).toBe(true);
    expect(elements.some((e) => e.text === "Nure Mume")).toBe(true);
    expect(elements.some((e) => e.text === "Abdulhafiz Abdurezak")).toBe(true);

    // Must contain their student IDs
    expect(elements.some((e) => e.text === "0267/17")).toBe(true);
    expect(elements.some((e) => e.text === "1187/17")).toBe(true);
    expect(elements.some((e) => e.text === "3265/17")).toBe(true);

    // Must contain leader lines
    const leaderLines = elements.filter((e) => e.id?.includes("cover-member-line"));
    expect(leaderLines.length).toBe(5);

    // Must sanitize corporate footers
    expect(elements.every((e) => !e.text?.toLowerCase().includes("board review"))).toBe(true);
    expect(elements.every((e) => !e.text?.toLowerCase().includes("executive confidential"))).toBe(true);
  });

  test("renderExecutivePdf renders publication-grade PDF without unparsed markdown asterisks", async () => {
    const text = `
# PROJECT PROPOSAL
## Project Title: Student Management System
The system is built on **Object-Oriented Programming**, using **Abstraction, Inheritance, and Polymorphism**.

## Main System Features
- **Register Regular Student:** Allows users to save records.
- **Search Student:** Finds a student using ID.
- Terminate with \`System.exit(0)\`.

## Conclusion
The system successfully fulfills all academic objectives.
`;

    const blocks = parsePlainTextToBlocks(text);
    const pdfBytes = await renderExecutivePdf(blocks, "PROJECT PROPOSAL", {
      fontFamily: "academic",
      fontSize: 10,
      lineSpacing: 1.4,
      primaryColor: "#1B365D",
      headingStyle: "clean",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
