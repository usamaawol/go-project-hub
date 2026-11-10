import { extractRealMetrics } from "./presentation-pipeline/content-analyzer";
import {
  buildSlideDiagramData,
  renderDiagramDataToSvg,
} from "./presentation-pipeline/diagram-synthesizer";

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
 * Generates an undulating, glowing 3D wireframe mesh SVG inspired by modern presentation design (Gamma benchmark).
 * Uses perspective mathematical warping and radiant neon gradient strokes with glowing nodes.
 */
export function generateGamma3DMeshSvg(options?: {
  width?: number;
  height?: number;
  isDark?: boolean;
  accentColor?: string;
  theme?: "cyan-emerald" | "violet-cyan" | "emerald-blue" | "sunset";
}): {
  svg: string;
  dataUrl: string;
} {
  const w = options?.width || 800;
  const h = options?.height || 800;
  const isDark = options?.isDark !== false;
  const rows = 20;
  const cols = 18;
  const grid: Array<Array<{ x: number; y: number; u: number; v: number; elevation: number }>> = [];

  for (let r = 0; r <= rows; r++) {
    const row: Array<{ x: number; y: number; u: number; v: number; elevation: number }> = [];
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const v = r / rows;
      const pers = 0.45 + 0.65 * v;
      const x = (u - 0.5) * w * 1.4 * pers + w * 0.5;
      const elevation = Math.sin(u * 6.5 + v * 3.2) * 42 + Math.cos(u * 3.8 - v * 5.4) * 32;
      const y = v * h * 0.92 + elevation * (0.35 + 0.85 * v);
      row.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        u,
        v,
        elevation,
      });
    }
    grid.push(row);
  }

  let paths = "";
  // Horizontal curves
  for (let r = 0; r <= rows; r++) {
    let d = `M ${grid[r]![0]!.x} ${grid[r]![0]!.y}`;
    for (let c = 1; c <= cols; c++) {
      const prev = grid[r]![c - 1]!;
      const curr = grid[r]![c]!;
      const cx = (prev.x + curr.x) / 2;
      const cy = (prev.y + curr.y) / 2;
      d += ` Q ${prev.x} ${prev.y} ${cx} ${cy}`;
    }
    const last = grid[r]![cols]!;
    d += ` L ${last.x} ${last.y}`;
    const opacity = (0.3 + 0.65 * (r / rows)).toFixed(2);
    paths += `<path d="${d}" fill="none" stroke="url(#gammaMeshGrad)" stroke-width="1.3" stroke-opacity="${opacity}" />\n`;
  }

  // Vertical curves
  for (let c = 0; c <= cols; c++) {
    let d = `M ${grid[0]![c]!.x} ${grid[0]![c]!.y}`;
    for (let r = 1; r <= rows; r++) {
      const prev = grid[r - 1]![c]!;
      const curr = grid[r]![c]!;
      const cx = (prev.x + curr.x) / 2;
      const cy = (prev.y + curr.y) / 2;
      d += ` Q ${prev.x} ${prev.y} ${cx} ${cy}`;
    }
    const last = grid[rows]![c]!;
    d += ` L ${last.x} ${last.y}`;
    const opacity = (0.25 + 0.6 * Math.sin((c / cols) * Math.PI)).toFixed(2);
    paths += `<path d="${d}" fill="none" stroke="url(#gammaMeshGrad)" stroke-width="1.1" stroke-opacity="${opacity}" />\n`;
  }

  // Crest glowing nodes
  let nodes = "";
  for (let r = 3; r <= rows; r += 2) {
    for (let c = 2; c <= cols; c += 2) {
      const pt = grid[r]![c]!;
      if (pt.elevation > 15) {
        const rad = pt.elevation > 35 ? 2.5 : 1.8;
        nodes += `<circle cx="${pt.x}" cy="${pt.y}" r="${rad}" fill="#34D399" opacity="0.85" />\n`;
      }
    }
  }

  const bgGradient = isDark
    ? `<radialGradient id="gammaMeshDarkBg" cx="60%" cy="40%" r="75%">
        <stop offset="0%" stop-color="#0E1B38" />
        <stop offset="50%" stop-color="#080E21" />
        <stop offset="100%" stop-color="#040711" />
      </radialGradient>`
    : `<linearGradient id="gammaMeshDarkBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F1F5F9" />
        <stop offset="100%" stop-color="#E2E8F0" />
      </linearGradient>`;

  const svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${bgGradient}
    <linearGradient id="gammaMeshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06B6D4" />
      <stop offset="40%" stop-color="#10B981" />
      <stop offset="75%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
    <filter id="gammaNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#gammaMeshDarkBg)" />
  ${paths}
  <g filter="url(#gammaNeonGlow)">
    ${nodes}
  </g>
</svg>`;

  let base64 = "";
  try {
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(svg).toString("base64");
    } else {
      base64 = btoa(unescape(encodeURIComponent(svg)));
    }
  } catch {
    base64 = encodeURIComponent(svg);
  }

  return {
    svg,
    dataUrl: base64.startsWith("%")
      ? `data:image/svg+xml;utf8,${base64}`
      : `data:image/svg+xml;base64,${base64}`,
  };
}

function truncateSvgWord(str: string, maxLen: number): string {
  const s = (str || "").trim();
  if (s.length <= maxLen) return s;
  const sub = s.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxLen * 0.45)) {
    return sub.slice(0, lastSpace).trim();
  }
  return sub.trim();
}

/**
 * Client-compatible Contextual Visual Synthesizer.
 * Generates genuine, source-grounded vector diagrams and quantitative charts cleanly
 * without fabricating unrelated ML/Transformer labels or placeholder metrics.
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
  const cleanBullets = (params.bullets || []).filter((b) => Boolean(b && b.trim()));
  const conceptName =
    params.concept || truncateSvgWord(params.title.replace(/^(slide|section|\d+)[—:.\s]+/i, ""), 48);
  const caption = params.subtitle || conceptName;
  const extractedMetrics = extractRealMetrics(
    `${params.title}\n${params.subtitle || ""}\n${cleanBullets.join("\n")}`,
  ).filter((m) => typeof m.numericValue === "number");

  const diagram = buildSlideDiagramData({
    title: params.title || conceptName,
    subtitle: params.subtitle,
    concept: conceptName,
    bullets: cleanBullets,
    metrics: extractedMetrics.length >= 2 ? extractedMetrics : undefined,
  });

  const { svgContent, dataUrl } = renderDiagramDataToSvg({
    diagram,
    accentColor: params.accentColor || "#2563EB",
    isDark: Boolean(params.isDark),
  });

  return {
    imageUrl: dataUrl,
    svgContent,
    caption,
    concept: conceptName,
    type: diagram.kind === "bar-chart" ? "chart" : "diagram",
  };
}
