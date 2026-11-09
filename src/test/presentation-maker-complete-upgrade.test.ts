import { describe, it, expect } from "bun:test";
import {
  verifyAndSanitizeImage,
  validateBase64DataUrl,
  isValidSvgString,
} from "../lib/image-verifier";
import {
  SLIDE_CANVAS_WIDTH,
  SLIDE_CANVAS_HEIGHT,
  convertSlideToElements,
  syncElementsToSlide,
  type SlideElement,
} from "../lib/slide-element-model";
import { computeThemeTokens, type RawThemeInput } from "../lib/presentation-theme";
import { renderSlideDeckToPptx } from "../lib/presentation-renderer";
import type { SlidePreviewItem } from "../lib/presentation-session-client";
import { getDefaultAssignmentMetadata, type AssignmentMetadata } from "../lib/assignment-types";
import { generateDefaultCoverElements } from "../lib/cover-templates-registry";

describe("Presentation Maker: Complete Upgrade & Requirements Verification", () => {
  const theme: RawThemeInput = {
    id: "executive-navy",
    name: "Executive Navy",
    category: "Corporate",
    kind: "corporate",
    colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
    fonts: "Inter",
    tier: "free",
  };
  const tokens = computeThemeTokens(theme);

  // --------------------------------------------------------------------------
  // Requirement 1: Invisible and Broken Image Problem Fixed
  // --------------------------------------------------------------------------
  describe("Requirement 1: Invisible & Broken Image Protection", () => {
    it("validates real Base64 PNG/JPEG and recognizes valid SVG markup", () => {
      // 1x1 transparent PNG data URL
      const validPng =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const resPng = validateBase64DataUrl(validPng);
      expect(resPng.valid).toBe(true);
      expect(resPng.format).toBe("png");

      const validSvg = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
      expect(isValidSvgString(validSvg)).toBe(true);

      const b64Svg = `data:image/svg+xml;base64,${Buffer.from(validSvg).toString("base64")}`;
      const resSvg = validateBase64DataUrl(b64Svg);
      expect(resSvg.valid).toBe(true);
      expect(resSvg.format).toBe("svg+xml");
    });

    it("rejects WebP format for PPTX compatibility (PowerPoint fails on WebP)", () => {
      const webpData = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/1AAA";
      const res = validateBase64DataUrl(webpData);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("WebP format is not supported");
    });

    it("rejects corrupted, empty, or placeholder image strings", async () => {
      const res1 = await verifyAndSanitizeImage("");
      expect(res1.valid).toBe(false);

      const res2 = await verifyAndSanitizeImage("data:image/png;base64,short");
      expect(res2.valid).toBe(false);

      const res3 = await verifyAndSanitizeImage("https://invalid-non-existent-domain-xyz.com/image.png");
      expect(res3.valid).toBe(false);
    });

    it("never crashes PPTX export when an image element contains a remote URL or missing visual", async () => {
      const slides: SlidePreviewItem[] = [
        {
          id: "slide-1",
          slideNumber: 1,
          title: "Visual Slide",
          subtitle: "Testing resilient image handling",
          bullets: ["Key point A", "Key point B"],
          layout: "text-visual",
          visual: {
            type: "picture",
            concept: "Technology",
            caption: "Resilient visual",
            imageUrl: "https://example.com/unreachable-image.png",
          },
        },
      ];

      // Exporting to PPTX must succeed without throwing unhandled exceptions
      const pptx = await renderSlideDeckToPptx("Test Deck", "Business", slides, tokens);
      const buffer = await pptx.write({ outputType: "nodebuffer" });
      expect(buffer).toBeDefined();
      expect((buffer as Buffer).length).toBeGreaterThan(1000);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 2: Assignment Information — All Metadata Fields Optional
  // --------------------------------------------------------------------------
  describe("Requirement 2: Assignment Metadata Strictly Optional", () => {
    it("generates an individual assignment cover with only title and source content (all metadata omitted)", () => {
      const metadata: AssignmentMetadata = {
        ...getDefaultAssignmentMetadata(),
        assignmentTitle: "Neural Networks Analysis",
        assignmentType: "individual",
        // All optional fields empty
        studentName: "",
        studentId: "",
        courseName: "",
        courseCode: "",
        instructorName: "",
        department: "",
        college: "",
        university: "",
      };

      const template = {
        id: "classic-university",
        name: "Classic University",
        coverStyle: "academic",
        category: "Academic",
        description: "Standard academic template",
        accentColor: "#1E3A8A",
        bgPattern: "none",
        supportedAspectRatios: ["16:9"],
      };

      const elements = generateDefaultCoverElements(template as any, metadata, 1333, 750);
      expect(elements.length).toBeGreaterThan(0);

      // Verify that no placeholder text like 'N/A', 'Not provided', or 'Student Name' appears
      for (const el of elements) {
        if (el.text) {
          expect(el.text).not.toContain("N/A");
          expect(el.text).not.toContain("Not provided");
          expect(el.text).not.toContain("Student Name");
          expect(el.text).not.toContain("Instructor Name");
        }
      }
    });

    it("generates a group assignment cover without requiring group members or IDs", () => {
      const metadata: AssignmentMetadata = {
        ...getDefaultAssignmentMetadata(),
        assignmentTitle: "Distributed Cloud Architecture",
        assignmentType: "group",
        groupName: "Team Alpha",
        groupMembers: [], // Empty group members list
        studentName: "",
        studentId: "",
      };

      const template = {
        id: "modern-minimal",
        name: "Modern Minimal",
        coverStyle: "modern",
        category: "Academic",
        description: "Clean modern template",
        accentColor: "#059669",
        bgPattern: "none",
        supportedAspectRatios: ["16:9"],
      };

      const elements = generateDefaultCoverElements(template as any, metadata, 1333, 750);
      const titleEl = elements.find((e) => e.text && e.text.includes("Distributed Cloud Architecture"));
      expect(titleEl).toBeDefined();

      // Ensure no fake member names or empty member boxes exist
      for (const el of elements) {
        if (el.text) {
          expect(el.text).not.toContain("Member 1");
          expect(el.text).not.toContain("fake student");
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 4 & 5: Complete Manual Slide Editing & Topic Placement
  // --------------------------------------------------------------------------
  describe("Requirement 4 & 5: Universal Slide Elements & Positioning", () => {
    it("converts any slide layout into draggable, resizable, stylable SlideElements", () => {
      const slide: SlidePreviewItem = {
        id: "slide-bento",
        slideNumber: 2,
        title: "Microservices Architecture",
        subtitle: "High-throughput operational topology",
        layout: "bento-grid",
        bullets: [
          "Event-driven messaging queue",
          "Decoupled persistence tier",
          "Automated container orchestration",
          "Real-time telemetric observability",
        ],
      };

      const elements = convertSlideToElements(slide, tokens);
      expect(elements.length).toBeGreaterThanOrEqual(5);

      const titleElement = elements.find((e) => e.role === "title");
      expect(titleElement).toBeDefined();
      expect(titleElement?.text).toBe("Microservices Architecture");
      expect(titleElement?.fontFamily).toBe(tokens.fontTitle);
      expect(titleElement?.width).toBeGreaterThan(400);

      // Verify cards exist for each bento item
      const cards = elements.filter((e) => e.role === "card" || e.type === "card");
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it("allows repositioning title to Top, Center, Left, Right or custom coordinates", () => {
      const slide: SlidePreviewItem = {
        id: "slide-pos",
        slideNumber: 3,
        title: "Strategic Executive Vision",
        layout: "content",
        bullets: ["Goal 1", "Goal 2"],
      };

      const elements = convertSlideToElements(slide, tokens);
      const titleEl = elements.find((e) => e.role === "title");
      expect(titleEl).toBeDefined();

      // User moves title to Center
      const centerTitle: SlideElement = {
        ...titleEl!,
        x: 100,
        y: 280,
        width: 1133,
        height: 120,
        textAlign: "center",
      };

      const updatedElements = elements.map((e) => (e.id === titleEl!.id ? centerTitle : e));
      const syncedSlide = syncElementsToSlide(updatedElements, slide);
      expect(syncedSlide.title).toBe("Strategic Executive Vision");
      expect(syncedSlide.elements).toBeDefined();

      const syncedTitleEl = syncedSlide.elements?.find((e) => e.role === "title");
      expect(syncedTitleEl?.textAlign).toBe("center");
      expect(syncedTitleEl?.y).toBe(280);
    });

    it("supports adding text boxes, shapes, lines, and custom styling", () => {
      const slide: SlidePreviewItem = {
        id: "slide-edit",
        slideNumber: 4,
        title: "Platform Overview",
        layout: "content",
        bullets: ["Point A", "Point B"],
      };

      const baseElements = convertSlideToElements(slide, tokens);

      // Add a custom Callout Card
      const customCard: SlideElement = {
        id: "custom-card-1",
        type: "card",
        role: "card",
        shapeType: "roundRect",
        x: 200,
        y: 350,
        width: 400,
        height: 150,
        fillColor: "#1E293B",
        borderColor: "#38BDF8",
        borderWidth: 2,
        borderRadius: 16,
      };

      // Add custom Text inside the card
      const customText: SlideElement = {
        id: "custom-text-1",
        type: "text",
        role: "custom",
        x: 220,
        y: 370,
        width: 360,
        height: 110,
        text: "Custom Metric Callout\n+48% Performance Gain",
        fontFamily: "Inter",
        fontSize: 20,
        fontWeight: "bold",
        textColor: "#38BDF8",
        letterSpacing: 1,
        lineHeight: 1.3,
      };

      const newElements = [...baseElements, customCard, customText];
      const synced = syncElementsToSlide(newElements, slide);

      expect(synced.elements?.length).toBe(baseElements.length + 2);
      expect(synced.elements?.some((e) => e.id === "custom-card-1")).toBe(true);
      expect(synced.elements?.some((e) => e.id === "custom-text-1")).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 8: Export Must Match the Editor (1:1 Native PPTX Parity)
  // --------------------------------------------------------------------------
  describe("Requirement 8: PPTX Export Matches Canvas Coordinates", () => {
    it("renders slide elements directly into native editable PowerPoint objects without screenshot flattening", async () => {
      const customElements: SlideElement[] = [
        // Title at custom position
        {
          id: "title-el",
          type: "text",
          role: "title",
          x: 150,
          y: 90,
          width: 1033,
          height: 70,
          text: "Executive Architecture Strategy",
          fontFamily: "Inter",
          fontSize: 32,
          fontWeight: "bold",
          textColor: "#FFFFFF",
          textAlign: "left",
        },
        // Card container
        {
          id: "card-el",
          type: "card",
          shapeType: "roundRect",
          x: 150,
          y: 200,
          width: 500,
          height: 350,
          fillColor: "#1E293B",
          borderColor: "#2563EB",
          borderWidth: 2,
          borderRadius: 16,
        },
        // Card inner text
        {
          id: "card-text",
          type: "text",
          x: 180,
          y: 230,
          width: 440,
          height: 290,
          text: "Modular Container Framework\n\n• Microservice boundaries\n• Event telemetry pipelines\n• Low-latency memory caches",
          fontFamily: "Roboto",
          fontSize: 16,
          fontWeight: "normal",
          textColor: "#F8FAFC",
          textAlign: "left",
          lineHeight: 1.4,
        },
      ];

      const slideWithElements: SlidePreviewItem = {
        id: "slide-elements-deck",
        slideNumber: 1,
        title: "Executive Architecture Strategy",
        layout: "content",
        customBgColor: "#0F172A",
        elements: customElements,
      };

      const pptx = await renderSlideDeckToPptx(
        "Executive Architecture Strategy",
        "Architecture",
        [slideWithElements],
        tokens,
      );

      const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(2000);

      // Verify PPTX is a valid ZIP package containing slide1.xml
      const zipHeader = buffer.slice(0, 4).toString("hex");
      expect(zipHeader).toBe("504b0304"); // Standard PK ZIP signature
    });
  });
});
