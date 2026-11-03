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
 * Client-compatible Contextual Visual Synthesizer
 * Generates custom SVG vector illustrations and graphs for slides
 * without needing an external service.
 */
export function buildContextualVisual(params: {
  title: string;
  subtitle?: string;
  bullets?: string[];
  concept?: string;
  accentColor?: string;
  isDark?: boolean;
}): {
  imageUrl: string;
  svgContent: string;
  caption: string;
  concept: string;
  type: "picture" | "graph" | "diagram" | "chart";
} {
  const combined = `${params.title} ${params.subtitle || ""} ${(params.bullets || []).join(" ")}`.toLowerCase();
  const accent = params.accentColor || "#F97316";
  const bg = params.isDark ? "#0B1120" : "#F8FAFC";
  const cardBg = params.isDark ? "#1E293B" : "#FFFFFF";
  const textPrimary = params.isDark ? "#F8FAFC" : "#0F172A";
  const textMuted = params.isDark ? "#94A3B8" : "#64748B";
  const conceptName =
    params.concept || params.title.replace(/^(slide|section|\d+)[—:.\s]+/i, "").slice(0, 40);
  const caption = params.subtitle || `Visual topology and design structure for ${conceptName}`;

  const safeConcept = escapeXml(conceptName.toUpperCase());
  const safeCaption = escapeXml(caption);

  let svg: string;
  let type: "picture" | "graph" | "diagram" | "chart" = "diagram";

  // CASE 0: AI / Machine Learning / Data & Model Architecture
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
    const bullets = params.bullets || [];
    const getBulletPoint = (bIdx: number, subIdx: number, fallback: string) => {
      const b = bullets[bIdx];
      if (!b) return fallback;
      const clean = b.replace(/^[✓✔︎•*\d.\s]+/, "").trim();
      const parts = clean.split(/[:.,;]|\s+and\s+/i).map(p => p.trim()).filter(p => p.length > 2);
      return escapeXml(parts[subIdx] ? parts[subIdx]!.slice(0, 24) : fallback);
    };

    const in1 = getBulletPoint(0, 0, "Input Ingestion");
    const in2 = getBulletPoint(0, 1, "Context Mapping");
    const in3 = getBulletPoint(0, 2, "Token Vectors");

    const proc1 = getBulletPoint(1, 0, "Neural Processing");
    const proc2 = getBulletPoint(1, 1, "Attention Weights");
    const proc3 = getBulletPoint(1, 2, "Latent Dimensions");

    const out1 = getBulletPoint(2, 0, "Synthesized Insights");
    const out2 = getBulletPoint(2, 1, "Structured Assets");
    const out3 = getBulletPoint(2, 2, "Executable Output");

    type = "diagram";
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="c_ai_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${cardBg}" />
    </linearGradient>
    <linearGradient id="c_ai_flow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="50%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
    <linearGradient id="c_ai_glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.1" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="url(#c_ai_bg)" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  
  <text x="60" y="65" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="${textPrimary}" letter-spacing="1">
    ${safeConcept} // AI SYSTEM ARCHITECTURE
  </text>
  <text x="60" y="90" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">
    ${safeCaption}
  </text>

  <!-- 01: Ingestion -->
  <rect x="60" y="150" width="200" height="230" rx="16" fill="${cardBg}" stroke="#3B82F6" stroke-width="2" />
  <rect x="80" y="170" width="160" height="34" rx="8" fill="#3B82F6" fill-opacity="0.15" />
  <circle cx="100" cy="187" r="6" fill="#3B82F6" />
  <text x="115" y="192" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#2563EB">01. INGESTION</text>
  <text x="80" y="230" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Data &amp; Inputs</text>
  <text x="80" y="260" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${in1}</text>
  <text x="80" y="285" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${in2}</text>
  <text x="80" y="310" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${in3}</text>
  <text x="80" y="345" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#3B82F6">TOKENIZATION / EMBED</text>

  <!-- Flow 1 -> 2 -->
  <path d="M 260 265 L 305 265" stroke="url(#c_ai_flow)" stroke-width="4" stroke-dasharray="6,4" />
  <polygon points="315,265 303,259 303,271" fill="${accent}" />

  <!-- 02: Processing Core -->
  <rect x="315" y="140" width="210" height="250" rx="20" fill="url(#c_ai_glow)" stroke="${accent}" stroke-width="2.5" />
  <rect x="335" y="160" width="170" height="34" rx="8" fill="${accent}" fill-opacity="0.2" />
  <circle cx="355" cy="177" r="6" fill="${accent}" />
  <text x="370" y="182" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="${accent}">02. PROCESSING</text>
  <text x="335" y="220" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="${textPrimary}">Model / AI Core</text>
  <text x="335" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${proc1}</text>
  <text x="335" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${proc2}</text>
  <text x="335" y="300" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${proc3}</text>
  <rect x="335" y="330" width="170" height="34" rx="8" fill="${cardBg}" stroke="${accent}" stroke-width="1" />
  <text x="420" y="352" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="${accent}">TRANSFORMER CORE</text>

  <!-- Flow 2 -> 3 -->
  <path d="M 525 265 L 570 265" stroke="url(#c_ai_flow)" stroke-width="4" stroke-dasharray="6,4" />
  <polygon points="580,265 568,259 568,271" fill="#10B981" />

  <!-- 03: Output Generation -->
  <rect x="580" y="150" width="200" height="230" rx="16" fill="${cardBg}" stroke="#10B981" stroke-width="2" />
  <rect x="600" y="170" width="160" height="34" rx="8" fill="#10B981" fill-opacity="0.15" />
  <circle cx="620" cy="187" r="6" fill="#10B981" />
  <text x="635" y="192" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#059669">03. GENERATION</text>
  <text x="600" y="230" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Output &amp; Action</text>
  <text x="600" y="260" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${out1}</text>
  <text x="600" y="285" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${out2}</text>
  <text x="600" y="310" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• ${out3}</text>
  <text x="600" y="345" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#10B981">DECISION SYNTHESIS</text>
</svg>`;
  }
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
    <linearGradient id="c_bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${cardBg}" />
    </linearGradient>
    <linearGradient id="c_foxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7A00" />
      <stop offset="50%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#D946EF" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="url(#c_bgGrad)" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  <g stroke="${accent}" stroke-opacity="0.1" stroke-width="1">
    <line x1="80" y1="0" x2="80" y2="480" /><line x1="240" y1="0" x2="240" y2="480" />
    <line x1="400" y1="0" x2="400" y2="480" /><line x1="560" y1="0" x2="560" y2="480" />
    <line x1="720" y1="0" x2="720" y2="480" />
    <line x1="0" y1="120" x2="800" y2="120" /><line x1="0" y1="240" x2="800" y2="240" />
    <line x1="0" y1="360" x2="800" y2="360" />
  </g>
  <g transform="translate(400, 210)">
    <circle cx="0" cy="0" r="110" fill="${accent}" opacity="0.15" />
    <polygon points="-80,-90 -25,-20 -95,-10" fill="url(#c_foxGrad)" opacity="0.9" />
    <polygon points="80,-90 95,-10 25,-20" fill="url(#c_foxGrad)" opacity="0.9" />
    <polygon points="0,-75 -45,-15 0,-10" fill="#FFA34D" />
    <polygon points="0,-75 0,-10 45,-15" fill="#FF841A" />
    <polygon points="-45,-15 -75,25 -20,35" fill="url(#c_foxGrad)" />
    <polygon points="45,-15 20,35 75,25" fill="url(#c_foxGrad)" />
    <polygon points="-20,35 0,-10 20,35" fill="#FFFFFF" opacity="0.95" />
    <polygon points="-75,25 -50,75 0,95" fill="#FF6B00" />
    <polygon points="75,25 0,95 50,75" fill="#E65100" />
    <polygon points="-20,35 0,70 20,35" fill="#FFF7ED" />
    <polygon points="0,75 -12,90 12,90" fill="#1E293B" />
    <polygon points="-32,15 -18,22 -35,26" fill="#111827" />
    <polygon points="32,15 35,26 18,22" fill="#111827" />
  </g>
  <rect x="220" y="375" width="360" height="42" rx="21" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <text x="400" y="401" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}" letter-spacing="2">
    ${conceptName.toUpperCase()} // CONCEPT MATRIX
  </text>
</svg>`;
  } else if (
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
    <linearGradient id="c_leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981" /><stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="c_sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" /><stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="${bg}" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  <circle cx="120" cy="110" r="50" fill="url(#c_sunGrad)" />
  <text x="120" y="115" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#78350F">LIGHT</text>
  <line x1="170" y1="130" x2="240" y2="170" stroke="#F59E0B" stroke-width="3" stroke-dasharray="6,4" />
  <polygon points="245,173 233,165 237,175" fill="#F59E0B" />
  <rect x="220" y="90" width="530" height="330" rx="30" fill="url(#c_leafGrad)" opacity="0.15" stroke="#10B981" stroke-width="2.5" />
  <text x="250" y="125" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#059669" letter-spacing="1.5">CHLOROPLAST ORGANELLE</text>
  <rect x="260" y="160" width="200" height="210" rx="16" fill="${cardBg}" stroke="#10B981" stroke-width="1.5" />
  <text x="360" y="195" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Light Reactions</text>
  <text x="360" y="215" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${textMuted}">Thylakoid Membrane</text>
  <rect x="280" y="240" width="160" height="34" rx="8" fill="#3B82F6" opacity="0.15" />
  <text x="360" y="262" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563EB">H₂O → O₂ (Oxygen)</text>
  <rect x="280" y="290" width="160" height="34" rx="8" fill="#10B981" opacity="0.2" />
  <text x="360" y="312" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#047857">Produces ATP &amp; NADPH</text>
  <path d="M 460 265 L 510 265" stroke="${accent}" stroke-width="4" stroke-dasharray="4,4" />
  <polygon points="515,265 505,259 505,271" fill="${accent}" />
  <rect x="520" y="160" width="200" height="210" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <text x="620" y="195" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Calvin Cycle</text>
  <text x="620" y="215" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${textMuted}">Stroma Fluid</text>
  <rect x="540" y="240" width="160" height="34" rx="8" fill="#8B5CF6" opacity="0.15" />
  <text x="620" y="262" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#7C3AED">CO₂ (Carbon Fixation)</text>
  <rect x="540" y="290" width="160" height="34" rx="8" fill="#F59E0B" opacity="0.2" />
  <text x="620" y="312" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#D97706">Yields C₆H₁₂O₆ (Glucose)</text>
</svg>`;
  } else if (
    combined.includes("metric") ||
    combined.includes("growth") ||
    combined.includes("revenue") ||
    combined.includes("%") ||
    combined.includes("kpi")
  ) {
    type = "chart";
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="c_barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${accent}" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.3" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="${bg}" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  <text x="60" y="65" font-family="system-ui, sans-serif" font-size="16" font-weight="800" fill="${textPrimary}" letter-spacing="1">
    QUANTIFIABLE METRICS &amp; PERFORMANCE TRAJECTORY
  </text>
  <line x1="100" y1="380" x2="720" y2="380" stroke="${textMuted}" stroke-opacity="0.4" stroke-width="1.5" />
  <line x1="100" y1="130" x2="100" y2="380" stroke="${textMuted}" stroke-opacity="0.4" stroke-width="1.5" />
  <rect x="150" y="240" width="80" height="140" rx="8" fill="url(#c_barGrad)" />
  <text x="190" y="225" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${accent}">+48%</text>
  <text x="190" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="${textMuted}">Phase 1</text>
  <rect x="290" y="180" width="80" height="200" rx="8" fill="url(#c_barGrad)" />
  <text x="330" y="165" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${accent}">+72%</text>
  <text x="330" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="${textMuted}">Phase 2</text>
  <rect x="430" y="210" width="80" height="170" rx="8" fill="url(#c_barGrad)" />
  <text x="470" y="195" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${accent}">85.4%</text>
  <text x="470" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="${textMuted}">Phase 3</text>
  <rect x="570" y="140" width="80" height="240" rx="8" fill="${accent}" />
  <text x="610" y="125" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="${accent}">99.2%</text>
  <text x="610" y="410" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${textPrimary}">Target</text>
</svg>`;
  } else {
    type = "diagram";
    const bullets = params.bullets || [];
    
    // Helper to extract clean title and detailed sub-points from each bullet
    const extractBoxContent = (rawBullet?: string, defaultLabel = "Core Pillar", defaultSub1 = "Strategic Setup", defaultSub2 = "Execution Criteria") => {
      if (!rawBullet) {
        return {
          title: defaultLabel,
          sub1: defaultSub1,
          sub2: defaultSub2,
        };
      }
      const clean = rawBullet.replace(/^[✓✔︎•*\d.\s]+/, "").trim();
      const colonIdx = clean.indexOf(":");
      let title = defaultLabel;
      let remainder = clean;
      if (colonIdx > 0 && colonIdx < 30) {
        title = clean.slice(0, colonIdx).trim();
        remainder = clean.slice(colonIdx + 1).trim();
      } else {
        const words = clean.split(/\s+/);
        title = words.slice(0, 3).join(" ");
        remainder = words.slice(3).join(" ") || clean;
      }

      // Split remainder into 2 concise sub-points
      const clauses = remainder
        .split(/[,.;]|\s+and\s+|\s+with\s+/i)
        .map((c) => c.trim())
        .filter((c) => c.length > 3);

      const sub1 = clauses[0] ? clauses[0].slice(0, 24) : defaultSub1;
      const sub2 = clauses[1] ? clauses[1].slice(0, 24) : (clauses[0] && clauses[0].length > 24 ? clauses[0].slice(24, 48) : defaultSub2);

      return {
        title: title.slice(0, 22),
        sub1: sub1.charAt(0).toUpperCase() + sub1.slice(1),
        sub2: sub2.charAt(0).toUpperCase() + sub2.slice(1),
      };
    };

    const box1 = extractBoxContent(bullets[0], "Architecture", "System Foundation", "Configuration Gates");
    const box2 = extractBoxContent(bullets[1], "Operational Flow", "Pipeline Execution", "Quality Guardrails");
    const box3 = extractBoxContent(bullets[2] || bullets[0], "Validation", "Automated Testing", "Release Readiness");

    const step1Title = escapeXml(box1.title);
    const step1Sub1 = escapeXml(box1.sub1);
    const step1Sub2 = escapeXml(box1.sub2);

    const step2Title = escapeXml(box2.title);
    const step2Sub1 = escapeXml(box2.sub1);
    const step2Sub2 = escapeXml(box2.sub2);

    const step3Title = escapeXml(box3.title);
    const step3Sub1 = escapeXml(box3.sub1);
    const step3Sub2 = escapeXml(box3.sub2);

    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="c_diag_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${cardBg}" />
    </linearGradient>
    <linearGradient id="c_diag_flow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accent}" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.6" />
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="20" fill="url(#c_diag_bg)" stroke="${accent}" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="60" y="65" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="${textPrimary}" letter-spacing="1">
    ${safeConcept} // SYSTEM TOPOLOGY &amp; WORKFLOW
  </text>
  <text x="60" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textMuted}">${safeCaption}</text>
  
  <!-- Box 01 -->
  <rect x="60" y="160" width="195" height="180" rx="16" fill="${cardBg}" stroke="${accent}" stroke-opacity="0.4" stroke-width="1.5" />
  <rect x="80" y="180" width="36" height="24" rx="6" fill="${accent}" fill-opacity="0.2" />
  <text x="98" y="196" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="${accent}">01</text>
  <text x="80" y="235" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">${step1Title}</text>
  <text x="80" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textMuted}">• ${step1Sub1}</text>
  <text x="80" y="295" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textMuted}">• ${step1Sub2}</text>
  
  <!-- Connector 1 -> 2 -->
  <path d="M 255 250 L 300 250" stroke="url(#c_diag_flow)" stroke-width="3" stroke-dasharray="5,4" />
  <polygon points="305,250 295,244 295,256" fill="${accent}" />
  
  <!-- Box 02 -->
  <rect x="305" y="150" width="200" height="200" rx="18" fill="${cardBg}" stroke="${accent}" stroke-width="2" />
  <rect x="325" y="170" width="36" height="24" rx="6" fill="${accent}" />
  <text x="343" y="186" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF">02</text>
  <text x="325" y="225" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">${step2Title}</text>
  <text x="325" y="265" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textMuted}">• ${step2Sub1}</text>
  <text x="325" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textMuted}">• ${step2Sub2}</text>
  
  <!-- Connector 2 -> 3 -->
  <path d="M 505 250 L 550 250" stroke="url(#c_diag_flow)" stroke-width="3" stroke-dasharray="5,4" />
  <polygon points="555,250 545,244 545,256" fill="${accent}" />
  
  <!-- Box 03 -->
  <rect x="555" y="160" width="195" height="180" rx="16" fill="${cardBg}" stroke="${accent}" stroke-opacity="0.4" stroke-width="1.5" />
  <rect x="575" y="180" width="36" height="24" rx="6" fill="${accent}" fill-opacity="0.2" />
  <text x="593" y="196" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="${accent}">03</text>
  <text x="575" y="235" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">${step3Title}</text>
  <text x="575" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textMuted}">• ${step3Sub1}</text>
  <text x="575" y="295" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textMuted}">• ${step3Sub2}</text>
</svg>`;
  }

  // Universal base64 encoder for Node and Browser runtimes
  let base64Data: string;
  try {
    if (typeof Buffer !== "undefined") {
      base64Data = Buffer.from(svg).toString("base64");
    } else {
      base64Data = btoa(unescape(encodeURIComponent(svg)));
    }
  } catch {
    base64Data = encodeURIComponent(svg);
  }

  return {
    imageUrl: base64Data.startsWith("%")
      ? `data:image/svg+xml;utf8,${base64Data}`
      : `data:image/svg+xml;base64,${base64Data}`,
    svgContent: svg,
    caption,
    concept: conceptName,
    type,
  };
}
