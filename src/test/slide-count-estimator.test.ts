import { describe, expect, it } from "bun:test";
import {
  estimateOptimalSlideCount,
  SLIDE_COUNT_PRESETS,
} from "../lib/slide-count-estimator";
import { buildSlideDeckContent } from "../lib/presentation-session-client";

describe("DocuMind Slide Count Estimator & Blank Slide Prevention", () => {
  it("enforces the exact slide count presets: 5, 8, 10, 15, and 20", () => {
    expect(SLIDE_COUNT_PRESETS).toEqual([5, 8, 10, 15, 20]);
  });

  it("recommends 5 slides for short/concise inputs (< 140 words)", () => {
    const shortText = "Project Kickoff: We are building a modern document studio with AI support.";
    const rec = estimateOptimalSlideCount(shortText);
    expect(rec.optimalCount).toBe(5);
    expect(rec.options.find((o) => o.count === 5)?.isOptimal).toBe(true);
    expect(rec.estimatedMinutes).toBeGreaterThanOrEqual(3);

    // Advisory check
    const match = rec.getAdvisory(5);
    expect(match.level).toBe("optimal");

    // 20 slides warning for short text
    const warn = rec.getAdvisory(20);
    expect(warn.level).toBe("warning");
    expect(warn.message).toContain("stretch short sentences across multiple slides");
  });

  it("recommends 8 slides for medium executive briefs (140 - 400 words)", () => {
    // Generate text with ~220 words
    const sentence = "Our modern enterprise architecture provides real-time vector graphics processing with zero persistence requirements. ";
    const mediumText = sentence.repeat(16);
    const rec = estimateOptimalSlideCount(mediumText);
    expect(rec.optimalCount).toBe(8);
    expect(rec.getAdvisory(8).level).toBe("optimal");
  });

  it("recommends 10 slides for 400 - 900 words", () => {
    const paragraph = "Strategic section detailing operational workflows, distributed cloud topology, microservice orchestration, fault tolerance protocols, and continuous integration pipelines for high-reliability systems. ";
    const text = paragraph.repeat(25); // ~500 words
    const rec = estimateOptimalSlideCount(text);
    expect(rec.optimalCount).toBe(10);
    expect(rec.getAdvisory(10).level).toBe("optimal");
  });

  it("recommends 15 slides for 900 - 1500 words", () => {
    const paragraph = "Detailed operational section covering telemetry indicators, backend guardrails, compliance gates, automated load testing, asynchronous worker queues, and event-driven architectural models. ";
    const text = paragraph.repeat(50); // ~1000 words
    const rec = estimateOptimalSlideCount(text);
    expect(rec.optimalCount).toBe(15);
    expect(rec.getAdvisory(15).level).toBe("optimal");
  });

  it("recommends 20 slides for comprehensive materials (> 1500 words)", () => {
    const paragraph = "Deep academic chapter covering full literature review, empirical methods, hypothesis verification, multi-factor regression analysis, control variables, quantitative sampling frameworks, and statistical significance validation. ";
    const text = paragraph.repeat(70); // ~1600 words
    const rec = estimateOptimalSlideCount(text);
    expect(rec.optimalCount).toBe(20);
    expect(rec.getAdvisory(20).level).toBe("optimal");
  });

  it("guarantees no slide is blank or empty even when 20 slides is generated for dense numbered lists", () => {
    // This replicates the user's screenshot where numbered rules (e.g. '5. Fix errors you introduce before proceeding') were parsed
    const numberedRulesText = `
      1. First inspect the available tools.
      2. Keep files clean and maintainable.
      3. Never commit secrets or api keys.
      4. Avoid hardcoding fake data in production.
      5. Fix errors you introduce before proceeding.
      6. Maintain documentation integrity.
      7. Preserve all existing comments and docstrings.
      8. Run tests before completing the turn.
    `;

    const slides = buildSlideDeckContent(
      "System Working Rules",
      numberedRulesText,
      20,
      "balanced",
      "Company Presentation",
    );

    expect(slides.length).toBe(20);

    for (const slide of slides) {
      // Must have title
      expect(slide.title.trim().length).toBeGreaterThan(0);

      // Must never have only 1 lonely bullet with no visual / no cards / no quote
      if (slide.layout === "content") {
        expect(slide.bullets).toBeDefined();
        expect(slide.bullets!.length).toBeGreaterThanOrEqual(3);
        // And bullets must never be generic "Key insights for ..."
        for (const b of slide.bullets!) {
          expect(b).not.toContain("Key insights for");
        }
      }

      // If slide has visual, visual must have a concept or imageUrl
      if (slide.layout === "text-visual") {
        expect(slide.visual).toBeDefined();
        expect(slide.bullets).toBeDefined();
        expect(slide.bullets!.length).toBeGreaterThanOrEqual(1);
      }

      // If two-column, neither column should have more than 5 bullets (preventing massive scrollbar)
      if (slide.layout === "two-column") {
        if (slide.leftColumn) {
          expect(slide.leftColumn.bullets.length).toBeLessThanOrEqual(5);
        }
        if (slide.rightColumn) {
          expect(slide.rightColumn.bullets.length).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it("formats a complex 200-line master project prompt into an executive 8-slide deck without boring text dumps or duplicates", () => {
    const complexPrompt = `
MASTER PROJECT PROMPT — EAGLE TECHNOLOGY
Rebuild a Complete Flutter Android Application from Scratch

Act as a senior Flutter developer, mobile UI/UX engineer, Firebase architect, Android build engineer, and application security specialist.
Your task is to reconstruct my previously working Android application, formerly named **RED FOX TECH**, under its new name **Eagle Technology**.
My old computer crashed, and the original project folder was deleted before I could push the source code to GitHub.
Therefore, assume the original source code is unavailable.

PROJECT IDENTITY
New application name: Eagle Technology
Previous name: RED FOX TECH
Platform: Android

WORKING RULES — FOLLOW STRICTLY
First inspect the available development environment and project directory
2. If the workspace is empty, create the Flutter project in the current designated workspace.
3. Do not claim that the old application has been recovered. This is a reconstruction.
5. Ask me for missing screenshots, branding images, or essential configuration when required.
6. Do not invent an original screen's exact layout when a reference screenshot is available.
Never deploy production Firebase Security Rules, publish the application, create paid resources, or make irreversible changes without my explicit approval.
Never expose private credentials, authentication tokens, service-account keys, or other secrets in source code, terminal logs, screenshots, or GitHub.
14. Do not claim an APK has been built until the actual APK exists and its output path has been verified.
16. Do not replace real backend operations with fake success messages or hardcoded data in production flows.
Use free development tools and Firebase resources where possible.
Warn me before introducing any service that could incur charges.
18. Do not ask me to paste passwords, private keys, or service-account JSON into the Gemini chat.

Reconstruct the screens and features evidenced by my screenshots.
Managing supported listings
Viewing submitted contact messages
Reviewing incorrect-listing reports
Viewing relevant statistics
Restricting administrative operations to authorized administrators

Use my existing Firebase project if it remains accessible and is suitable for this application.
Implement Firebase Security Rules that enforce access control on the backend.
A user may read and update only the profile fields they are authorized to access.
Users must not be able to grant themselves administrator privileges.

Use a clean, maintainable Flutter structure appropriate to the size of the application.
Then build the debug APK and run the application on an Android emulator or connected device.
Once the app works and the checks pass, create a release APK using the appropriate Flutter build command.
Provide the exact verified APK path and the appropriate way for me to copy it to my phone.
`;

    const slides = buildSlideDeckContent(
      "MASTER PROJECT PROMPT — EAGLE TECHNOLOGY",
      complexPrompt,
      8,
      "balanced",
      "Business Strategy & Operations",
    );

    expect(slides.length).toBe(8);

    // Slide 1: Cover
    expect(slides[0]!.layout).toBe("title");
    expect(slides[0]!.title).toContain("MASTER PROJECT PROMPT");

    // Slide 2: Agenda
    expect(slides[1]!.layout).toBe("agenda");
    // Agenda must NOT duplicate the presentation title as its first topic
    expect(slides[1]!.bullets![0]).not.toBe("MASTER PROJECT PROMPT — EAGLE TECHNOLOGY");

    // Slide 3: Should NOT be a duplicate of Slide 1 with empty bullets
    expect(slides[2]!.title).not.toBe("MASTER PROJECT PROMPT — EAGLE TECHNOLOGY");
    if (slides[2]!.bullets) {
      expect(slides[2]!.bullets.length).toBeGreaterThanOrEqual(2);
      expect(slides[2]!.bullets.length).toBeLessThanOrEqual(5);
    }

    // Every intermediate slide (3 to 7) must have between 2 and 5 bullets, never 50+
    for (let i = 2; i < 7; i++) {
      const s = slides[i]!;
      if (s.bullets) {
        expect(s.bullets.length).toBeLessThanOrEqual(5);
        expect(s.bullets.length).toBeGreaterThanOrEqual(2);
        for (const b of s.bullets) {
          // No raw bullet numbering like "2. If the workspace..."
          expect(b).not.toMatch(/^\d+[.)]\s/);
          // Every bullet has a clean executive anchor
          expect(b).toContain(":");
        }
      }
      if (s.leftColumn) {
        expect(s.leftColumn.bullets.length).toBeLessThanOrEqual(4);
      }
      if (s.rightColumn) {
        expect(s.rightColumn.bullets.length).toBeLessThanOrEqual(4);
      }
    }

    // Slide 8: Conclusion
    const conclusion = slides[7]!;
    expect(conclusion.layout).toBe("conclusion");
    expect(conclusion.bullets).toBeDefined();
    expect(conclusion.bullets!.length).toBeGreaterThanOrEqual(3);

    // Conclusion must NOT blindly copy the bullets of Slide 7
    const slide7Bullets = slides[6]!.bullets || [];
    if (slide7Bullets.length > 0) {
      expect(conclusion.bullets![0]).not.toBe(slide7Bullets[0]);
    }
  });
});
