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

  let svg: string;
  let type: "picture" | "graph" | "diagram" | "chart" = "diagram";

  if (
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
    svg = `<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="480" rx="20" fill="${bg}" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  <text x="60" y="65" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="${textPrimary}" letter-spacing="1">
    ${conceptName.toUpperCase()} // TOPOLOGY &amp; WORKFLOW
  </text>
  <text x="60" y="90" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">${caption}</text>
  <rect x="60" y="170" width="180" height="150" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <circle cx="95" cy="205" r="14" fill="${accent}" />
  <text x="95" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF">01</text>
  <text x="120" y="210" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Discovery</text>
  <text x="80" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Requirements</text>
  <text x="80" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Creative Brief</text>
  <path d="M 240 245 L 295 245" stroke="${accent}" stroke-width="3" stroke-dasharray="4,4" />
  <polygon points="300,245 290,239 290,251" fill="${accent}" />
  <rect x="310" y="170" width="180" height="150" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="2" />
  <circle cx="345" cy="205" r="14" fill="${accent}" />
  <text x="345" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF">02</text>
  <text x="370" y="210" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Architecture</text>
  <text x="330" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Design Strategy</text>
  <text x="330" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Visual Concepts</text>
  <path d="M 490 245 L 545 245" stroke="${accent}" stroke-width="3" stroke-dasharray="4,4" />
  <polygon points="550,245 540,239 540,251" fill="${accent}" />
  <rect x="560" y="170" width="180" height="150" rx="16" fill="${cardBg}" stroke="${accent}" stroke-width="1.5" />
  <circle cx="595" cy="205" r="14" fill="${accent}" />
  <text x="595" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF">03</text>
  <text x="620" y="210" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${textPrimary}">Delivery</text>
  <text x="580" y="250" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Frontend Build</text>
  <text x="580" y="275" font-family="system-ui, sans-serif" font-size="11" fill="${textMuted}">• Final Approval</text>
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
