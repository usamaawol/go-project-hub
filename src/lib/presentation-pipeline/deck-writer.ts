import { cleanHeadingTitle, calculateNaturalSlideCount } from "./content-analyzer";
import {
  buildPreciseVisualPrompt,
  buildSlideDiagramData,
  renderDiagramDataToSvg,
} from "./diagram-synthesizer";
import type {
  AnalyzedTopic,
  DocumentAnalysis,
  PipelineSlideItem,
  PresentationDirectives,
  SlideSurface,
} from "./types";

const CARD_STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "that", "this", "these",
  "those", "it", "its", "they", "their", "we", "our", "you", "your", "i", "not", "do", "does",
  "did", "can", "could", "will", "would", "should", "must", "may", "might", "have", "has", "had",
]);

/**
 * Truncates text cleanly on word boundaries without mid-word clipping.
 */
function trimWords(text: string, maxChars: number): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const words = clean.split(" ");
  let out = "";
  for (const w of words) {
    if (!out) out = w;
    else if (out.length + 1 + w.length <= maxChars - 1) out += ` ${w}`;
    else break;
  }
  return out ? `${out}…` : clean.slice(0, maxChars - 1) + "…";
}

/**
 * Derives a clean, distinct card title and description from any factual sentence
 * without duplicating phrasing (`title === description` or clipped prefixes like `"I do not | I do not..."`).
 */
export function buildCrispCardFromPoint(
  point: string,
  fallbackLabel: string,
  index: number,
  isRtl = false,
): { title: string; description: string; tag?: string } {
  const clean = point.replace(/^[-•*\d.)]+\s*/, "").trim();
  if (!clean) {
    return {
      title: `${fallbackLabel} ${index + 1}`,
      description: fallbackLabel,
    };
  }

  // Case A: Explicit "Term: Definition" or "Term — Explanation"
  const colonIdx = clean.indexOf(":");
  const dashIdx = clean.indexOf(" — ");
  const splitIdx =
    colonIdx >= 3 && colonIdx <= 44 ? colonIdx : dashIdx >= 3 && dashIdx <= 44 ? dashIdx : -1;

  if (splitIdx > 0) {
    const rawHead = clean.slice(0, splitIdx).trim();
    const rawBody = clean.slice(splitIdx + (colonIdx === splitIdx ? 1 : 3)).trim();
    if (rawHead.length >= 2 && rawBody.length >= 4 && rawHead.toLowerCase() !== rawBody.toLowerCase()) {
      return {
        title: cleanHeadingTitle(rawHead, 38),
        description: trimWords(rawBody, 130),
        tag: `0${index + 1}`,
      };
    }
  }

  // Case B: Natural clause split without repeating stopword fragments ("I do not | I do not want...")
  const words = clean.split(/\s+/);
  const meaningful = words.filter(
    (w) => w.length >= 3 && !CARD_STOP_WORDS.has(w.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, "")),
  );

  let cardTitle: string;
  if (meaningful.length >= 2) {
    cardTitle = meaningful
      .slice(0, Math.min(3, meaningful.length))
      .map((w) => {
        const stripped = w.replace(/[,.;:!?]+$/, "");
        return /^[a-z]/.test(stripped) ? stripped.charAt(0).toUpperCase() + stripped.slice(1) : stripped;
      })
      .join(" ");
  } else if (meaningful.length === 1) {
    const solo = meaningful[0]!.replace(/[,.;:!?]+$/, "");
    cardTitle = /^[a-z]/.test(solo) ? solo.charAt(0).toUpperCase() + solo.slice(1) : solo;
  } else {
    cardTitle = isRtl ? `محور 0${index + 1}` : `Key Aspect 0${index + 1}`;
  }

  cardTitle = trimWords(cleanHeadingTitle(cardTitle, 32), 32);
  let desc = trimWords(clean, 130);

  if (cardTitle.toLowerCase() === desc.toLowerCase()) {
    cardTitle = isRtl ? `نقطة رئيسية 0${index + 1}` : `Core Insight 0${index + 1}`;
  }

  return {
    title: cardTitle,
    description: desc,
    tag: `0${index + 1}`,
  };
}

/**
 * Ensures dense single-item bullet strings like `"Examples, text, images, numbers, or a user question"`
 * expand naturally into clear, scannable bullets when a slide only has one fact line (without inventing facts).
 */
function ensureScannableBullets(facts: string[], summary: string, maxCount = 5): string[] {
  const unique = Array.from(new Set(facts.map((f) => f.trim()).filter(Boolean)));
  if (unique.length === 0 && summary) {
    unique.push(summary.trim());
  }

  // If only 1 compact comma/or list exists (e.g., "Examples, text, images, numbers, or a user question"), decompose gracefully
  if (unique.length === 1 && unique[0]!.length > 28) {
    const line = unique[0]!;
    const colonParts = line.split(/:\s+/);
    if (colonParts.length === 2 && colonParts[1]!.includes(",")) {
      const items = colonParts[1]!
        .split(/,\s*(?:or\s+|and\s+)?|\s+or\s+|\s+and\s+/i)
        .map((s) => s.trim().replace(/[.;]+$/, ""))
        .filter((s) => s.length >= 3);
      if (items.length >= 2) {
        return [colonParts[0]!.trim(), ...items.slice(0, maxCount - 1)];
      }
    }
    if ((line.match(/,/g) || []).length >= 2) {
      const parts = line
        .split(/,\s*(?:and\s+|or\s+)?|\s+or\s+/i)
        .map((s) => s.trim().replace(/^(?:and|or)\s+/i, "").replace(/[.;]+$/, ""))
        .filter((s) => s.length >= 3);
      if (parts.length >= 2) {
        return parts.slice(0, maxCount).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
      }
    }
  }

  return unique.slice(0, maxCount).map((b) => trimWords(b, 145));
}

function selectAccentThemeInfo(directives: PresentationDirectives, analysis: DocumentAnalysis) {
  const accent = directives.theme?.colors?.accent || "#2563EB";
  const bg = directives.theme?.colors?.bg || "#FFFFFF";
  const lum = (() => {
    const c = bg.replace("#", "");
    if (c.length !== 6) return 1;
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  })();
  return {
    accent,
    isDark: lum < 0.35,
    domain: analysis.domain,
  };
}

/**
 * Selects a balanced subset/expansion of `AnalyzedTopic` items matching the desired slot count
 * while preserving original narrative ordering and avoiding repetition.
 */
function mapTopicsToContentSlots(
  analysis: DocumentAnalysis,
  slotCount: number,
  isRtl: boolean,
): Array<{
  topic: AnalyzedTopic;
  subMode?: "overview" | "examples" | "terms" | "metrics" | "diagram";
}> {
  if (slotCount <= 0) return [];
  // Avoid duplicating an explicit "Conclusion" source topic right before our dedicated final Conclusion slide
  const nonClosingTopics =
    analysis.topics.length >= 4
      ? analysis.topics.filter(
          (t) => !/^(?:conclusion|conclusions|summary|closing|final remarks|recommendations)$/i.test(t.title.trim()),
        )
      : analysis.topics;
  const topics = nonClosingTopics.length >= 2 ? nonClosingTopics : analysis.topics;

  if (topics.length >= slotCount) {
    // Select evenly across the document (preserve intro + evenly spread body + last)
    if (slotCount === 1) return [{ topic: topics[0]! }];
    const indices = new Set<number>([0]);
    const step = (topics.length - 1) / (slotCount - 1);
    for (let k = 1; k < slotCount - 1; k++) {
      indices.add(Math.round(k * step));
    }
    indices.add(topics.length - 1);
    const ordered = Array.from(indices)
      .sort((a, b) => a - b)
      .slice(0, slotCount);
    // Fill any rounding collision cleanly
    for (let j = 1; ordered.length < slotCount && j < topics.length; j++) {
      if (!ordered.includes(j)) ordered.push(j);
    }
    return ordered.sort((a, b) => a - b).map((idx) => ({ topic: topics[idx]! }));
  }

  // Fewer extracted sections than requested slides -> enrich strictly with distinct real facets (never clone bullets)
  const slots: Array<{ topic: AnalyzedTopic; subMode?: "overview" | "examples" | "terms" | "metrics" | "diagram" }> = [];
  for (const t of topics) {
    slots.push({ topic: t, subMode: "overview" });
  }

  // Inject real metrics spotlight if not already on a dedicated topic
  if (
    slots.length < slotCount &&
    analysis.allMetrics.length >= 2 &&
    !topics.some((t) => t.recommendedVisual === "chart" && t.metrics.length >= 2)
  ) {
    slots.push({
      topic: {
        id: "derived-metrics",
        title: isRtl ? "المؤشرات والأرقام الرئيسية" : "Key Quantitative Figures",
        summary: analysis.allMetrics.map((m) => `${m.label}: ${m.value}`).join(" • "),
        keyFacts: analysis.allMetrics.map((m) => `${m.label}: ${m.value}${m.context ? ` — ${m.context}` : ""}`),
        examples: [],
        technicalTerms: [],
        metrics: analysis.allMetrics.slice(0, 4),
        processSteps: [],
        timelineItems: [],
        recommendedVisual: "chart",
        diagramKind: "bar-chart",
        importance: 9,
        sourceIndices: [0],
      },
      subMode: "metrics",
    });
  }

  // Enrich multi-fact sections cleanly by splitting distinct facets without repeating bullets
  let expandIdx = 0;
  while (slots.length < slotCount && expandIdx < topics.length) {
    const t = topics[expandIdx]!;
    if (t.examples.length >= 1 && slots.length < slotCount) {
      slots.push({
        topic: {
          ...t,
          id: `${t.id}-examples`,
          title: isRtl ? `تطبيقات وأمثلة: ${t.title}` : `Applied Examples: ${cleanHeadingTitle(t.title, 42)}`,
          keyFacts: t.examples,
          summary: t.examples[0]!,
          metrics: [],
          processSteps: [],
          timelineItems: [],
          comparison: undefined,
          recommendedVisual: "cards",
        },
        subMode: "examples",
      });
    } else if (t.keyFacts.length >= 4 && slots.length < slotCount) {
      const half = Math.ceil(t.keyFacts.length / 2);
      const firstHalf = t.keyFacts.slice(0, half);
      const secondHalf = t.keyFacts.slice(half);
      // Mutate earlier overview slot for `t` to only carry `firstHalf` so ZERO bullets repeat!
      const origSlot = slots.find((s) => s.topic.id === t.id);
      if (origSlot) {
        origSlot.topic = { ...origSlot.topic, keyFacts: firstHalf };
      }
      const subTitle =
        buildCrispCardFromPoint(secondHalf[0]!, "Details", 0, isRtl).title ||
        cleanHeadingTitle(t.title, 42);
      slots.push({
        topic: {
          ...t,
          id: `${t.id}-deep`,
          title: isRtl
            ? `تفاصيل محورية: ${t.title}`
            : subTitle.toLowerCase() === cleanHeadingTitle(t.title, 42).toLowerCase()
              ? `${cleanHeadingTitle(t.title, 38)} — Key Breakdown`
              : `${cleanHeadingTitle(t.title, 32)} — ${subTitle}`,
          keyFacts: secondHalf,
          summary: secondHalf[0]!,
          metrics: [],
          processSteps: [],
          timelineItems: [],
          comparison: undefined,
          recommendedVisual: t.recommendedVisual === "diagram" ? "image" : "diagram",
        },
        subMode: "diagram",
      });
    } else if (t.technicalTerms.length >= 2 && slots.length < slotCount) {
      slots.push({
        topic: {
          ...t,
          id: `${t.id}-terms`,
          title: isRtl ? `المفاهيم الأساسية: ${t.title}` : `${cleanHeadingTitle(t.title, 42)}: Key Concepts`,
          keyFacts: t.technicalTerms.map((tt) => `${tt.term}: ${tt.explanation}`),
          summary: `${t.technicalTerms[0]!.term}: ${t.technicalTerms[0]!.explanation}`,
          metrics: [],
          processSteps: [],
          timelineItems: [],
          comparison: undefined,
          recommendedVisual: t.technicalTerms.length >= 4 ? "bento" : "cards",
        },
        subMode: "terms",
      });
    }
    expandIdx++;
  }

  // If source was genuinely ultra-short (e.g., 1 sentence) and caller forced extra slides:
  // Create honest architectural / thesis / practical impact breakdowns grounded strictly in existing thesis/facts
  if (slots.length < slotCount) {
    const synthesisAngles = [
      {
        title: isRtl ? "جوهر الفكرة والسياق العام" : "Core Thesis & Scope",
        layoutHint: "hero-split" as const,
        facts: [analysis.coreThesis, ...analysis.keyTakeaways.slice(0, 2)],
      },
      {
        title: isRtl ? "الأهمية والتأثير العملي" : "Practical Implications & Value",
        layoutHint: "three-card" as const,
        facts: analysis.keyFacts.length > 1 ? analysis.keyFacts.slice(1, 4) : [analysis.coreThesis, ...analysis.conclusionPoints.slice(0, 2)],
      },
      {
        title: isRtl ? "البنية المفاهيمية والعلاقات" : "Conceptual Relationships",
        layoutHint: "diagram" as const,
        facts: analysis.topics[0]?.keyFacts || [analysis.coreThesis],
      },
    ];
    let sIdx = 0;
    while (slots.length < slotCount) {
      const angle = synthesisAngles[sIdx % synthesisAngles.length]!;
      slots.push({
        topic: {
          id: `synth-${sIdx + 1}`,
          title: sIdx >= synthesisAngles.length ? `${angle.title} (${sIdx + 1})` : angle.title,
          summary: angle.facts[0] || analysis.coreThesis,
          keyFacts: ensureScannableBullets(angle.facts, analysis.coreThesis, 4),
          examples: [],
          technicalTerms: [],
          metrics: [],
          processSteps: [],
          timelineItems: [],
          recommendedVisual: angle.layoutHint === "diagram" ? "diagram" : angle.layoutHint === "hero-split" ? "image" : "cards",
          importance: 5,
          sourceIndices: [0],
        },
      });
      sIdx++;
    }
  }

  return slots.slice(0, slotCount);
}

/**
 * Picks a diverse Gamma slide layout for a topic without repeating consecutive identical layouts.
 */
function pickLayoutForTopic(
  topic: AnalyzedTopic,
  slotIndex: number,
  prevLayout: string | undefined,
  textOnly: boolean,
): PipelineSlideItem["layout"] {
  const candidates: PipelineSlideItem["layout"][] = [];

  if (topic.tableData) candidates.push("table");
  if (topic.comparison) candidates.push("two-column");
  if (topic.metrics.length >= 2 || (topic.metrics.length >= 1 && /\b(kpi|metric|growth|pitch|performance|revenue|adoption|rate)\b/i.test(`${topic.title} ${topic.summary}`))) {
    candidates.push("metrics");
  }
  if (topic.timelineItems.length >= 2) candidates.push("timeline");
  if (topic.processSteps.length >= 2) candidates.push("process");
  if (topic.quote) candidates.push("quote");

  if (slotIndex === 0) {
    candidates.push("hero-split");
  }

  if (!textOnly) {
    if (topic.recommendedVisual === "diagram") candidates.push("diagram-explainer", "text-visual");
    if (topic.recommendedVisual === "image") candidates.push("image-led", "text-visual");
  }

  if (topic.keyFacts.length >= 4 || topic.technicalTerms.length >= 4 || topic.recommendedVisual === "bento") {
    candidates.push("bento-grid");
  }
  if (topic.keyFacts.length >= 3 || topic.technicalTerms.length >= 3) {
    candidates.push("three-card");
  }
  if (slotIndex === 0) {
    candidates.push("hero-split", "three-card", "bento-grid");
  } else if (topic.keyFacts.length >= 3) {
    candidates.push("hero-split", "three-card", "headline-hero", "two-column", "content");
  } else {
    candidates.push("hero-split", "headline-hero", "two-column");
  }

  for (const cand of candidates) {
    if (textOnly && (cand === "text-visual" || cand === "image-led" || cand === "diagram-explainer")) {
      continue;
    }
    if (cand !== prevLayout) {
      return cand;
    }
  }

  return textOnly
    ? (prevLayout === "two-column" ? "headline-hero" : "two-column")
    : (topic.keyFacts.length >= 3 ? "content" : "hero-split");
}

/**
 * Stage 2 Presentation Writer & Gamma Visual Design Director:
 * Transforms `DocumentAnalysis` + separated `PresentationDirectives` into a richly designed,
 * visually varied, zero-filler deck of `PipelineSlideItem[]`.
 */
export function composePresentationDeck(
  analysis: DocumentAnalysis,
  directives: PresentationDirectives,
): PipelineSlideItem[] {
  const isRtl =
    analysis.isRtl ||
    directives.language === "Arabic" ||
    directives.language === "Hebrew";
  const textOnly = directives.visualPreference === "text-only";
  const density = directives.density || "balanced";
  const isAssignmentCover = Boolean(directives.assignmentMetadata?.isAssignment);

  const requestedCount = directives.autoSlideCount
    ? analysis.recommendedSlideCount
    : directives.slideCount && directives.slideCount >= 3
      ? Math.min(50, Math.round(directives.slideCount))
      : calculateNaturalSlideCount(analysis.totalSourceWords, analysis.topics.length);

  const targetCount = Math.max(3, requestedCount);

  // Strictly honor Gamma Item 8: omit Agenda on short 3-4 slide decks unless explicitly requested!
  const includeAgenda =
    directives.includeAgenda === true ||
    (directives.includeAgenda !== false && targetCount >= 5);

  const { accent, isDark, domain } = selectAccentThemeInfo(directives, analysis);
  const slides: PipelineSlideItem[] = [];

  const hasExplicitUserTitle =
    Boolean(directives.title?.trim()) &&
    !/^(?:untitled|new presentation|presentation)$/i.test(directives.title!.trim());
  const baseDeckTitle = hasExplicitUserTitle
    ? directives.title!.replace(/^#{1,6}\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1").trim().slice(0, 72)
    : cleanHeadingTitle(analysis.detectedTitle, 68);

  const cleanDeckTitle = isAssignmentCover
    ? cleanHeadingTitle(directives.assignmentMetadata?.assignmentTitle?.trim() || baseDeckTitle, 72)
    : baseDeckTitle;

  // Clean subtitle: never stamp generic "BUSINESS STRATEGY & OPERATIONS" over user subject
  const cleanCoverSubtitle = trimWords(
    analysis.coreThesis && analysis.coreThesis.toLowerCase() !== cleanDeckTitle.toLowerCase()
      ? analysis.coreThesis
      : analysis.topics[0]?.summary || (isRtl ? "عرض تقديمي تحليلي" : "Structured Subject Presentation"),
    130,
  );

  const domainBadge = isAssignmentCover
    ? "ACADEMIC ASSIGNMENT"
    : isRtl
      ? analysis.domain === "academic" ? "دراسة ومحتوى تعليمي" : "عرض تقديمي"
      : directives.purpose &&
          !/^general topic overview$/i.test(directives.purpose) &&
          !/^business strategy & operations$/i.test(directives.purpose)
        ? directives.purpose.toUpperCase()
        : `${analysis.domain.toUpperCase()} BRIEFING`;

  // SLIDE 1: Hero Title or Assignment Cover
  slides.push({
    id: "slide-1",
    slideNumber: 1,
    layout: isAssignmentCover ? "assignment-cover" : "title",
    title: cleanDeckTitle,
    subtitle: cleanCoverSubtitle,
    categoryTag: domainBadge,
    assignmentMetadata: isAssignmentCover ? directives.assignmentMetadata : undefined,
    isRtl,
    visualMesh: true,
    slideSurface: isAssignmentCover ? "base" : "dark",
    notes: `Subject: ${analysis.subject}. Core Thesis: ${analysis.coreThesis}`,
  });

  // SLIDE 2 (Optional): Structured Agenda / Roadmap
  if (includeAgenda) {
    const agendaBullets = analysis.topics.slice(0, 6).map((t) => {
      const head = cleanHeadingTitle(t.title, 48);
      if (head.length <= 16 && t.summary && t.summary.toLowerCase() !== head.toLowerCase()) {
        return trimWords(`${head}: ${t.summary}`, 85);
      }
      if (head.length <= 16) {
        return trimWords(`${head} — Key Takeaways`, 64);
      }
      return head;
    });
    // If document had 1 concise section, populate roadmap from its core facts (each >= 16 chars)
    const fallbackAgenda = [
      cleanHeadingTitle(`${cleanDeckTitle}: Core Scope`, 68),
      ...ensureScannableBullets(analysis.keyFacts, analysis.coreThesis, 4),
    ]
      .filter((b) => b.length > 15)
      .slice(0, 4);

    slides.push({
      id: "slide-2",
      slideNumber: 2,
      layout: "agenda",
      title: isRtl ? "محاور العرض التقديمي" : "Presentation Roadmap",
      subtitle: isRtl
        ? "تسلسل الأفكار والمحاور الرئيسية المستخلصة من المحتوى"
        : "Structured progression through key source themes",
      categoryTag: isRtl ? "خارطة العرض" : "ROADMAP",
      bullets: agendaBullets.length >= 2 ? agendaBullets : fallbackAgenda,
      isRtl,
      slideSurface: "tinted",
    });
  }

  // Reserve last slide for Conclusion -> calculate middle content slots
  const reserveClosing = targetCount >= 3 ? 1 : 0;
  const middleSlotsCount = Math.max(1, targetCount - slides.length - reserveClosing);
  const contentSlots = mapTopicsToContentSlots(analysis, middleSlotsCount, isRtl);

  let prevLayout: string | undefined = slides[slides.length - 1]?.layout;
  const maxBullets = density === "concise" ? 3 : density === "detailed" ? 5 : 4;

  contentSlots.forEach((slot, idx) => {
    const { topic } = slot;
    const layout = pickLayoutForTopic(topic, idx, prevLayout, textOnly);
    prevLayout = layout;

    const slideNum = slides.length + 1;
    const rawBullets = ensureScannableBullets(topic.keyFacts, topic.summary, maxBullets);
    const bullets = rawBullets.map((b) => {
      if (b.length <= 16) {
        const prefix = cleanHeadingTitle(topic.title, 28);
        if (prefix.toLowerCase() !== b.toLowerCase()) {
          return trimWords(`${prefix}: ${b.replace(/[.]$/, "")}`, 140);
        }
      }
      return b;
    });

    // Determine surface contrast rhythm (Gamma dark/tinted/base alternation)
    let slideSurface: SlideSurface = "base";
    if (layout === "quote" || layout === "metrics" || layout === "timeline") {
      slideSurface = "tinted";
    } else if (layout === "headline-hero" || (idx > 0 && idx % 4 === 3)) {
      slideSurface = "dark";
    } else if (layout === "two-column" && idx % 2 === 1) {
      slideSurface = "tinted";
    }

    const slide: PipelineSlideItem = {
      id: `slide-${slideNum}`,
      slideNumber: slideNum,
      layout,
      title: cleanHeadingTitle(topic.title, 66),
      subtitle: trimWords(topic.summary, 130),
      categoryTag: isRtl ? `المحور 0${idx + 1}` : `0${idx + 1} // ${domain.toUpperCase()}`,
      bullets,
      sourceParagraphIndices: topic.sourceIndices,
      sourceExcerpt: topic.summary.slice(0, 140),
      isRtl,
      slideSurface,
    };

    // Populate structured composition data cleanly matching chosen layout
    if (layout === "table" && topic.tableData) {
      slide.table = topic.tableData;
    } else if (layout === "two-column") {
      if (topic.comparison) {
        slide.leftColumn = {
          title: topic.comparison.leftTitle,
          bullets: topic.comparison.leftPoints.slice(0, 4),
        };
        slide.rightColumn = {
          title: topic.comparison.rightTitle,
          bullets: topic.comparison.rightPoints.slice(0, 4),
        };
      } else {
        const half = Math.ceil(bullets.length / 2);
        slide.leftColumn = {
          title: isRtl ? "الأبعاد الأساسية" : "Core Principles",
          bullets: bullets.slice(0, Math.max(1, half)),
        };
        slide.rightColumn = {
          title: isRtl ? "التطبيقات والنتائج" : "Applied Impact",
          bullets: bullets.slice(half).length > 0 ? bullets.slice(half) : [trimWords(topic.summary, 110)],
        };
      }
    } else if (layout === "three-card") {
      const cardSources = bullets.slice(0, 3);
      while (cardSources.length < 3 && topic.technicalTerms[cardSources.length]) {
        const tt = topic.technicalTerms[cardSources.length]!;
        cardSources.push(`${tt.term}: ${tt.explanation}`);
      }
      slide.cards = cardSources.map((p, ci) =>
        buildCrispCardFromPoint(p, isRtl ? "محور" : "Focus", ci, isRtl),
      );
    } else if (layout === "bento-grid") {
      const boxSources =
        topic.technicalTerms.length >= 3
          ? topic.technicalTerms.slice(0, 4).map((tt) => `${tt.term}: ${tt.explanation}`)
          : bullets.slice(0, 4);
      slide.bentoGrid = boxSources.map((p, bi) =>
        buildCrispCardFromPoint(p, isRtl ? "عنصر" : "Dimension", bi, isRtl),
      );
    } else if (layout === "metrics" && topic.metrics.length > 0) {
      slide.metrics = topic.metrics.slice(0, 4);
    } else if (layout === "timeline" && topic.timelineItems.length > 0) {
      slide.timeline = topic.timelineItems.slice(0, 4).map((item) => ({
        phase: item.phase,
        title: item.title,
        description: trimWords(item.detail, 115),
      }));
    } else if (layout === "process" && topic.processSteps.length > 0) {
      slide.processSteps = topic.processSteps.slice(0, 4).map((st, si) => ({
        stepNumber: si + 1,
        title: st.title,
        description: trimWords(st.detail, 115),
      }));
    } else if (layout === "quote" && topic.quote) {
      slide.quote = topic.quote;
    } else if (layout === "hero-split") {
      const distinctHeadline = trimWords(
        bullets[0] && bullets[0].toLowerCase() !== slide.title.toLowerCase()
          ? bullets[0]
          : topic.summary,
        88,
      );
      slide.heroSplit = {
        headline:
          distinctHeadline.toLowerCase() === slide.title.toLowerCase()
            ? isRtl ? "رؤية تحليلية مركزة" : "Focused Strategic Synthesis"
            : distinctHeadline,
        highlight: trimWords(topic.summary, 110),
        details: bullets.slice(1).length > 0 ? bullets.slice(1, 4) : bullets.slice(0, 3),
        cards: bullets.slice(0, 3).map((b, bi) => buildCrispCardFromPoint(b, "Point", bi, isRtl)),
      };
      slide.visualMesh = true;
    } else if (layout === "headline-hero") {
      const stat = topic.metrics[0]?.value || `0${idx + 1}`;
      const statLabel = topic.metrics[0]?.label || cleanHeadingTitle(topic.title, 28);
      slide.statCallout = {
        stat,
        label: statLabel,
        context: trimWords(topic.summary, 120),
        bullets: bullets.slice(0, 3),
      };
    }

    // Attach crisp content-driven diagram / visual ONLY where helpful and NOT text-only
    const needsDiagram =
      !textOnly &&
      (layout === "diagram-explainer" ||
        layout === "text-visual" ||
        layout === "image-led" ||
        (layout === "metrics" && (slide.metrics?.length || 0) >= 2));

    if (needsDiagram) {
      const diagramData = buildSlideDiagramData({
        title: slide.title,
        subtitle: slide.subtitle,
        concept: topic.visualConcept || slide.title,
        bullets: slide.bullets,
        cards: slide.cards || slide.bentoGrid,
        metrics: slide.metrics,
        processSteps: slide.processSteps,
        timeline: slide.timeline,
        leftColumn: slide.leftColumn,
        rightColumn: slide.rightColumn,
        preferredKind: topic.diagramKind,
      });

      const { svgContent, dataUrl } = renderDiagramDataToSvg({
        diagram: diagramData,
        accentColor: accent,
        isDark: slideSurface === "dark" || isDark,
        isRtl,
      });

      slide.diagramData = diagramData;
      slide.visual = {
        type: layout === "image-led" ? "image" : layout === "metrics" ? "chart" : "diagram",
        concept: topic.visualConcept || slide.title,
        diagramType:
          diagramData.kind === "bar-chart"
            ? "metrics-bars"
            : diagramData.kind === "concept-map"
              ? "architecture"
              : diagramData.kind,
        imagePrompt: buildPreciseVisualPrompt({
          slideTitle: slide.title,
          concept: topic.visualConcept,
          summary: topic.summary,
          domain,
        }),
        svgContent,
        imageUrl: dataUrl,
        caption: trimWords(slide.title, 64),
      };
    }

    slides.push(slide);
  });

  // FINAL SLIDE: High-Impact Conclusion
  if (slides.length < targetCount) {
    const conclusionNum = slides.length + 1;
    const rawConclusion = ensureScannableBullets(
      analysis.conclusionPoints,
      analysis.coreThesis,
      density === "concise" ? 3 : 4,
    );
    slides.push({
      id: `slide-${conclusionNum}`,
      slideNumber: conclusionNum,
      layout: "conclusion",
      title: isRtl ? "الخلاصة والتوصيات الرئيسية" : "Key Takeaways & Conclusions",
      subtitle: trimWords(analysis.coreThesis, 125),
      categoryTag: isRtl ? "الخلاصة" : "SUMMARY",
      bullets: rawConclusion,
      isRtl,
      visualMesh: true,
      slideSurface: "dark",
    });
  }

  return slides;
}

/**
 * Builds Stage 2 AI Design Director prompts consuming ONLY `DocumentAnalysis` + separated `directives`.
 */
export function buildAiDeckComposerPrompts(
  analysis: DocumentAnalysis,
  directives: PresentationDirectives,
): { systemPrompt: string; userPrompt: string } {
  const targetCount = directives.autoSlideCount
    ? analysis.recommendedSlideCount
    : directives.slideCount || analysis.recommendedSlideCount;

  return {
    systemPrompt: `You are a Principal Presentation Writer & Visual Design Director matching Gamma.app editorial standards.
STRICT RULES:
1. Write ONLY from the provided structured DocumentAnalysis. NEVER invent statistics, quotes, citations, or unrelated filler.
2. NEVER copy system instructions or prompt text into slides.
3. Choose purposeful, varied layouts across slides so no two consecutive slides look identical.
4. Keep copy crisp, scannable, and audience-calibrated — short headings (<65 chars), concrete bullets (<130 chars each), distinct card titles and descriptions.
5. Set "visual" ONLY when an image or diagram genuinely clarifies the concept (write a concrete subject-grounded imagePrompt and diagramKind).
6. Return ONLY valid JSON.`,
    userPrompt: `Compose a ${targetCount}-slide presentation from this analyzed document.

PRESENTATION CONTEXT:
- Title hint: ${directives.title || analysis.detectedTitle}
- Audience: ${directives.audience || "Informed readers"}
- Purpose/Style: ${directives.purpose || analysis.domain}
- Density: ${directives.density || "balanced"}
- Language: ${analysis.language}${analysis.isRtl ? " (RTL)" : ""}
- Visual mode: ${directives.visualPreference === "text-only" ? "NO visuals/diagrams (text-only layouts)" : "Include purposeful visuals/diagrams where helpful"}

ANALYZED DOCUMENT JSON:
${JSON.stringify(analysis).slice(0, 12000)}

Return JSON: { "slides": [ { "slideNumber": 1, "layout": "title | agenda | hero-split | three-card | bento-grid | two-column | metrics | timeline | process | diagram-explainer | image-led | headline-hero | quote | table | conclusion", "slideSurface": "dark | tinted | base", "title": "...", "subtitle": "...", "categoryTag": "...", "bullets": ["..."], "cards": [{"title":"...","description":"..."}], "metrics": [{"label":"...","value":"...","description":"..."}], "leftColumn": {"title":"...","bullets":["..."]}, "rightColumn": {"title":"...","bullets":["..."]}, "timeline": [{"phase":"...","title":"...","description":"..."}], "processSteps": [{"stepNumber":1,"title":"...","description":"..."}], "quote": {"text":"...","author":"..."}, "visual": {"type":"diagram | image | chart","concept":"...","diagramType":"pipeline | layers | cycle | matrix | metrics-bars | architecture","imagePrompt":"...","caption":"..."} } ] }`,
  };
}
