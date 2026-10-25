/**
 * DocuMind Intelligent Slide Count Estimator
 * Analyzes document and prompt text depth, word count, structural headings,
 * and bullet density to calculate the optimal slide deck length.
 * Standardizes deck targets to: 5, 8, 10, 15, or 20 slides.
 */

export const SLIDE_COUNT_PRESETS = [5, 8, 10, 15, 20] as const;
export type SlideCountOption = (typeof SLIDE_COUNT_PRESETS)[number];

export interface SlideCountOptionMeta {
  count: SlideCountOption;
  label: string;
  pacingTitle: string;
  description: string;
  recommendedWordRange: string;
  isOptimal: boolean;
}

export interface SlideCountRecommendation {
  optimalCount: SlideCountOption;
  reason: string;
  wordCount: number;
  characterCount: number;
  detectedTopicsCount: number;
  estimatedMinutes: number;
  options: SlideCountOptionMeta[];
  getAdvisory: (selectedCount: number) => {
    level: "optimal" | "advisory" | "warning";
    message: string;
  };
}

/**
 * Estimates the optimal slide count based on textual volume and semantic density.
 */
export function estimateOptimalSlideCount(
  content: string,
  userSelectedCount?: number,
): SlideCountRecommendation {
  const text = (content || "").trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const characterCount = text.length;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Detect structural topic markers (Markdown headers, numbered items, all-caps lines, colon ends)
  const topicLines = lines.filter((l) => {
    if (l.startsWith("#")) return true;
    if (/^\d+[.)]\s+[A-Za-z]/.test(l) && l.length < 90) return true;
    if (l.endsWith(":") && l.length < 80) return true;
    if (l === l.toUpperCase() && l.length > 3 && l.length < 60 && !l.includes(".")) return true;
    if (/^(Introduction|Overview|Scope|Architecture|Features|Requirements|Results|Conclusion|Summary)\b/i.test(l) && l.length < 70) return true;
    return false;
  });

  const detectedTopicsCount = Math.max(
    1,
    topicLines.length > 0 ? topicLines.length : Math.ceil(wordCount / 90),
  );

  // Deterministic calculation based on content depth
  let optimalCount: SlideCountOption = 8;
  let reason = "";

  if (wordCount < 140 && (topicLines.length <= 4 || topicLines.length === 0)) {
    optimalCount = 5;
    reason = `Based on your concise text (~${wordCount} words, ${detectedTopicsCount} key points), 5 slides provides a punchy, focused presentation without empty slides.`;
  } else if (wordCount < 400 && (topicLines.length <= 8 || topicLines.length === 0)) {
    optimalCount = 8;
    reason = `Based on your content depth (~${wordCount} words, ${detectedTopicsCount} topics), 8 slides is optimal for an executive briefing or lecture without overcrowding.`;
  } else if (wordCount < 900 && (topicLines.length <= 13 || topicLines.length === 0)) {
    optimalCount = 10;
    reason = `Based on your content (~${wordCount} words across ${detectedTopicsCount} topics), 10 slides provides comprehensive coverage with balanced visual pacing.`;
  } else if (wordCount < 1500 && (topicLines.length <= 18 || topicLines.length === 0)) {
    optimalCount = 15;
    reason = `Based on your detailed material (~${wordCount} words, ${detectedTopicsCount} topics), 15 slides provides thorough room for technical or academic analysis.`;
  } else {
    optimalCount = 20;
    reason = `Based on your comprehensive document (~${wordCount} words, ${detectedTopicsCount} topics), 20 slides gives full room for all chapters and detailed takeaways.`;
  }

  // Estimated presentation delivery duration (~2 minutes per content slide)
  const estimatedMinutes = Math.max(3, Math.round(optimalCount * 1.8));

  // Build metadata for each available preset
  const options: SlideCountOptionMeta[] = SLIDE_COUNT_PRESETS.map((count) => {
    const isOptimal = count === optimalCount;
    switch (count) {
      case 5:
        return {
          count,
          label: "5 Slides",
          pacingTitle: "Executive Pitch / Lightning Talk",
          description: "Punchy summary covering thesis, 3 core pillars, and conclusion.",
          recommendedWordRange: "< 150 words",
          isOptimal,
        };
      case 8:
        return {
          count,
          label: "8 Slides",
          pacingTitle: "Standard Brief / Lecture Review",
          description: "Balanced pacing with agenda, 5 dedicated content topics, and takeaway synthesis.",
          recommendedWordRange: "150 – 400 words",
          isOptimal,
        };
      case 10:
        return {
          count,
          label: "10 Slides",
          pacingTitle: "Comprehensive Presentation",
          description: "Detailed deck with telemetry, comparison matrices, and process timelines.",
          recommendedWordRange: "400 – 900 words",
          isOptimal,
        };
      case 15:
        return {
          count,
          label: "15 Slides",
          pacingTitle: "In-Depth Academic / Technical Deck",
          description: "Deep dive for research papers, project specifications, and multi-part case studies.",
          recommendedWordRange: "900 – 1,600 words",
          isOptimal,
        };
      case 20:
        return {
          count,
          label: "20 Slides",
          pacingTitle: "Full Workshop / Masterclass Deck",
          description: "Maximum depth for detailed multi-section reports, training courses, and thesis defenses.",
          recommendedWordRange: "1,600+ words",
          isOptimal,
        };
    }
  });

  const getAdvisory = (selectedCount: number) => {
    if (selectedCount === optimalCount) {
      return {
        level: "optimal" as const,
        message: `Perfect match: ${selectedCount} slides distributes your ~${wordCount} words naturally without crowded or empty slides.`,
      };
    }

    if (selectedCount >= 15 && wordCount < 200) {
      return {
        level: "warning" as const,
        message: `Selecting ${selectedCount} slides for ~${wordCount} words will stretch short sentences across multiple slides. We recommend ${optimalCount} slides for a clean, cohesive layout.`,
      };
    }

    if (selectedCount === 20 && wordCount < 500) {
      return {
        level: "warning" as const,
        message: `Selecting 20 slides for ~${wordCount} words may leave slides with minimal text. We recommend ${optimalCount} slides for best visual impact.`,
      };
    }

    if (selectedCount === 5 && wordCount > 800) {
      return {
        level: "advisory" as const,
        message: `Selecting 5 slides for ~${wordCount} words will compress multiple sections together. Consider 10 or 15 slides to give each section room.`,
      };
    }

    if (selectedCount < optimalCount) {
      return {
        level: "advisory" as const,
        message: `${selectedCount} slides will provide a more compact overview of your ~${wordCount} words.`,
      };
    }

    return {
      level: "advisory" as const,
      message: `${selectedCount} slides will give your content spacious, detailed pacing.`,
    };
  };

  return {
    optimalCount,
    reason,
    wordCount,
    characterCount,
    detectedTopicsCount,
    estimatedMinutes,
    options,
    getAdvisory,
  };
}
