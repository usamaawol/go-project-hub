import {
  type SlideLayoutType,
  computeThemeTokens,
  type RawThemeInput,
} from "./presentation-theme";
import { renderSlideDeckToPptx } from "./presentation-renderer";
import type { AssignmentMetadata } from "./assignment-types";
import type { SlideElement } from "./slide-element-model";
import {
  analyzeSourceContent,
  composePresentationDeck,
  detectUnreadableExtraction,
  inferCleanDocumentTitle,
  sanitizePresentationInput,
  validateAndRepairDeck,
  type SlideDiagramData,
  type SlideSurface,
} from "./presentation-pipeline";

export type { SlideLayoutType, SlideElement };

export interface SlidePreviewItem {
  id: string;
  slideNumber: number;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  categoryTag?: string;
  bullets?: string[];
  // Assignment metadata for academic cover slides
  assignmentMetadata?: AssignmentMetadata;
  // Content accuracy & traceability
  sourceParagraphIndices?: number[];
  sourceExcerpt?: string;
  isQuestionOrInstruction?: boolean;
  // Comparison & Two-column
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
  // Three Pillar Cards
  cards?: Array<{ title: string; description: string; tag?: string }>;
  // Bento Grid (4 Quadrants / Feature Matrix)
  bentoGrid?: Array<{ title: string; description: string; tag?: string; icon?: string }>;
  // Hero Split (High-impact left highlight + right analytical cards)
  heroSplit?: {
    headline: string;
    highlight: string;
    details: string[];
    cards?: Array<{ title: string; description: string }>;
  };
  // Section Header divider metadata
  sectionHeader?: { sectionNumber?: string; sectionTitle?: string };
  // Stat Callout / Headline Hero (Massive statement or telemetry takeaway)
  statCallout?: { stat: string; label: string; context: string; bullets?: string[] };
  // Metrics & KPI telemetry
  metrics?: Array<{ label: string; value: string; description?: string }>;
  // Timeline & Phases
  timeline?: Array<{ phase: string; title: string; description: string }>;
  // Process & Steps
  processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
  // Quote & Standout Takeaway
  quote?: { text: string; author?: string; role?: string };
  // Gamma-Grade Modern Presentation Components
  calloutPill?: { text: string; icon?: string; type?: "info" | "warning" | "success" | "accent" };
  alertCallout?: { title?: string; text: string; icon?: string };
  quoteBox?: { text: string; citation?: string; badge?: string };
  workflowSteps?: Array<{ stepNumber: number; title: string; subtitle?: string; icon?: string }>;
  isRtl?: boolean;
  visualMesh?: boolean;
  slideSurface?: SlideSurface;
  diagramData?: SlideDiagramData;
  isManuallyEdited?: boolean;
  qualityNotes?: string[];
  // Table / Matrix
  table?: {
    headers: string[];
    rows: string[][];
  };
  // Visual Asset / Diagram / Graph / Picture
  visual?: {
    type: "diagram" | "illustration" | "chart" | "image" | "picture" | "graph";
    concept: string;
    diagramType?: "architecture" | "flowchart" | "layers" | "metrics-bars" | "venn" | "pipeline" | "cycle" | "matrix";
    imagePrompt?: string;
    imageUrl?: string;
    svgContent?: string;
    caption?: string;
  };
  notes?: string;
  // Interactive slide formatting overrides
  titleFontSize?: number;
  isTitleBold?: boolean;
  isSubtitleItalic?: boolean;
  textColor?: string;
  cardBgColor?: string;
  customBgColor?: string;
  elements?: SlideElement[];
}

export interface PresentationSessionData {
  id: string;
  title: string;
  purpose: string;
  density: "concise" | "balanced" | "detailed";
  audience?: string;
  language?: string;
  additionalInstructions?: string;
  presentationType?: "standard" | "assignment";
  assignmentMetadata?: AssignmentMetadata;
  theme: {
    id: string;
    name: string;
    category: string;
    kind: string;
    colors: { primary: string; accent: string; bg: string };
    fonts: string;
    tier: "free" | "pro";
  };
  typography: {
    fontFamily: string;
    fontSizePreset: "compact" | "standard" | "large" | "extra-large";
  };
  slideCount: number;
  slides: SlidePreviewItem[];
  fileSize: number;
  createdAt: number;
  expiresAt: number;
  secondsRemaining: number;
}

const STORAGE_PREFIX = "documind_presentation_session_";

/**
 * Detects a clean, presentation-ready title from raw input text.
 */
export function detectTitleFromText(text: string): string {
  if (!text || !text.trim()) return "";
  return inferCleanDocumentTitle(text);
}

/**
 * Orchestrates Input Sanitization -> Semantic Source Understanding -> Gamma Deck Composition ->
 * Geometric & Visual Quality Control to produce balanced, non-repetitive slides strictly grounded
 * in the user's actual source material.
 */
export function buildSlideDeckContent(
  title: string,
  rawContent: string,
  slideCount: number,
  density: "concise" | "balanced" | "detailed",
  purpose: string,
  assignmentMetadata?: AssignmentMetadata,
  options?: {
    includeAgenda?: boolean;
    visualPreference?: "diagrams" | "text-only";
    theme?: RawThemeInput;
    autoSlideCount?: boolean;
    audience?: string;
    language?: string;
  },
): SlidePreviewItem[] {
  const sourceInput = (rawContent || "").trim();

  // Fail honestly when extracted file text is corrupted/binary/unreadable
  if (sourceInput.length > 0) {
    const err = detectUnreadableExtraction(sourceInput);
    if (err) {
      throw new Error(err);
    }
  }

  const effectiveSource = sourceInput || (title || "Presentation Overview").trim();
  const sanitized = sanitizePresentationInput(effectiveSource);
  if (!sanitized.valid) {
    throw new Error(
      sanitized.errorReason ||
        "Source text could not be read cleanly. Please verify the uploaded file or paste readable text.",
    );
  }

  const analysis = analyzeSourceContent(sanitized, title);
  const draftSlides = composePresentationDeck(analysis, {
    title: title || analysis.detectedTitle,
    purpose,
    density,
    audience: options?.audience,
    language: options?.language,
    slideCount,
    autoSlideCount: options?.autoSlideCount,
    includeAgenda: options?.includeAgenda,
    visualPreference: options?.visualPreference,
    assignmentMetadata,
    theme: options?.theme,
  });

  const themeForValidation: RawThemeInput = options?.theme || {
    id: "executive-brief",
    name: "Executive Brief",
    category: "Business",
    kind: "business",
    colors: { primary: "#0F294A", accent: "#2563EB", bg: "#FAF8F5" },
    fonts: "Inter",
    tier: "free",
  };
  const tokens = computeThemeTokens(themeForValidation);
  const qc = validateAndRepairDeck(draftSlides, tokens, analysis);

  return (qc.slides as SlidePreviewItem[]).slice(0, draftSlides.length).map((s, idx) => ({
    ...s,
    slideNumber: idx + 1,
    id: `slide-${idx + 1}`,
  }));
}

// In-memory fallback if sessionStorage is unavailable
const memoryStore = new Map<string, PresentationSessionData>();

function pruneExpiredLocalSessions(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const item = JSON.parse(window.localStorage.getItem(key) || "{}");
          if (item.expiresAt && Date.now() > item.expiresAt) {
            toRemove.push(key);
          }
        } catch {
          toRemove.push(key);
        }
      }
    }
    for (const key of toRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Non-fatal if localStorage is restricted
  }
}

export function saveClientSession(session: PresentationSessionData): void {
  memoryStore.set(session.id, session);
  if (typeof window !== "undefined") {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(`${STORAGE_PREFIX}${session.id}`, JSON.stringify(session));
      }
    } catch (e) {
      console.warn("Could not save presentation to sessionStorage:", e);
    }

    try {
      if (window.localStorage) {
        pruneExpiredLocalSessions();
        window.localStorage.setItem(`${STORAGE_PREFIX}${session.id}`, JSON.stringify(session));
      }
    } catch (e) {
      console.warn("Could not save presentation to localStorage:", e);
    }
  }
}

export function getClientSession(sessionId: string): PresentationSessionData | null {
  if (memoryStore.has(sessionId)) {
    const item = memoryStore.get(sessionId)!;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(sessionId);
      return null;
    }
    return item;
  }

  if (typeof window !== "undefined") {
    if (window.sessionStorage) {
      try {
        const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
        if (stored) {
          const parsed: PresentationSessionData = JSON.parse(stored);
          if (Date.now() > parsed.expiresAt) {
            window.sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
          } else {
            memoryStore.set(sessionId, parsed);
            return parsed;
          }
        }
      } catch {
        // Ignored
      }
    }

    if (window.localStorage) {
      try {
        const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
        if (stored) {
          const parsed: PresentationSessionData = JSON.parse(stored);
          if (Date.now() > parsed.expiresAt) {
            window.localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
          } else {
            memoryStore.set(sessionId, parsed);
            return parsed;
          }
        }
      } catch {
        // Ignored
      }
    }
  }

  return null;
}

export function removeClientSession(sessionId: string): void {
  memoryStore.delete(sessionId);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage?.removeItem(`${STORAGE_PREFIX}${sessionId}`);
    } catch {
      // Ignored
    }
    try {
      window.localStorage?.removeItem(`${STORAGE_PREFIX}${sessionId}`);
    } catch {
      // Ignored
    }
  }
}

/**
 * Generates and triggers browser download of the genuine PowerPoint (.pptx) file
 * directly from the current (possibly manually edited) slides and design tokens.
 */
export async function generateAndDownloadClientPptx(
  session: PresentationSessionData,
): Promise<string> {
  const rawTheme: RawThemeInput = {
    id: session.theme.id,
    name: session.theme.name,
    category: session.theme.category,
    kind: session.theme.kind,
    colors: session.theme.colors,
    fonts: session.theme.fonts,
    tier: session.theme.tier,
  };

  const tokens = computeThemeTokens(rawTheme, session.typography);
  const pptx = await renderSlideDeckToPptx(session.title, session.purpose, session.slides, tokens);

  const cleanFilename = `${session.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "presentation"}.pptx`;
  await pptx.writeFile({ fileName: cleanFilename });
  return cleanFilename;
}

export interface SourceCoverageReport {
  totalSections: number;
  coveredSections: number;
  coveragePercentage: number;
  uncoveredTopics: string[];
}

/**
 * Validates that user source sections and key topics are faithfully represented in the generated deck.
 */
export function calculateSourceCoverage(
  rawContent: string,
  slides: SlidePreviewItem[],
): SourceCoverageReport {
  if (!rawContent || !rawContent.trim()) {
    return { totalSections: 0, coveredSections: 0, coveragePercentage: 100, uncoveredTopics: [] };
  }

  const lines = rawContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const potentialHeadings = lines
    .filter(
      (l) =>
        l.startsWith("#") ||
        (l.length < 80 && l.endsWith(":")) ||
        /^\d+[.)]\s+[A-Z]/.test(l) ||
        /^(Q\d+|Problem|Question|Task|Chapter|Section|Part)\b/i.test(l),
    )
    .map((h) =>
      h
        .replace(/^[-#*>\d.\s]+/, "")
        .replace(/[:.]+$/, "")
        .trim(),
    )
    .filter((h) => h.length > 2);

  if (potentialHeadings.length === 0) {
    return { totalSections: 1, coveredSections: 1, coveragePercentage: 100, uncoveredTopics: [] };
  }

  const allSlideContent = slides
    .map((s) =>
      [
        s.title,
        s.subtitle || "",
        ...(s.bullets || []),
        ...(s.leftColumn?.bullets || []),
        ...(s.rightColumn?.bullets || []),
        ...(s.cards?.map((c) => `${c.title} ${c.description}`) || []),
        ...(s.bentoGrid?.map((b) => `${b.title} ${b.description}`) || []),
      ]
        .join(" ")
        .toLowerCase(),
    )
    .join(" ");

  const uncovered: string[] = [];
  let covered = 0;

  for (const h of potentialHeadings) {
    const hWords = h
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const isCovered = hWords.length === 0 || hWords.some((w) => allSlideContent.includes(w));
    if (isCovered) {
      covered++;
    } else {
      uncovered.push(h);
    }
  }

  const coveragePercentage = Math.round((covered / potentialHeadings.length) * 100);

  return {
    totalSections: potentialHeadings.length,
    coveredSections: covered,
    coveragePercentage,
    uncoveredTopics: uncovered,
  };
}
