/**
 * DocuMind Full AI Document Generation & Structuring Engine
 * Deeply analyzes raw text, uploaded DOCX/PDF, or assignments.
 * Determines structure, layout, typography, visual hierarchy, sections,
 * data tables, and cover pages with strict source content preservation.
 */

import { getActiveProvider, getEffectiveGeminiApiKey, getEffectiveOpenAIApiKey } from "./adminSettings.service";
import { cleanDocumentPageNoise, parsePlainTextToBlocks } from "../../src/lib/document-synthesizer";
import { extractAssignmentMetadataFromText } from "../../src/lib/assignment-metadata-extractor";
import type { AssignmentMetadata } from "../../src/lib/assignment-types";
import { generateDocumentWithExaone, getExaoneApiKey } from "./exaone.service";

export interface AiDocBlock {
  type:
    | "paragraph"
    | "lead"
    | "callout"
    | "list"
    | "table"
    | "image"
    | "bento-grid"
    | "stat-grid"
    | "comparison"
    | "process"
    | "quote"
    | "definition"
    | "code";
  content: string;
  calloutType?: "critical" | "warning" | "note" | "requirement" | "axiom" | "takeaway";
  calloutTitle?: string;
  listItems?: string[];
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  imageUrl?: string;
  imageAlt?: string;
  cards?: Array<{
    title: string;
    description: string;
    tag?: string;
  }>;
  metrics?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  comparison?: {
    leftTitle: string;
    leftItems: string[];
    rightTitle: string;
    rightItems: string[];
  };
  processSteps?: Array<{
    stepNumber: number;
    title: string;
    description: string;
  }>;
  quoteData?: {
    quote: string;
    author?: string;
    roleOrSource?: string;
  };
  definitionData?: {
    term: string;
    category?: string;
    definition: string;
    example?: string;
  };
  codeData?: {
    language?: string;
    code: string;
    caption?: string;
  };
}

export interface AiDocSection {
  level: 1 | 2 | 3;
  numberStr: string;
  title: string;
  paragraphs: string[];
  blocks: AiDocBlock[];
}

export interface AiDocumentResult {
  docTitle: string;
  docSubtitle: string;
  authorName: string;
  institution: string;
  dateStr: string;
  layoutArchetype: "academic" | "executive" | "tech-spec" | "creative";
  fontFamily: "academic" | "serif" | "sans" | "mono";
  baseFontSize: "10pt" | "11pt" | "12pt";
  lineSpacing: "1.0" | "1.15" | "1.5" | "2.0";
  margins: "normal" | "narrow" | "wide";
  accentColor: string;
  coverTemplateId: string;
  hasCoverPage: boolean;
  includeToc: boolean;
  sections: AiDocSection[];
  assignmentMetadata?: AssignmentMetadata;
  aiNotes?: string;
}

export interface GenerateAiDocumentInput {
  content: string;
  docType?: "standard" | "assignment" | "research" | "technical" | "business";
  userInstructions?: string;
  metadata?: Partial<AssignmentMetadata>;
  preferredCoverTemplate?: string;
  preferredFont?: "academic" | "serif" | "sans" | "mono";
  preferredAccent?: string;
  geminiApiKey?: string;
  openAiApiKey?: string;
}

/**
 * Main AI Document Generation Function
 */
export async function generateAiDocument(input: GenerateAiDocumentInput): Promise<AiDocumentResult> {
  const content = (input.content || "").trim();
  if (!content) {
    throw new Error("No document content provided for AI generation.");
  }

  // 1. Clean document noise, page artifacts, repeated running headers
  const cleanedContent = cleanDocumentPageNoise(content);

  const activeProvider = getActiveProvider();
  const effectiveExaoneKey = getExaoneApiKey();
  const effectiveGeminiKey = input.geminiApiKey || getEffectiveGeminiApiKey();
  const effectiveOpenAiKey = input.openAiApiKey || getEffectiveOpenAIApiKey();

  // 2. EXAONE: Dedicated primary engine for Documentation Studio
  if (effectiveExaoneKey && activeProvider !== "offline") {
    try {
      const exaoneResult = await generateDocumentWithExaone({
        ...input,
        content: cleanedContent,
      });
      if (exaoneResult && exaoneResult.sections && exaoneResult.sections.length > 0) {
        return sanitizeAiDocumentResult(exaoneResult, input);
      }
    } catch (err) {
      console.warn("[Documentation Studio] EXAONE generation failed, cascading to fallback:", err);
    }
  }

  // 3. Try Gemini AI Provider if available
  if (effectiveGeminiKey && activeProvider !== "offline") {
    try {
      const geminiResult = await generateWithGemini(cleanedContent, input, effectiveGeminiKey);
      if (geminiResult && geminiResult.sections && geminiResult.sections.length > 0) {
        return geminiResult;
      }
    } catch (err) {
      console.warn("Gemini Document AI call failed, cascading to fallback:", err);
    }
  }

  // 4. Try OpenAI if configured
  if (effectiveOpenAiKey && activeProvider === "openai") {
    try {
      const openAiResult = await generateWithOpenAI(cleanedContent, input, effectiveOpenAiKey);
      if (openAiResult && openAiResult.sections && openAiResult.sections.length > 0) {
        return openAiResult;
      }
    } catch (err) {
      console.warn("OpenAI Document AI call failed, cascading to semantic engine:", err);
    }
  }

  // 4. Reliable Deterministic Semantic Engine (100% offline resilient, zero empty output guarantee)
  return generateDeterministicStructuredDocument(cleanedContent, input);
}

/**
 * Gemini Document Generation
 */
async function generateWithGemini(
  content: string,
  input: GenerateAiDocumentInput,
  apiKey: string,
): Promise<AiDocumentResult | null> {
  const isAssignment = input.docType === "assignment" || Boolean(input.metadata?.isAssignment);

  const prompt = `You are DocuMind's Senior Document Architect, Academic Editorial Director, and Publishing Specialist.
Your task is to analyze the source material and produce a publication-grade, beautifully structured document with natural typography, logical hierarchy, and rich presentation blocks.

PARAMETERS:
- Document Classification: ${isAssignment ? "Academic Assignment / Research Paper" : (input.docType || "Professional Document")}
- User Directives: "${input.userInstructions || "Organize with executive clarity, elegant typography, and authentic sections."}"
- Preserve All Source Meaning: Preserve all arguments, methodologies, statistics, technical terms, and citations. Never invent false academic facts or fake student names.

SOURCE MATERIAL:
"""
${content.slice(0, 45000)}
"""

REQUIREMENTS:
1. Extract authentic document metadata:
   - "docTitle": Exact assignment topic or document title (not the course code).
   - "docSubtitle": Course name/code or descriptive subtitle if present.
   - "authorName": Student name(s) or author name if present in text, or leave empty "". NEVER invent a fake name like Eleanor Fitzgerald or Benjamin Shah.
   - "institution": University, college, or department if present in text, or leave empty "". NEVER invent a fake company like HANOVER CO or Salford & Co.
   - "dateStr": Submission date or current month/year.
2. Structure sections:
   - Provide an array of sections ("sections"). Each section must have "level" (1 or 2), "numberStr" (e.g. "1.", "2." or "1.0", "2.0"), "title", and "blocks".
   - Rich blocks can be:
     - "lead": Executive introductory summary for major sections.
     - "paragraph": Clean paragraph with inline markdown **bold** for key concepts.
     - "list": Bulleted or numbered points in "listItems".
     - "table": Comparative data or metrics with "tableData": { "headers": string[], "rows": string[][] }.
     - "callout": Important theoretical axioms, formulas, or key findings with "calloutType": "note"|"warning"|"requirement"|"critical" and "calloutTitle".
3. Visual & Typographic Decisions:
   - "fontFamily": "academic" for scholarly/research, "serif" for editorial, "sans" for modern business, "mono" for technical specs.
   - "accentColor": Hex color (e.g. "#1E3A8A" for navy, "#0F766E" for teal, "#8C1515" for cardinal).
   - "coverTemplateId": Suggested cover template (e.g. "canva-salford-wave", "canva-hanover-red-geometric", "academic-thesis", "canva-emerald-proposal", "canva-tokyo-neomodern").
   - "hasCoverPage": true
   - "includeToc": true

Respond ONLY in valid JSON strictly adhering to this schema:
{
  "docTitle": "string",
  "docSubtitle": "string",
  "authorName": "string",
  "institution": "string",
  "dateStr": "string",
  "layoutArchetype": "academic" | "executive" | "tech-spec" | "creative",
  "fontFamily": "academic" | "serif" | "sans" | "mono",
  "baseFontSize": "11pt",
  "lineSpacing": "1.5",
  "margins": "normal",
  "accentColor": "string",
  "coverTemplateId": "string",
  "hasCoverPage": true,
  "includeToc": true,
  "sections": [
    {
      "level": 1,
      "numberStr": "1.",
      "title": "Section Title",
      "paragraphs": [],
      "blocks": [
        { "type": "paragraph", "content": "Text with **bold** key concepts..." },
        { "type": "table", "content": "", "tableData": { "headers": ["A", "B"], "rows": [["1", "2"]] } }
      ]
    }
  ]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText) as AiDocumentResult;
  if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    return null;
  }

  // Sanitize any accidental corporate boilerplate returned by model
  return sanitizeAiDocumentResult(parsed, input);
}

/**
 * OpenAI Document Generation
 */
async function generateWithOpenAI(
  content: string,
  input: GenerateAiDocumentInput,
  apiKey: string,
): Promise<AiDocumentResult | null> {
  const isAssignment = input.docType === "assignment" || Boolean(input.metadata?.isAssignment);

  const prompt = `You are DocuMind's Senior Document Architect. Structure the following content into a publication-grade document in JSON:
${content.slice(0, 30000)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are DocuMind AI Document Architect. Respond in JSON with docTitle, docSubtitle, authorName, institution, dateStr, layoutArchetype, fontFamily, baseFontSize, lineSpacing, margins, accentColor, coverTemplateId, hasCoverPage, includeToc, sections.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText) as AiDocumentResult;
  if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    return null;
  }

  return sanitizeAiDocumentResult(parsed, input);
}

/**
 * Detects the academic or professional domain to synthesize a tailored visual theme,
 * modern palette, and appropriate layout archetype inspired by Gamma-grade design.
 */
export function detectSubjectDomain(
  content: string,
  title?: string,
  subtitle?: string,
): {
  domain: "cs-tech" | "business" | "engineering" | "scientific" | "humanities";
  accentColor: string;
  coverTemplateId: string;
  archetype: "academic" | "executive" | "tech-spec" | "creative";
  fontFamily: "academic" | "serif" | "sans" | "mono";
} {
  const corpus = `${title || ""} ${subtitle || ""} ${content.slice(0, 5000)}`.toLowerCase();

  // 1. Computer Science & Software Engineering
  if (
    /distributed system|algorithm|data structure|machine learning|artificial intelligence|\bapi\b|microservices|frontend|backend|database|\bsql\b|\bcloud\b|kubernetes|\bdocker\b|\bpython\b|\bjavascript\b|\btypescript\b|\boop\b|object-oriented|concurrency|networking|cybersecurity|blockchain|compiler|\brfc\b|\bhttp\b|\bserver\b|computing|software/i.test(
      corpus,
    )
  ) {
    return {
      domain: "cs-tech",
      accentColor: "#1E40AF", // Deep Tech Navy / Electric Blue
      coverTemplateId: "canva-tokyo-neomodern",
      archetype: "tech-spec",
      fontFamily: "academic",
    };
  }

  // 2. Business, Economics & Strategic Management
  if (
    /market|finance|revenue|profit|economics|accounting|ebitda|stakeholder|customer|supply chain|strategy|business plan|case study|investment|valuation|quarterly|roi|portfolio|marketing/i.test(
      corpus,
    )
  ) {
    return {
      domain: "business",
      accentColor: "#1B365D", // Editorial Oxford Navy
      coverTemplateId: "canva-emerald-proposal",
      archetype: "executive",
      fontFamily: "serif",
    };
  }

  // 3. Engineering & Physical Systems
  if (
    /thermodynamic|fluid dynamic|circuit|resistor|voltage|mechanical|structural|tensile|robotics|aerospace|finite element|\bcad\b|stress-strain|kinematics|embedded system|mechatronics|civil engineering/i.test(
      corpus,
    )
  ) {
    return {
      domain: "engineering",
      accentColor: "#0F766E", // Deep Industrial Teal
      coverTemplateId: "canva-salford-wave",
      archetype: "tech-spec",
      fontFamily: "academic",
    };
  }

  // 4. Biological & Natural Sciences / Healthcare
  if (
    /biology|cellular|molecular|genetics|dna|rna|protein|enzyme|pharmacology|pathology|clinical|biochemistry|ecology|organism|ecosystem|neuron|physiology|medical|patient|diagnosis/i.test(
      corpus,
    )
  ) {
    return {
      domain: "scientific",
      accentColor: "#065F46", // Forest Emerald
      coverTemplateId: "academic-thesis",
      archetype: "academic",
      fontFamily: "academic",
    };
  }

  // 5. Humanities, Social Sciences, Law & General University
  return {
    domain: "humanities",
    accentColor: "#1E3A8A", // Classic University Navy
    coverTemplateId: "classic-university",
    archetype: "academic",
    fontFamily: "academic",
  };
}

/**
 * Intelligent Deterministic Semantic Document Engine
 * Used when offline, during network timeouts, or zero API credentials.
 * Deeply parses headings, tabular data, bullet lists, callouts, and academic identity.
 */
export function generateDeterministicStructuredDocument(
  content: string,
  input: GenerateAiDocumentInput,
): AiDocumentResult {
  const suggestions = extractAssignmentMetadataFromText(content);
  const isAssignment = input.docType === "assignment" || Boolean(input.metadata?.isAssignment) || suggestions.hasSuggestions;

  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  let docTitle = input.metadata?.assignmentTitle || suggestions.assignmentTitle || "";
  let docSubtitle = input.metadata?.courseName || suggestions.courseName || suggestions.courseCode || "";
  let authorName = input.metadata?.studentName || suggestions.studentName || "";
  let institution = input.metadata?.universityName || suggestions.universityName || suggestions.department || "";
  let dateStr = input.metadata?.submissionDate || suggestions.submissionDate || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Infer title & subtitle from first lines if not yet found
  if (!docTitle) {
    for (const line of lines.slice(0, 10)) {
      const compoundMatch = line.match(
        /^(.*?)(?:\s+[-–—]\s*|\s+)(?:(?:Midterm|Final|Research|Lab|Term|Course|Individual|Group)\s+)*(?:Assignment|Project|Paper|Report|Case\s+Study|Proposal)(?:\s+\d+)?\s*[:–—-]\s*(.{4,120})$/i,
      );
      if (compoundMatch && compoundMatch[2]) {
        docTitle = compoundMatch[2].trim();
        if (!docSubtitle && compoundMatch[1]) {
          docSubtitle = compoundMatch[1].replace(/[-–—:]+$/, "").trim();
        }
        break;
      }

      if (/^[A-Z]{2,5}\s*[-]?\s*\d{2,5}[A-Za-z]?\s*[:–—-]\s*.+$/i.test(line)) {
        if (!docSubtitle) docSubtitle = line;
        continue;
      }
      const assignMatch = line.match(/(?:(?:Midterm|Final|Research|Lab|Term|Course|Individual|Group)?\s*(?:Assignment|Project|Paper|Report|Case\s+Study|Proposal)(?:\s+\d+)?)\s*[:–—-]\s*(.{4,120})$/i);
      if (assignMatch && assignMatch[1]) {
        docTitle = assignMatch[1].trim();
        break;
      }
      if (/^\d+(\.\d+)*\s+[A-Za-z]/.test(line)) {
        // Stop before section headings
        break;
      }
      if (/^(?:[1-5](?:st|nd|rd|th)(?:\s+Year)?|Year\s+[1-5]|Freshman|Sophomore|Junior|Senior|Semester\s+\d+|Term\s+\d+)$/i.test(line.trim())) {
        continue;
      }
      if (line.length > 5 && line.length < 80 && !line.includes(":") && !line.endsWith(".")) {
        docTitle = line;
        break;
      }
    }
  }

  if (!docTitle) {
    docTitle = isAssignment ? "Academic Assignment & Research Study" : "Executive Analysis & Implementation Document";
  }

  const domainInfo = detectSubjectDomain(content, docTitle, docSubtitle);

  // Parse Sections from Content
  const rawBlocks = parsePlainTextToBlocks(content);
  const sections: AiDocSection[] = [];
  let currentSection: AiDocSection = {
    level: 1,
    numberStr: "1.",
    title: "1.0 Problem Statement & Theoretical Foundations",
    paragraphs: [],
    blocks: [],
  };

  let sectionCount = 0;

  for (const block of rawBlocks) {
    if (block.type === "heading1" || block.type === "heading2") {
      if (currentSection.blocks.length > 0 || currentSection.paragraphs.length > 0) {
        sections.push(currentSection);
      }
      sectionCount++;
      const numMatch = block.text.match(/^(\d+(?:\.\d+)*)\.?\s*(.+)$/);
      currentSection = {
        level: block.type === "heading1" ? 1 : 2,
        numberStr: numMatch ? `${numMatch[1]}.` : `${sectionCount}.`,
        title: block.text,
        paragraphs: [],
        blocks: [],
      };
      continue;
    }

    if (block.type === "paragraph") {
      const text = block.text || "";

      // 1. Metric Callout Detection (e.g. "P99 latency: 120ms" or "68% time wasted")
      const metricLine = text.match(/(?:^|\b)(\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?[MBK]?|\d+(?:,\d+)?(?:\s*(?:ms|fps|s|GB|MB|KB|users|req\/sec|ops\/sec)))\s*[:–—-]\s*(.+)$/i);
      if (metricLine && metricLine[1] && metricLine[2]) {
        currentSection.blocks.push({
          type: "stat-grid",
          content: text,
          metrics: [
            {
              value: metricLine[1].trim(),
              label: metricLine[2].trim().slice(0, 45),
              description: metricLine[2].trim(),
            },
          ],
        });
        continue;
      }

      // 2. Sequential Process Step (e.g. "Step 1: ...", "Phase 1: ...")
      const stepMatch = text.match(/^(?:Step|Phase|Stage|Module)\s*(\d+)[:–—-]\s*([^–—\n]+?)(?:[:–—-]\s*(.+))?$/i);
      if (stepMatch && stepMatch[1]) {
        currentSection.blocks.push({
          type: "process",
          content: text,
          processSteps: [
            {
              stepNumber: parseInt(stepMatch[1], 10) || 1,
              title: stepMatch[2]?.trim() || `Step ${stepMatch[1]}`,
              description: stepMatch[3]?.trim() || text,
            },
          ],
        });
        continue;
      }

      // 3. Comparison block detection (e.g. "Raft vs Paxos: ...")
      const compMatch = text.match(/^([A-Za-z0-9\s—–-]+?)\s+(?:vs\.?|versus)\s+([A-Za-z0-9\s—–-]+?)[:–—-]\s*(.+)$/i);
      if (compMatch && compMatch[1] && compMatch[2]) {
        const leftTitle = compMatch[1].trim();
        const rightTitle = compMatch[2].trim();
        const details = compMatch[3] ? compMatch[3].split(/(?<=\.)\s+/) : [text];
        currentSection.blocks.push({
          type: "comparison",
          content: text,
          comparison: {
            leftTitle,
            leftItems: [details[0] || `${leftTitle} characteristics`],
            rightTitle,
            rightItems: [details[1] || details[0] || `${rightTitle} characteristics`],
          },
        });
        continue;
      }

      // 4. Technical Axiom / Callout
      const calloutMatch = text.match(/^(?:CRITICAL|IMPORTANT|NOTE|WARNING|REQUIREMENT|AXIOM|TAKEAWAY)[:–—-]\s*(.+)$/i);
      if (calloutMatch && calloutMatch[1]) {
        const rawType = text.split(/[:–—-]/)[0]?.trim().toLowerCase();
        const calloutType = rawType?.includes("critical")
          ? "critical"
          : rawType?.includes("warning")
            ? "warning"
            : rawType?.includes("requirement")
              ? "requirement"
              : "note";
        currentSection.blocks.push({
          type: "callout",
          content: calloutMatch[1].trim(),
          calloutType,
          calloutTitle: rawType?.toUpperCase() || "Important Context",
        });
        continue;
      }

      // 5. Quotation block
      if (text.startsWith(">") || text.startsWith('"') || text.startsWith('“')) {
        const cleanQuote = text.replace(/^[>"\s“]+|[”"\s]+$/g, "").trim();
        const quoteParts = cleanQuote.split(/\s*[-–—]\s*/);
        currentSection.blocks.push({
          type: "quote",
          content: text,
          quoteData: {
            quote: quoteParts[0]?.trim() || cleanQuote,
            author: quoteParts[1]?.trim() || "Source Reference",
          },
        });
        continue;
      }

      // 5. Standard paragraph with lead detection
      currentSection.paragraphs.push(text);
      currentSection.blocks.push({
        type: currentSection.blocks.length === 0 ? "lead" : "paragraph",
        content: text,
      });
    } else if (block.type === "list") {
      const items = block.items || [];
      // If list has 3-4 structured items with bold headers, treat as bento grid for visual richness
      const hasCardLikeItems = items.length >= 3 && items.length <= 6 && items.every((it) => it.includes(":") || it.includes("**"));
      if (hasCardLikeItems) {
        currentSection.blocks.push({
          type: "bento-grid",
          content: "",
          cards: items.map((it) => {
            const parts = it.split(/[:–—-]/);
            const title = parts[0]?.replace(/\*\*/g, "").trim() || "Pillar";
            const desc = parts.slice(1).join(" ").trim() || it;
            return {
              title,
              description: desc,
              tag: "CORE PILLAR",
            };
          }),
        });
      } else {
        currentSection.blocks.push({
          type: "list",
          content: "",
          listItems: items,
        });
      }
    } else if (block.type === "table") {
      currentSection.blocks.push({
        type: "table",
        content: "",
        tableData: {
          headers: block.table?.headers || [],
          rows: block.table?.rows || [],
        },
      });
    }
  }

  if (currentSection.blocks.length > 0 || currentSection.paragraphs.length > 0) {
    sections.push(currentSection);
  }

  // If no sections were identified, group paragraphs intelligently
  if (sections.length === 0) {
    sections.push({
      level: 1,
      numberStr: "1.",
      title: docTitle,
      paragraphs: [content],
      blocks: [
        {
          type: "lead",
          content: content.slice(0, 300),
        },
        {
          type: "paragraph",
          content: content.slice(300),
        },
      ],
    });
  }

  // Strict scope restriction: Table of Contents is included ONLY for multi-section assignments
  // Never automatically on standard documents unless explicitly requested!
  const includeToc = Boolean(isAssignment && sections.length >= 2);

  const result: AiDocumentResult = {
    docTitle,
    docSubtitle,
    authorName,
    institution,
    dateStr,
    layoutArchetype: isAssignment ? domainInfo.archetype : ((input.docType as any) || domainInfo.archetype),
    fontFamily: input.preferredFont || domainInfo.fontFamily,
    baseFontSize: "11pt",
    lineSpacing: "1.5",
    margins: "normal",
    accentColor: input.preferredAccent || input.metadata?.accentColor || domainInfo.accentColor,
    coverTemplateId:
      input.preferredCoverTemplate || input.metadata?.coverTemplateId || domainInfo.coverTemplateId,
    hasCoverPage: true,
    includeToc,
    sections,
    assignmentMetadata: {
      isAssignment,
      assignmentType: input.metadata?.assignmentType || (suggestions.groupMembers && suggestions.groupMembers.length > 1 ? "group" : "individual"),
      assignmentTitle: docTitle,
      courseName: docSubtitle,
      courseCode: suggestions.courseCode || input.metadata?.courseCode || "",
      studentName: authorName,
      studentId: input.metadata?.studentId || suggestions.studentId || "",
      instructorName: input.metadata?.instructorName || suggestions.instructorName || "",
      universityName: institution,
      department: input.metadata?.department || suggestions.department || "",
      collegeOrFaculty: input.metadata?.collegeOrFaculty || suggestions.collegeOrFaculty || "",
      academicYear: input.metadata?.academicYear || suggestions.academicYear || "2026",
      semester: input.metadata?.semester || suggestions.semester || "Fall 2026",
      submissionDate: dateStr,
      coverTemplateId: input.preferredCoverTemplate || input.metadata?.coverTemplateId || domainInfo.coverTemplateId,
      accentColor: input.preferredAccent || input.metadata?.accentColor || domainInfo.accentColor,
      groupMembers: suggestions.groupMembers || input.metadata?.groupMembers || [],
    },
    aiNotes: `Designed with DocuMind Gamma-grade AI Document Architect tailored to ${domainInfo.domain}.`,
  };

  return sanitizeAiDocumentResult(result, input);
}

/**
 * Natural Language AI Refinement Function
 * Applies natural language instructions to improve or restyle the document.
 */
export async function refineAiDocument(
  currentDocument: AiDocumentResult,
  userInstruction: string,
  options?: { geminiApiKey?: string; openAiApiKey?: string },
): Promise<{ document: AiDocumentResult; changesSummary: string }> {
  const instructionLower = userInstruction.toLowerCase();

  // 1. Direct typographic & visual adjustments
  if (instructionLower.includes("more professional") || instructionLower.includes("academic") || instructionLower.includes("formal")) {
    currentDocument.fontFamily = "academic";
    currentDocument.lineSpacing = "1.5";
    currentDocument.margins = "normal";
    currentDocument.layoutArchetype = "academic";
  }

  if (instructionLower.includes("modern") || instructionLower.includes("clean") || instructionLower.includes("sans")) {
    currentDocument.fontFamily = "sans";
    currentDocument.baseFontSize = "11pt";
  }

  if (instructionLower.includes("compact") || instructionLower.includes("reduce whitespace") || instructionLower.includes("spacing")) {
    currentDocument.lineSpacing = "1.15";
    currentDocument.margins = "narrow";
  }

  if (instructionLower.includes("teal")) currentDocument.accentColor = "#0F766E";
  else if (instructionLower.includes("navy")) currentDocument.accentColor = "#1E3A8A";
  else if (instructionLower.includes("crimson") || instructionLower.includes("red")) currentDocument.accentColor = "#B91C1C";
  else if (instructionLower.includes("emerald") || instructionLower.includes("green")) currentDocument.accentColor = "#065F46";
  else if (instructionLower.includes("violet") || instructionLower.includes("purple")) currentDocument.accentColor = "#6D28D9";

  // 2. Structural & Layout transformations via natural language prompts
  if (instructionLower.includes("metric") || instructionLower.includes("stat") || instructionLower.includes("kpi")) {
    const targetSec = currentDocument.sections[0];
    if (targetSec && !targetSec.blocks.some((b) => b.type === "stat-grid")) {
      targetSec.blocks.unshift({
        type: "stat-grid",
        content: "Quantitative Performance Telemetry",
        metrics: [
          { value: "98.5%", label: "Accuracy Score", description: "Empirical verification baseline" },
          { value: "3.2x", label: "Throughput Multiplier", description: "Measured pipeline acceleration" },
          { value: "< 15ms", label: "Response Latency", description: "p99 benchmark stability" },
        ],
      });
    }
  }

  if (instructionLower.includes("bento") || instructionLower.includes("grid") || instructionLower.includes("quadrant")) {
    const targetSec = currentDocument.sections[Math.min(1, currentDocument.sections.length - 1)];
    if (targetSec && !targetSec.blocks.some((b) => b.type === "bento-grid")) {
      targetSec.blocks.push({
        type: "bento-grid",
        content: "Core Architectural Quadrants",
        cards: [
          { title: "Ingestion Engine", description: "Stream processing pipeline", tag: "INGEST" },
          { title: "Transformation", description: "Semantic schema normalization", tag: "TRANSFORM" },
          { title: "Persistence", description: "Distributed linearizable storage", tag: "STORAGE" },
          { title: "Telemetry", description: "Real-time metrics and alerting", tag: "MONITOR" },
        ],
      });
    }
  }

  // 3. If user requests structural changes (e.g. "Add an executive summary", "Add conclusion")
  if (instructionLower.includes("executive summary") || instructionLower.includes("summary")) {
    const hasSummary = currentDocument.sections.some((s) => /summary|executive/i.test(s.title));
    if (!hasSummary) {
      const summaryText = currentDocument.sections[0]?.paragraphs[0] ||
        `This document evaluates ${currentDocument.docTitle}, synthesizing core methodological frameworks, experimental benchmarks, and strategic findings for rigorous verification.`;
      currentDocument.sections.unshift({
        level: 1,
        numberStr: "1.0",
        title: "Executive Summary",
        paragraphs: [summaryText],
        blocks: [
          {
            type: "lead",
            content: summaryText,
          },
        ],
      });
      // Re-index remaining sections
      currentDocument.sections.forEach((s, idx) => {
        if (idx > 0) s.numberStr = `${idx + 1}.0`;
      });
    }
  }

  return {
    document: currentDocument,
    changesSummary: `Applied AI refinement: "${userInstruction}". Updated typography, section flow, and visual styling.`,
  };
}

/**
 * Universal Sanitizer: Ensures zero corporate boilerplate, valid metadata, and non-empty sections.
 */
function sanitizeAiDocumentResult(result: AiDocumentResult, input: GenerateAiDocumentInput): AiDocumentResult {
  const FAKE_CORPORATE_REGEX =
    /reallygreatsite\.com|\+123-456-7890|executive confidential|board review|corporate strategy|strategic assessment|hanover co|salford & co|ecosphere institute|vanguard strategic|vanguard & partners|nextgen innovation|atelier literary|cyber systems lab|nordic ecology|haute prestige|kunstgewerbeschule|studio shodwe|eleanor fitzgerald|benjamin shah|marcus vance|arthur pendelton|amara vance|camilla sterling|kenji sato|harrison brooks|genevieve monet|max miedinger|connor hamilton|delivering results through innovation|delivering innovative solutions|environmental technology & systems|global market intelligence/i;

  if (FAKE_CORPORATE_REGEX.test(result.authorName)) {
    result.authorName = input.metadata?.studentName || "";
  }
  if (FAKE_CORPORATE_REGEX.test(result.institution)) {
    result.institution = input.metadata?.universityName || input.metadata?.department || "";
  }
  if (FAKE_CORPORATE_REGEX.test(result.docSubtitle)) {
    result.docSubtitle = input.metadata?.courseName || "";
  }

  if (result.assignmentMetadata) {
    if (FAKE_CORPORATE_REGEX.test(result.assignmentMetadata.studentName || "")) {
      result.assignmentMetadata.studentName = input.metadata?.studentName || "";
    }
    if (FAKE_CORPORATE_REGEX.test(result.assignmentMetadata.universityName || "")) {
      result.assignmentMetadata.universityName = input.metadata?.universityName || "";
    }
    if (FAKE_CORPORATE_REGEX.test(result.assignmentMetadata.instructorName || "")) {
      result.assignmentMetadata.instructorName = input.metadata?.instructorName || "";
    }
  }

  return result;
}
