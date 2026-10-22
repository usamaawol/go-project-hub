import { ENV } from "../config/env";

export interface ContextualVisualResult {
  imageUrl: string;
  svgContent?: string;
  caption: string;
  concept: string;
  type: "picture" | "graph" | "diagram" | "chart";
}

/**
 * Intelligent contextual visual generator.
 * Uses Gemini / Imagen when an API key is present,
 * and falls back to high-fidelity, topic-aware SVG graphics
 * so slides are never boring and never have blank or generic placeholders.
 */
export async function generateSlideVisual(params: {
  title: string;
  subtitle?: string;
  bullets?: string[];
  visualPrompt?: string;
  visualType?: "picture" | "graph" | "diagram" | "chart";
  concept?: string;
  apiKey?: string;
  accentColor?: string;
  isDark?: boolean;
}): Promise<ContextualVisualResult> {
  const {
    title,
    subtitle = "",
    bullets = [],
    visualPrompt,
    visualType = "diagram",
    concept,
    apiKey = ENV.GEMINI_API_KEY,
    accentColor = "#F97316",
    isDark = false,
  } = params;

  const conceptName = concept || title.replace(/^(slide|section|\d+)[—:.\s]+/i, "").slice(0, 40);
  const captionText = subtitle || `Visual illustration and topological model for ${conceptName}`;

  // 1. If Gemini API key is configured, attempt Gemini / Imagen generation
  if (apiKey && apiKey.trim().length > 10) {
    try {
      // A. For "picture" requests, try Imagen 3
      if (visualType === "picture") {
        const imageResult = await generateImagenPicture({
          prompt:
            visualPrompt ||
            `A modern high-end presentation graphic: ${title}. ${subtitle}. Professional aesthetic, clean studio lighting, 16:9 composition, vibrant colors, no watermarks, no cluttered text.`,
          apiKey,
        });
        if (imageResult) {
          return {
            imageUrl: imageResult,
            caption: captionText,
            concept: conceptName,
            type: "picture",
          };
        }
      }

      // B. For "graph", "diagram", "chart" (or if Imagen didn't return), generate vector SVG via Gemini 2.5 Flash
      const svgResult = await generateGeminiSvgDiagram({
        title,
        subtitle,
        bullets,
        visualPrompt: visualPrompt || `Vector graph/diagram representing: ${title} - ${subtitle}`,
        accentColor,
        isDark,
        apiKey,
      });

      if (svgResult) {
        const base64Data = Buffer.from(svgResult).toString("base64");
        return {
          imageUrl: `data:image/svg+xml;base64,${base64Data}`,
          svgContent: svgResult,
          caption: captionText,
          concept: conceptName,
          type: visualType === "chart" ? "chart" : "diagram",
        };
      }
    } catch (err) {
      console.warn("Gemini visual generation encountered an error, using contextual synthesizer:", err);
    }
  }

  // 2. High-fidelity Contextual Visual Synthesizer (Fallback & Standalone)
  return synthesizeContextualVisual({
    title,
    subtitle,
    bullets,
    concept: conceptName,
    caption: captionText,
    accentColor,
    isDark,
  });
}

/**
 * Call Google Imagen 3 API for high-resolution 16:9 illustrations
 */
async function generateImagenPicture(params: {
  prompt: string;
  apiKey: string;
}): Promise<string | null> {
  const timeoutMs = 12000;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${params.apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: params.prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          outputMimeType: "image/jpeg",
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string }>;
    };
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (b64) {
      return `data:image/jpeg;base64,${b64}`;
    }
  } catch {
    // Fail gracefully to SVG diagram
  }
  return null;
}

/**
 * Call Gemini 2.5 Flash to generate custom contextual SVG vector graphics
 */
async function generateGeminiSvgDiagram(params: {
  title: string;
  subtitle: string;
  bullets: string[];
  visualPrompt: string;
  accentColor: string;
  isDark: boolean;
  apiKey: string;
}): Promise<string | null> {
  const timeoutMs = 10000;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${params.apiKey}`;

  const prompt = `You are an elite presentation visual designer. Generate a clean, modern, professional vector SVG illustration or graph for a presentation slide.
Topic: ${params.title}
Subtitle: ${params.subtitle}
Key Details: ${params.bullets.slice(0, 4).join(" | ")}
Design Goal: ${params.visualPrompt}

STRICT SPECIFICATIONS:
1. Return ONLY valid SVG markup starting with <svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg"> and ending with </svg>.
2. Do not wrap in markdown or backticks (\`\`\`xml or \`\`\`svg).
3. Theme: Background ${params.isDark ? "#0F172A" : "#F8FAFC"}, primary text ${params.isDark ? "#F8FAFC" : "#0F172A"}, accent color ${params.accentColor}.
4. Include attractive rounded shapes, smooth gradients, clean connector arrows, and legible labels.
5. Must be visually rich, informative, and directly illustrate the subject matter.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (raw) {
      const match = raw.match(/<svg[\s\S]*<\/svg>/i);
      if (match) return match[0];
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * High-fidelity contextual SVG synthesizer for instant, offline, and reliable visuals.
 * Generates custom vector art tailored to the topic (Tech/Fox, Science/Photosynthesis, Metrics, Architecture, Comparison).
 */
export function synthesizeContextualVisual(params: {
  title: string;
  subtitle: string;
  bullets: string[];
  concept: string;
  caption: string;
  accentColor: string;
  isDark: boolean;
}): ContextualVisualResult {
  const combined = `${params.title} ${params.subtitle} ${params.bullets.join(" ")}`.toLowerCase();
  const accent = params.accentColor || "#F97316";
  const bg = params.isDark ? "#0B1120" : "#F8FAFC";
  const cardBg = params.isDark ? "#1E293B" : "#FFFFFF";
  const textPrimary = params.isDark ? "#F8FAFC" : "#0F172A";
  const textMuted = params.isDark ? "#94A3B8" : "#64748B";

  const safeConcept = escapeXml(params.concept.toUpperCase());
  const safeCaption = escapeXml(params.caption);

  let svg: string;
  let type: "picture" | "graph" | "diagram" | "chart" = "diagram";

  // CASE 0: AI / Data / Machine Learning / Workflow architecture
  if (
    combined.includes("artificial intelligence") ||
    combined.includes(" ai ") ||
    combined.includes("ai system") ||
    combined.includes("machine learning") ||
    combined.includes("deep learning") ||
    combined.includes("neural") ||
    combined.includes("model or ai") ||
    combined.includes("data or input") ||
    combined.includes("input or data") ||
    combined.includes("algorithm") ||
    combined.includes("inference")
  ) {
    type = "diagram";
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ai_bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${cardBg}" />
    </linearGradient>
    <linearGradient id="ai_flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="50%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
    <linearGradient id="ai_glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.1" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="url(#ai_bgGrad)" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  
  <text x="60" y="65" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="${textPrimary}" letter-spacing="1">
    ${safeConcept} // AI SYSTEM ARCHITECTURE
  </text>
  <text x="60" y="90" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">
    ${safeCaption}
  </text>

  <!-- Block 1: Ingestion -->
  <rect x="60" y="150" width="200" height="230" rx="16" fill="${cardBg}" stroke="#3B82F6" stroke-width="2" />
  <rect x="80" y="170" width="160" height="34" rx="8" fill="#3B82F6" fill-opacity="0.15" />
  <circle cx="100" cy="187" r="6" fill="#3B82F6" />
  <text x="115" y="192" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#2563EB">01. INGESTION</text>
  <text x="80" y="230" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Data &amp; Inputs</text>
  <text x="80" y="260" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Text &amp; Documents</text>
  <text x="80" y="285" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Images &amp; Sensor Feeds</text>
  <text x="80" y="310" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• User Queries &amp; Signals</text>
  <text x="80" y="345" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#3B82F6">TOKENIZATION / EMBED</text>

  <!-- Flow 1 -> 2 -->
  <path d="M 260 265 L 305 265" stroke="url(#ai_flowGrad)" stroke-width="4" stroke-dasharray="6,4" />
  <polygon points="315,265 303,259 303,271" fill="${accent}" />

  <!-- Block 2: Neural Core -->
  <rect x="315" y="140" width="210" height="250" rx="20" fill="url(#ai_glowGrad)" stroke="${accent}" stroke-width="2.5" />
  <rect x="335" y="160" width="170" height="34" rx="8" fill="${accent}" fill-opacity="0.2" />
  <circle cx="355" cy="177" r="6" fill="${accent}" />
  <text x="370" y="182" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="${accent}">02. PROCESSING</text>
  <text x="335" y="220" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="${textPrimary}">Model / AI Core</text>
  <text x="335" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Deep Neural Weights</text>
  <text x="335" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Multi-Head Attention</text>
  <text x="335" y="300" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Latent Feature Matrix</text>
  <rect x="335" y="330" width="170" height="34" rx="8" fill="${cardBg}" stroke="${accent}" stroke-width="1" />
  <text x="420" y="352" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="${accent}">TRANSFORMER CORE</text>

  <!-- Flow 2 -> 3 -->
  <path d="M 525 265 L 570 265" stroke="url(#ai_flowGrad)" stroke-width="4" stroke-dasharray="6,4" />
  <polygon points="580,265 568,259 568,271" fill="#10B981" />

  <!-- Block 3: Output & Action -->
  <rect x="580" y="150" width="200" height="230" rx="16" fill="${cardBg}" stroke="#10B981" stroke-width="2" />
  <rect x="600" y="170" width="160" height="34" rx="8" fill="#10B981" fill-opacity="0.15" />
  <circle cx="620" cy="187" r="6" fill="#10B981" />
  <text x="635" y="192" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#059669">03. GENERATION</text>
  <text x="600" y="230" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Output &amp; Action</text>
  <text x="600" y="260" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Structured Answers</text>
  <text x="600" y="285" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Analytical Insights</text>
  <text x="600" y="310" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Actionable Results</text>
  <text x="600" y="345" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#10B981">DECISION SYNTHESIS</text>
</svg>`;
  }
  // CASE 1: Tech / Fox / Brand / Futuristic concepts (e.g. Red Fox Tech, Futuristic Fox, Digital Lab)
  else if (
    combined.includes("fox") ||
    combined.includes("futuristic") ||
    combined.includes("editorial") ||
    combined.includes("digital lab") ||
    combined.includes("brand") ||
    combined.includes("showcase")
  ) {
    type = "picture";
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${cardBg}" />
    </linearGradient>
    <linearGradient id="foxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7A00" />
      <stop offset="50%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#D946EF" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="800" height="480" rx="20" fill="url(#bgGrad)" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  
  <!-- Subtle Grid lines -->
  <g stroke="${accent}" stroke-opacity="0.1" stroke-width="1">
    <line x1="80" y1="0" x2="80" y2="480" />
    <line x1="240" y1="0" x2="240" y2="480" />
    <line x1="400" y1="0" x2="400" y2="480" />
    <line x1="560" y1="0" x2="560" y2="480" />
    <line x1="720" y1="0" x2="720" y2="480" />
    <line x1="0" y1="120" x2="800" y2="120" />
    <line x1="0" y1="240" x2="800" y2="240" />
    <line x1="0" y1="360" x2="800" y2="360" />
  </g>

  <!-- Glowing Geometric Fox Emblem -->
  <g transform="translate(400, 210)">
    <!-- Ambient Halo Glow -->
    <circle cx="0" cy="0" r="110" fill="${accent}" opacity="0.15" filter="url(#glow)" />
    
    <!-- Outer Fox Ears -->
    <polygon points="-80,-90 -25,-20 -95,-10" fill="url(#foxGrad)" opacity="0.9" />
    <polygon points="80,-90 95,-10 25,-20" fill="url(#foxGrad)" opacity="0.9" />
    
    <!-- Forehead Facets -->
    <polygon points="0,-75 -45,-15 0,-10" fill="#FFA34D" />
    <polygon points="0,-75 0,-10 45,-15" fill="#FF841A" />
    <polygon points="-45,-15 -75,25 -20,35" fill="url(#foxGrad)" />
    <polygon points="45,-15 20,35 75,25" fill="url(#foxGrad)" />
    <polygon points="-20,35 0,-10 20,35" fill="#FFFFFF" opacity="0.95" />
    
    <!-- Cheeks & Snout -->
    <polygon points="-75,25 -50,75 0,95" fill="#FF6B00" />
    <polygon points="75,25 0,95 50,75" fill="#E65100" />
    <polygon points="-20,35 0,70 20,35" fill="#FFF7ED" />
    
    <!-- Nose Tip -->
    <polygon points="0,75 -12,90 12,90" fill="#1E293B" />

    <!-- Eyes (Geometric Angled Cutouts) -->
    <polygon points="-32,15 -18,22 -35,26" fill="#111827" />
    <polygon points="32,15 35,26 18,22" fill="#111827" />
  </g>

  <!-- Title Badge -->
  <rect x="220" y="375" width="360" height="42" rx="21" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <text x="400" y="401" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}" letter-spacing="2">
    ${params.concept.toUpperCase()} // DESIGN MATRIX
  </text>
</svg>`;
  }
  // CASE 2: Photosynthesis / Biology / Science / Nature
  else if (
    combined.includes("photosynthesis") ||
    combined.includes("biology") ||
    combined.includes("plant") ||
    combined.includes("chloroplast") ||
    combined.includes("calvin") ||
    combined.includes("light reaction") ||
    combined.includes("energy")
  ) {
    type = "diagram";
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="${bg}" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>

  <!-- Sun Energy Source -->
  <circle cx="120" cy="110" r="50" fill="url(#sunGrad)" />
  <text x="120" y="115" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#78350F">LIGHT</text>
  <line x1="170" y1="130" x2="240" y2="170" stroke="#F59E0B" stroke-width="3" stroke-dasharray="6,4" />
  <polygon points="245,173 233,165 237,175" fill="#F59E0B" />

  <!-- Chloroplast Boundary (Main Container) -->
  <rect x="220" y="90" width="530" height="330" rx="30" fill="url(#leafGrad)" opacity="0.15" stroke="#10B981" stroke-width="2.5" />
  <text x="250" y="125" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#059669" letter-spacing="1.5">CHLOROPLAST ORGANELLE</text>

  <!-- Stage 1: Light Reactions (Thylakoid Membrane) -->
  <rect x="260" y="160" width="200" height="210" rx="16" fill="${cardBg}" stroke="#10B981" stroke-width="1.5" />
  <text x="360" y="195" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Light Reactions</text>
  <text x="360" y="215" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${textMuted}">Thylakoid Membrane</text>

  <!-- Input H2O -> Output O2 -->
  <rect x="280" y="240" width="160" height="34" rx="8" fill="#3B82F6" opacity="0.15" />
  <text x="360" y="262" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563EB">H₂O → O₂ (Oxygen)</text>

  <rect x="280" y="290" width="160" height="34" rx="8" fill="#10B981" opacity="0.2" />
  <text x="360" y="312" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#047857">Produces ATP &amp; NADPH</text>

  <!-- Energy Arrow Linking Stages -->
  <path d="M 460 265 L 510 265" stroke="${accent}" stroke-width="4" stroke-dasharray="4,4" />
  <polygon points="515,265 505,259 505,271" fill="${accent}" />

  <!-- Stage 2: Calvin Cycle (Stroma) -->
  <rect x="520" y="160" width="200" height="210" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <text x="620" y="195" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Calvin Cycle</text>
  <text x="620" y="215" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${textMuted}">Stroma Fluid</text>

  <rect x="540" y="240" width="160" height="34" rx="8" fill="#8B5CF6" opacity="0.15" />
  <text x="620" y="262" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#7C3AED">CO₂ (Carbon Fixation)</text>

  <rect x="540" y="290" width="160" height="34" rx="8" fill="#F59E0B" opacity="0.2" />
  <text x="620" y="312" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#D97706">Yields C₆H₁₂O₆ (Glucose)</text>
</svg>`;
  }
  // CASE 3: Metrics / Data / Growth / Financials
  else if (
    combined.includes("metric") ||
    combined.includes("growth") ||
    combined.includes("revenue") ||
    combined.includes("%") ||
    combined.includes("kpi") ||
    combined.includes("performance")
  ) {
    type = "chart";
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${accent}" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.3" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="${bg}" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>

  <!-- Chart Title -->
  <text x="60" y="65" font-family="system-ui, sans-serif" font-size="16" font-weight="800" fill="${textPrimary}" letter-spacing="1">
    QUANTIFIABLE METRICS &amp; PERFORMANCE TRAJECTORY
  </text>
  <text x="60" y="88" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">
    Comparative analytical indices across strategic milestones
  </text>

  <!-- Axes & Grid -->
  <line x1="100" y1="380" x2="720" y2="380" stroke="${textMuted}" stroke-opacity="0.4" stroke-width="1.5" />
  <line x1="100" y1="130" x2="100" y2="380" stroke="${textMuted}" stroke-opacity="0.4" stroke-width="1.5" />
  
  <line x1="100" y1="190" x2="720" y2="190" stroke="${textMuted}" stroke-opacity="0.15" stroke-dasharray="4,4" />
  <line x1="100" y1="250" x2="720" y2="250" stroke="${textMuted}" stroke-opacity="0.15" stroke-dasharray="4,4" />
  <line x1="100" y1="310" x2="720" y2="310" stroke="${textMuted}" stroke-opacity="0.15" stroke-dasharray="4,4" />

  <!-- Bar 1 -->
  <rect x="150" y="240" width="80" height="140" rx="8" fill="url(#barGrad)" />
  <text x="190" y="225" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${accent}">+48%</text>
  <text x="190" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="${textMuted}">Phase 1</text>

  <!-- Bar 2 -->
  <rect x="290" y="180" width="80" height="200" rx="8" fill="url(#barGrad)" />
  <text x="330" y="165" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${accent}">+72%</text>
  <text x="330" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="${textMuted}">Phase 2</text>

  <!-- Bar 3 -->
  <rect x="430" y="210" width="80" height="170" rx="8" fill="url(#barGrad)" />
  <text x="470" y="195" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${accent}">85.4%</text>
  <text x="470" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="${textMuted}">Phase 3</text>

  <!-- Bar 4 (Hero peak) -->
  <rect x="570" y="140" width="80" height="240" rx="8" fill="${accent}" />
  <text x="610" y="125" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="${accent}">99.2%</text>
  <text x="610" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${textPrimary}">Target</text>
</svg>`;
  }
  // CASE 4: Architecture / Process / Workflow / Flowchart
  else {
    type = "diagram";
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="480" rx="20" fill="${bg}" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>

  <!-- Header -->
  <text x="60" y="65" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="${textPrimary}" letter-spacing="1">
    ${safeConcept} // SYSTEM TOPOLOGY
  </text>
  <text x="60" y="90" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">
    ${safeCaption}
  </text>

  <!-- Node 1 -->
  <rect x="60" y="170" width="180" height="150" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <circle cx="95" cy="205" r="14" fill="${accent}" />
  <text x="95" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF">01</text>
  <text x="120" y="210" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Discovery</text>
  <text x="80" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Requirements</text>
  <text x="80" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Creative Brief</text>

  <!-- Flow Arrow 1 -> 2 -->
  <path d="M 240 245 L 295 245" stroke="${accent}" stroke-width="3" stroke-dasharray="4,4" />
  <polygon points="300,245 290,239 290,251" fill="${accent}" />

  <!-- Node 2 -->
  <rect x="310" y="170" width="180" height="150" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="2" />
  <circle cx="345" cy="205" r="14" fill="${accent}" />
  <text x="345" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF">02</text>
  <text x="370" y="210" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Architecture</text>
  <text x="330" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Component UI</text>
  <text x="330" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Visual Direction</text>

  <!-- Flow Arrow 2 -> 3 -->
  <path d="M 490 245 L 545 245" stroke="${accent}" stroke-width="3" stroke-dasharray="4,4" />
  <polygon points="550,245 540,239 540,251" fill="${accent}" />

  <!-- Node 3 -->
  <rect x="560" y="170" width="180" height="150" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <circle cx="595" cy="205" r="14" fill="${accent}" />
  <text x="595" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF">03</text>
  <text x="620" y="210" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Delivery</text>
  <text x="580" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Frontend Build</text>
  <text x="580" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Final Approval</text>
</svg>`;
  }

  const base64Data = Buffer.from(svg).toString("base64");
  return {
    imageUrl: `data:image/svg+xml;base64,${base64Data}`,
    svgContent: svg,
    caption: params.caption,
    concept: params.concept,
    type,
  };
}
