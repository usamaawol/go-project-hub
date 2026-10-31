import { describe, it, expect } from "vitest";
import {
  getDefaultAssignmentMetadata,
  type AssignmentMetadata,
} from "@/lib/assignment-types";
import {
  getCoverTemplateById,
  generateDefaultCoverElements,
} from "@/lib/cover-templates-registry";
import { renderSlideDeckToPptx } from "@/lib/presentation-renderer";
import { computeThemeTokens, type RawThemeInput } from "@/lib/presentation-theme";
import type { SlidePreviewItem } from "@/lib/presentation-session-client";

describe("Assignment Presentation Maker High-Fidelity & Full Slide Editing", () => {
  const sampleMeta: AssignmentMetadata = {
    ...getDefaultAssignmentMetadata(),
    assignmentTitle: "Advanced Object-Oriented Software Engineering",
    courseName: "CS 401 - Advanced Software Architecture",
    instructorName: "Dr. Catherine Howard",
    studentName: "Alex Mercer",
    studentId: "STU-882194",
    universityName: "Stanford University",
    department: "Department of Computer Science",
    submissionDate: "November 15, 2026",
    academicYear: "2026-2027",
    semester: "Fall Semester",
    logoDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    coverTemplateId: "canva-blue-yellow-proposal",
    accentColor: "#F59E0B",
  };

  it("places institutional logo in the top-left corner with zero overlap in 16:9", () => {
    const template = getCoverTemplateById("canva-blue-yellow-proposal");
    const elements = generateDefaultCoverElements(template, sampleMeta, 1333, 750);

    // Verify logo element exists
    const logoEl = elements.find((el) => el.type === "image" && el.imageUrl === sampleMeta.logoDataUrl);
    expect(logoEl).toBeDefined();

    // Verify logo is placed in the top-left corner
    expect(logoEl!.x).toBe(60);
    expect(logoEl!.y).toBeGreaterThanOrEqual(35);
    expect(logoEl!.y).toBeLessThanOrEqual(50);
    expect(logoEl!.width).toBe(140);
    expect(logoEl!.height).toBeGreaterThanOrEqual(60);

    // Verify that NO title or heading element collides with the logo
    const collidingElements = elements.filter(
      (el) =>
        el.id !== logoEl!.id &&
        el.type === "text" &&
        el.x < 220 &&
        el.y < 110
    );
    expect(collidingElements).toHaveLength(0);
  });

  it("fills the first page / slide without huge voids at the bottom", () => {
    const template = getCoverTemplateById("canva-blue-yellow-proposal");
    const elements = generateDefaultCoverElements(template, sampleMeta, 1333, 750);

    // Verify elements span across vertical depth (down past y: 550)
    const maxY = Math.max(...elements.map((el) => el.y + el.height));
    expect(maxY).toBeGreaterThan(600);

    // Verify real metadata is placed on the slide
    const textContents = elements
      .filter((el) => el.type === "text")
      .map((el) => el.text || "")
      .join(" ");

    expect(textContents.toLowerCase()).toContain("advanced object-oriented software engineering");
    expect(textContents.toLowerCase()).toContain("stanford university");
    expect(textContents).toContain("Alex Mercer");
    expect(textContents).toContain("STU-882194");
    expect(textContents).toContain("Dr. Catherine Howard");
    expect(textContents).toContain("November 15, 2026");

    // Verify fake placeholders are stripped out
    expect(textContents).not.toContain("+123-456-7890");
    expect(textContents).not.toContain("reallygreatsite.com");
  });

  it("renders Slide 1 Cover and Slide 2+ with custom font size, bold, and colors in PPTX", async () => {
    const rawTheme: RawThemeInput = {
      name: "Academic Modern",
      colors: {
        primary: sampleMeta.accentColor || "#1E3A8A",
        accent: "#3B82F6",
        bg: "#FFFFFF",
      },
    };
    const tokens = computeThemeTokens(rawTheme);

    const slides: SlidePreviewItem[] = [
      {
        id: "slide-1",
        slideNumber: 1,
        layout: "assignment-cover",
        title: sampleMeta.assignmentTitle!,
        assignmentMetadata: sampleMeta,
      },
      {
        id: "slide-2",
        slideNumber: 2,
        layout: "content",
        title: "Object-Oriented Design Principles",
        subtitle: "Encapsulation, Inheritance, Polymorphism, and Abstraction",
        titleFontSize: 32,
        isTitleBold: true,
        textColor: "#1E3A8A",
        isSubtitleItalic: true,
        bullets: [
          "Encapsulation restricts direct access to some of an object's components.",
          "Inheritance facilitates code reuse and hierarchical classification.",
          "Polymorphism enables unified interfaces for different data types.",
        ],
        notes: "Emphasize coupling and cohesion in enterprise architecture.",
      },
      {
        id: "slide-3",
        slideNumber: 3,
        layout: "two-column",
        title: "Comparative Architectural Paradigms",
        leftColumn: {
          title: "Object-Oriented Paradigm",
          bullets: ["State encapsulation", "Message passing", "Dynamic dispatch"],
        },
        rightColumn: {
          title: "Functional Paradigm",
          bullets: ["Pure functions", "Immutable state", "First-class functions"],
        },
      },
    ];

    const pptx = await renderSlideDeckToPptx(
      sampleMeta.assignmentTitle!,
      "Academic Assignment",
      slides,
      tokens
    );

    expect(pptx).toBeDefined();
    expect(pptx.title).toBe(sampleMeta.assignmentTitle);
    expect(pptx.layout).toBe("LAYOUT_WIDE");

    // Generate output buffer to confirm valid PPTX binary generation
    const buffer = await pptx.write({ outputType: "nodebuffer" });
    expect(buffer).toBeDefined();
    expect((buffer as Buffer).length).toBeGreaterThan(10000);
  });
});
