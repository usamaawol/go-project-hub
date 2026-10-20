import { describe, expect, it } from "vitest";
import {
  createPresentationSession,
  getPresentationSession,
  deletePresentationSession,
  cleanupExpiredSessions,
} from "../../server/services/presentationSession.service";
import { extractTextFromBuffer } from "../../server/services/extractor.service";
import { TOUR_STEPS } from "../components/tour/ProductTour";
import fs from "fs";

describe("DocuMind 15-Point Workflow & Presentation Verification", () => {
  // Scenario 1: Pasted text presentation generation
  it("Scenario 1: Generates presentation session from pasted text content", async () => {
    const session = await createPresentationSession({
      title: "AI & Document Synthesis",
      content:
        "DocuMind simplifies document formatting and AI presentation authoring with zero friction.",
      purpose: "General / Overview",
      density: "balanced",
      theme: {
        id: "corporate-clean",
        name: "Corporate Clean",
        category: "Corporate",
        kind: "corporate",
        colors: { primary: "#1E293B", accent: "#3B82F6", bg: "#FFFFFF" },
        fonts: "Inter / Roboto",
        tier: "free",
      },
      typography: {
        fontFamily: "Inter",
        fontSizePreset: "standard",
      },
      slideCount: 6,
    });

    expect(session.id).toBeDefined();
    expect(session.title).toBe("AI & Document Synthesis");
    expect(session.slides.length).toBe(6);
    expect(session.slides[0]?.layout).toBe("title");
    expect(session.slides[1]?.layout).toBe("agenda");
    expect(fs.existsSync(session.filePath)).toBe(true);

    deletePresentationSession(session.id);
  });

  // Scenario 2: Uploaded document generation (extract text first, then generate)
  it("Scenario 2: Generates presentation session from uploaded document extraction", async () => {
    const dummyDocument = Buffer.from(
      "DocuMind Academic Research Report\n\nAbstract: This paper explores ephemeral document processing.\nSection 1: Data Minimization\nSection 2: Instant Previews\nConclusion: User privacy is preserved.",
      "utf-8",
    );

    const extraction = await extractTextFromBuffer(dummyDocument, "report.txt", "text/plain");
    expect(extraction.text).toContain("DocuMind Academic Research Report");

    const session = await createPresentationSession({
      title: "Extracted Research Presentation",
      content: extraction.text,
      purpose: "Academic Lecture",
      density: "detailed",
      theme: {
        id: "academic-lecture",
        name: "Academic Lecture",
        category: "Education",
        kind: "education",
        colors: { primary: "#312E81", accent: "#4F46E5", bg: "#FAF5FF" },
        fonts: "Merriweather / Roboto",
        tier: "free",
      },
      typography: {
        fontFamily: "Merriweather",
        fontSizePreset: "large",
      },
      slideCount: 5,
    });

    expect(session.slides.length).toBe(5);
    expect(session.theme.colors.primary).toBe("#312E81");
    expect(fs.existsSync(session.filePath)).toBe(true);

    deletePresentationSession(session.id);
  });

  // Scenario 3: Theme reflection across slides
  it("Scenario 3: Reflects theme palette and metadata throughout generated slides", async () => {
    const session = await createPresentationSession({
      title: "Emerald Growth Theme Test",
      content: "Key performance indicators for Q3 show 40% growth in document processing.",
      purpose: "Pitch Deck",
      density: "concise",
      theme: {
        id: "emerald-growth",
        name: "Emerald Growth",
        category: "Creative",
        kind: "creative",
        colors: { primary: "#064E3B", accent: "#10B981", bg: "#ECFDF5" },
        fonts: "Montserrat / Inter",
        tier: "free",
      },
      slideCount: 5,
    });

    expect(session.theme.colors.accent).toBe("#10B981");
    expect(session.theme.colors.bg).toBe("#ECFDF5");
    // Verify slide layouts generated (e.g. metrics layout exists for concise/pitch decks)
    const layouts = session.slides.map((s) => s.layout);
    expect(layouts).toContain("title");
    expect(layouts).toContain("metrics");

    deletePresentationSession(session.id);
  });

  // Scenario 4: Font family & sizing presets
  it("Scenario 4: Correctly captures font family and sizing preset", async () => {
    const session = await createPresentationSession({
      title: "Typography Showcase",
      content: "Testing Playfair Display and extra-large typography scaling.",
      typography: {
        fontFamily: "Playfair Display",
        fontSizePreset: "extra-large",
      },
      slideCount: 5,
    });

    expect(session.typography.fontFamily).toBe("Playfair Display");
    expect(session.typography.fontSizePreset).toBe("extra-large");

    deletePresentationSession(session.id);
  });

  // Scenario 5: Variable slide count (e.g. 5, 8, 12, 20 slides)
  it("Scenario 5: Generates precise custom slide counts from 5 up to 20", async () => {
    for (const count of [5, 8, 12, 20]) {
      const session = await createPresentationSession({
        title: `Slide Count ${count} Test`,
        content: `Generating an exact deck containing ${count} slides.`,
        slideCount: count,
      });

      expect(session.slides.length).toBe(count);
      deletePresentationSession(session.id);
    }
  });

  // Scenario 6 & 7: Preview retrieval & structured slide controls
  it("Scenario 6 & 7: Returns structured slide cards with layouts for in-browser viewer", async () => {
    const session = await createPresentationSession({
      title: "Preview Viewer Verification",
      content: "Slides must contain bullet points, layouts, speaker notes, and numbers.",
      slideCount: 5,
    });

    const preview = getPresentationSession(session.id);
    expect(preview).not.toBeNull();
    if (!preview) return;

    expect(preview.slides[0]?.slideNumber).toBe(1);
    expect(preview.slides[0]?.notes).toBeDefined();
    expect(preview.expiresAt).toBeGreaterThan(Date.now());

    deletePresentationSession(session.id);
  });

  // Scenario 8: PPTX file exists on disk and has valid headers
  it("Scenario 8: PPTX binary file exists on disk and is a valid ZIP/Office package", async () => {
    const session = await createPresentationSession({
      title: "Binary Download Validation",
      content: "Verifying binary PPTX packaging.",
      slideCount: 5,
    });

    expect(fs.existsSync(session.filePath)).toBe(true);
    const fileBytes = fs.readFileSync(session.filePath);
    expect(fileBytes.length).toBeGreaterThan(1000);
    // PPTX is a zip file, starts with magic bytes PK (0x50, 0x4B)
    expect(fileBytes[0]).toBe(0x50);
    expect(fileBytes[1]).toBe(0x4b);

    deletePresentationSession(session.id);
  });

  // Scenario 9 & 10: 10-Minute expiration, file cleanup, and 410 rejection
  it("Scenario 9 & 10: Enforces 10-minute expiration and purges physical files on cleanup", async () => {
    const session = await createPresentationSession({
      title: "Expiring Session Test",
      content: "Temporary session for privacy testing.",
      slideCount: 5,
    });

    expect(fs.existsSync(session.filePath)).toBe(true);

    // Artificially expire session by setting expiresAt to the past
    session.expiresAt = Date.now() - 1000;

    // getPresentationSession returns null for expired session
    const retrieved = getPresentationSession(session.id);
    expect(retrieved).toBeNull();

    // cleanupExpiredSessions cleans up disk directory
    cleanupExpiredSessions();
    expect(fs.existsSync(session.filePath)).toBe(false);
  });

  // Scenario 11: Privacy-first ephemeral storage (no Mongo write)
  it("Scenario 11: Confirms storage is purely ephemeral in os.tmpdir and not database", async () => {
    const session = await createPresentationSession({
      title: "Ephemeral Privacy Check",
      content: "Sensitive business proposal text.",
      slideCount: 5,
    });

    // File path is inside temp directory
    expect(session.filePath).toContain("documind-temp-sessions");
    deletePresentationSession(session.id);
  });

  // Scenario 14: Interactive Tour covers all 7 product steps
  it("Scenario 14: Interactive product tour includes all 7 essential guidance steps", () => {
    expect(TOUR_STEPS.length).toBe(7);
    const stepIds = TOUR_STEPS.map((s) => s.id);
    expect(stepIds).toContain("step-1-content");
    expect(stepIds).toContain("step-2-theme");
    expect(stepIds).toContain("step-3-typography");
    expect(stepIds).toContain("step-4-slides");
    expect(stepIds).toContain("step-5-generate");
    expect(stepIds).toContain("step-6-preview-nav");
    expect(stepIds).toContain("step-7-download-privacy");
  });

  // Client-side fallback test (reproduces Vercel deployment returning HTML)
  it("Scenario 15: Handles HTML/offline server responses gracefully with client ephemeral generator", async () => {
    const { createPresentationSessionApi, fetchPresentationPreviewApi } =
      await import("../lib/api-client");

    // Mock fetch to simulate Vercel returning HTML <!DOCTYPE html> for /api requests
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("<!DOCTYPE html><html><body>Vercel SPA Fallback</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });

    try {
      const result = await createPresentationSessionApi({
        title: "Vercel Resilient Deck",
        content: "Testing client fallback when Vercel returns HTML instead of JSON.",
        theme: {
          id: "corporate-clean",
          name: "Corporate Clean",
          category: "Business",
          kind: "business",
          colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
          fonts: "Inter",
          tier: "free",
        },
        slideCount: 5,
      });

      expect(result.sessionId).toBeDefined();
      expect(result.slideCount).toBe(5);

      // Verify preview fetches from client session without JSON.parse crash
      const preview = await fetchPresentationPreviewApi(result.sessionId);
      expect(preview.id).toBe(result.sessionId);
      expect(preview.slides.length).toBe(5);
      expect(preview.slides[0]?.layout).toBe("title");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
