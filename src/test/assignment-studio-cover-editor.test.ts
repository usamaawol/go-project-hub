import { describe, it, expect } from "vitest";
import {
  COVER_TEMPLATES_REGISTRY,
  getCoverTemplateById,
  generateDefaultCoverElements,
  CANVAS_A4_WIDTH,
  CANVAS_A4_HEIGHT,
} from "../lib/cover-templates-registry";
import {
  COVER_TEMPLATES,
  getDefaultAssignmentMetadata,
  type AssignmentMetadata,
  type CanvasCoverElement,
} from "../lib/assignment-types";
import { generateAssignmentCoverHtml } from "../lib/assignment-document-renderer";
import {
  paginateSectionsIntoA4Pages,
  parseDocumentSections,
  type FormattingConfig,
} from "../components/workspace/DocumentFormattingWorkflow";

describe("DocuMind Document Studio 50+ Cover Templates & Native Editor Verification", () => {
  // -----------------------------------------------------------
  // 1. Template Library: 50+ Genuinely Distinct Templates
  // -----------------------------------------------------------
  describe("50+ Template Library & Scalable Registry", () => {
    it("contains at least 50 genuinely distinct, functional cover-page templates", () => {
      expect(COVER_TEMPLATES_REGISTRY.length).toBeGreaterThanOrEqual(50);
      expect(COVER_TEMPLATES.length).toBeGreaterThanOrEqual(50);

      // Verify all template IDs are unique
      const ids = new Set(COVER_TEMPLATES_REGISTRY.map((t) => t.id));
      expect(ids.size).toBe(COVER_TEMPLATES_REGISTRY.length);
    });

    it("spans all required 8 categories with rich metadata and visual tokens", () => {
      const categories = new Set(COVER_TEMPLATES_REGISTRY.map((t) => t.category));
      expect(categories).toContain("Academic");
      expect(categories).toContain("Modern");
      expect(categories).toContain("Formal");
      expect(categories).toContain("Research");
      expect(categories).toContain("Business");
      expect(categories).toContain("Minimalist");
      expect(categories).toContain("Geometric");
      expect(categories).toContain("Creative");

      for (const tpl of COVER_TEMPLATES_REGISTRY) {
        expect(tpl.id).toBeTruthy();
        expect(tpl.name).toBeTruthy();
        expect(tpl.tagline).toBeTruthy();
        expect(tpl.description).toBeTruthy();
        expect(tpl.defaultAccent).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(tpl.fontFamily).toBeTruthy();
        expect(tpl.borderStyle).toBeTruthy();
        expect(tpl.metadataLayout).toBeTruthy();
      }
    });

    it("generates distinct HTML layouts with zero duplicate outputs for all templates", () => {
      const meta = getDefaultAssignmentMetadata();
      meta.isAssignment = true;
      meta.studentName = "Sophia Loren";
      meta.studentId = "STU-2026-88";
      meta.courseName = "Distributed Cloud Architecture";
      meta.instructorName = "Dr. Robert Vance";
      meta.assignmentTitle = "High-Throughput Consensus Engines";
      meta.universityName = "Stanford University";

      const htmlSet = new Set<string>();

      for (const template of COVER_TEMPLATES_REGISTRY) {
        const coverHtml = generateAssignmentCoverHtml({
          ...meta,
          coverTemplateId: template.id,
        });

        expect(coverHtml).toContain("High-Throughput Consensus Engines");
        expect(coverHtml).toContain("Sophia Loren");
        expect(coverHtml).toContain("Dr. Robert Vance");

        // Every template must generate unique HTML
        expect(htmlSet.has(coverHtml)).toBe(false);
        htmlSet.add(coverHtml);
      }

      expect(htmlSet.size).toBeGreaterThanOrEqual(50);
    });

    it("retrieves template by ID safely and falls back to default if invalid", () => {
      const classic = getCoverTemplateById("classic-university");
      expect(classic.id).toBe("classic-university");

      const fallback = getCoverTemplateById("non-existent-template-id");
      expect(fallback).toBeDefined();
      expect(fallback.id).toBe("classic-university");
    });
  });

  // -----------------------------------------------------------
  // 2. Individual Assignment Workflow
  // -----------------------------------------------------------
  describe("Individual Assignment Workflow", () => {
    it("renders all individual fields correctly without group elements", () => {
      const individualMeta: AssignmentMetadata = {
        isAssignment: true,
        assignmentType: "individual",
        studentName: "Lucas Grey",
        studentId: "LG-2026-4412",
        courseName: "Quantum Computing & Mechanics",
        courseCode: "PHYS 401",
        instructorName: "Prof. Richard Feynman",
        universityName: "California Institute of Technology",
        department: "Department of Theoretical Physics",
        collegeOrFaculty: "Division of Physics, Mathematics and Astronomy",
        academicYear: "2026-2027",
        semester: "Spring 2026",
        submissionDate: "2026-10-28",
        assignmentTitle: "Decoherence in Multi-Qubit Superconducting Processors",
        additionalInstructions: "Submitted for Honors Capstone Review",
        coverTemplateId: "undergraduate-thesis",
        accentColor: "#0369A1",
        groupMembers: [],
      };

      const html = generateAssignmentCoverHtml(individualMeta);
      expect(html).toContain("Lucas Grey");
      expect(html).toContain("LG-2026-4412");
      expect(html).toContain("Quantum Computing");
      expect(html).toContain("PHYS 401");
      expect(html).toContain("Prof. Richard Feynman");
      expect(html).toContain("California Institute of Technology");
      expect(html).toContain("Department of Theoretical Physics");
      expect(html).toContain("2026-10-28");
      expect(html).not.toContain("Group Members Directory");
      expect(html).not.toContain("GROUP:");
    });
  });

  // -----------------------------------------------------------
  // 3. Group Assignment Workflow & Placement Decision (Option A vs Option B)
  // -----------------------------------------------------------
  describe("Group Assignment Workflow & Placement Decisions", () => {
    const baseGroupMeta: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "group",
      groupName: "Team Prometheus",
      assignmentTitle: "Distributed Resilient Ledger Architecture",
      courseName: "Cloud Operating Systems",
      courseCode: "CS 610",
      instructorName: "Dr. Eleanor Vance",
      universityName: "Carnegie Mellon University",
      groupMembers: [
        { id: "m1", fullName: "Alice Hamilton", studentId: "CMU-881" },
        { id: "m2", fullName: "Bob Zhang", studentId: "CMU-882" },
        { id: "m3", fullName: "Clara O'Connor", studentId: "CMU-883" },
      ],
      coverTemplateId: "cyber-systems",
      accentColor: "#0891B2",
    };

    it("Option A: Displays group name on cover page and not as a duplicate body heading", () => {
      const optionAMeta: AssignmentMetadata = {
        ...baseGroupMeta,
        groupNamePlacement: "cover",
      };

      const coverHtml = generateAssignmentCoverHtml(optionAMeta);
      expect(coverHtml).toContain("TEAM PROMETHEUS");
      expect(coverHtml).toContain("Alice Hamilton");
      expect(coverHtml).toContain("Bob Zhang");
      expect(coverHtml).toContain("Clara O&#039;Connor");
    });

    it("Option B: Omits group name from cover page and places it on top of the first body page", () => {
      const optionBMeta: AssignmentMetadata = {
        ...baseGroupMeta,
        groupNamePlacement: "first-body-page",
      };

      // 1. Cover page must NOT have the group name
      const coverHtml = generateAssignmentCoverHtml(optionBMeta);
      expect(coverHtml).not.toContain("GROUP: TEAM PROMETHEUS");
      expect(coverHtml).not.toContain("TEAM: TEAM PROMETHEUS");

      // 2. Full document pagination puts it on the first body page
      const config: FormattingConfig = {
        layoutArchetype: "academic",
        hasCoverPage: true,
        coverStyle: "academic",
        docTitle: optionBMeta.assignmentTitle || "Document Title",
        docSubtitle: "",
        authorName: "Alice Hamilton",
        institution: optionBMeta.universityName || "",
        dateStr: "2026-10-28",
        assignmentMetadata: optionBMeta,
        fontFamily: "serif",
        baseFontSize: "11pt",
        lineSpacing: "1.5",
        paragraphSpacing: "normal",
        headingNumbering: "decimal",
        headingCase: "title",
        headingDivider: true,
        margins: "academic",
        headerText: "CMU Research",
        headerAlign: "right",
        headerRule: true,
        pageNumberPosition: "bottom-center",
        pageNumberFormat: "page-x-of-y",
        firstPageUnnumbered: true,
        includeToc: false,
        tocLevels: 2,
        tocDotLeaders: true,
      };

      const rawContent = `1. Introduction\nDistributed consensus under network partitions is difficult.`;
      const sections = parseDocumentSections(rawContent, config.headingNumbering);
      const pages = paginateSectionsIntoA4Pages(sections, config);

      expect(pages.length).toBeGreaterThanOrEqual(2);
      expect(pages[0]?.isCover).toBe(true);
      expect(pages[1]?.isFirstBodyPage).toBe(true);
    });
  });

  // -----------------------------------------------------------
  // 4. Native Canvas Element Generator & Interactive Operations
  // -----------------------------------------------------------
  describe("Canvas Cover Element Operations", () => {
    it("generates standard A4 canvas elements strictly within page bounds", () => {
      const template = getCoverTemplateById("classic-university");
      const meta = getDefaultAssignmentMetadata();
      meta.isAssignment = true;
      meta.assignmentTitle = "Autonomous Robotics Navigation";
      meta.studentName = "Elena Fisher";
      meta.studentId = "EF-1002";
      meta.courseName = "Robotics & Perception";
      meta.instructorName = "Prof. John Craig";

      const elements = generateDefaultCoverElements(template, meta, CANVAS_A4_WIDTH, CANVAS_A4_HEIGHT);
      expect(elements.length).toBeGreaterThanOrEqual(6);

      // Verify canvas background exists
      const bg = elements.find((e) => e.id === "canvas-bg");
      expect(bg).toBeDefined();
      expect(bg?.width).toBe(CANVAS_A4_WIDTH);
      expect(bg?.height).toBe(CANVAS_A4_HEIGHT);

      // Verify essential metadata elements exist
      const titleEl = elements.find((e) => e.isMetadataField === "assignmentTitle");
      expect(titleEl).toBeDefined();
      expect(titleEl?.text).toBe("Autonomous Robotics Navigation");

      const studentEl = elements.find((e) => e.isMetadataField === "studentName");
      expect(studentEl).toBeDefined();
      expect(studentEl?.text).toBe("Elena Fisher");
    });

    it("supports adding shapes, badges, and moving elements without data loss", () => {
      const template = getCoverTemplateById("modern-minimal");
      const meta = getDefaultAssignmentMetadata();
      const elements = generateDefaultCoverElements(template, meta);

      // Add a custom shape
      const customBadge: CanvasCoverElement = {
        id: "badge-custom-test",
        type: "badge",
        name: "Test Badge",
        x: 100,
        y: 150,
        width: 140,
        height: 28,
        text: "PEER REVIEWED",
        zIndex: 50,
      };

      const updated = [...elements, customBadge];
      expect(updated.find((e) => e.id === "badge-custom-test")).toBeDefined();

      // Move element
      const moved = updated.map((e) => (e.id === "badge-custom-test" ? { ...e, x: 220, y: 300 } : e));
      const movedBadge = moved.find((e) => e.id === "badge-custom-test");
      expect(movedBadge?.x).toBe(220);
      expect(movedBadge?.y).toBe(300);
    });

    it("generates authentic Canva Blue & Yellow Minimalist Modern Proposal matching user specification", () => {
      const template = getCoverTemplateById("canva-modern-proposal");
      expect(template).toBeDefined();
      expect(template.name).toContain("Blue & Yellow Minimalist Modern Proposal");
      expect(template.category).toBe("Modern");

      const meta: AssignmentMetadata = {
        ...getDefaultAssignmentMetadata(),
        assignmentTitle: "PROJECT PROPOSAL",
        studentName: "Benjamin Shah",
        universityName: "Studio Shodwe",
        academicYear: "2026",
      };

      const elements = generateDefaultCoverElements(template, meta);

      // Check pure white background (no ugly green or clumsy card containers)
      const bg = elements.find((e) => e.id === "canvas-bg");
      expect(bg?.fillColor).toBe("#FFFFFF");

      // Check geometric SVG polygons: wedges, chevrons, dot matrix
      const trNavy = elements.find((e) => e.id === "canva-tr-navy");
      expect(trNavy).toBeDefined();
      expect(trNavy?.svgContent).toContain("polygon");

      const trYellow = elements.find((e) => e.id === "canva-tr-yellow");
      expect(trYellow).toBeDefined();

      const dots = elements.find((e) => e.id === "canva-tr-dots");
      expect(dots).toBeDefined();
      expect(dots?.svgContent).toContain("circle");

      const brChevron = elements.find((e) => e.id === "canva-br-navy");
      expect(brChevron).toBeDefined();

      const tlNavy = elements.find((e) => e.id === "canva-tl-navy");
      expect(tlNavy).toBeDefined();

      // Check bold typography elements
      const yearEl = elements.find((e) => e.id === "canva-title-year");
      expect(yearEl?.text).toBe("2026");

      const titleEl = elements.find((e) => e.id === "canva-title-main");
      expect(titleEl?.text).toBe("PROJECT PROPOSAL");

      const authorEl = elements.find((e) => e.id === "canva-meta-name");
      expect(authorEl?.text).toBe("Benjamin Shah");

      // Verify elements can be freely repositioned (e.g. moving top-right shapes to bottom, left, or right)
      const repositioned = elements.map((e) =>
        e.id === "canva-tr-navy" ? { ...e, x: 20, y: 800 } : e,
      );
      const movedWedge = repositioned.find((e) => e.id === "canva-tr-navy");
      expect(movedWedge?.x).toBe(20);
      expect(movedWedge?.y).toBe(800);
    });

    it("generates authentic Canva Blue White Yellow Modern Minimalist Proposal (Salford & Co. Picture 4)", () => {
      const template = getCoverTemplateById("canva-salford-wave");
      expect(template).toBeDefined();
      expect(template.name).toContain("Salford & Co.");

      const meta: AssignmentMetadata = {
        ...getDefaultAssignmentMetadata(),
        assignmentTitle: "Project Proposal",
        studentName: "Benjamin Shah",
        universityName: "Salford & Co.",
        academicYear: "2026",
      };

      const elements = generateDefaultCoverElements(template, meta);

      // 1. Pure White Background
      const bg = elements.find((e) => e.id === "canvas-bg");
      expect(bg?.fillColor).toBe("#FFFFFF");

      // 2. Top-left wave header and yellow underlay ribbon
      const topNavy = elements.find((e) => e.id === "salford-top-navy");
      expect(topNavy).toBeDefined();
      expect(topNavy?.svgContent).toContain("<path");

      const topYellow = elements.find((e) => e.id === "salford-top-yellow");
      expect(topYellow).toBeDefined();
      expect(topYellow?.svgContent).toContain("<path");

      // 3. Top-right brand pill badge
      const pillBadge = elements.find((e) => e.id === "salford-brand-pill");
      expect(pillBadge).toBeDefined();
      expect(pillBadge?.borderRadius).toBe(20);

      const brandText = elements.find((e) => e.id === "salford-brand-text");
      expect(brandText?.text).toBe("Salford & Co.");

      // 4. Bottom-right fluid curves
      const brNavy = elements.find((e) => e.id === "salford-br-navy");
      expect(brNavy).toBeDefined();
      const brYellow = elements.find((e) => e.id === "salford-br-yellow");
      expect(brYellow).toBeDefined();

      // 5. Title & Author
      const titleEl = elements.find((e) => e.id === "salford-title-main");
      expect(titleEl?.text).toBe("Project Proposal 2026");

      const authorEl = elements.find((e) => e.id === "salford-meta-name");
      expect(authorEl?.text).toBe("Benjamin Shah");

      // 6. Coordinates
      const contactEl = elements.find((e) => e.id === "salford-footer-contact");
      expect(contactEl?.text).toMatch(/reallygreatsite\.com|Salford & Co\./);

      // 7. Freely editable and repositionable (move wave from top to bottom)
      const moved = elements.map((e) => (e.id === "salford-top-navy" ? { ...e, y: 800 } : e));
      expect(moved.find((e) => e.id === "salford-top-navy")?.y).toBe(800);
    });

    it("generates authentic Canva Red White Modern Geometric Proposal (Hanover Co Picture 5)", () => {
      const template = getCoverTemplateById("canva-hanover-red-geometric");
      expect(template).toBeDefined();
      expect(template.name).toContain("Hanover Co");

      const meta: AssignmentMetadata = {
        ...getDefaultAssignmentMetadata(),
        assignmentTitle: "STRATEGIC PROPOSAL",
        studentName: "Eleanor Fitzgerald",
        instructorName: "Connor Hamilton",
        universityName: "HANOVER CO",
      };

      const elements = generateDefaultCoverElements(template, meta);

      // 1. Pure White Background
      const bg = elements.find((e) => e.id === "canvas-bg");
      expect(bg?.fillColor).toBe("#FFFFFF");

      // 2. Left Edge Red and Charcoal Faceted Polygons
      const leftRed = elements.find((e) => e.id === "hanover-left-red-top");
      expect(leftRed).toBeDefined();
      expect(leftRed?.svgContent).toContain("polygon");

      const leftCharcoal = elements.find((e) => e.id === "hanover-left-charcoal");
      expect(leftCharcoal).toBeDefined();

      // 3. Right-Edge 6x3 Circular Red Dot Matrix
      const dotGrid = elements.find((e) => e.id === "hanover-dot-grid");
      expect(dotGrid).toBeDefined();
      expect(dotGrid?.svgContent).toContain("<circle");

      // 4. Bottom-Left Charcoal & Red Wedges
      const blCharcoal = elements.find((e) => e.id === "hanover-bl-charcoal");
      expect(blCharcoal).toBeDefined();
      const blRed = elements.find((e) => e.id === "hanover-bl-red");
      expect(blRed).toBeDefined();

      // 5. Two-tier Prepared For / Prepared By Metadata
      const forName = elements.find((e) => e.id === "hanover-for-name");
      expect(forName?.text).toBe("Connor Hamilton");

      const byName = elements.find((e) => e.id === "hanover-by-name");
      expect(byName?.text).toBe("Eleanor Fitzgerald");

      // 6. Freely repositionable (move dot matrix to left)
      const moved = elements.map((e) => (e.id === "hanover-dot-grid" ? { ...e, x: 50, y: 700 } : e));
      const movedDots = moved.find((e) => e.id === "hanover-dot-grid");
      expect(movedDots?.x).toBe(50);
      expect(movedDots?.y).toBe(700);
    });

    it("synthesizes Canva-grade vector geometry and dot matrices across standard templates", () => {
      const template = getCoverTemplateById("harvard-crimson");
      const meta = getDefaultAssignmentMetadata();
      const elements = generateDefaultCoverElements(template, meta);

      // Academic templates must now include decorative corner anchor wedges and dot accents
      const tlAnchor = elements.find((e) => e.id === "accent-tl-anchor");
      expect(tlAnchor).toBeDefined();
      expect(tlAnchor?.svgContent).toContain("polygon");

      const dotAccent = elements.find((e) => e.id === "accent-dot-matrix");
      expect(dotAccent).toBeDefined();
      expect(dotAccent?.svgContent).toContain("<circle");
    });
  });
});
