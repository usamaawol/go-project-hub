import { describe, it, expect } from "bun:test";
import { estimateOptimalSlideCount, recommendNaturalSlideCount } from "../lib/slide-count-estimator";
import { buildSlideDeckContent, type SlidePreviewItem } from "../lib/presentation-session-client";
import { buildContextualVisual } from "../lib/presentation-visual-generator";
import {
  computeThemeTokens,
  recommendThemeFromCatalog,
  resolveSlideSurfaceTokens,
  type RawThemeInput,
} from "../lib/presentation-theme";
import { TEMPLATES } from "../data/templates";
import {
  detectUnreadableExtraction,
  sanitizePresentationInput,
} from "../lib/presentation-pipeline/input-sanitizer";
import { calculateNaturalSlideCount } from "../lib/presentation-pipeline/content-analyzer";
import { convertSlideToElements, syncElementsToSlide } from "../lib/slide-element-model";
import { renderSlideDeckToPptx } from "../lib/presentation-renderer";

const DEFAULT_THEME: RawThemeInput = {
  id: "executive-brief",
  name: "Executive Brief",
  category: "Business",
  kind: "business",
  colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
  fonts: "Inter",
  tier: "free",
};

const CHECKLIST_SPEC_CONTENT = `
# 1. FIX THE INVISIBLE AND BROKEN IMAGE PROBLEM
Investigate why generated images sometimes appear invisible, missing, broken, or incorrectly positioned.
Requirements:
- Never display an invisible image placeholder as if an image were successfully generated.
- Verify that an image was actually generated and can be loaded before adding it to a slide.
- Verify image dimensions and supported formats.
- Handle failed image requests properly.
- Prevent broken image references in the preview and exported PPTX.
- Do not leave empty image containers.

# 2. ASSIGNMENT INFORMATION — ALL METADATA FIELDS OPTIONAL
When a user selects Assignment, allow them to choose:
- Individual Assignment.
- Group Assignment.
Allow users to leave any metadata field empty:
- University.
- College.
- Department.
- Student ID.
- Course name.
- Course code.
- Academic year.
- Semester.
- Instructor name.
- Submission date.
Important rules:
- Do not display empty placeholders on the final presentation.
- Do not invent missing information.
- Do not prevent generation because optional fields are empty.

# 3. AI MUST CREATE A BEAUTIFUL FIRST PRESENTATION
AI should analyze the uploaded document or pasted text and decide:
- Slide structure.
- Slide sequence.
- Appropriate number of slides.
- Layout for every slide.
- Typography.
- Font sizes.
- Colors.
- Visual hierarchy.
Avoid boring presentations with only titles and bullet points.

# 4. USER MUST BE ABLE TO EDIT EVERY SLIDE MANUALLY
After AI generates the presentation, the user must be able to change:
- Text content.
- Font family.
- Font size.
- Bold.
- Italic.
- Underline.
- Text color.
- Alignment.
The user must also be able to:
- Move text elements.
- Resize text elements.
- Add new text boxes.
- Delete text boxes.
- Duplicate slides.
- Reorder slides.

# 5. BUILD A REAL SLIDE EDITOR
Formatting toolbar:
- Font family.
- Font size.
- Bold.
- Italic.
- Underline.
- Text color.
- Alignment.
- Letter spacing.
- Line spacing.
- Background color.
Editing behavior:
- Undo.
- Redo.
- Save changes.
- Preserve edits when switching slides.

# 6. AI AND MANUAL EDITING MUST WORK TOGETHER
Examples:
- Make this slide more professional.
- Change the design to a modern blue theme.
- Move the title to the center.
- Improve the typography.
- Add a relevant diagram.
- Reduce the amount of text.
Protect manual edits:
- Do not overwrite manual changes silently.
- Regenerate only the selected slide when requested.
- Keep undo and redo functional.

# 7. EXPORT MUST MATCH THE EDITOR
Verify that:
- All text is present.
- Text positions are correct.
- Fonts and sizes are applied where supported.
- Images are visible.
- Shapes are present.
- Slide backgrounds are correct.
- No slides are empty.
- Slide order is correct.

# 8. REAL TESTING AND DEFINITION OF DONE
Definition of done:
- Only when you can verify everything works end to end across creation, editing, preview, and PPTX download.
- Zero broken images, zero uneditable slides, zero silent overwrites, and complete export fidelity.
`.trim();

describe("Presentation Quality, Dense Content & Editor Parity Regressions", () => {
  it("does not over-inflate ~500-word requirement checklists to 50 slides", () => {
    const rec = estimateOptimalSlideCount(CHECKLIST_SPEC_CONTENT);
    expect(rec.optimalCount).toBeLessThanOrEqual(20);
    expect(rec.optimalCount).toBeGreaterThanOrEqual(5);
  });

  it("produces rich non-empty slides without title==description duplicates, (Cont.) chains, or canned overrides", () => {
    const slides = buildSlideDeckContent(
      "Presentation Maker Overhaul",
      CHECKLIST_SPEC_CONTENT,
      14,
      "balanced",
      "Technical & Product Engineering",
    );

    expect(slides.length).toBe(14);

    for (const s of slides) {
      // Zero "(Cont.) (Cont.)" or duplicate continuation suffixes
      expect(s.title).not.toMatch(/\(Cont\.\)\s*\(Cont\.\)/i);

      // Every non-cover/title slide must have meaningful text items
      const textCount =
        (s.bullets?.length || 0) +
        (s.cards?.length || 0) +
        (s.bentoGrid?.length || 0) +
        (s.timeline?.length || 0) +
        (s.processSteps?.length || 0) +
        (s.leftColumn?.bullets?.length || 0) +
        (s.metrics?.length || 0) +
        (s.heroSplit?.details?.length || 0);
      if (s.layout !== "title" && s.layout !== "assignment-cover" && s.layout !== "section-header") {
        expect(textCount).toBeGreaterThan(0);
      }

      // No canned unrelated replacement for "Definition of done"
      const joined = JSON.stringify(s);
      expect(joined).not.toContain("Verified end-to-end delivery matching acceptance criteria");
      expect(joined).not.toContain("Key analysis and findings.");

      // Cards must not duplicate title === description
      for (const card of s.cards || []) {
        expect(card.title.trim().toLowerCase()).not.toBe(card.description.trim().toLowerCase());
        expect(card.description.trim().length).toBeGreaterThan(0);
      }
      for (const box of s.bentoGrid || []) {
        expect(box.title.trim().toLowerCase()).not.toBe(box.description.trim().toLowerCase());
        expect(box.description.trim().length).toBeGreaterThan(0);
      }

      // hero-split headline must not duplicate slide.title
      if (s.layout === "hero-split" && s.heroSplit?.headline) {
        const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
        expect(norm(s.heroSplit.headline)).not.toBe(norm(s.title));
      }
    }
  });

  it("honors visualPreference = 'text-only' without generating broken or diagram visual slides", () => {
    const slides = buildSlideDeckContent(
      "AI Presentation Architecture",
      CHECKLIST_SPEC_CONTENT,
      10,
      "balanced",
      "Business & Strategy",
      undefined,
      { visualPreference: "text-only" },
    );

    expect(slides.length).toBe(10);
    for (const s of slides) {
      expect(s.layout).not.toBe("text-visual");
      expect(s.layout).not.toBe("image-led");
      expect(s.visual).toBeUndefined();
    }
  });

  it("does not hallucinate Transformer/ML diagrams on non-ML topics mentioning 'AI'", () => {
    const vis = buildContextualVisual({
      title: "AI and Manual Editing Must Work Together",
      subtitle: "User controls and selective regeneration",
      bullets: [
        "Make this slide more professional without overwriting edits",
        "Preserve unaffected slides and maintain undo history",
      ],
      accentColor: "#2563EB",
      isDark: false,
    });

    expect(vis.svgContent).not.toContain("TRANSFORMER CORE");
    expect(vis.svgContent).not.toContain("LATENT DIMENSIONS");
    expect(vis.svgContent).not.toContain("System Foundation");
    expect(vis.svgContent).not.toContain("Configuration Gates");
  });

  it("converts three-card, timeline, headline-hero, table, section-header, and references cleanly to editable elements", () => {
    const tokens = computeThemeTokens(DEFAULT_THEME);

    const threeCardSlide: SlidePreviewItem = {
      id: "s-3card",
      slideNumber: 2,
      layout: "three-card",
      title: "Core Metadata Controls",
      subtitle: "Optional academic inputs",
      cards: [
        { title: "Individual Mode", description: "Student name, ID, and course details stay optional" },
        { title: "Group Mode", description: "Flexible member roster with optional identifiers" },
        { title: "Clean Rendering", description: "No N/A or empty placeholder boxes shown" },
      ],
    };

    const timelineSlide: SlidePreviewItem = {
      id: "s-timeline",
      slideNumber: 3,
      layout: "timeline",
      title: "Delivery Roadmap",
      timeline: [
        { phase: "Phase 01", title: "Parse Input", description: "Extract topics cleanly" },
        { phase: "Phase 02", title: "Design Layout", description: "Balance hierarchy and space" },
        { phase: "Phase 03", title: "Export PPTX", description: "Generate native editable slides" },
      ],
    };

    const headlineHeroSlide: SlidePreviewItem = {
      id: "s-hero",
      slideNumber: 4,
      layout: "headline-hero",
      title: "Complete Manual Control",
      subtitle: "Edit every text box, shape, and background freely",
      statCallout: {
        stat: "100%",
        label: "Editable Canvas",
        context: "Changes sync directly to PPTX export.",
        bullets: ["Every text element remains editable", "Direct background and shape controls"],
      },
    };

    const tableSlide: SlidePreviewItem = {
      id: "s-table",
      slideNumber: 5,
      layout: "table",
      title: "Feature Matrix",
      table: {
        headers: ["Capability", "Editor", "PPTX Export"],
        rows: [
          ["Editable Text", "Yes", "Yes"],
          ["Custom Fonts", "Yes", "Yes"],
        ],
      },
    };

    const sectionHeaderSlide: SlidePreviewItem = {
      id: "s-sec",
      slideNumber: 6,
      layout: "section-header",
      title: "Deep Architecture",
      subtitle: "System Layer Breakdown",
      bullets: ["Unified element model bridges canvas and PPTX"],
    };

    const referencesSlide: SlidePreviewItem = {
      id: "s-ref",
      slideNumber: 7,
      layout: "references",
      title: "Sources & References",
      bullets: [
        "1. OpenXML Specification for Editable Presentation Shapes",
        "2. WCAG 2.1 Contrast Guidelines for Slide Readability",
      ],
    };

    for (const slide of [
      threeCardSlide,
      timelineSlide,
      headlineHeroSlide,
      tableSlide,
      sectionHeaderSlide,
      referencesSlide,
    ]) {
      const elements = convertSlideToElements(slide, tokens);
      const textBlob = elements.map((e) => e.text || "").join(" | ");
      expect(elements.length).toBeGreaterThanOrEqual(2);
      expect(textBlob).not.toContain("Key analysis and findings.");
    }

    expect(convertSlideToElements(threeCardSlide, tokens).map((e) => e.text).join(" ")).toContain("Individual Mode");
    expect(convertSlideToElements(timelineSlide, tokens).map((e) => e.text).join(" ")).toContain("Parse Input");
    expect(convertSlideToElements(headlineHeroSlide, tokens).map((e) => e.text).join(" ")).toContain("100%");
    expect(convertSlideToElements(tableSlide, tokens).map((e) => e.text).join(" ")).toContain("Editable Text");
    expect(convertSlideToElements(referencesSlide, tokens).map((e) => e.text).join(" ")).toContain("OpenXML Specification");
  });

  it("syncs manual element edits and exports a non-empty PPTX across updated layouts", async () => {
    const tokens = computeThemeTokens(DEFAULT_THEME);
    const deck = buildSlideDeckContent(
      "Product Launch Strategy",
      CHECKLIST_SPEC_CONTENT,
      8,
      "balanced",
      "Business & Strategy",
    );

    // Edit slide 2 manually through the element model
    const slide2 = deck[2]!;
    const elements = convertSlideToElements(slide2, tokens);
    const titleEl = elements.find((e) => e.role === "title");
    expect(titleEl).toBeDefined();
    titleEl!.text = "Edited Heading Verified";
    deck[2] = syncElementsToSlide(elements, slide2);

    const pptx = await renderSlideDeckToPptx(
      "Product Launch Strategy",
      "Business & Strategy",
      deck,
      tokens,
    );
    const pptxBuffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

    expect(Buffer.isBuffer(pptxBuffer)).toBe(true);
    expect(pptxBuffer.byteLength).toBeGreaterThan(15000);
  });

  it("rejects unreadable binary %PDF/ZIP and mojibake inputs without ReferenceError", () => {
    const rawPdfDump =
      "%PDF-1.5\n1 0 obj << /Type /Font /Resources /Filter /FlateDecode >> stream \uFFFD\uFFFD\uFFFD endstream";
    const err = detectUnreadableExtraction(rawPdfDump);
    expect(err).toBeTruthy();
    expect(err!).toMatch(/raw pdf binary|corrupted/i);

    expect(detectUnreadableExtraction("PK\x03\x04\x14\x00\x06\x00")).toMatch(/zip\/docx binary/i);
    expect(detectUnreadableExtraction("[PDF EXTRACTION ERROR: encrypted]")).toMatch(/could not be extracted/i);
    expect(detectUnreadableExtraction("Chapter 1 overview")).toBeNull();
  });

  it("selects non-grayscale domain themes and natural slide counts organically", () => {
    const geoText =
      "ETHIOSMART\nHIGHER EDUCATION STUDY NOTES SERIES\nGeography of Ethiopia and the Horn\nCourse Code: GeES 1011\nThis freshman university chapter covers drainage systems, map reading, and regional location in Ethiopia.";
    const geoTheme = recommendThemeFromCatalog(geoText, TEMPLATES);
    expect(geoTheme).toBeDefined();
    expect(geoTheme!.id).toBe("classroom-bright");
    expect(geoTheme!.id).not.toContain("grayscale");

    const oopText =
      "Student Management System Using Java Object-Oriented Programming. Demonstrates Abstraction, Inheritance, Polymorphism, ArrayList collections, and software class hierarchy.";
    const oopTheme = recommendThemeFromCatalog(oopText, TEMPLATES);
    expect(oopTheme?.id).toBe("neural-grid");

    expect(recommendNaturalSlideCount(geoText).recommendedCount).toBeLessThanOrEqual(20);
    expect(calculateNaturalSlideCount(55, 2)).toBe(4);
    expect(calculateNaturalSlideCount(5047, 40)).toBeLessThanOrEqual(20);
  });

  it("isolates internal prompt instructions, builds non-occluded covers, and preserves assignment optionality", () => {
    const tokens = computeThemeTokens(TEMPLATES.find((t) => t.id === "clinical-trial-deck")!);
    const mixed = `
IMPORTANT: WORK ON PRESENTATION MAKER ONLY
ASSIGNMENT INFORMATION — ALL METADATA FIELDS OPTIONAL
RETURN VALID JSON AND DO NOT OUTPUT MARKDOWN FENCES

# Photosynthetic Electron Transport
Chloroplasts capture light energy inside thylakoid membranes to drive ATP synthesis.
## Light Reactions
- Photosystem II splits water at 680nm wavelength.
- Cytochrome b6f pumps protons across the thylakoid membrane.
    `.trim();

    const sanitized = sanitizePresentationInput(mixed);
    expect(sanitized.valid).toBe(true);
    expect(sanitized.cleanSourceText).not.toContain("WORK ON PRESENTATION MAKER");

    const deck = buildSlideDeckContent("Photosynthetic Electron Transport", mixed, 4, "balanced", "Science");
    const coverEls = convertSlideToElements(deck[0]!, tokens, deck.length);
    // Cover slide must NOT contain default bullet content card ("-content-card")
    expect(coverEls.some((e) => e.id.includes("content-card"))).toBe(false);
    expect(coverEls.some((e) => e.role === "title" && e.text?.includes("Photosynthetic"))).toBe(true);

    // Native 16:9 widescreen assignment cover skips empty optional placeholders & resolves source title
    const assignCoverSlide: SlidePreviewItem = {
      id: "assign-1",
      slideNumber: 1,
      layout: "assignment-cover",
      title: "Photosynthetic Electron Transport",
      assignmentMetadata: {
        isAssignment: true,
        assignmentType: "individual",
        studentName: "Amina Khalid",
        courseName: "Plant Biochemistry BIOL-304",
        universityName: "",
        instructorName: "",
        studentId: "",
      } as any,
    };
    const assignEls = convertSlideToElements(assignCoverSlide, tokens, 4);
    const assignBlob = assignEls.map((e) => e.text || "").join(" ");
    expect(assignBlob).toContain("Photosynthetic Electron Transport");
    expect(assignBlob).toContain("Amina Khalid");
    expect(assignBlob).toContain("Plant Biochemistry BIOL-304");
    expect(assignBlob).not.toContain("UNIVERSITY OR ACADEMIC INSTITUTION");
    expect(assignBlob).not.toContain("Instructor / Professor");

    // Headline hero skips duplicate prefix context & light customBgColor flips dark theme text to readable ink
    const hhSlide: SlidePreviewItem = {
      id: "hh-1",
      slideNumber: 2,
      layout: "headline-hero",
      title: "General Objective",
      subtitle: "To design and develop a Java-based Student Management System that organizes student...",
      statCallout: {
        stat: "To design and develop a Java-based Student Management System that organizes student records reliably.",
        context: "To design and develop a Java-based Student Management System that organizes student...",
      },
      customBgColor: "#FFFBEB",
    };
    const hhEls = convertSlideToElements(hhSlide, tokens, 4);
    expect(hhEls.some((e) => e.id.endsWith("-hh-context"))).toBe(false);
    const adaptedTokens = resolveSlideSurfaceTokens(tokens, "dark", "#FFFBEB");
    expect(adaptedTokens.isDark).toBe(false);
    expect(adaptedTokens.textPrimary).toBe("#0F172A");
  });
});
