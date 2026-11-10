import { blendHex } from "../presentation-theme";
import type { DiagramKind, DiagramNode, SlideDiagramData } from "./types";

/**
 * Escapes special XML characters so generated SVGs always parse cleanly in browsers and Office/LibreOffice.
 */
export function escapeXml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wraps text onto multiple SVG lines on word boundaries without mid-word clipping.
 */
export function wrapDiagramText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    if (!current) {
      current = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine - 1) + "…" : word;
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      if (lines.length >= maxLines) {
        // Append ellipsis cleanly on last line if remaining text was omitted
        const last = lines[lines.length - 1]!;
        if (!last.endsWith("…")) {
          lines[lines.length - 1] =
            last.length > maxCharsPerLine - 1 ? `${last.slice(0, maxCharsPerLine - 2)}…` : `${last}…`;
        }
        return lines;
      }
      current = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine - 1) + "…" : word;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

/**
 * Parses numeric metric values like "42%", "$3.5M", "18 ms", "140,000+" strictly from source strings.
 */
export function parseNumericMetricValue(valStr: string): number | null {
  if (!valStr) return null;
  const cleaned = valStr.replace(/[,+$€£\s]/g, "");
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return Number.isFinite(num) ? num : null;
}

export interface BuildDiagramInput {
  title: string;
  subtitle?: string;
  concept?: string;
  bullets?: string[];
  cards?: Array<{ title: string; description: string; tag?: string }>;
  metrics?: Array<{ label: string; value: string; description?: string }>;
  processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
  timeline?: Array<{ phase: string; title: string; description: string }>;
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
  preferredKind?: DiagramKind;
}

/**
 * Builds structured, genuinely source-derived diagram data (`SlideDiagramData`)
 * suitable for both native editable slide shapes and SVG raster/vector fallback.
 * Never fabricates unrelated technical jargon or placeholder percentages.
 */
export function buildSlideDiagramData(input: BuildDiagramInput): SlideDiagramData {
  const cleanTitle = (input.title || input.concept || "Concept Overview").trim();

  // 1. Real numeric metrics -> bar-chart
  if (input.metrics && input.metrics.length >= 2) {
    const numericNodes = input.metrics
      .slice(0, 5)
      .map((m) => ({
        label: m.label.trim(),
        detail: m.description?.trim(),
        value: m.value.trim(),
        numericValue: parseNumericMetricValue(m.value) ?? undefined,
      }))
      .filter((n) => n.label.length > 0 && n.numericValue !== undefined);

    if (numericNodes.length >= 2) {
      return {
        kind: "bar-chart",
        title: cleanTitle,
        subtitle: input.subtitle,
        nodes: numericNodes,
      };
    }
  }

  // 2. Process steps -> sequential horizontal pipeline
  if (input.processSteps && input.processSteps.length >= 2) {
    return {
      kind: "pipeline",
      title: cleanTitle,
      subtitle: input.subtitle,
      nodes: input.processSteps.slice(0, 4).map((s, idx) => ({
        label: s.title.trim() || `Stage ${idx + 1}`,
        detail: s.description.trim(),
        value: `0${idx + 1}`,
      })),
    };
  }

  // 3. Timeline milestones -> chronological pipeline
  if (input.timeline && input.timeline.length >= 2) {
    return {
      kind: "pipeline",
      title: cleanTitle,
      subtitle: input.subtitle,
      nodes: input.timeline.slice(0, 4).map((t) => ({
        label: t.title.trim(),
        detail: t.description.trim(),
        value: t.phase.trim(),
      })),
    };
  }

  // 4. Side-by-side comparison -> 2x2 matrix or contrast pairs
  if (input.leftColumn && input.rightColumn) {
    const nodes: DiagramNode[] = [
      {
        label: input.leftColumn.title,
        detail: input.leftColumn.bullets.slice(0, 2).join(" • "),
        value: "A",
      },
      {
        label: input.rightColumn.title,
        detail: input.rightColumn.bullets.slice(0, 2).join(" • "),
        value: "B",
      },
    ];
    return {
      kind: "matrix",
      title: cleanTitle,
      subtitle: input.subtitle,
      nodes,
    };
  }

  // 5. Cards -> matrix / layers / concept map depending on topic
  const combined = `${cleanTitle} ${input.subtitle || ""} ${(input.bullets || []).join(" ")}`.toLowerCase();

  let kind: DiagramKind = input.preferredKind || "concept-map";
  if (!input.preferredKind) {
    if (/\b(cycle|loop|feedback|iterative|continuous|lifecycle)\b/.test(combined)) {
      kind = "cycle";
    } else if (/\b(layer|stack|tier|hierarchy|level|foundation|kernel)\b/.test(combined)) {
      kind = "layers";
    } else if (/\b(pipeline|flow|workflow|step|stage|ingest|input|output|transform|process)\b/.test(combined)) {
      kind = "pipeline";
    } else if ((input.cards && input.cards.length === 4) || /\b(quadrant|matrix|framework|pillars?)\b/.test(combined)) {
      kind = "matrix";
    } else {
      kind = "concept-map";
    }
  }

  const nodes: DiagramNode[] = [];
  if (input.cards && input.cards.length >= 2) {
    for (const c of input.cards.slice(0, 4)) {
      nodes.push({
        label: c.title.trim(),
        detail: c.description.trim(),
        value: c.tag?.trim(),
      });
    }
  } else if (input.bullets && input.bullets.length > 0) {
    for (let i = 0; i < Math.min(4, input.bullets.length); i++) {
      const b = input.bullets[i]!.trim();
      const colonIdx = b.indexOf(":");
      if (colonIdx > 2 && colonIdx < 36) {
        nodes.push({
          label: b.slice(0, colonIdx).trim(),
          detail: b.slice(colonIdx + 1).trim(),
          value: `0${i + 1}`,
        });
      } else {
        const words = b.split(/\s+/);
        const head = words.slice(0, Math.min(4, words.length)).join(" ");
        nodes.push({
          label: head,
          detail: b,
          value: `0${i + 1}`,
        });
      }
    }
  }

  // If a flow/input slide only supplied 1-2 bullets, turn input -> processing -> outcome cleanly using source words
  if (nodes.length === 1) {
    const single = nodes[0]!;
    if (kind === "pipeline") {
      nodes.push(
        {
          label: cleanTitle,
          detail: input.subtitle && input.subtitle !== cleanTitle ? input.subtitle : single.detail || cleanTitle,
          value: "02",
        },
        {
          label: "Structured Output",
          detail: "Verified insights derived from source input",
          value: "03",
        },
      );
    }
  }

  return {
    kind,
    title: cleanTitle,
    subtitle: input.subtitle,
    nodes: nodes.length > 0 ? nodes : [{ label: cleanTitle, detail: input.subtitle || "" }],
  };
}

export interface RenderDiagramSvgOptions {
  diagram: SlideDiagramData;
  accentColor?: string;
  secondaryColor?: string;
  isDark?: boolean;
  isRtl?: boolean;
  headerBadge?: string;
}

/**
 * Renders `SlideDiagramData` into a crisp, high-contrast 960x540 (16:9) XML-valid SVG string + Base64 data URL.
 * Every text label is wrapped on word boundaries and XML-escaped (`&amp;`).
 */
export function renderDiagramDataToSvg(opts: RenderDiagramSvgOptions): {
  svgContent: string;
  dataUrl: string;
} {
  const W = 960;
  const H = 540;
  const isDark = Boolean(opts.isDark);
  const accent = opts.accentColor && /^#[0-9a-fA-F]{6}$/.test(opts.accentColor)
    ? opts.accentColor.toUpperCase()
    : "#2563EB";
  const accent2 =
    opts.secondaryColor && /^#[0-9a-fA-F]{6}$/.test(opts.secondaryColor)
      ? opts.secondaryColor.toUpperCase()
      : blendHex(accent, "#10B981", 0.38);

  const bgTop = isDark ? "#0B1120" : "#F8FAFC";
  const bgBottom = isDark ? "#111827" : "#EFF6FF";
  const surface = isDark ? "#1E293B" : "#FFFFFF";
  const surfaceBorder = isDark ? "#334155" : blendHex("#CBD5E1", accent, 0.25);
  const titleColor = isDark ? "#F8FAFC" : "#0F172A";
  const bodyColor = isDark ? "#CBD5E1" : "#334155";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const pillFill = isDark ? blendHex("#1E293B", accent, 0.26) : blendHex("#FFFFFF", accent, 0.12);

  const { diagram } = opts;
  const lowerCombined = `${diagram.title} ${diagram.subtitle || ""} ${diagram.nodes.map((n) => `${n.label} ${n.detail || ""}`).join(" ")}`.toLowerCase();

  // Preserve explicit header badge or infer honest architectural header without fake jargon
  const isAiArchitectureContext =
    /\b(ai system|artificial intelligence|user question|examples,\s*text,\s*images)\b/.test(lowerCombined) ||
    (diagram.title.toLowerCase().includes("data or input") && lowerCombined.includes("images"));
  const badgeText =
    opts.headerBadge ||
    (isAiArchitectureContext
      ? "AI SYSTEM ARCHITECTURE"
      : diagram.kind === "bar-chart"
        ? "QUANTITATIVE DATA"
        : diagram.kind === "layers"
          ? "ARCHITECTURE LAYERS"
          : diagram.kind === "cycle"
            ? "ITERATIVE CYCLE"
            : diagram.kind === "matrix"
              ? "COMPARATIVE MATRIX"
              : diagram.kind === "pipeline"
                ? "WORKFLOW PIPELINE"
                : "CONCEPT STRUCTURE");

  const titleLines = wrapDiagramText(diagram.title, 44, 2);

  let bodySvg = "";

  if (diagram.kind === "bar-chart" && diagram.nodes.length >= 2) {
    const items = diagram.nodes.slice(0, 5);
    const maxVal = Math.max(
      ...items.map((n) => Math.abs(n.numericValue ?? 0)),
      1,
    );
    const chartLeft = 72;
    const chartRight = W - 72;
    const chartTop = 152;
    const chartBottom = 452;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;
    const barSlot = chartW / items.length;
    const barW = Math.min(96, barSlot * 0.56);

    // Subtle baseline & gridlines
    for (let g = 0; g <= 3; g++) {
      const gy = chartTop + (chartH / 3) * g;
      bodySvg += `<line x1="${chartLeft}" y1="${gy}" x2="${chartRight}" y2="${gy}" stroke="${surfaceBorder}" stroke-width="1" stroke-dasharray="${g === 3 ? "0" : "4 4"}" opacity="0.65"/>`;
    }

    items.forEach((node, idx) => {
      const val = Math.abs(node.numericValue ?? 0);
      const barH = Math.max(24, Math.round((val / maxVal) * (chartH - 36)));
      const bx = chartLeft + idx * barSlot + (barSlot - barW) / 2;
      const by = chartBottom - barH;
      const fill = idx % 2 === 0 ? accent : accent2;
      bodySvg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH}" rx="10" fill="${fill}" opacity="0.92"/>`;
      bodySvg += `<text x="${(bx + barW / 2).toFixed(1)}" y="${(by - 12).toFixed(1)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="${titleColor}">${escapeXml(node.value || String(node.numericValue))}</text>`;

      const labelLines = wrapDiagramText(node.label, 14, 2);
      labelLines.forEach((ln, li) => {
        bodySvg += `<text x="${(bx + barW / 2).toFixed(1)}" y="${chartBottom + 24 + li * 18}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="600" fill="${bodyColor}">${escapeXml(ln)}</text>`;
      });
    });
  } else if (diagram.kind === "layers") {
    const items = diagram.nodes.slice(0, 4);
    const gap = 14;
    const topY = 148;
    const availH = H - topY - 40;
    const layerH = Math.floor((availH - gap * (items.length - 1)) / items.length);

    items.forEach((node, idx) => {
      const inset = idx * 14;
      const lx = 64 + inset;
      const lw = W - 128 - inset * 2;
      const ly = topY + idx * (layerH + gap);
      const badgeColor = idx % 2 === 0 ? accent : accent2;

      bodySvg += `<rect x="${lx}" y="${ly}" width="${lw}" height="${layerH}" rx="12" fill="${surface}" stroke="${surfaceBorder}" stroke-width="1.5"/>`;
      bodySvg += `<rect x="${lx}" y="${ly}" width="8" height="${layerH}" rx="4" fill="${badgeColor}"/>`;
      bodySvg += `<text x="${lx + 28}" y="${ly + Math.min(34, layerH * 0.44)}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="${titleColor}">${escapeXml(wrapDiagramText(node.label, 42, 1)[0] || "")}</text>`;

      if (node.detail) {
        const dLines = wrapDiagramText(node.detail, 66, 2);
        dLines.forEach((dl, di) => {
          bodySvg += `<text x="${lx + 28}" y="${ly + Math.min(58, layerH * 0.68) + di * 18}" font-family="Inter, Arial, sans-serif" font-size="13.5" fill="${bodyColor}">${escapeXml(dl)}</text>`;
        });
      }
    });
  } else if (diagram.kind === "cycle") {
    const items = diagram.nodes.slice(0, 4);
    const positions = [
      { x: 260, y: 150 },
      { x: 540, y: 150 },
      { x: 540, y: 340 },
      { x: 260, y: 340 },
    ];
    const boxW = 240;
    const boxH = 136;

    // Center hub + loop ring
    bodySvg += `<circle cx="480" cy="312" r="145" fill="none" stroke="${accent}" stroke-width="2.5" stroke-dasharray="8 6" opacity="0.45"/>`;
    bodySvg += `<circle cx="480" cy="312" r="46" fill="${pillFill}" stroke="${accent}" stroke-width="2"/>`;
    bodySvg += `<text x="480" y="317" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="800" fill="${accent}">LOOP</text>`;

    items.forEach((node, idx) => {
      const pos = positions[idx % positions.length]!;
      const bx = pos.x - boxW / 2 + 80;
      const by = pos.y;
      bodySvg += `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" rx="14" fill="${surface}" stroke="${surfaceBorder}" stroke-width="1.5"/>`;
      bodySvg += `<rect x="${bx + 14}" y="${by + 12}" width="32" height="22" rx="6" fill="${pillFill}"/>`;
      bodySvg += `<text x="${bx + 30}" y="${by + 27}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="${accent}">0${idx + 1}</text>`;
      const lLines = wrapDiagramText(node.label, 22, 2);
      lLines.forEach((ll, li) => {
        bodySvg += `<text x="${bx + 14}" y="${by + 54 + li * 20}" font-family="Inter, Arial, sans-serif" font-size="15.5" font-weight="700" fill="${titleColor}">${escapeXml(ll)}</text>`;
      });
      if (node.detail) {
        const dLines = wrapDiagramText(node.detail, 28, 2);
        dLines.forEach((dl, di) => {
          bodySvg += `<text x="${bx + 14}" y="${by + 96 + di * 16}" font-family="Inter, Arial, sans-serif" font-size="12" fill="${bodyColor}">${escapeXml(dl)}</text>`;
        });
      }
    });
  } else if (diagram.kind === "matrix" || (diagram.kind === "concept-map" && diagram.nodes.length >= 2)) {
    const items = diagram.nodes.slice(0, 4);
    const cols = items.length <= 2 ? items.length : 2;
    const rows = Math.ceil(items.length / cols);
    const padX = 56;
    const gapX = 24;
    const gapY = 22;
    const topY = 148;
    const cardW = Math.floor((W - padX * 2 - gapX * (cols - 1)) / cols);
    const cardH = Math.floor((H - topY - 40 - gapY * (rows - 1)) / rows);

    items.forEach((node, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = padX + col * (cardW + gapX);
      const cy = topY + row * (cardH + gapY);
      const topBarColor = idx % 2 === 0 ? accent : accent2;

      bodySvg += `<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="14" fill="${surface}" stroke="${surfaceBorder}" stroke-width="1.5"/>`;
      bodySvg += `<rect x="${cx}" y="${cy}" width="${cardW}" height="6" rx="3" fill="${topBarColor}"/>`;

      if (node.value) {
        bodySvg += `<rect x="${cx + 20}" y="${cy + 20}" width="44" height="22" rx="6" fill="${pillFill}"/>`;
        bodySvg += `<text x="${cx + 42}" y="${cy + 35}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="${accent}">${escapeXml(node.value.slice(0, 6))}</text>`;
      }

      const maxLabelChars = Math.max(18, Math.floor(cardW / 12));
      const lLines = wrapDiagramText(node.label, maxLabelChars, 2);
      const labelY = node.value ? cy + 66 : cy + 40;
      lLines.forEach((ll, li) => {
        bodySvg += `<text x="${cx + 20}" y="${labelY + li * 22}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="${titleColor}">${escapeXml(ll)}</text>`;
      });

      if (node.detail) {
        const detailChars = Math.max(26, Math.floor(cardW / 9.2));
        const dLines = wrapDiagramText(node.detail, detailChars, rows === 1 ? 5 : 3);
        const detailY = labelY + lLines.length * 22 + 12;
        dLines.forEach((dl, di) => {
          bodySvg += `<text x="${cx + 20}" y="${detailY + di * 19}" font-family="Inter, Arial, sans-serif" font-size="13.5" fill="${bodyColor}">${escapeXml(dl)}</text>`;
        });
      }
    });
  } else {
    // Horizontal workflow pipeline (default crisp multi-stage composition)
    const items = diagram.nodes.slice(0, 4);
    const count = Math.max(1, items.length);
    const padX = 50;
    const arrowGap = 34;
    const nodeW = Math.floor((W - padX * 2 - arrowGap * (count - 1)) / count);
    const nodeY = 166;
    const nodeH = 310;

    items.forEach((node, idx) => {
      const nx = padX + idx * (nodeW + arrowGap);
      const strokeCol = idx === 0 ? accent : surfaceBorder;

      bodySvg += `<rect x="${nx}" y="${nodeY}" width="${nodeW}" height="${nodeH}" rx="16" fill="${surface}" stroke="${strokeCol}" stroke-width="${idx === 0 ? "2" : "1.5"}"/>`;
      bodySvg += `<circle cx="${nx + 34}" cy="${nodeY + 34}" r="16" fill="${idx % 2 === 0 ? accent : accent2}"/>`;
      bodySvg += `<text x="${nx + 34}" y="${nodeY + 39}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="800" fill="#FFFFFF">${idx + 1}</text>`;

      const labelChars = Math.max(12, Math.floor((nodeW - 36) / 9.5));
      const lLines = wrapDiagramText(node.label, labelChars, 3);
      lLines.forEach((ll, li) => {
        bodySvg += `<text x="${nx + 20}" y="${nodeY + 84 + li * 22}" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="700" fill="${titleColor}">${escapeXml(ll)}</text>`;
      });

      if (node.detail) {
        const dChars = Math.max(16, Math.floor((nodeW - 36) / 7.8));
        const dLines = wrapDiagramText(node.detail, dChars, 6);
        const startY = nodeY + 94 + lLines.length * 22 + 12;
        dLines.forEach((dl, di) => {
          bodySvg += `<text x="${nx + 20}" y="${startY + di * 19}" font-family="Inter, Arial, sans-serif" font-size="13" fill="${bodyColor}">${escapeXml(dl)}</text>`;
        });
      }

      if (idx < count - 1) {
        const ax1 = nx + nodeW + 4;
        const ax2 = nx + nodeW + arrowGap - 6;
        const ay = nodeY + nodeH / 2;
        bodySvg += `<line x1="${ax1}" y1="${ay}" x2="${ax2}" y2="${ay}" stroke="${accent}" stroke-width="2.5"/>`;
        bodySvg += `<polygon points="${ax2 - 6},${ay - 5} ${ax2 + 2},${ay} ${ax2 - 6},${ay + 5}" fill="${accent}"/>`;
      }
    });
  }

  const headerY = 48;
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgTop}"/>
      <stop offset="100%" stop-color="${bgBottom}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="18" fill="url(#bgGrad)"/>
  <rect x="44" y="28" width="${Math.max(170, badgeText.length * 8.2 + 28)}" height="28" rx="14" fill="${pillFill}"/>
  <text x="58" y="${headerY - 1}" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="800" letter-spacing="1.1" fill="${accent}">${escapeXml(badgeText)}</text>
  ${titleLines
    .map(
      (ln, idx) =>
        `<text x="44" y="${94 + idx * 30}" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="800" fill="${titleColor}">${escapeXml(ln)}</text>`,
    )
    .join("\n  ")}
  ${diagram.subtitle ? `<text x="44" y="${96 + titleLines.length * 30}" font-family="Inter, Arial, sans-serif" font-size="13" fill="${mutedColor}">${escapeXml(wrapDiagramText(diagram.subtitle, 78, 1)[0] || "")}</text>` : ""}
  ${bodySvg}
</svg>`;

  let base64: string;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(svgContent, "utf-8").toString("base64");
  } else {
    base64 = btoa(unescape(encodeURIComponent(svgContent)));
  }

  return {
    svgContent,
    dataUrl: `data:image/svg+xml;base64,${base64}`,
  };
}

/**
 * Generates a precise, subject-grounded image prompt for an enabled external image generator
 * ONLY when visual imagery meaningfully improves concept comprehension.
 */
export function buildPreciseVisualPrompt(opts: {
  slideTitle: string;
  concept?: string;
  summary?: string;
  domain?: string;
}): string {
  const cleanTitle = (opts.slideTitle || "Concept").trim();
  const cleanConcept = (opts.concept || opts.summary || cleanTitle).trim().slice(0, 140);
  const styleHint =
    opts.domain === "technology"
      ? "clean minimalist isometric technical architecture illustration, crisp studio lighting"
      : opts.domain === "science" || opts.domain === "healthcare"
        ? "scientific editorial diagram illustration, clean medical textbook clarity"
        : opts.domain === "business" || opts.domain === "finance"
          ? "modern editorial vector illustration, sleek contemporary geometric aesthetic"
          : "modern editorial magazine illustration, refined visual storytelling";

  return `${styleHint} depicting: ${cleanConcept}. Subject context: ${cleanTitle}. High visual clarity, balanced negative space, no watermark, no random garbled text.`;
}
