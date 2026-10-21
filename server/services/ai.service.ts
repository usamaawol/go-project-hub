import { ENV } from "../config/env";

export interface DocumentGuidance {
  recommendedTool: string;
  recommendedTheme: string;
  suggestedSteps: string[];
  summary: string;
  outline: Array<{ title: string; bullets: string[] }>;
}

export async function analyzeDocumentAndGuide(
  text: string,
  userGoal?: string,
): Promise<DocumentGuidance> {
  const goal = (userGoal || "").toLowerCase();

  // If Gemini API Key is configured, attempt real Gemini call
  if (ENV.GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are DocuMind AI Document Guide. Analyze this document excerpt and user goal "${userGoal || "Generate presentation"}":\n\n${text.slice(0, 3000)}\n\nRespond in JSON with:
                    {
                      "recommendedTool": "string",
                      "recommendedTheme": "string",
                      "summary": "string",
                      "suggestedSteps": ["step 1", "step 2", "step 3"],
                      "outline": [{"title": "Slide Title", "bullets": ["point 1", "point 2"]}]
                    }`,
                  },
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          const parsed = JSON.parse(candidate);
          return {
            recommendedTool: parsed.recommendedTool || "Presentation Studio",
            recommendedTheme: parsed.recommendedTheme || "Executive Brief",
            suggestedSteps: parsed.suggestedSteps || [
              "1. Extract structure",
              "2. Apply theme",
              "3. Export .PPTX",
            ],
            summary: parsed.summary || text.slice(0, 200) + "...",
            outline: parsed.outline || [],
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, using deterministic guidance:", err);
    }
  }

  // Deterministic Intelligent Fallback
  const lower = text.toLowerCase();
  let recommendedTheme = "Executive Brief";
  let recommendedTool = "Presentation Studio";

  if (lower.includes("research") || lower.includes("method") || lower.includes("hypothesis")) {
    recommendedTheme = "Findings Column";
    recommendedTool = "Extract & Structure Findings";
  } else if (
    lower.includes("student") ||
    lower.includes("class") ||
    lower.includes("course") ||
    lower.includes("lecture")
  ) {
    recommendedTheme = "Classroom Bright";
    recommendedTool = "Educational Lecture Series";
  } else if (
    lower.includes("api") ||
    lower.includes("code") ||
    lower.includes("architecture") ||
    lower.includes("server")
  ) {
    recommendedTheme = "Neural Grid";
    recommendedTool = "Technical Architecture Blueprint";
  } else if (
    lower.includes("investor") ||
    lower.includes("arr") ||
    lower.includes("round") ||
    lower.includes("growth")
  ) {
    recommendedTheme = "Series A Venture Deck";
    recommendedTool = "Pitch Deck Generator";
  }

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const headings = lines.filter((l) => l.length < 60 && !l.endsWith(".")).slice(0, 4);

  const outline =
    headings.length > 0
      ? headings.map((h, i) => ({
          title: h,
          bullets: [
            `Key takeaway for ${h}`,
            `Supporting data and operational checkpoint`,
            `Actionable recommendation`,
          ],
        }))
      : [
          {
            title: "Executive Summary",
            bullets: ["Core document overview", "Primary objectives", "Strategic alignment"],
          },
          {
            title: "Detailed Analysis",
            bullets: ["Operational findings", "Quantitative metrics", "Comparative factors"],
          },
          {
            title: "Recommendations & Next Steps",
            bullets: ["Immediate action items", "Milestone schedule", "Resource allocation"],
          },
        ];

  return {
    recommendedTool,
    recommendedTheme,
    summary: text.slice(0, 240).trim() + "…",
    suggestedSteps: [
      "1. Parse document structure and key headings.",
      `2. Apply the "${recommendedTheme}" theme layout.`,
      "3. Review generated slide outline and refine bullet points.",
      "4. Export genuine .pptx presentation deck for free.",
    ],
    outline,
  };
}
