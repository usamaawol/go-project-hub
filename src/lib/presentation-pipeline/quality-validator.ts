import { validateBase64DataUrl, isValidSvgString } from "../image-verifier";
import type { SlideLayoutType, ThemeTokens } from "../presentation-theme";
import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH, convertSlideToElements, type SlideElement } from "../slide-element-model";
import { cleanHeadingTitle } from "./content-analyzer";
import { buildCrispCardFromPoint } from "./deck-writer";
import { buildSlideDiagramData, renderDiagramDataToSvg } from "./diagram-synthesizer";
import type {
  DocumentAnalysis,
  PipelineSlideItem,
  QualityIssue,
  QualityValidationResult,
} from "./types";

const LEAKED_INSTRUCTION_SNIPPETS: RegExp[] = [
  /RETURN\s+(?:ONLY\s+)?VALID\s+JSON/i,
  /DO\s+NOT\s+(?:OUTPUT|INCLUDE)\s+MARKDOWN\s+FENCES/i,
  /SYSTEM\s+(?:PROMPT|INSTRUCTIONS)\s*:/i,
  /ASSIGNMENT\s+INFORMATION\s*[—:-]\s*ALL\s+METADATA\s+FIELDS\s+OPTIONAL/i,
];

function tokenizeForSimilarity(text: string): Set<string> {
  const clean = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return new Set(clean);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  return inter / (a.size + b.size - inter);
}

/**
 * Estimates whether text fits cleanly inside an element box without vertical clipping.
 */
function estimateTextFitsBox(el: SlideElement): boolean {
  if (!el.text || el.type !== "text") return true;
  const pt = el.fontSize || 14;
  // At 1333px width = 13.333 in: 1pt = 1.3889 px; avg char width ~0.54 * ptPx
  const ptPx = pt * 1.35;
  const avgCharW = Math.max(5.5, ptPx * 0.54);
  const charsPerLine = Math.max(8, Math.floor((el.width - 14) / avgCharW));
  const rawParagraphs = el.text.split("\n");
  let lines = 0;
  for (const p of rawParagraphs) {
    lines += Math.max(1, Math.ceil(p.trim().length / charsPerLine));
  }
  const lineHeightPx = ptPx * (el.lineHeight || 1.28);
  const neededH = lines * lineHeightPx + 8;
  return neededH <= el.height + 10;
}

/**
 * Computes intersection ratio relative to the smaller rectangle.
 */
function rectOverlapRatio(a: SlideElement, b: SlideElement): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const inter = xOverlap * yOverlap;
  if (inter <= 0) return 0;
  const minArea = Math.max(1, Math.min(a.width * a.height, b.width * b.height));
  return inter / minArea;
}

function countSlideBodyItems(slide: PipelineSlideItem): number {
  return (
    (slide.bullets?.length || 0) +
    (slide.cards?.length || 0) +
    (slide.bentoGrid?.length || 0) +
    (slide.timeline?.length || 0) +
    (slide.processSteps?.length || 0) +
    (slide.leftColumn?.bullets?.length || 0) +
    (slide.rightColumn?.bullets?.length || 0) +
    (slide.metrics?.length || 0) +
    (slide.table?.rows?.length || 0) +
    (slide.heroSplit?.cards?.length || slide.heroSplit?.details?.length || 0) +
    (slide.quote?.text ? 1 : 0) +
    (slide.statCallout?.stat ? 1 : 0)
  );
}

/**
 * Checks every slide semantically AND renders geometric element bounds via `convertSlideToElements`
 * to fix broken images, clipped/overlapping text, duplicate slides, empty voids, and instruction leaks
 * before presenting or exporting the deck.
 */
export function validateAndRepairDeck(
  slides: PipelineSlideItem[],
  tokens: ThemeTokens,
  analysis?: DocumentAnalysis,
): QualityValidationResult<PipelineSlideItem> {
  const issues: QualityIssue[] = [];
  let fixedCount = 0;

  // Preserve manually edited slides untouched vertically unless invalid visual URL exists
  const repaired: PipelineSlideItem[] = slides.map((orig, idx) => {
    const slide: PipelineSlideItem = { ...orig, slideNumber: idx + 1 };

    // 1. Clean any stray leaked instruction text & normalize duplicated "(Cont.)" chains
    if (slide.title) {
      let cleanT = slide.title.replace(/(?:\s*\(Cont\.\)){2,}/gi, " (Continued)").trim();
      for (const rx of LEAKED_INSTRUCTION_SNIPPETS) {
        if (rx.test(cleanT)) {
          cleanT = cleanT.replace(rx, "").trim();
          issues.push({
            slideNumber: slide.slideNumber,
            severity: "fixed",
            code: "INSTRUCTION_STRIP",
            message: `Removed leaked instruction marker from slide ${slide.slideNumber} title.`,
          });
          fixedCount++;
        }
      }
      if (!cleanT) {
        cleanT = analysis?.topics[idx % Math.max(1, analysis.topics.length)]?.title || `Section ${slide.slideNumber}`;
      }
      slide.title = idx === 0 ? cleanT.slice(0, 72) : cleanHeadingTitle(cleanT, 72);
    }

    if (slide.bullets) {
      const cleanedBullets = slide.bullets
        .map((b) => {
          let out = b.trim();
          for (const rx of LEAKED_INSTRUCTION_SNIPPETS) out = out.replace(rx, "").trim();
          return out;
        })
        .filter((b) => b.length >= 2);
      if (cleanedBullets.length !== slide.bullets.length) {
        slide.bullets = cleanedBullets;
        fixedCount++;
      }
    }

    // 2. Repair duplicated card titles == descriptions or malformed "prefix | prefix"
    if (slide.cards) {
      slide.cards = slide.cards.map((c, ci) => {
        const titleClean = (c.title || "").trim();
        const descClean = (c.description || "").trim();
        if (!descClean || titleClean.toLowerCase() === descClean.toLowerCase() || descClean.includes(" | ")) {
          fixedCount++;
          return buildCrispCardFromPoint(descClean || titleClean, "Key Point", ci, Boolean(slide.isRtl));
        }
        return c;
      });
    }
    if (slide.bentoGrid) {
      slide.bentoGrid = slide.bentoGrid.map((b, bi) => {
        const titleClean = (b.title || "").trim();
        const descClean = (b.description || "").trim();
        if (!descClean || titleClean.toLowerCase() === descClean.toLowerCase() || descClean.includes(" | ")) {
          fixedCount++;
          return buildCrispCardFromPoint(descClean || titleClean, "Dimension", bi, Boolean(slide.isRtl));
        }
        return b;
      });
    }

    // 3. Validate attached visual / image — NEVER allow broken, invisible, or malformed images
    if (slide.visual) {
      let validImage = false;
      if (slide.visual.imageUrl) {
        const res = validateBase64DataUrl(slide.visual.imageUrl);
        if (res.valid) {
          validImage = true;
        }
      } else if (slide.visual.svgContent && isValidSvgString(slide.visual.svgContent)) {
        validImage = true;
      }

      if (!validImage) {
        // Fallback smoothly to a valid content-driven diagram SVG OR remove broken container
        const hasDiagramSource =
          (slide.bullets && slide.bullets.length > 0) ||
          (slide.cards && slide.cards.length > 0) ||
          (slide.metrics && slide.metrics.length >= 2);

        if (hasDiagramSource) {
          const diagramData =
            slide.diagramData ||
            buildSlideDiagramData({
              title: slide.title,
              subtitle: slide.subtitle,
              bullets: slide.bullets,
              cards: slide.cards || slide.bentoGrid,
              metrics: slide.metrics,
              processSteps: slide.processSteps,
              timeline: slide.timeline,
            });
          const svg = renderDiagramDataToSvg({
            diagram: diagramData,
            accentColor: tokens.accent,
            isDark: slide.slideSurface === "dark" || tokens.isDark,
            isRtl: slide.isRtl,
          });
          slide.diagramData = diagramData;
          slide.visual = {
            ...slide.visual,
            type: "diagram",
            svgContent: svg.svgContent,
            imageUrl: svg.dataUrl,
          };
          issues.push({
            slideNumber: slide.slideNumber,
            severity: "fixed",
            code: "REPAIRED_BROKEN_IMAGE_TO_DIAGRAM",
            message: `Replaced unverifiable/missing image on slide ${slide.slideNumber} with source-derived diagram.`,
          });
          fixedCount++;
        } else {
          delete slide.visual;
          if (slide.layout === "image-led" || slide.layout === "text-visual") {
            slide.layout = "content";
          }
          issues.push({
            slideNumber: slide.slideNumber,
            severity: "fixed",
            code: "REMOVED_BROKEN_IMAGE",
            message: `Removed invalid image container on slide ${slide.slideNumber}.`,
          });
          fixedCount++;
        }
      }
    } else if ((slide.layout === "image-led" || slide.layout === "text-visual" || slide.layout === "diagram-explainer") && !slide.diagramData) {
      // A visual layout with ZERO visual AND zero diagramData would leave an empty visual void!
      slide.layout = (slide.cards?.length || 0) >= 3 ? "three-card" : "content";
      issues.push({
        slideNumber: slide.slideNumber,
        severity: "fixed",
        code: "EMPTY_VISUAL_SLOT_DOWNGRADED",
        message: `Switched visual-less "${orig.layout}" slide ${slide.slideNumber} to clean "${slide.layout}" composition.`,
      });
      fixedCount++;
    }

    // 4. Prevent empty meaningless non-cover slides
    if (
      slide.layout !== "title" &&
      slide.layout !== "assignment-cover" &&
      slide.layout !== "section-header" &&
      countSlideBodyItems(slide) === 0
    ) {
      const recoveredBullets: string[] = [];
      if (slide.subtitle && slide.subtitle !== slide.title) {
        recoveredBullets.push(slide.subtitle);
      }
      if (analysis && analysis.keyFacts.length > 0) {
        recoveredBullets.push(analysis.keyFacts[idx % analysis.keyFacts.length]!);
      }
      if (recoveredBullets.length > 0) {
        slide.bullets = recoveredBullets;
        fixedCount++;
        issues.push({
          slideNumber: slide.slideNumber,
          severity: "fixed",
          code: "EMPTY_SLIDE_RECOVERED",
          message: `Restored missing body content on slide ${slide.slideNumber} from source context.`,
        });
      }
    }

    return slide;
  });

  // 5. Detect near-duplicate non-title slides & break consecutive identical layouts
  for (let i = 1; i < repaired.length - 1; i++) {
    const curr = repaired[i]!;
    const prev = repaired[i - 1]!;
    if (curr.isManuallyEdited) continue;

    // Layout diversity check (never repeat same middle content layout consecutively)
    if (
      curr.layout === prev.layout &&
      curr.layout !== "section-header" &&
      curr.layout !== "agenda"
    ) {
      if (curr.layout === "content" && (curr.bullets?.length || 0) >= 3) {
        curr.cards = curr.bullets!.slice(0, 3).map((b, bi) => buildCrispCardFromPoint(b, "Point", bi, Boolean(curr.isRtl)));
        curr.layout = "three-card";
        fixedCount++;
      } else if (curr.layout === "three-card" && (curr.bullets?.length || 0) >= 4) {
        curr.bentoGrid = curr.bullets!.slice(0, 4).map((b, bi) => buildCrispCardFromPoint(b, "Factor", bi, Boolean(curr.isRtl)));
        curr.layout = "bento-grid";
        fixedCount++;
      } else if (curr.layout === "three-card" && (curr.bullets?.length || 0) >= 2) {
        curr.heroSplit = {
          headline: curr.bullets![0]!,
          highlight: curr.subtitle || curr.bullets![0]!,
          details: curr.bullets!.slice(1),
          cards: curr.cards,
        };
        curr.layout = "hero-split";
        fixedCount++;
      }
    }

    // Duplicate content check vs previous slide
    if (curr.layout !== "agenda" && prev.layout !== "agenda" && curr.layout !== "title" && prev.layout !== "title") {
      const sim = jaccardSimilarity(
        tokenizeForSimilarity(`${prev.title} ${(prev.bullets || []).join(" ")}`),
        tokenizeForSimilarity(`${curr.title} ${(curr.bullets || []).join(" ")}`),
      );
      if (sim > 0.78 && analysis && analysis.topics.length > 1) {
        const replacementTopic = analysis.topics.find(
          (t) =>
            !repaired.some(
              (s) => s.title.toLowerCase() === cleanHeadingTitle(t.title, 72).toLowerCase(),
            ),
        );
        if (replacementTopic) {
          curr.title = cleanHeadingTitle(replacementTopic.title, 66);
          curr.subtitle = replacementTopic.summary;
          curr.bullets = replacementTopic.keyFacts.slice(0, 4);
          curr.cards = replacementTopic.keyFacts.slice(0, 3).map((b, bi) =>
            buildCrispCardFromPoint(b, "Detail", bi, Boolean(curr.isRtl)),
          );
          curr.layout = curr.cards.length >= 3 ? "three-card" : "content";
          issues.push({
            slideNumber: curr.slideNumber,
            severity: "fixed",
            code: "DEDUPLICATED_SLIDE",
            message: `Replaced repetitive slide ${curr.slideNumber} with unrepresented source section "${curr.title}".`,
          });
          fixedCount++;
        }
      }
    }
  }

  // 6. Geometric Element Render Inspection (bounds, overlap, clipping, void check)
  for (let i = 0; i < repaired.length; i++) {
    const slide = repaired[i]!;
    if (slide.isManuallyEdited) continue;

    let elements = convertSlideToElements(slide as any, tokens);

    // Inspect bounds & estimated text overflow
    let hasClippingOrBoundsIssue = false;
    for (const el of elements) {
      if (
        el.x < -2 ||
        el.y < -2 ||
        el.x + el.width > SLIDE_CANVAS_WIDTH + 4 ||
        el.y + el.height > SLIDE_CANVAS_HEIGHT + 4
      ) {
        hasClippingOrBoundsIssue = true;
      }
      if (el.type === "text" && el.role === "title" && !estimateTextFitsBox(el)) {
        // Auto-adjust title font slightly instead of letting LibreOffice/PowerPoint wrap onto subtitle!
        slide.titleFontSize = Math.max(20, (el.fontSize || tokens.fontSizes.slideTitle) - 4);
        fixedCount++;
        issues.push({
          slideNumber: slide.slideNumber,
          severity: "fixed",
          code: "TITLE_FONT_SCALED",
          message: `Scaled title font size on slide ${slide.slideNumber} to prevent wrapping collision.`,
        });
      }
    }

    // Recompute if font size scaled
    if (slide.titleFontSize && !slide.elements?.length) {
      elements = convertSlideToElements(slide as any, tokens);
    }

    // Check pairwise text-on-text collisions
    const textEls = elements.filter((e) => e.type === "text" && (e.text || "").trim().length > 0);
    let hasTextOverlap = false;
    for (let a = 0; a < textEls.length; a++) {
      for (let b = a + 1; b < textEls.length; b++) {
        if (rectOverlapRatio(textEls[a]!, textEls[b]!) > 0.22) {
          hasTextOverlap = true;
          break;
        }
      }
      if (hasTextOverlap) break;
    }

    if (hasTextOverlap || hasClippingOrBoundsIssue) {
      // Trim overly verbose bullets cleanly so cards/columns fit within geometry
      if (slide.bullets && slide.bullets.length > 4) {
        slide.bullets = slide.bullets.slice(0, 4);
        fixedCount++;
      }
      issues.push({
        slideNumber: slide.slideNumber,
        severity: "warning",
        code: hasTextOverlap ? "TEXT_OVERLAP_ADJUSTED" : "BOUNDS_ADJUSTED",
        message: `Tightened slide ${slide.slideNumber} element density to eliminate clipping/overlap.`,
      });
    }

    // Check excessive blank void on body slides
    if (slide.layout !== "title" && slide.layout !== "section-header" && slide.layout !== "assignment-cover") {
      const contentEls = elements.filter((e) => e.role !== "footer" && e.role !== "shape");
      const totalBoxArea = contentEls.reduce((acc, el) => acc + el.width * el.height, 0);
      const canvasArea = SLIDE_CANVAS_WIDTH * SLIDE_CANVAS_HEIGHT;
      if (contentEls.length <= 1 || totalBoxArea / canvasArea < 0.14) {
        issues.push({
          slideNumber: slide.slideNumber,
          severity: "warning",
          code: "SPARSE_SLIDE_LAYOUT",
          message: `Slide ${slide.slideNumber} ("${slide.title}") has low visual fill density.`,
        });
      }
    }
  }

  const uniqueLayouts = Array.from(new Set(repaired.map((s) => s.layout as SlideLayoutType)));
  const errorCount = issues.filter((is) => is.severity === "error").length;

  return {
    passed: errorCount === 0,
    slides: repaired,
    issues,
    fixedCount,
    layoutDiversityCount: uniqueLayouts.length,
    uniqueLayouts,
  };
}
