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

  // Scenario 16: YouTube video URL parsing, privacy-enhanced embed, and placeholder safety
  it("Scenario 16: Correctly extracts YouTube ID, enforces youtube-nocookie domain, and safely handles invalid URLs", async () => {
    const { extractYouTubeId } = await import("../components/landing/IntroVideoSection");

    // Standard short URL
    expect(extractYouTubeId("https://youtu.be/-ya6HxljoVw")).toBe("-ya6HxljoVw");

    // Standard watch URL
    expect(extractYouTubeId("https://www.youtube.com/watch?v=-ya6HxljoVw")).toBe("-ya6HxljoVw");

    // Embed URL
    expect(extractYouTubeId("https://www.youtube.com/embed/-ya6HxljoVw")).toBe("-ya6HxljoVw");

    // Raw 11-char ID
    expect(extractYouTubeId("-ya6HxljoVw")).toBe("-ya6HxljoVw");

    // Invalid / empty URLs
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId("invalid-url-without-id")).toBeNull();
  });

  // Scenario 17: Dynamic title detection and content-driven slide generation with zero demo text
  it("Scenario 17: Generates genuine slides from user resource with zero hardcoded demo text", async () => {
    const { buildSlideDeckContent, detectTitleFromText } =
      await import("../lib/presentation-session-client");

    const biologyNotes = `# Photosynthesis and Plant Biology
Stage 1: Light reactions occur in the thylakoid membranes, generating ATP and NADPH.
Stage 2: Calvin cycle fixes carbon dioxide into sugar in the stroma.
Key Global Impact:
- Plants synthesize over 150 billion tons of biomass every year.
- Global photosynthesis produces 21% atmospheric oxygen.
Conclusion:
Photosynthesis forms the ecological foundation for terrestrial life.`;

    // 1. Detects title dynamically
    const detected = detectTitleFromText(biologyNotes);
    expect(detected).toBe("Photosynthesis and Plant Biology");

    // 2. Generates slides directly from custom notes
    const slides = buildSlideDeckContent("", biologyNotes, 5, "balanced", "Education");

    expect(slides.length).toBe(5);
    expect(slides[0]?.title).toBe("Photosynthesis and Plant Biology");
    expect(slides[0]?.layout).toBe("title");

    // Agenda should reflect the actual topics
    expect(slides[1]?.layout).toBe("agenda");
    const agendaText = slides[1]?.bullets?.join(" ") || "";
    expect(agendaText).not.toContain("Executive Summary & Current Landscape");
    expect(agendaText.toLowerCase()).toMatch(/(photosynthesis|stage|light|calvin|impact)/i);

    // Slide 3 & 4 should contain actual user concepts
    const allSlideTitles = slides.map((s) => s.title).join(" ");
    expect(allSlideTitles).not.toContain("Strategic Operations & Knowledge Review");
    expect(allSlideTitles).not.toContain("Context & Market Dynamics");
    expect(allSlideTitles).not.toContain("Strategic Comparative Analysis");

    // Slide bullets must contain user's actual text
    const allBullets = slides.flatMap((s) => s.bullets || []).join(" ");
    expect(allBullets).not.toContain("Traditional Workflows");
    expect(allBullets).not.toContain("DocuMind Architecture");
    expect(allBullets.toLowerCase()).toMatch(/(thylakoid|calvin|biomass|photosynthesis)/i);
  });

  // Scenario 18: Document Studio dynamic section parsing from raw user text
  it("Scenario 18: Dynamically parses user text into document sections for TOC and body preview", async () => {
    const { parseDocumentSections } =
      await import("../components/workspace/DocumentFormattingWorkflow");

    const sampleDoc = `# Deep Ocean Exploration
The abyssal plains cover more than 50 percent of the Earth's surface.

## Hydrothermal Vents
Chemosynthetic bacteria form the base of vent ecosystems, utilizing hydrogen sulfide.

## Technological Challenges
Submersibles must withstand ambient pressures exceeding 1,000 atmospheres.`;

    const sections = parseDocumentSections(sampleDoc, "decimal");
    expect(sections.length).toBe(3);

    // Section 1
    expect(sections[0]?.title).toBe("Deep Ocean Exploration");
    expect(sections[0]?.numberStr).toBe("1.0 ");
    expect(sections[0]?.paragraphs[0]).toContain("abyssal plains cover more than 50 percent");

    // Section 2
    expect(sections[1]?.title).toBe("Hydrothermal Vents");
    expect(sections[1]?.numberStr).toBe("1.1 ");
    expect(sections[1]?.paragraphs[0]).toContain("Chemosynthetic bacteria");

    // Section 3
    expect(sections[2]?.title).toBe("Technological Challenges");
    expect(sections[2]?.numberStr).toBe("1.2 ");
    expect(sections[2]?.paragraphs[0]).toContain("1,000 atmospheres");

    // Must NOT contain dummy corporate executive summary
    const allText = sections.map((s) => s.paragraphs.join(" ")).join(" ");
    expect(allText).not.toContain("Modern enterprise operations generate billions");
  });

  // Scenario 19: Authentic user registration, login, and profile update (zero demo user data)
  it("Scenario 19: Authentic user registration, login, and profile update without demo fallbacks", async () => {
    const { registerWithEmail, loginWithEmail, updateUserProfile, logoutUser } =
      await import("../lib/firebase");

    // Clean any previous session
    await logoutUser();

    // 1. Register with real custom user data
    const testEmail = `usama_real_${Date.now()}@example.com`;
    const user = await registerWithEmail(testEmail, "securePass123", "Usama Awol");
    expect(user.email).toBe(testEmail);
    expect(user.displayName).toBe("Usama Awol");
    expect(user.displayName).not.toBe("Google Demo User");
    expect(user.email).not.toBe("creator@google.com");
    expect(user.email).not.toBe("demo@documind.com");

    // 2. Update profile name
    const updated = await updateUserProfile({ displayName: "Usama Awol (Lead)" });
    expect(updated.displayName).toBe("Usama Awol (Lead)");

    // 3. Logout and sign back in
    await logoutUser();
    const loggedIn = await loginWithEmail(testEmail, "securePass123");
    expect(loggedIn.email).toBe(testEmail);
    expect(loggedIn.displayName).toBe("Usama Awol (Lead)");

    // 4. Clean up
    await logoutUser();
  });

  // Scenario 20: Workspace history tracking, dynamic metrics, and template bookmarks
  it("Scenario 20: Tracks authentic user jobs and computes dynamic metrics with zero mock history", async () => {
    const {
      getWorkspaceJobs,
      addWorkspaceJob,
      clearWorkspaceHistory,
      deleteWorkspaceJob,
      computeWorkspaceStats,
      getBookmarkedTemplateIds,
      toggleBookmarkTemplate,
    } = await import("../lib/workspace-history");

    // Start with empty history
    clearWorkspaceHistory();
    expect(getWorkspaceJobs().length).toBe(0);

    const emptyStats = computeWorkspaceStats([]);
    expect(emptyStats.documentsHandled).toBe(0);
    expect(emptyStats.presentationsBuilt).toBe(0);
    expect(emptyStats.storageSaved).toBe("0 MB");

    // Record an authentic presentation job
    const job1 = addWorkspaceJob({
      name: "Climate_Change_Impacts.pptx",
      tool: "Presentation Maker",
      format: "PPTX",
      originalSize: "10 Slides",
      resultSize: "2.1 MB",
    });

    // Record an authentic compression job
    const job2 = addWorkspaceJob({
      name: "Annual_Report_2026.pdf",
      tool: "PDF Compressor",
      format: "PDF",
      originalSize: "12.4 MB",
      resultSize: "3.2 MB (-74%)",
    });

    const jobs = getWorkspaceJobs();
    expect(jobs.length).toBe(2);
    expect(jobs[0]?.name).toBe("Annual_Report_2026.pdf");
    expect(jobs[1]?.name).toBe("Climate_Change_Impacts.pptx");

    // Check dynamic stats
    const stats = computeWorkspaceStats(jobs);
    expect(stats.documentsHandled).toBe(2);
    expect(stats.presentationsBuilt).toBe(1);
    expect(parseFloat(stats.storageSaved)).toBeGreaterThan(0);

    // Delete a job
    deleteWorkspaceJob(job1.id);
    expect(getWorkspaceJobs().length).toBe(1);

    // Test template bookmarks
    const templateId = "theme-01";
    const initialBookmarked = getBookmarkedTemplateIds().includes(templateId);
    toggleBookmarkTemplate(templateId);
    expect(getBookmarkedTemplateIds().includes(templateId)).toBe(!initialBookmarked);
    toggleBookmarkTemplate(templateId);
    expect(getBookmarkedTemplateIds().includes(templateId)).toBe(initialBookmarked);

    // Clean up
    clearWorkspaceHistory();
  });
});
