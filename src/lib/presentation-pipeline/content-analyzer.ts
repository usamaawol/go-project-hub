import type {
  AnalyzedTopic,
  DiagramKind,
  DocumentAnalysis,
  ExtractedComparison,
  ExtractedMetric,
  SanitizedInputResult,
} from "./types";

const INTRO_FRAGMENT_PATTERNS: RegExp[] = [
  /^(?:these|those|the following|such|many|most|some|several)\s+(?:tasks|steps|systems|methods|features|examples|points|components)\b.*$/i,
  /^at\s+a\s+(?:high|macro|broad)\s+level\b.*$/i,
  /^upon\s+completing\s+this\b.*$/i,
  /^(?:for\s+example|for\s+instance|in\s+addition|furthermore|moreover|however|specifically)\s*[,:]?$/i,
  /^(?:below|above)\s+(?:is|are)\s+.*$/i,
  /^(?:include|including|such\s+as)\s*:?\s*$/i,
];

/**
 * Checks whether a candidate line is an incomplete sentence lead-in rather than a true heading.
 */
export function isIntroLeadInFragment(line: string): boolean {
  const clean = line.replace(/[:.\s]+$/, "").trim();
  if (!clean || clean.length < 3) return true;
  if (INTRO_FRAGMENT_PATTERNS.some((re) => re.test(clean))) return true;
  if (/\b(?:can include|will be able to|include|follow|consist of|are as follows|shown below)\s*$/i.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Strips markdown decoration, excessive punctuation, and numbering prefixes from headings
 * while preserving natural casing and complete words.
 */
export function cleanHeadingTitle(raw: string, maxLen = 72): string {
  let cleaned = (raw || "")
    .replace(/[\uFE00-\uFE0F]/g, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\s]+/u, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\*{1,2}([^*]+)\*{1,2}$/, "$1")
    .replace(/^(?:part|chapter|section|module)\s+\d+(?:\.\d+)?\s*[—–:-]?\s*/i, "")
    .replace(/^\d+(?:\.\d+){0,2}[.)]?\s+/, "")
    .replace(/([A-Z]{3,})([A-Z][a-z]+)\b/g, "$1 $2")
    .replace(/[:;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize SHOUTY ALL-CAPS headers cleanly into Title Case while preserving short acronyms (e.g., AI, OOP, DNA)
  const words = cleaned.split(" ").filter(Boolean);
  if (
    cleaned.length > 10 &&
    words.length >= 2 &&
    cleaned === cleaned.toUpperCase() &&
    /[A-Z]/.test(cleaned)
  ) {
    cleaned = words
      .map((w) =>
        w.length <= 4 && /^[A-Z0-9-]+$/.test(w)
          ? w
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      )
      .join(" ");
  }

  // Capitalize first letter gently for short normalized labels (e.g., "data or input" -> "Data or Input")
  if (cleaned && /^[a-z]/.test(cleaned) && words.length <= 5) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  if (cleaned.length <= maxLen) return cleaned;

  let out = "";
  for (const w of cleaned.split(" ")) {
    if (!out) out = w;
    else if (out.length + 1 + w.length <= maxLen - 1) out += ` ${w}`;
    else break;
  }
  return out || cleaned.slice(0, maxLen);
}

/**
 * Builds a concise natural title from source text (used as fallback when caller hasn't given a strong title).
 */
export function inferCleanDocumentTitle(cleanSourceText: string, hintTitle?: string): string {
  const cleanHint = (hintTitle || "")
    .replace(/\.(?:pdf|docx?|txt|md|pptx?)$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    cleanHint &&
    cleanHint.length >= 4 &&
    !/^(?:untitled|new presentation|document|presentation|short note)$/i.test(cleanHint)
  ) {
    return cleanHeadingTitle(cleanHint, 72);
  }

  const lines = cleanSourceText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isIntroLeadInFragment(l));

  if (lines.length === 0) return cleanHint || "Presentation Overview";

  // 1. Check explicit metadata/proposal title field near the top (e.g. "1.1 Project Title\nStudent Management System...")
  for (let i = 0; i < Math.min(8, lines.length - 1); i++) {
    const cur = cleanHeadingTitle(lines[i]!, 80).toLowerCase();
    if (/^(?:project\s+title|document\s+title|assignment\s+title|title|subject|topic)$/.test(cur)) {
      return cleanHeadingTitle(lines[i + 1]!, 72);
    }
    const inlineColon = lines[i]!.match(/^(?:title|topic|subject|project title)\s*[:：]\s*(.{4,80})$/i);
    if (inlineColon) {
      return cleanHeadingTitle(inlineColon[1]!, 72);
    }
  }

  // 2. Prefer explicit markdown H1 near the start
  for (const line of lines.slice(0, 6)) {
    if (/^#{1,2}\s+/.test(line)) {
      return cleanHeadingTitle(line, 68);
    }
  }

  // 3. Skip generic boilerplate series/proposal/brand-watermark headers if a concrete descriptive title immediately follows
  const isGenericBannerLine = (ln: string) => {
    const c = cleanHeadingTitle(ln, 90);
    return (
      /^(?:project\s+proposal|study\s+notes(?:\s+series)?|higher\s+education.*|course\s+notes|lecture\s+notes|course\s+code\b.*|source\s+textbook\s+metadata\b.*|chapter\s+\d+|topic\s+\d+(?:\.\d+)?\b.*|introduction|overview|assignment)$/i.test(
        c,
      ) || /^(?:course\s+code|topic\s+\d+\.\d+|source\s+textbook)\s*:/i.test(ln.trim())
    );
  };

  const hasDescriptiveCandidateNearby = lines
    .slice(0, 8)
    .some(
      (other) =>
        other.length <= 76 &&
        other.split(/\s+/).length >= 3 &&
        !/[.!?]$/.test(other) &&
        !isGenericBannerLine(other) &&
        !(other === other.toUpperCase() && other.split(/\s+/).length === 1),
    );

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const candidate = lines[i]!;
    const isSingleWordAllCapsBadge =
      candidate.split(/\s+/).length === 1 &&
      candidate === candidate.toUpperCase() &&
      candidate.length <= 24 &&
      hasDescriptiveCandidateNearby;
    if (
      candidate.length <= 76 &&
      !/[.!?]$/.test(candidate) &&
      !isGenericBannerLine(candidate) &&
      !isSingleWordAllCapsBadge
    ) {
      return cleanHeadingTitle(candidate, 72);
    }
  }

  const first = lines[0]!;
  if (first.length <= 74 && !/[.!?]$/.test(first)) {
    return cleanHeadingTitle(first, 68);
  }

  const firstClause = first.split(/[.!?;]/)[0] || first;
  return cleanHeadingTitle(firstClause, 62);
}

/**
 * Classifies subject domain and picks a matching vibrant theme ID from the catalog
 * (never recommending grayscale defaults).
 */
export function classifySourceDomain(
  cleanText: string,
  hintTitle?: string,
): { domain: DocumentAnalysis["domain"]; recommendedThemeId: string } {
  const sample = `${hintTitle || ""} ${cleanText.slice(0, 8000)}`.toLowerCase();

  const scores: Array<{
    domain: DocumentAnalysis["domain"];
    themeId: string;
    patterns: RegExp[];
  }> = [
    {
      domain: "technology",
      themeId: "neural-grid",
      patterns: [
        /\b(api|microservice|kubernetes|docker|algorithm|neural|consensus|distributed|database|software|oop|object-oriented|programming|java|python|polymorphism|inheritance|abstraction|encapsulation|compiler|latency|protocol|byzantine|raft|paxos|architecture|encryption|cybersecurity)\b/g,
      ],
    },
    {
      domain: "healthcare",
      themeId: "clinical-trial-deck",
      patterns: [
        /\b(patient|clinical|diagnosis|therapy|treatment|oncology|epidemiology|vaccine|pathology|medical|hospital|disease|symptom|pharmacology)\b/g,
      ],
    },
    {
      domain: "science",
      themeId: "findings-column",
      patterns: [
        /\b(hypothesis|experiment|photosynthesis|chloroplast|quantum|molecule|atom|genetics|dna|crispr|physics|biology|chemistry|ecology|empirical|regression|theorem|thermodynamics)\b/g,
      ],
    },
    {
      domain: "academic",
      themeId: "classroom-bright",
      patterns: [
        /\b(course|syllabus|lecture|student|curriculum|assignment|semester|thesis|faculty|pedagogy|chapter|module|learning|classroom|textbook|geography|horn of africa|freshman|region|topography|location|islam|quran|hadith|القرآن|الحديث|العلم)\b/g,
      ],
    },
    {
      domain: "finance",
      themeId: "commercial-banking-advisory",
      patterns: [
        /\b(ebitda|arr|roi|valuation|portfolio|fiscal|revenue|margin|capital|liquidity|equity|credit|investment|audit|quarterly|forecast)\b/g,
      ],
    },
    {
      domain: "business",
      themeId: "executive-brief",
      patterns: [
        /\b(strategy|stakeholder|market|customer|retention|operations|roadmap|growth|enterprise|adoption|governance|workflow|supply chain|kpi)\b/g,
      ],
    },
    {
      domain: "humanities",
      themeId: "history-primary-sources",
      patterns: [
        /\b(history|philosophy|literature|ethics|culture|society|civilization|historical|treaty|constitution|heritage)\b/g,
      ],
    },
  ];

  let bestDomain: DocumentAnalysis["domain"] = "business";
  let bestThemeId = "executive-brief";
  let bestScore = 0;

  for (const candidate of scores) {
    let score = 0;
    for (const re of candidate.patterns) {
      const m = sample.match(re);
      if (m) score += m.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = candidate.domain;
      bestThemeId = candidate.themeId;
    }
  }

  return { domain: bestDomain, recommendedThemeId: bestThemeId };
}

/**
 * Extracts ONLY real quantitative figures grounded in source text.
 * Rejects calendar years (e.g. 2026), step/section numbering, and stray punctuation integers.
 */
export function extractRealMetrics(text: string): ExtractedMetric[] {
  const metrics: ExtractedMetric[] = [];
  const seenLabels = new Set<string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[-•*]\s+/, "").trim();
    // Pattern 1: "Label: 42% ..." or "Latency reduction: -34%" or "Uptime: 99.8%" or "Latitudinal Extent: 3°N"
    const colonMatch = line.match(
      /^([A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF][A-Za-z0-9À-ÖØ-öø-ÿ\u0600-\u06FF\s/&()-]{2,42}):\s*([<>~±+-]?\s*[$€£]?\s*\d[\d,.]*(?:\.\d+)?\s*(?:°[NSEW]?|%|ms|s|sec|min|hr|hrs|days?|x|X|M|B|K|MB|GB|TB|req\/sec|users?|themes?|slides?|km²|km2|km|kg)?\+?)\b(.*)$/i,
    );
    if (colonMatch) {
      const label = colonMatch[1]!.trim();
      const rawVal = colonMatch[2]!.trim();
      const value = rawVal.replace(/\.$/, "");
      const rest = (colonMatch[3] || "").trim().replace(/^[-—–,]\s*/, "");
      // Reject step/phase/year/publication metadata lines
      if (
        !/^(?:step|phase|stage|chapter|part|section|module|year|publication\s+year|edition|copyright|figure|table|page)\b/i.test(label) &&
        !/^(?:19|20)\d{2}$/.test(value)
      ) {
        const key = label.toLowerCase();
        if (!seenLabels.has(key)) {
          seenLabels.add(key);
          const numMatch = value.match(/-?\d[\d,.]*/);
          metrics.push({
            label,
            value,
            numericValue: numMatch ? parseFloat(numMatch[0].replace(/,/g, "")) : undefined,
            context: rest || line,
          });
        }
        continue;
      }
    }

    // Pattern 2: Inline percentage / currency / unit telemetry ("ARR Growth +42% YoY", "99.95% uptime SLA", "$4.5M savings")
    const inlineMatches = line.matchAll(
      /([+-]?\$\s*\d[\d,.]*(?:\.\d+)?\s*[MBK]?|[+-]?\d[\d,.]*(?:\.\d+)?\s*(?:%|ms|req\/sec|GB|TB|MB))\s+(?:in\s+|of\s+|for\s+)?([A-Za-z][A-Za-z0-9\s-]{2,34})/gi,
    );
    for (const m of inlineMatches) {
      const value = m[1]!.replace(/\s+/g, "");
      const rawCaptured = m[2]!
        .replace(/^(?:its|their|our|the|this|that)\s+/i, "")
        .replace(/\s+(?:is|are|was|were|has|have|had|can|will|should)\b.*$/i, "")
        .trim();
      const label = cleanHeadingTitle(rawCaptured, 32);
      const key = label.toLowerCase();
      if (
        label.length >= 3 &&
        !/^(?:or|and|with|that|this|from|the|its|their)$/i.test(label) &&
        !seenLabels.has(key)
      ) {
        seenLabels.add(key);
        const numMatch = value.match(/-?\d[\d,.]*/);
        metrics.push({
          label,
          value,
          numericValue: numMatch ? parseFloat(numMatch[0].replace(/,/g, "")) : undefined,
          context: line,
        });
      }
      if (metrics.length >= 6) break;
    }
    if (metrics.length >= 6) break;
  }

  return metrics.slice(0, 6);
}

/**
 * Extracts explicit contrast/comparison pairs ("A vs B", "Old vs Modern", "قديماً ... اليوم ...").
 */
function extractComparisonFromText(title: string, text: string): ExtractedComparison | undefined {
  // Pattern 1: Arabic classic vs modern pattern (e.g., "قديماً: ... \n اليوم: ...")
  const oldAr = text.match(/قدي[مً]{1,2}ا\s*[:：]\s*(.+)/);
  const newAr = text.match(/(?:اليوم|حديث[اً]{1,2})\s*[:：]\s*(.+)/);
  if (oldAr && newAr) {
    return {
      title,
      leftTitle: "قديماً",
      rightTitle: "اليوم",
      leftPoints: oldAr[1]!.split(/[،,؛\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 4),
      rightPoints: newAr[1]!.split(/[،,؛\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 4),
    };
  }

  // Pattern 2: "A vs B" / "Pros vs Cons" / "Before vs After"
  const vsTitle = title.match(/^(.{3,36}?)\s+(?:vs\.?|versus|compared\s+to)\s+(.{3,36})$/i);
  const lines = text.split("\n").map((l) => l.replace(/^[-•*]\s+/, "").trim()).filter(Boolean);
  if (vsTitle) {
    const leftTitle = cleanHeadingTitle(vsTitle[1]!, 32);
    const rightTitle = cleanHeadingTitle(vsTitle[2]!, 32);
    const leftPoints: string[] = [];
    const rightPoints: string[] = [];

    for (const ln of lines) {
      const lower = ln.toLowerCase();
      if (lower.includes(rightTitle.toLowerCase().split(" ")[0]!) && rightPoints.length < 4 && !lower.startsWith(leftTitle.toLowerCase().split(" ")[0]!)) {
        rightPoints.push(ln);
      } else if (leftPoints.length < 4) {
        leftPoints.push(ln);
      } else if (rightPoints.length < 4) {
        rightPoints.push(ln);
      }
    }

    if (leftPoints.length > 0 && rightPoints.length > 0) {
      return { title, leftTitle, rightTitle, leftPoints, rightPoints };
    }
  }

  // Pattern 3: Explicit "Advantages: ... Disadvantages: ..." / "Before: ... After: ..."
  const leftLabeled = lines.filter((l) => /^(?:pros|advantages|benefits|strengths|before|legacy|traditional)\s*:/i.test(l));
  const rightLabeled = lines.filter((l) => /^(?:cons|disadvantages|drawbacks|risks|limitations|after|modern)\s*:/i.test(l));
  if (leftLabeled.length > 0 && rightLabeled.length > 0) {
    return {
      title,
      leftTitle: leftLabeled[0]!.split(":")[0]!.trim(),
      rightTitle: rightLabeled[0]!.split(":")[0]!.trim(),
      leftPoints: leftLabeled.map((l) => l.replace(/^[^:]+:\s*/, "").trim()),
      rightPoints: rightLabeled.map((l) => l.replace(/^[^:]+:\s*/, "").trim()),
    };
  }

  return undefined;
}

/**
 * Extracts chronological timeline entries when present.
 */
function extractTimelineItems(text: string): Array<{ phase: string; title: string; detail: string }> {
  // Never misinterpret MCQ exam questions ("Q2", "Q3", "Q4") or "Correct Answer = B" as business quarter timelines
  if (/correct answer|self-assessment|\bmcq\b/i.test(text)) {
    return [];
  }
  const items: Array<{ phase: string; title: string; detail: string }> = [];
  const lines = text.split("\n").map((l) => l.replace(/^[-•*]\s+/, "").trim()).filter(Boolean);

  for (const ln of lines) {
    const m = ln.match(/^((?:Phase|Stage|Q[1-4]|Week|Month|Milestone|Year)\s*\d*(?:\s*\d{4})?|\d{4}(?:\s*[-–]\s*\d{4})?)\s*[:–—-]\s*(.+)$/i);
    if (m) {
      const phase = m[1]!.trim();
      const body = m[2]!.trim();
      if (/^Q[1-4]$/i.test(phase) && /\?$/.test(body)) continue;
      const colon = body.indexOf(":");
      items.push({
        phase,
        title: colon > 2 && colon < 40 ? body.slice(0, colon).trim() : cleanHeadingTitle(body.split(/[.;]/)[0] || body, 38),
        detail: colon > 2 && colon < 40 ? body.slice(colon + 1).trim() : body,
      });
    }
  }

  return items.length >= 2 ? items.slice(0, 5) : [];
}

/**
 * Extracts explicit sequential process steps ("Step 1: ...", "1. ...", "First ...").
 */
function extractProcessSteps(text: string): Array<{ title: string; detail: string }> {
  const steps: Array<{ title: string; detail: string }> = [];
  const lines = text.split("\n").map((l) => l.replace(/^[-•*]\s+/, "").trim()).filter(Boolean);

  for (const ln of lines) {
    const m = ln.match(/^(?:Step\s+\d+|Stage\s+\d+|\d+(?:\.\d+)*[.)])\s*[:—–-]?\s*(.+)$/i);
    if (m) {
      const isExplicitStepPrefix = /^(?:Step|Stage)\s+\d+/i.test(ln);
      const content = m[1]!.trim();
      if (/\bthe\s+(?:system|project|application)\s+will\s+provide\b/i.test(content)) {
        continue;
      }
      const sep = content.indexOf(":");
      const hasDetail = (sep > 2 && sep < 40 && content.slice(sep + 1).trim().length > 4) || content.split(/\s+/).length >= 6;
      if (!isExplicitStepPrefix && !hasDetail) {
        continue; // Do NOT turn bare numbered headings ("1. Project Title", "2. General Objective") into empty workflow steps
      }
      const stepTitle =
        sep > 2 && sep < 40
          ? content.slice(0, sep).trim()
          : cleanHeadingTitle(content.split(/[.]/)[0] || content, 36);
      const stepDetail =
        sep > 2 && sep < 40 ? content.slice(sep + 1).trim() : content;
      if (stepTitle.toLowerCase() !== stepDetail.toLowerCase()) {
        steps.push({ title: stepTitle, detail: stepDetail });
      }
    }
  }

  return steps.length >= 2 ? steps.slice(0, 5) : [];
}

/**
 * Extracts markdown tables or dense `Key: Definition` concept lists into table rows if >= 3 rows.
 */
function extractTableIfPresent(text: string): { headers: string[]; rows: string[][] } | undefined {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const pipeLines = lines.filter((l) => l.includes("|") && l.split("|").length >= 3);
  if (pipeLines.length >= 3) {
    const parseRow = (r: string) =>
      r
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
    const headers = parseRow(pipeLines[0]!);
    const dataRows = pipeLines
      .slice(1)
      .filter((r) => !/^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(r))
      .map(parseRow)
      .filter((r) => r.length >= 2);
    if (headers.length >= 2 && dataRows.length >= 2) {
      return { headers: headers.slice(0, 4), rows: dataRows.slice(0, 6).map((r) => r.slice(0, 4)) };
    }
  }
  return undefined;
}

interface RawSection {
  title: string;
  bodyParagraphs: string[];
  sourceIndices: number[];
}

/**
 * Clusters sanitized paragraphs into coherent semantic sections rather than blindly 1-to-1 splitting lines.
 */
function clusterParagraphsIntoSections(paragraphs: string[], docTitle: string): RawSection[] {
  const sections: RawSection[] = [];
  let current: RawSection = { title: "", bodyParagraphs: [], sourceIndices: [] };

  const deriveFallbackSectionTitle = (bodyText: string, index: number): string => {
    const firstLine =
      bodyText
        .split(/\n/)
        .map((l) => l.replace(/^[-•*]\s+/, "").trim())
        .find((l) => l.length >= 6 && /[A-Za-z\u0600-\u06FF]{3,}/.test(l)) || bodyText;
    const colonIdx = firstLine.indexOf(":");
    if (colonIdx >= 4 && colonIdx <= 42) {
      const leftPart = firstLine.slice(0, colonIdx).trim();
      const rightPart = firstLine.slice(colonIdx + 1).trim();
      if (/^(?:topic|chapter|part|section|module)\s+[A-Z0-9.]+$/i.test(leftPart) && rightPart.length >= 4) {
        return cleanHeadingTitle(rightPart, 56);
      }
      return cleanHeadingTitle(leftPart, 56);
    }
    const firstSentence = firstLine.split(/[.!?؟;]/)[0] || firstLine;
    const cleaned = cleanHeadingTitle(firstSentence, 54);
    const endsWithDangling = /[,;]$|\b(?:and|or|the|of|in|to|for|with|by|from)\s*$/i.test(cleaned);
    if (
      cleaned.length >= 4 &&
      !/^\d+(?:\.\d+)?$/.test(cleaned) &&
      !/^(?:has|have|was|were|are|is|[a-z])\b/.test(cleaned) &&
      !endsWithDangling
    ) {
      return cleaned;
    }
    return `${docTitle} — Section ${index + 1}`;
  };

  const pushCurrentIfSubstantive = () => {
    const text = current.bodyParagraphs.join("\n").trim();
    if (text.length > 0 || (current.title && current.bodyParagraphs.length > 0)) {
      sections.push({
        title: current.title || deriveFallbackSectionTitle(text, sections.length),
        bodyParagraphs: current.bodyParagraphs,
        sourceIndices: current.sourceIndices,
      });
    }
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const block = paragraphs[i]!;
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    while (lines.length > 0 && isIntroLeadInFragment(lines[0]!)) {
      lines.shift();
    }
    if (lines.length === 0) continue;

    // Skip isolated single-word ALL-CAPS watermark badges, series banners, TOC outlines, and textbook metadata blocks at cover/preamble
    const isValidHeadingShape = (line: string) => {
      if (!/[A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF\u0590-\u05FF]{3,}/.test(line)) return false;
      if (/^[a-z]/.test(line)) return false;
      if (/[,;]$/.test(line)) return false;
      if (/\b(?:and|or|the|of|in|to|for|with|by|from)\s*$/i.test(line)) return false;
      return true;
    };

    if (
      paragraphs.length >= 5 &&
      lines.length <= 2 &&
      ((lines[0]!.split(/\s+/).length === 1 && lines[0]! === lines[0]!.toUpperCase() && lines[0]!.length <= 22) ||
        /^(?:higher education study notes|source textbook metadata|about\s+\w+|course code\s*:)/i.test(lines[0]!) ||
        (i <= 5 && /^topic\s+\d+(?:\.\d+)?\s*:/i.test(lines[0]!)) ||
        /chapter\s+\d+\s*:.*topic\s+\d+\.\d+/i.test(lines[0]!))
    ) {
      continue;
    }

    // Skip a short cover/title banner at Paragraph 0 if followed immediately by an explicit titled section/question
    if (
      i <= 2 &&
      paragraphs.length >= 3 &&
      sections.length === 0 &&
      lines.length <= 3 &&
      block.split(/\s+/).length <= 20 &&
      !/[.!?]$/.test(block.trim()) &&
      (/^(?:#{1,4}\s+|question\s+\d+|part\s+\d+|chapter\s+\d+|section\s+[a-z0-9]+|\d+(?:\.\d+)?[.)]\s+)/i.test(
        (paragraphs[i + 1] || "").trim(),
      ) ||
        cleanHeadingTitle(block, 80).toLowerCase() === docTitle.toLowerCase())
    ) {
      continue;
    }

    const firstLine = lines[0]!;
    const cleanFirst = cleanHeadingTitle(firstLine, 80);
    const isGenericSublabelColon =
      (firstLine.endsWith(":") ||
        /^\d+(?:\.\d+)+\s+[A-Za-z]+$/.test(firstLine) ||
        /^(?:ethiopian example|primary focus|common exam mistake|key takeaway|worked example)$/i.test(cleanFirst)) &&
      /^(?:responsibilities|attributes|methods|operations|properties|features|example|examples|ethiopian example|primary focus|note|notes|overview|summary|advantages|disadvantages|benefits|limitations|common exam mistake|key points)\s*:?$/i.test(
        cleanFirst,
      );
    const isSystemLeadInHeading =
      /^(?:\d+(?:\.\d+)?\s+)?(?:the\s+system\s+will|the\s+application\s+will|the\s+project\s+will|it\s+allows|this\s+section)\b/i.test(
        firstLine,
      ) ||
      (/\b(?:the\s+following|will\s+be\s+used|are\s+outlined)\b/i.test(cleanFirst) && Boolean(current.title));

    const headingCandidate =
      isValidHeadingShape(firstLine) &&
      !isSystemLeadInHeading &&
      !(isGenericSublabelColon && (current.bodyParagraphs.length > 0 || Boolean(current.title)));
    const isExplicitHeading =
      headingCandidate &&
      (/^#{1,4}\s+/.test(firstLine) ||
        /^(?:part|chapter|section|module)\s+[A-Z0-9]+/i.test(firstLine) ||
        (/^\d+(?:\.\d+)?[.)]?\s+[A-Z\u0600-\u06FF]/.test(firstLine) && firstLine.length <= 75 && !/:.{12,}/.test(firstLine)) ||
        (firstLine.endsWith(":") && firstLine.length >= 6 && firstLine.length <= 68 && !isIntroLeadInFragment(firstLine)) ||
        (firstLine.length >= 6 && firstLine.length <= 64 && !/[.!?]$/.test(firstLine) && lines.length > 1 && !firstLine.startsWith("-") && !isIntroLeadInFragment(firstLine)));

    // Special check: standalone single-line heading paragraph (e.g. "## Architecture" followed by content block)
    const isStandaloneHeadingBlock =
      headingCandidate &&
      lines.length === 1 &&
      !firstLine.startsWith("-") &&
      !firstLine.startsWith("•") &&
      firstLine.length <= 72 &&
      !/:.{12,}/.test(firstLine) &&
      (/^#{1,4}\s+/.test(firstLine) ||
        /^(?:part|chapter|section|module|\d+(?:\.\d+)?)\s+[A-Z]/i.test(firstLine) ||
        (!/[.!?]$/.test(firstLine) && firstLine.split(/\s+/).length <= 8 && !isIntroLeadInFragment(firstLine)));

    // Do NOT create micro-sections out of intro fragments like "These tasks can include:"
    if (isIntroLeadInFragment(firstLine) && lines.length === 1) {
      continue;
    }

    if (isStandaloneHeadingBlock && i + 1 < paragraphs.length) {
      if (current.bodyParagraphs.length > 0) {
        pushCurrentIfSubstantive();
        current = { title: cleanHeadingTitle(firstLine, 68), bodyParagraphs: [], sourceIndices: [i] };
      } else {
        current.title = cleanHeadingTitle(firstLine, 68);
        current.sourceIndices.push(i);
      }
      continue;
    }

    if (isExplicitHeading && !isIntroLeadInFragment(firstLine)) {
      if (current.bodyParagraphs.length > 0) {
        pushCurrentIfSubstantive();
        current = { title: "", bodyParagraphs: [], sourceIndices: [] };
      }
      current.title = cleanHeadingTitle(firstLine, 68);
      current.sourceIndices.push(i);
      const rest = lines.slice(1).filter((l) => !isIntroLeadInFragment(l));
      if (rest.length > 0) {
        current.bodyParagraphs.push(rest.join("\n"));
      }
      continue;
    }

    // If first line WAS a dangling lead-in ("These tasks can include:") followed by content lines, skip lead-in and keep body!
    const keptLines = isIntroLeadInFragment(firstLine) ? lines.slice(1) : lines;
    const bodyText = keptLines.join("\n").trim();
    if (!bodyText) continue;

    current.bodyParagraphs.push(bodyText);
    current.sourceIndices.push(i);

    // Prevent one section from swallowing an entire essay when source has no headings
    const totalWordsInCurrent = current.bodyParagraphs.join(" ").split(/\s+/).length;
    if (totalWordsInCurrent >= 140 && i + 1 < paragraphs.length) {
      pushCurrentIfSubstantive();
      current = { title: "", bodyParagraphs: [], sourceIndices: [] };
    }
  }

  if (current.bodyParagraphs.length > 0) {
    pushCurrentIfSubstantive();
  }

  return sections;
}

/**
 * Breaks a section's prose & bullet text into crisp concise factual key points (zero hallucination).
 */
function extractFactsFromSectionText(text: string, maxFacts = 5): {
  facts: string[];
  examples: string[];
  technicalTerms: Array<{ term: string; explanation: string }>;
  quote?: { text: string; author?: string };
} {
  const facts: string[] = [];
  const examples: string[] = [];
  const technicalTerms: Array<{ term: string; explanation: string }> = [];
  let quote: { text: string; author?: string } | undefined;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const rawLine of lines) {
    // Blockquote or scripture/citation line (e.g. ﴿...﴾ or > "quote" — author)
    const quoteMatch = rawLine.match(/^[>“"﴿](.{15,240}?)[”"﴾](?:\s*[—–-]\s*(.{2,60}))?$/);
    if (quoteMatch && !quote) {
      quote = { text: quoteMatch[1]!.trim(), author: quoteMatch[2]?.trim() };
      continue;
    }

    const cleanLine = rawLine
      .replace(/^[-•*]\s+/, "")
      .replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
      .trim();
    if (
      !cleanLine ||
      cleanLine.length < 4 ||
      isIntroLeadInFragment(cleanLine) ||
      /^(?:responsibilities|attributes|methods|operations|properties|features)\s*:?$/i.test(cleanLine) ||
      /\bthe\s+(?:system|project|application)\s+will\s+provide\s+the\s+following\b/i.test(cleanLine)
    ) {
      continue;
    }

    if (/^(?:e\.g\.|for example|example|such as)\b/i.test(cleanLine)) {
      examples.push(cleanLine);
    }

    // Extract "Term: Explanation" or "Term — Explanation"
    const defMatch = cleanLine.match(/^([A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF][A-Za-z0-9À-ÖØ-öø-ÿ\u0600-\u06FF\s/-]{2,34})\s*[:—–]\s+(.{8,})$/);
    if (defMatch) {
      const term = defMatch[1]!.trim();
      const explanation = defMatch[2]!.trim();
      if (!/^(?:step|phase|note|warning|remember|قديماً|اليوم)$/i.test(term)) {
        technicalTerms.push({ term, explanation });
      }
    }

    // Split multi-sentence paragraphs into crisp standalone takeaways when lines are dense prose
    if (cleanLine.length > 175 && !cleanLine.includes(":")) {
      const sentences = cleanLine
        .split(/(?<=[.!?؟])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 12);
      for (const s of sentences) {
        if (facts.length < maxFacts) facts.push(s);
      }
    } else if (facts.length < maxFacts) {
      facts.push(cleanLine);
    }
  }

  return { facts, examples, technicalTerms, quote };
}

/**
 * Recommends a topic-appropriate slide count naturally based on topic breadth & source depth.
 * Strictly avoids 50-slide bloat for normal inputs.
 */
export function calculateNaturalSlideCount(wordCount: number, topicCount: number): number {
  if (wordCount <= 90) return 4;
  if (wordCount <= 190) return Math.min(6, Math.max(4, topicCount + 2));
  if (wordCount <= 550) return Math.min(9, Math.max(5, topicCount + 3));
  if (wordCount <= 1400) return Math.min(13, Math.max(7, topicCount + 3));
  if (wordCount <= 3200) return Math.min(17, Math.max(10, topicCount + 3));
  return Math.min(20, Math.max(12, Math.min(topicCount + 3, 20)));
}

/**
 * Stage 1 Source Understanding:
 * Analyzes ONLY sanitized user source content to understand subject, thesis, structured topics,
 * metrics, comparisons, timelines, processes, definitions, and conclusions before writing slides.
 */
export function analyzeSourceContent(
  sanitized: SanitizedInputResult,
  hintTitle?: string,
): DocumentAnalysis {
  const cleanText = sanitized.cleanSourceText;
  const detectedTitle = inferCleanDocumentTitle(cleanText, hintTitle);
  const { domain, recommendedThemeId } = classifySourceDomain(cleanText, detectedTitle);
  const allMetrics = extractRealMetrics(cleanText);

  const rawSections = clusterParagraphsIntoSections(sanitized.paragraphs, detectedTitle);
  const topics: AnalyzedTopic[] = [];

  for (let i = 0; i < rawSections.length; i++) {
    const sec = rawSections[i]!;
    const combinedSecText = sec.bodyParagraphs.join("\n").trim();
    if (!combinedSecText) continue;

    // Avoid duplicating deck cover title cleanly
    let topicTitle = cleanHeadingTitle(sec.title || detectedTitle, 66);
    if (
      topicTitle.toLowerCase() === detectedTitle.toLowerCase() &&
      sec.bodyParagraphs.length > 0 &&
      rawSections.length > 1
    ) {
      topicTitle = i === 0 ? (sanitized.isRtl ? "نظرة عامة وسياق الموضوع" : "Core Overview & Context") : `Section ${i + 1}: ${topicTitle}`;
    }

    const { facts, examples, technicalTerms, quote } = extractFactsFromSectionText(combinedSecText, 6);
    const secMetrics = extractRealMetrics(combinedSecText);
    const processSteps = extractProcessSteps(combinedSecText);
    const timelineItems = extractTimelineItems(combinedSecText);
    const comparison = extractComparisonFromText(topicTitle, combinedSecText);
    const tableData = extractTableIfPresent(combinedSecText);

    // Choose content-driven recommended visual structure (never random!)
    let recommendedVisual: AnalyzedTopic["recommendedVisual"] = "cards";
    let diagramKind: DiagramKind | undefined;

    if (tableData) {
      recommendedVisual = "table";
    } else if (comparison) {
      recommendedVisual = "comparison";
      diagramKind = "matrix";
    } else if (timelineItems.length >= 2) {
      recommendedVisual = "timeline";
      diagramKind = "pipeline";
    } else if (processSteps.length >= 2) {
      recommendedVisual = "process";
      diagramKind = "pipeline";
    } else if (secMetrics.length >= 2) {
      recommendedVisual = "chart";
      diagramKind = "bar-chart";
    } else if (quote && facts.length <= 2) {
      recommendedVisual = "quote";
    } else if (
      (facts.length >= 2 || processSteps.length >= 2 || technicalTerms.length >= 2) &&
      /\b(architecture|pipeline|input|output|layer|tier|workflow|cycle|system|framework|mechanism|topology)\b/i.test(
        `${topicTitle} ${combinedSecText}`,
      )
    ) {
      recommendedVisual = "diagram";
      diagramKind = /\b(layer|stack|tier|hierarchy)\b/i.test(combinedSecText)
        ? "layers"
        : /\b(cycle|loop|feedback)\b/i.test(combinedSecText)
          ? "cycle"
          : "pipeline";
    } else if (facts.length === 4 || technicalTerms.length === 4) {
      recommendedVisual = "bento";
      diagramKind = "matrix";
    } else if (facts.length >= 3) {
      recommendedVisual = i % 3 === 1 ? "image" : "cards";
    } else {
      recommendedVisual = i % 2 === 0 ? "image" : "none";
    }

    const summary =
      facts[0] || sec.bodyParagraphs[0]?.split(/[.!?؟]/)[0]?.trim() || topicTitle;

    topics.push({
      id: `topic-${i + 1}`,
      title: topicTitle,
      summary,
      keyFacts: facts.length > 0 ? facts : [combinedSecText.slice(0, 180)],
      examples,
      technicalTerms,
      metrics: secMetrics,
      processSteps,
      timelineItems,
      comparison,
      tableData,
      quote,
      recommendedVisual,
      visualConcept: `${topicTitle} — ${summary.slice(0, 80)}`,
      diagramKind,
      importance: Math.max(1, 10 - i) + (secMetrics.length > 0 ? 2 : 0) + (comparison ? 2 : 0),
      sourceIndices: sec.sourceIndices,
    });
  }

  // Filter out 1-sentence intro stubs and publisher/copyright/MCQ quiz chrome when rich core sections exist
  const topicalWithoutChrome =
    topics.length >= 8
      ? topics.filter(
          (t) =>
            !/^(?:authors of original module|about\s+\w+|chapter-end self-assessment.*|copyright notice)$/i.test(
              t.title.trim(),
            ) &&
            !/common exam mistake|formal copyright|source attribution|correct answer\s*=|self-assessment|\bmcq\b|^Q\d+:/i.test(
              t.title,
            ),
        )
      : topics;
  const baseTopics = topicalWithoutChrome.length >= 4 ? topicalWithoutChrome : topics;
  const firstTitle = (baseTopics[0]?.title || "").trim().toLowerCase();
  const isGenericIntroHeading =
    firstTitle === detectedTitle.toLowerCase() ||
    /^(?:introduction|intro|overview|welcome|preamble|chapter introduction)$/.test(firstTitle);
  const firstTopicWords = (baseTopics[0]?.keyFacts.join(" ") || "").split(/\s+/).filter(Boolean).length;
  const effectiveTopics =
    isGenericIntroHeading &&
    baseTopics.length >= 3 &&
    baseTopics[0]!.keyFacts.length === 1 &&
    firstTopicWords < 28 &&
    baseTopics[0]!.metrics.length === 0 &&
    baseTopics[0]!.processSteps.length === 0 &&
    baseTopics[0]!.timelineItems.length === 0
      ? baseTopics.slice(1)
      : baseTopics;

  // Ensure even very short single-paragraph documents yield clean, non-empty topic nodes without inventing fake facts
  if (effectiveTopics.length === 0) {
    const { facts, examples, technicalTerms, quote } = extractFactsFromSectionText(cleanText, 5);
    effectiveTopics.push({
      id: "topic-1",
      title: detectedTitle,
      summary: facts[0] || cleanText.slice(0, 160),
      keyFacts: facts.length > 0 ? facts : [cleanText.trim()],
      examples,
      technicalTerms,
      metrics: allMetrics,
      processSteps: [],
      timelineItems: [],
      quote,
      recommendedVisual: "image",
      visualConcept: detectedTitle,
      importance: 10,
      sourceIndices: [0],
    });
  }

  const keyTakeaways = effectiveTopics
    .slice(0, 5)
    .map((t) => t.title)
    .filter(Boolean);

  const keyFacts = effectiveTopics.flatMap((t) => t.keyFacts).slice(0, 8);
  const explicitConclusion = effectiveTopics.find((t) =>
    /\b(conclusion|summary|takeaway|recommendation|future|outlook|خاتمة|خلاصة)\b/i.test(t.title),
  );
  const trimOnWordBoundary = (s: string, maxLen: number) => {
    const t = s.trim();
    if (t.length <= maxLen) return t;
    const sub = t.slice(0, maxLen - 1);
    const space = sub.lastIndexOf(" ");
    return (space > Math.floor(maxLen * 0.4) ? sub.slice(0, space) : sub).trim() + "…";
  };

  const conclusionPoints = (explicitConclusion?.keyFacts || [
    ...effectiveTopics.slice(0, 4).map((t) => trimOnWordBoundary(`${t.title}: ${t.summary}`, 105)),
  ]).slice(0, 4);

  const coreThesis =
    topics[0]?.summary || cleanText.split(/[.!?؟\n]/)[0]?.trim() || detectedTitle;

  const recommendedSlideCount = calculateNaturalSlideCount(sanitized.wordCount, effectiveTopics.length);

  return {
    subject: detectedTitle,
    detectedTitle,
    domain,
    coreThesis,
    keyTakeaways,
    keyFacts,
    allMetrics,
    topics: effectiveTopics,
    conclusionPoints,
    audienceFit: sanitized.detectedLanguage,
    language: sanitized.detectedLanguage,
    isRtl: sanitized.isRtl,
    recommendedSlideCount,
    recommendedThemeId,
    totalSourceWords: sanitized.wordCount,
  };
}

/**
 * Extracts a balanced full-document brief for LLM calls (start + evenly sampled interior sections + conclusion + metrics)
 * so long documents never lose their middle chapters or data.
 */
export function buildFullDocumentAnalysisBrief(cleanSourceText: string, maxChars = 14000): string {
  const clean = cleanSourceText.trim();
  if (clean.length <= maxChars) return clean;

  const paragraphs = clean.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  if (paragraphs.length <= 8) return clean.slice(0, maxChars);

  const selected: string[] = [];
  let charBudget = maxChars;
  const pick = (label: string, idx: number) => {
    const p = paragraphs[idx];
    if (!p) return;
    const chunk = p.slice(0, 1400);
    if (charBudget - chunk.length > 0) {
      selected.push(`[${label}] ${chunk}`);
      charBudget -= chunk.length + 20;
    }
  };

  pick("OPENING", 0);
  pick("INTRO_2", 1);

  const interiorCount = Math.min(8, Math.max(3, paragraphs.length - 4));
  const step = Math.max(1, Math.floor((paragraphs.length - 3) / interiorCount));
  for (let i = 2; i < paragraphs.length - 2 && charBudget > 1600; i += step) {
    pick(`SECTION_${i + 1}`, i);
  }

  pick("CONCLUSION_PRE", paragraphs.length - 2);
  pick("CONCLUSION", paragraphs.length - 1);

  return selected.join("\n\n");
}

/**
 * Builds Stage 1 LLM prompts strictly isolated from internal system instructions.
 */
export function buildAiAnalysisPrompts(cleanSourceText: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const brief = buildFullDocumentAnalysisBrief(cleanSourceText, 14000);
  return {
    systemPrompt: `You are a Principal Research Analyst extracting structured meaning from a document BEFORE slides are designed.
RULES:
1. Analyze ONLY the supplied source content. NEVER invent statistics, facts, citations, or examples.
2. Distinguish between real quantitative metrics in the text and simple dates/step numbers.
3. Preserve all main ideas, arguments, technical terms (with source-grounded explanations), examples, comparisons, timelines, processes, and conclusions.
4. Keep headings natural, descriptive, and complete (never truncated sentence fragments).
5. Return ONLY valid JSON matching the requested schema.`,
    userPrompt: `Analyze this source document carefully and extract its structured meaning:

{
  "subject": "Core topic",
  "detectedTitle": "Clean, accurate presentation title (max 65 chars)",
  "domain": "technology | science | business | academic | healthcare | finance | humanities | general",
  "coreThesis": "Concise 1-2 sentence synthesis of the main message",
  "recommendedSlideCount": 8,
  "topics": [
    {
      "title": "Descriptive section title",
      "summary": "Key insight sentence grounded in source",
      "keyFacts": ["Concise source fact 1", "Concise source fact 2"],
      "examples": ["Real example from source if present"],
      "technicalTerms": [{"term": "Term", "explanation": "Source explanation"}],
      "metrics": [{"label": "Metric name", "value": "Exact figure from source"}],
      "processSteps": [{"title": "Step", "detail": "Action"}],
      "timelineItems": [{"phase": "Time/Phase", "title": "Milestone", "detail": "Detail"}],
      "comparison": {"title": "Comparison", "leftTitle": "Side A", "rightTitle": "Side B", "leftPoints": ["..."], "rightPoints": ["..."]},
      "recommendedVisual": "diagram | image | chart | cards | bento | timeline | process | comparison | table | quote | none",
      "visualConcept": "What visual/diagram would genuinely clarify this topic"
    }
  ],
  "conclusionPoints": ["Main takeaway 1", "Main takeaway 2", "Main takeaway 3"]
}

SOURCE CONTENT:
"""
${brief}
"""`,
  };
}
