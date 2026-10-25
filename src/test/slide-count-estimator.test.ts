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
});
