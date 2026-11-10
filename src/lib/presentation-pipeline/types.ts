import type { AssignmentMetadata } from "../assignment-types";
import type { RawThemeInput, SlideLayoutType } from "../presentation-theme";
import type { SlideElement } from "../slide-element-model";

export type DiagramKind =
  | "pipeline"
  | "layers"
  | "cycle"
  | "matrix"
  | "bar-chart"
  | "concept-map";

export type SlideSurface = "base" | "tinted" | "dark" | "accent";

export interface DiagramNode {
  label: string;
  detail?: string;
  value?: string;
  numericValue?: number;
}

export interface SlideDiagramData {
  kind: DiagramKind;
  title: string;
  subtitle?: string;
  nodes: DiagramNode[];
}

export interface PresentationDirectives {
  title?: string;
  purpose?: string;
  audience?: string;
  language?: string;
  density?: "concise" | "balanced" | "detailed";
  slideCount?: number;
  autoSlideCount?: boolean;
  includeAgenda?: boolean;
  visualPreference?: "diagrams" | "text-only";
  additionalInstructions?: string;
  assignmentMetadata?: AssignmentMetadata;
  theme?: RawThemeInput;
}

export interface SanitizedInputResult {
  valid: boolean;
  errorReason?: string;
  cleanSourceText: string;
  paragraphs: string[];
  wordCount: number;
  detectedLanguage: string;
  isRtl: boolean;
  strippedNoiseCount: number;
}

export interface ExtractedMetric {
  label: string;
  value: string;
  numericValue?: number;
  unit?: string;
  context?: string;
}

export interface ExtractedComparison {
  title: string;
  leftTitle: string;
  rightTitle: string;
  leftPoints: string[];
  rightPoints: string[];
}

export interface AnalyzedTopic {
  id: string;
  title: string;
  summary: string;
  keyFacts: string[];
  examples: string[];
  technicalTerms: Array<{ term: string; explanation: string }>;
  metrics: ExtractedMetric[];
  processSteps: Array<{ title: string; detail: string }>;
  timelineItems: Array<{ phase: string; title: string; detail: string }>;
  comparison?: ExtractedComparison;
  tableData?: { headers: string[]; rows: string[][] };
  quote?: { text: string; author?: string };
  recommendedVisual:
    | "diagram"
    | "image"
    | "chart"
    | "cards"
    | "bento"
    | "timeline"
    | "process"
    | "comparison"
    | "table"
    | "quote"
    | "none";
  visualConcept?: string;
  diagramKind?: DiagramKind;
  importance: number;
  sourceIndices: number[];
}

export interface DocumentAnalysis {
  subject: string;
  detectedTitle: string;
  domain:
    | "technology"
    | "science"
    | "business"
    | "academic"
    | "healthcare"
    | "finance"
    | "humanities"
    | "general";
  coreThesis: string;
  keyTakeaways: string[];
  keyFacts: string[];
  allMetrics: ExtractedMetric[];
  topics: AnalyzedTopic[];
  conclusionPoints: string[];
  audienceFit: string;
  language: string;
  isRtl: boolean;
  recommendedSlideCount: number;
  recommendedThemeId: string;
  totalSourceWords: number;
}

export interface QualityIssue {
  slideNumber: number;
  severity: "error" | "warning" | "fixed";
  code: string;
  message: string;
}

export interface QualityValidationResult<T = PipelineSlideItem> {
  passed: boolean;
  slides: T[];
  issues: QualityIssue[];
  fixedCount: number;
  layoutDiversityCount: number;
  uniqueLayouts: SlideLayoutType[];
}

export interface PipelineSlideItem {
  id: string;
  slideNumber: number;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  categoryTag?: string;
  bullets?: string[];
  assignmentMetadata?: AssignmentMetadata;
  sourceParagraphIndices?: number[];
  sourceExcerpt?: string;
  isQuestionOrInstruction?: boolean;
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
  cards?: Array<{ title: string; description: string; tag?: string }>;
  bentoGrid?: Array<{ title: string; description: string; tag?: string; icon?: string }>;
  heroSplit?: { headline: string; highlight: string; details: string[]; cards?: Array<{ title: string; description: string }> };
  sectionHeader?: { sectionNumber?: string; sectionTitle?: string };
  statCallout?: { stat: string; label: string; context: string; bullets?: string[] };
  metrics?: Array<{ label: string; value: string; description?: string }>;
  timeline?: Array<{ phase: string; title: string; description: string }>;
  processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
  quote?: { text: string; author?: string; role?: string };
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
  table?: {
    headers: string[];
    rows: string[][];
  };
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
  titleFontSize?: number;
  isTitleBold?: boolean;
  isSubtitleItalic?: boolean;
  textColor?: string;
  cardBgColor?: string;
  customBgColor?: string;
  elements?: SlideElement[];
}
