/**
 * DocuMind Intelligent Slide Count Estimator
 * Analyzes document and prompt text depth, word count, structural headings,
 * and bullet density to calculate the optimal slide deck length.
 * Standardizes deck targets to: 5, 8, 10, 15, 20, 25, 30, 35, 40, or 50 slides.
 */

export const SLIDE_COUNT_PRESETS = [5, 8, 10, 15, 20, 25, 30, 35, 40, 50] as const;
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
 * When uploaded documents or pasted text exceed 20 slides, the system dynamically
 * recommends 25, 30, 35, 40, or 50 slides to fully cover all topics and requirements.
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
    if (/^(Introduction|Overview|Scope|Architecture|Features|Requirements|Results|Conclusion|Summary|Chapter|Section|Module|Phase|Milestone|Key)\b/i.test(l) && l.length < 70) return true;
    return false;
  });

  const detectedTopicsCount = Math.max(
    1,
    topicLines.length > 0 ? topicLines.length : Math.ceil(wordCount / 90),
  );

  // Deterministic calculation based on content depth & topic structure
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
  } else if (wordCount < 2200 && (topicLines.length <= 22 || topicLines.length === 0)) {
    optimalCount = 20;
    reason = `Based on your comprehensive document (~${wordCount} words, ${detectedTopicsCount} topics), 20 slides gives full room for all chapters and detailed takeaways.`;
  } else if (wordCount < 3000 && (topicLines.length <= 27 || topicLines.length === 0)) {
    optimalCount = 25;
    reason = `Based on your extensive material (~${wordCount} words, ${detectedTopicsCount} topics), 25 slides gives dedicated coverage to each section without overcrowding.`;
  } else if (wordCount < 3800 && (topicLines.length <= 32 || topicLines.length === 0)) {
    optimalCount = 30;
    reason = `Based on your long-form document (~${wordCount} words, ${detectedTopicsCount} topics), 30 slides delivers balanced, chapter-by-chapter pacing.`;
  } else if (wordCount < 4600 && (topicLines.length <= 37 || topicLines.length === 0)) {
    optimalCount = 35;
    reason = `Based on your detailed multi-section content (~${wordCount} words, ${detectedTopicsCount} topics), 35 slides ensures thorough room for all modules and metrics.`;
  } else if (wordCount < 5600 && (topicLines.length <= 44 || topicLines.length === 0)) {
    optimalCount = 40;
    reason = `Based on your comprehensive syllabus (~${wordCount} words, ${detectedTopicsCount} topics), 40 slides delivers expansive room for all topics and deep analysis.`;
  } else {
    optimalCount = 50;
    reason = `Based on your extensive manuscript (~${wordCount} words, ${detectedTopicsCount} topics), 50 slides delivers a complete, full-scale master presentation deck.`;
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
          recommendedWordRange: "900 – 1,500 words",
          isOptimal,
        };
      case 20:
        return {
          count,
          label: "20 Slides",
          pacingTitle: "Full Workshop / Masterclass Deck",
          description: "Maximum depth for detailed multi-section reports, training courses, and thesis defenses.",
          recommendedWordRange: "1,500 – 2,200 words",
          isOptimal,
        };
      case 25:
        return {
          count,
          label: "25 Slides",
          pacingTitle: "Extended Workshop / Multi-Chapter Course",
          description: "Dedicated slides for extensive multi-part curricula, technical frameworks, and complete case studies.",
          recommendedWordRange: "2,200 – 3,000 words",
          isOptimal,
        };
      case 30:
        return {
          count,
          label: "30 Slides",
          pacingTitle: "Full Syllabus / Comprehensive Technical Blueprint",
          description: "Thorough chapter-by-chapter pacing for complex domain architecture and comprehensive audits.",
          recommendedWordRange: "3,000 – 3,800 words",
          isOptimal,
        };
      case 35:
        return {
          count,
          label: "35 Slides",
          pacingTitle: "Enterprise Architecture / Complete Specification",
          description: "Deep dive for multi-system topologies, cross-department roadmaps, and full-semester lecture modules.",
          recommendedWordRange: "3,800 – 4,600 words",
          isOptimal,
        };
      case 40:
        return {
          count,
          label: "40 Slides",
          pacingTitle: "Full-Length Training Program / Research Compendium",
          description: "Expansive coverage for large-scale enterprise training, comprehensive research papers, and technical handbooks.",
          recommendedWordRange: "4,600 – 5,600 words",
          isOptimal,
        };
      case 50:
        return {
          count,
          label: "50 Slides",
          pacingTitle: "Master Deck / Complete Enterprise Compendium",
          description: "Exhaustive full-scale deck covering all chapters, telemetry, methodologies, and operational appendices.",
          recommendedWordRange: "5,600+ words",
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

    if (selectedCount >= 20 && wordCount < 500) {
      return {
        level: "warning" as const,
        message: `Selecting ${selectedCount} slides for ~${wordCount} words may leave slides with minimal text. We recommend ${optimalCount} slides for best visual impact.`,
      };
    }

    if (selectedCount <= 8 && wordCount > 1500) {
      return {
        level: "advisory" as const,
        message: `Selecting ${selectedCount} slides for ~${wordCount} words will compress multiple sections together. Consider ${optimalCount} slides to give each section room.`,
      };
    }

    if (selectedCount < optimalCount) {
      return {
        level: "advisory" as const,
        message: `${selectedCount} slides will provide a more compact overview of your ~${wordCount} words across ${detectedTopicsCount} topics.`,
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
