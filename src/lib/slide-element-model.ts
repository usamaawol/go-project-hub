/**
 * DocuMind Universal Slide Element Model
 * 
 * Provides a unified, fully editable element representation for every slide:
 * - Coordinates calibrated to 16:9 widescreen canvas (1333 x 750 px).
 * - Exact 1:1 mapping with PPTX: 100 canvas px = 1.0 inch in PowerPoint (13.333" x 7.5").
 * - Supports drag-and-drop repositioning, resize handles, inline text editing,
 *   font styling, colors, alignment, shapes, images, and PowerPoint export fidelity.
 */

import type { SlidePreviewItem } from "./presentation-session-client";
import { type ThemeTokens, stripHex } from "./presentation-theme";
import { buildContextualVisual, generateGamma3DMeshSvg } from "./presentation-visual-generator";
import { generateDefaultCoverElements, getCoverTemplateById } from "./cover-templates-registry";
import { getDefaultAssignmentMetadata } from "./assignment-types";

export const SLIDE_CANVAS_WIDTH = 1333;
export const SLIDE_CANVAS_HEIGHT = 750;

export type SlideElementRole =
  | "title"
  | "subtitle"
  | "category"
  | "body"
  | "bullet"
  | "card"
  | "badge"
  | "shape"
  | "image"
  | "diagram"
  | "metric-value"
  | "metric-label"
  | "step-number"
  | "step-title"
  | "step-desc"
  | "quote-text"
  | "quote-author"
  | "footer"
  | "custom";

export interface SlideElement {
  id: string;
  type: "text" | "shape" | "image" | "card" | "line";
  role?: SlideElementRole;
  x: number; // 0 to 1333 px
  y: number; // 0 to 750 px
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;

  // Text formatting
  text?: string;
  fontFamily?: string;
  fontSize?: number; // pt (e.g. 14, 24, 36)
  fontWeight?: "normal" | "bold" | "500" | "600" | "700" | "800";
  fontStyle?: "normal" | "italic";
  underline?: boolean;
  textColor?: string; // hex
  textAlign?: "left" | "center" | "right" | "justify";
  letterSpacing?: number;
  lineHeight?: number;

  // Shape attributes
  shapeType?: "rect" | "roundRect" | "circle" | "pill" | "line";
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;

  // Image / Visual attributes
  imageUrl?: string;
  imageFit?: "contain" | "cover";
  altText?: string;
  svgContent?: string;

  // Parent or group reference
  groupId?: string;
}

/**
 * Converts any slide into an array of editable SlideElements
 * placed on a 1333 x 750 widescreen canvas.
 */
export function convertSlideToElements(
  slide: SlidePreviewItem,
  tokens: ThemeTokens,
): SlideElement[] {
  // If slide already has manual elements, return them
  if (slide.elements && slide.elements.length > 0) {
    return slide.elements;
  }

  const elements: SlideElement[] = [];
  const W = SLIDE_CANVAS_WIDTH;
  const H = SLIDE_CANVAS_HEIGHT;

  const fontTitle = tokens.fontTitle || "Inter";
  const fontBody = tokens.fontBody || "Inter";
  const textPrimary = tokens.textPrimary || "#0F172A";
  const textSecondary = tokens.textSecondary || "#475569";
  const textMuted = tokens.textMuted || "#94A3B8";
  const accent = tokens.accent || "#2563EB";
  const cardBg = tokens.cardBg || (tokens.isDark ? "#1E293B" : "#F8FAFC");
  const cardBorder = tokens.cardBorder || (tokens.isDark ? "#334155" : "#E2E8F0");
  const cardText = tokens.cardText || textPrimary;
  const cardMuted = tokens.cardMuted || textSecondary;

  let zIndex = 1;

  // 1. Assignment Cover Slide
  if (slide.layout === "assignment-cover") {
    const meta = slide.assignmentMetadata || getDefaultAssignmentMetadata();
    const tplId = meta.coverTemplateId || "classic-university";
    const template = getCoverTemplateById(tplId);
    const coverEls = (meta.customCoverElements && meta.customCoverElements.length > 0)
      ? meta.customCoverElements.map((el) => ({
          ...el,
          x: (el.x / 794) * W,
          y: (el.y / 1123) * H,
          width: (el.width / 794) * W,
          height: (el.height / 1123) * H,
        }))
      : generateDefaultCoverElements(template, meta, W, H);

    return coverEls.map((ce, idx) => ({
      id: ce.id || `cover-el-${idx}`,
      type: (ce.type as any) || "shape",
      role: ce.isMetadataField ? (ce.isMetadataField as any) : "custom",
      x: Math.round(ce.x),
      y: Math.round(ce.y),
      width: Math.round(ce.width),
      height: Math.round(ce.height),
      zIndex: ce.zIndex || idx + 1,
      text: ce.text,
      fontFamily: ce.fontFamily || fontTitle,
      fontSize: ce.fontSize ? Math.round(ce.fontSize) : 16,
      fontWeight: ce.fontWeight as any,
      fontStyle: ce.fontStyle as any,
      textColor: ce.textColor,
      textAlign: ce.textAlign as any,
      shapeType: ce.shapeType === "circle" ? "circle" : ce.borderRadius ? "roundRect" : "rect",
      fillColor: ce.fillColor,
      borderColor: ce.borderColor,
      borderWidth: ce.borderWidth,
      borderRadius: ce.borderRadius,
      imageUrl: ce.imageUrl,
      svgContent: ce.svgContent,
    }));
  }

  // Common Top Accent Bar for all standard slides
  elements.push({
    id: `${slide.id}-accent-bar`,
    type: "shape",
    role: "shape",
    shapeType: "rect",
    x: 0,
    y: 0,
    width: W,
    height: 8,
    fillColor: accent,
    zIndex: zIndex++,
  });

  // Slide Category Tag / Indicator
  if (slide.layout !== "title") {
    elements.push({
      id: `${slide.id}-category-badge`,
      type: "shape",
      role: "badge",
      shapeType: "pill",
      x: 100,
      y: 45,
      width: Math.max(120, (slide.categoryTag || "PRESENTATION").length * 11 + 24),
      height: 28,
      fillColor: `${accent}18`,
      borderColor: `${accent}40`,
      borderWidth: 1,
      borderRadius: 14,
      zIndex: zIndex++,
    });

    elements.push({
      id: `${slide.id}-category-text`,
      type: "text",
      role: "category",
      x: 106,
      y: 50,
      width: Math.max(108, (slide.categoryTag || "PRESENTATION").length * 11 + 12),
      height: 18,
      text: (slide.categoryTag || "PRESENTATION").toUpperCase(),
      fontFamily: fontTitle,
      fontSize: 10,
      fontWeight: "700",
      textColor: accent,
      textAlign: "center",
      letterSpacing: 1.5,
      zIndex: zIndex++,
    });

    elements.push({
      id: `${slide.id}-slide-num`,
      type: "text",
      role: "category",
      x: 340,
      y: 50,
      width: 200,
      height: 18,
      text: `SLIDE 0${slide.slideNumber}`,
      fontFamily: fontTitle,
      fontSize: 10,
      fontWeight: "600",
      textColor: textMuted,
      letterSpacing: 1,
      zIndex: zIndex++,
    });
  }

  // Common Slide Header (Title + Subtitle)
  if (slide.layout === "title") {
    // 2. HERO TITLE SLIDE (Gamma Benchmark Layout)
    elements.push({
      id: `${slide.id}-tag-pill`,
      type: "shape",
      role: "badge",
      shapeType: "pill",
      x: 100,
      y: 110,
      width: 240,
      height: 36,
      fillColor: `${accent}15`,
      borderColor: `${accent}40`,
      borderWidth: 1,
      borderRadius: 18,
      zIndex: zIndex++,
    });

    elements.push({
      id: `${slide.id}-tag-text`,
      type: "text",
      role: "category",
      x: 115,
      y: 118,
      width: 210,
      height: 20,
      text: (slide.categoryTag || "STRATEGIC OVERVIEW").toUpperCase(),
      fontFamily: fontTitle,
      fontSize: 11,
      fontWeight: "700",
      textColor: accent,
      textAlign: "center",
      letterSpacing: 2,
      zIndex: zIndex++,
    });

    elements.push({
      id: `${slide.id}-title`,
      type: "text",
      role: "title",
      x: 100,
      y: 175,
      width: 680,
      height: 170,
      text: slide.title,
      fontFamily: fontTitle,
      fontSize: slide.title.length > 50 ? 32 : 40,
      fontWeight: "800",
      textColor: textPrimary,
      lineHeight: 1.15,
      zIndex: zIndex++,
    });

    if (slide.subtitle) {
      elements.push({
        id: `${slide.id}-subtitle`,
        type: "text",
        role: "subtitle",
        x: 100,
        y: 365,
        width: 680,
        height: 70,
        text: slide.subtitle,
        fontFamily: fontBody,
        fontSize: 18,
        fontWeight: "normal",
        fontStyle: "italic",
        textColor: textSecondary,
        zIndex: zIndex++,
      });
    }

    elements.push({
      id: `${slide.id}-divider`,
      type: "shape",
      role: "shape",
      shapeType: "rect",
      x: 100,
      y: 450,
      width: 260,
      height: 5,
      fillColor: accent,
      zIndex: zIndex++,
    });

    // Right Visual Asset (Verified image or 3D wireframe mesh)
    const meshData = generateGamma3DMeshSvg({ isDark: tokens.isDark, accentColor: accent }).dataUrl;
    elements.push({
      id: `${slide.id}-hero-visual`,
      type: "image",
      role: "image",
      x: 820,
      y: 130,
      width: 413,
      height: 480,
      borderRadius: 24,
      borderColor: `${accent}40`,
      borderWidth: 1.5,
      imageUrl: slide.visual?.imageUrl || meshData,
      zIndex: zIndex++,
    });
  } else {
    // Standard Title & Subtitle
    const titleH = slide.title.length > 60 ? 75 : 55;
    elements.push({
      id: `${slide.id}-title`,
      type: "text",
      role: "title",
      x: 100,
      y: 85,
      width: 1133,
      height: titleH,
      text: slide.title,
      fontFamily: fontTitle,
      fontSize: slide.title.length > 60 ? 24 : 30,
      fontWeight: "800",
      textColor: textPrimary,
      lineHeight: 1.2,
      zIndex: zIndex++,
    });

    if (slide.subtitle) {
      elements.push({
        id: `${slide.id}-subtitle`,
        type: "text",
        role: "subtitle",
        x: 100,
        y: 85 + titleH + 4,
        width: 1133,
        height: 32,
        text: slide.subtitle,
        fontFamily: fontBody,
        fontSize: 14,
        fontStyle: "italic",
        textColor: textSecondary,
        zIndex: zIndex++,
      });
    }
  }

  const contentStartY = slide.subtitle ? 185 : 160;
  const contentMaxH = 490;

  // 3. Layout Specific Element Decomposition
  switch (slide.layout) {
    case "agenda": {
      const topics = slide.bullets || ["Introduction", "Key Findings", "Strategy", "Execution"];
      const cols = 2;
      const cardW = 540;
      const cardH = 65;
      const gapX = 35;
      const gapY = 16;

      topics.slice(0, 6).forEach((topic, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const cardX = 100 + c * (cardW + gapX);
        const cardY = contentStartY + 20 + r * (cardH + gapY);

        elements.push({
          id: `${slide.id}-agenda-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: cardX,
          y: cardY,
          width: cardW,
          height: cardH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 14,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-agenda-num-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "roundRect",
          x: cardX + 16,
          y: cardY + 14,
          width: 38,
          height: 38,
          fillColor: accent,
          borderRadius: 10,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-agenda-num-text-${idx}`,
          type: "text",
          role: "badge",
          x: cardX + 16,
          y: cardY + 22,
          width: 38,
          height: 20,
          text: `0${idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 12,
          fontWeight: "700",
          textColor: "#FFFFFF",
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-agenda-text-${idx}`,
          type: "text",
          role: "bullet",
          x: cardX + 68,
          y: cardY + 20,
          width: cardW - 85,
          height: 28,
          text: topic,
          fontFamily: fontBody,
          fontSize: 14,
          fontWeight: "600",
          textColor: cardText,
          zIndex: zIndex++,
        });
      });
      break;
    }

    case "hero-split": {
      // Left 3D wireframe mesh or verified image
      const meshData = generateGamma3DMeshSvg({ isDark: tokens.isDark, accentColor: accent }).dataUrl;
      const leftW = 480;
      elements.push({
        id: `${slide.id}-hero-img`,
        type: "image",
        role: "image",
        x: 100,
        y: contentStartY + 10,
        width: leftW,
        height: contentMaxH - 30,
        borderRadius: 20,
        borderColor: `${accent}40`,
        borderWidth: 1.5,
        imageUrl: slide.visual?.imageUrl || meshData,
        zIndex: zIndex++,
      });

      // Right detail cards
      const rightX = 100 + leftW + 40;
      const rightW = W - rightX - 100;
      const details = slide.heroSplit?.details || slide.bullets?.slice(0, 3) || [
        "Core structural milestone configured for execution.",
        "Continuous automated telemetry verification.",
      ];

      if (slide.heroSplit?.headline) {
        elements.push({
          id: `${slide.id}-split-headline`,
          type: "text",
          role: "title",
          x: rightX,
          y: contentStartY + 10,
          width: rightW,
          height: 48,
          text: slide.heroSplit.headline,
          fontFamily: fontTitle,
          fontSize: 20,
          fontWeight: "700",
          textColor: textPrimary,
          zIndex: zIndex++,
        });
      }

      const cardStartY = contentStartY + (slide.heroSplit?.headline ? 68 : 10);
      const cardH = 88;
      details.slice(0, 3).forEach((dText, idx) => {
        const cY = cardStartY + idx * (cardH + 14);
        elements.push({
          id: `${slide.id}-split-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: rightX,
          y: cY,
          width: rightW,
          height: cardH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 14,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-split-num-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "roundRect",
          x: rightX + 16,
          y: cY + 16,
          width: 32,
          height: 32,
          fillColor: accent,
          borderRadius: 8,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-split-num-text-${idx}`,
          type: "text",
          role: "badge",
          x: rightX + 16,
          y: cY + 22,
          width: 32,
          height: 20,
          text: `0${idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 11,
          fontWeight: "700",
          textColor: "#FFFFFF",
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-split-text-${idx}`,
          type: "text",
          role: "bullet",
          x: rightX + 60,
          y: cY + 16,
          width: rightW - 76,
          height: cardH - 32,
          text: dText,
          fontFamily: fontBody,
          fontSize: 13,
          fontWeight: "500",
          textColor: cardText,
          lineHeight: 1.3,
          zIndex: zIndex++,
        });
      });

      // Bottom Callout Pill
      const pillText = slide.calloutPill?.text || slide.heroSplit?.highlight;
      if (pillText) {
        elements.push({
          id: `${slide.id}-split-pill-bg`,
          type: "shape",
          role: "shape",
          shapeType: "roundRect",
          x: rightX,
          y: contentStartY + contentMaxH - 55,
          width: rightW,
          height: 40,
          fillColor: "#10B98115",
          borderColor: "#10B98150",
          borderWidth: 1,
          borderRadius: 10,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-split-pill-text`,
          type: "text",
          role: "badge",
          x: rightX + 16,
          y: contentStartY + contentMaxH - 45,
          width: rightW - 32,
          height: 24,
          text: `💡 ${pillText}`,
          fontFamily: fontBody,
          fontSize: 12,
          fontWeight: "600",
          textColor: "#059669",
          zIndex: zIndex++,
        });
      }
      break;
    }

    case "bento-grid": {
      const items = slide.bentoGrid || [
        { title: "Core Architecture", description: slide.bullets?.[0] || "Foundational service boundaries.", tag: "01", icon: "🏛️" },
        { title: "Strategic Workflow", description: slide.bullets?.[1] || "Automated delivery framework.", tag: "02", icon: "⚡" },
        { title: "Telemetry & Metrics", description: slide.bullets?.[2] || "Real-time indicators tracking throughput.", tag: "03", icon: "📊" },
        { title: "Target Deliverable", description: slide.bullets?.[3] || "Production milestone release.", tag: "04", icon: "🎯" },
      ];

      const cols = 2;
      const bW = 540;
      const bH = 175;
      const gapX = 35;
      const gapY = 20;

      items.slice(0, 4).forEach((item, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const bX = 100 + c * (bW + gapX);
        const bY = contentStartY + 15 + r * (bH + gapY);

        elements.push({
          id: `${slide.id}-bento-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: bX,
          y: bY,
          width: bW,
          height: bH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 16,
          zIndex: zIndex++,
        });

        // Top accent line
        elements.push({
          id: `${slide.id}-bento-line-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "rect",
          x: bX,
          y: bY,
          width: bW,
          height: 4,
          fillColor: accent,
          zIndex: zIndex++,
        });

        // Icon + Title
        elements.push({
          id: `${slide.id}-bento-title-${idx}`,
          type: "text",
          role: "step-title",
          x: bX + 22,
          y: bY + 18,
          width: bW - 100,
          height: 28,
          text: `${item.icon || "⚡"} ${item.title}`,
          fontFamily: fontTitle,
          fontSize: 16,
          fontWeight: "700",
          textColor: cardText,
          zIndex: zIndex++,
        });

        // Tag
        elements.push({
          id: `${slide.id}-bento-tag-${idx}`,
          type: "text",
          role: "badge",
          x: bX + bW - 70,
          y: bY + 18,
          width: 50,
          height: 22,
          text: item.tag || `0${idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 10,
          fontWeight: "700",
          textColor: accent,
          textAlign: "center",
          zIndex: zIndex++,
        });

        // Description
        elements.push({
          id: `${slide.id}-bento-desc-${idx}`,
          type: "text",
          role: "step-desc",
          x: bX + 22,
          y: bY + 54,
          width: bW - 44,
          height: 105,
          text: item.description,
          fontFamily: fontBody,
          fontSize: 13,
          textColor: cardMuted,
          lineHeight: 1.35,
          zIndex: zIndex++,
        });
      });
      break;
    }

    case "two-column": {
      const colW = 540;
      const colH = contentMaxH - 40;
      const leftCol = slide.leftColumn || {
        title: "Traditional Framework",
        bullets: slide.bullets?.slice(0, 3) || ["Manual review bottlenecks", "Linear deployment delays"],
      };
      const rightCol = slide.rightColumn || {
        title: "Modern Solution",
        bullets: slide.bullets?.slice(3, 6) || ["Real-time automated pipelines", "Instant telemetry validation"],
      };

      // Left Column
      elements.push({
        id: `${slide.id}-col-left-bg`,
        type: "shape",
        role: "card",
        shapeType: "roundRect",
        x: 100,
        y: contentStartY + 15,
        width: colW,
        height: colH,
        fillColor: cardBg,
        borderColor: cardBorder,
        borderWidth: 1,
        borderRadius: 16,
        zIndex: zIndex++,
      });

      elements.push({
        id: `${slide.id}-col-left-title`,
        type: "text",
        role: "title",
        x: 125,
        y: contentStartY + 35,
        width: colW - 50,
        height: 35,
        text: leftCol.title,
        fontFamily: fontTitle,
        fontSize: 18,
        fontWeight: "700",
        textColor: cardText,
        zIndex: zIndex++,
      });

      leftCol.bullets.forEach((b, bIdx) => {
        elements.push({
          id: `${slide.id}-col-left-b-${bIdx}`,
          type: "text",
          role: "bullet",
          x: 125,
          y: contentStartY + 85 + bIdx * 55,
          width: colW - 50,
          height: 48,
          text: `• ${b}`,
          fontFamily: fontBody,
          fontSize: 14,
          textColor: cardText,
          lineHeight: 1.3,
          zIndex: zIndex++,
        });
      });

      // Right Column
      const rX = 100 + colW + 35;
      elements.push({
        id: `${slide.id}-col-right-bg`,
        type: "shape",
        role: "card",
        shapeType: "roundRect",
        x: rX,
        y: contentStartY + 15,
        width: colW,
        height: colH,
        fillColor: cardBg,
        borderColor: accent,
        borderWidth: 1.5,
        borderRadius: 16,
        zIndex: zIndex++,
      });

      elements.push({
        id: `${slide.id}-col-right-title`,
        type: "text",
        role: "title",
        x: rX + 25,
        y: contentStartY + 35,
        width: colW - 50,
        height: 35,
        text: rightCol.title,
        fontFamily: fontTitle,
        fontSize: 18,
        fontWeight: "700",
        textColor: accent,
        zIndex: zIndex++,
      });

      rightCol.bullets.forEach((b, bIdx) => {
        elements.push({
          id: `${slide.id}-col-right-b-${bIdx}`,
          type: "text",
          role: "bullet",
          x: rX + 25,
          y: contentStartY + 85 + bIdx * 55,
          width: colW - 50,
          height: 48,
          text: `✓ ${b}`,
          fontFamily: fontBody,
          fontSize: 14,
          textColor: cardText,
          lineHeight: 1.3,
          zIndex: zIndex++,
        });
      });
      break;
    }

    case "metrics": {
      const metricsList = slide.metrics || [
        { label: "Throughput Efficiency", value: "+78%", description: "Measured across benchmark runs." },
        { label: "Response Latency", value: "< 24ms", description: "99th percentile response SLA." },
        { label: "Target Availability", value: "99.95%", description: "Verified across regions." },
      ];

      const count = Math.min(4, metricsList.length);
      const mW = (W - 200 - (count - 1) * 25) / count;
      const mH = 260;

      metricsList.slice(0, count).forEach((m, idx) => {
        const mX = 100 + idx * (mW + 25);
        const mY = contentStartY + 50;

        elements.push({
          id: `${slide.id}-metric-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: mX,
          y: mY,
          width: mW,
          height: mH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 20,
          zIndex: zIndex++,
        });

        // Top accent line
        elements.push({
          id: `${slide.id}-metric-line-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "rect",
          x: mX + 25,
          y: mY + 25,
          width: 50,
          height: 4,
          fillColor: accent,
          zIndex: zIndex++,
        });

        // Giant value
        elements.push({
          id: `${slide.id}-metric-val-${idx}`,
          type: "text",
          role: "metric-value",
          x: mX + 25,
          y: mY + 45,
          width: mW - 50,
          height: 65,
          text: m.value,
          fontFamily: fontTitle,
          fontSize: 38,
          fontWeight: "800",
          textColor: accent,
          zIndex: zIndex++,
        });

        // Label
        elements.push({
          id: `${slide.id}-metric-lbl-${idx}`,
          type: "text",
          role: "metric-label",
          x: mX + 25,
          y: mY + 120,
          width: mW - 50,
          height: 35,
          text: m.label,
          fontFamily: fontTitle,
          fontSize: 16,
          fontWeight: "700",
          textColor: cardText,
          zIndex: zIndex++,
        });

        // Description
        if (m.description) {
          elements.push({
            id: `${slide.id}-metric-desc-${idx}`,
            type: "text",
            role: "bullet",
            x: mX + 25,
            y: mY + 165,
            width: mW - 50,
            height: 70,
            text: m.description,
            fontFamily: fontBody,
            fontSize: 12,
            textColor: cardMuted,
            lineHeight: 1.3,
            zIndex: zIndex++,
          });
        }
      });
      break;
    }

    case "process": {
      const steps = slide.processSteps || [
        { stepNumber: 1, title: "Discovery & Analysis", description: slide.bullets?.[0] || "Requirements definition." },
        { stepNumber: 2, title: "Architecture Design", description: slide.bullets?.[1] || "System modeling." },
        { stepNumber: 3, title: "Implementation", description: slide.bullets?.[2] || "Iterative build gates." },
        { stepNumber: 4, title: "Deployment & Scale", description: slide.bullets?.[3] || "Production verification." },
      ];

      const sCount = Math.min(4, steps.length);
      const sW = (W - 200 - (sCount - 1) * 20) / sCount;
      const sH = 280;

      steps.slice(0, sCount).forEach((st, idx) => {
        const sX = 100 + idx * (sW + 20);
        const sY = contentStartY + 40;

        elements.push({
          id: `${slide.id}-step-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: sX,
          y: sY,
          width: sW,
          height: sH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 16,
          zIndex: zIndex++,
        });

        // Glowing divider line
        elements.push({
          id: `${slide.id}-step-line-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "rect",
          x: sX,
          y: sY,
          width: sW,
          height: 4,
          fillColor: accent,
          zIndex: zIndex++,
        });

        // Number
        elements.push({
          id: `${slide.id}-step-num-${idx}`,
          type: "text",
          role: "step-number",
          x: sX + 20,
          y: sY + 20,
          width: 80,
          height: 30,
          text: `0${st.stepNumber || idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 18,
          fontWeight: "800",
          textColor: accent,
          letterSpacing: 2,
          zIndex: zIndex++,
        });

        // Title
        elements.push({
          id: `${slide.id}-step-title-${idx}`,
          type: "text",
          role: "step-title",
          x: sX + 20,
          y: sY + 58,
          width: sW - 40,
          height: 45,
          text: st.title,
          fontFamily: fontTitle,
          fontSize: 15,
          fontWeight: "700",
          textColor: cardText,
          zIndex: zIndex++,
        });

        // Description
        elements.push({
          id: `${slide.id}-step-desc-${idx}`,
          type: "text",
          role: "step-desc",
          x: sX + 20,
          y: sY + 110,
          width: sW - 40,
          height: 145,
          text: st.description,
          fontFamily: fontBody,
          fontSize: 12,
          textColor: cardMuted,
          lineHeight: 1.35,
          zIndex: zIndex++,
        });
      });
      break;
    }

    case "quote": {
      const qText = slide.quote?.text || slide.quoteBox?.text || slide.subtitle || "Quality is not an act, it is a habit.";
      const qAuthor = slide.quote?.author || slide.quoteBox?.citation || "Strategic Benchmark";

      elements.push({
        id: `${slide.id}-quote-box`,
        type: "shape",
        role: "card",
        shapeType: "roundRect",
        x: 180,
        y: contentStartY + 30,
        width: 973,
        height: 260,
        fillColor: cardBg,
        borderColor: accent,
        borderWidth: 1.5,
        borderRadius: 24,
        zIndex: zIndex++,
      });

      elements.push({
        id: `${slide.id}-quote-text`,
        type: "text",
        role: "quote-text",
        x: 220,
        y: contentStartY + 70,
        width: 893,
        height: 120,
        text: `“${qText}”`,
        fontFamily: fontTitle,
        fontSize: 22,
        fontWeight: "bold",
        fontStyle: "italic",
        textColor: cardText,
        textAlign: "center",
        lineHeight: 1.3,
        zIndex: zIndex++,
      });

      elements.push({
        id: `${slide.id}-quote-author`,
        type: "text",
        role: "quote-author",
        x: 220,
        y: contentStartY + 205,
        width: 893,
        height: 35,
        text: `— ${qAuthor}`,
        fontFamily: fontTitle,
        fontSize: 15,
        fontWeight: "600",
        textColor: accent,
        textAlign: "center",
        zIndex: zIndex++,
      });
      break;
    }

    case "diagram-explainer":
    case "text-visual":
    case "image-led": {
      const leftW = 580;
      const rightW = 513;
      const bullets = slide.bullets || ["Core structural framework established.", "Deployment verified."];

      // Left Bullet Cards
      const bH = (contentMaxH - (bullets.length - 1) * 16) / Math.max(1, bullets.length);
      bullets.slice(0, 4).forEach((b, idx) => {
        const bY = contentStartY + idx * (bH + 16);
        elements.push({
          id: `${slide.id}-vis-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: 100,
          y: bY,
          width: leftW,
          height: bH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 14,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-vis-badge-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "roundRect",
          x: 120,
          y: bY + 14,
          width: 32,
          height: 32,
          fillColor: accent,
          borderRadius: 8,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-vis-badge-txt-${idx}`,
          type: "text",
          role: "badge",
          x: 120,
          y: bY + 20,
          width: 32,
          height: 20,
          text: `0${idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 11,
          fontWeight: "700",
          textColor: "#FFFFFF",
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-vis-txt-${idx}`,
          type: "text",
          role: "bullet",
          x: 168,
          y: bY + 16,
          width: leftW - 88,
          height: bH - 32,
          text: b,
          fontFamily: fontBody,
          fontSize: 13,
          fontWeight: "500",
          textColor: cardText,
          lineHeight: 1.3,
          zIndex: zIndex++,
        });
      });

      // Right Visual Box
      const vX = 100 + leftW + 40;
      elements.push({
        id: `${slide.id}-visual-container`,
        type: "shape",
        role: "shape",
        shapeType: "roundRect",
        x: vX,
        y: contentStartY,
        width: rightW,
        height: contentMaxH,
        fillColor: cardBg,
        borderColor: cardBorder,
        borderWidth: 1,
        borderRadius: 18,
        zIndex: zIndex++,
      });

      // Contextual visual or verified image
      const vImg = slide.visual?.imageUrl || buildContextualVisual({
        title: slide.title,
        subtitle: slide.subtitle,
        bullets: slide.bullets,
        concept: slide.visual?.concept || slide.title,
        accentColor: accent,
        isDark: tokens.isDark,
      }).imageUrl;

      elements.push({
        id: `${slide.id}-visual-image`,
        type: "image",
        role: "image",
        x: vX + 16,
        y: contentStartY + 16,
        width: rightW - 32,
        height: contentMaxH - 70,
        borderRadius: 12,
        imageUrl: vImg,
        zIndex: zIndex++,
      });

      // Caption
      elements.push({
        id: `${slide.id}-visual-caption`,
        type: "text",
        role: "caption",
        x: vX + 16,
        y: contentStartY + contentMaxH - 45,
        width: rightW - 32,
        height: 30,
        text: slide.visual?.caption || slide.visual?.concept || slide.subtitle || "Conceptual Architecture",
        fontFamily: fontBody,
        fontSize: 11,
        fontStyle: "italic",
        textColor: cardMuted,
        textAlign: "center",
        zIndex: zIndex++,
      });
      break;
    }

    case "conclusion": {
      elements.push({
        id: `${slide.id}-concl-bg`,
        type: "shape",
        role: "card",
        shapeType: "roundRect",
        x: 100,
        y: contentStartY + 15,
        width: 1133,
        height: contentMaxH - 30,
        fillColor: cardBg,
        borderColor: cardBorder,
        borderWidth: 1,
        borderRadius: 20,
        zIndex: zIndex++,
      });

      const bullets = slide.bullets || [
        "Core strategic objectives validated and documented.",
        "Operational readiness criteria satisfied for launch.",
        "Stakeholder sign-off configured for next milestone.",
      ];

      bullets.slice(0, 5).forEach((b, idx) => {
        elements.push({
          id: `${slide.id}-concl-check-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "circle",
          x: 140,
          y: contentStartY + 45 + idx * 65,
          width: 32,
          height: 32,
          fillColor: accent,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-concl-check-txt-${idx}`,
          type: "text",
          role: "badge",
          x: 140,
          y: contentStartY + 49 + idx * 65,
          width: 32,
          height: 24,
          text: "✓",
          fontFamily: fontTitle,
          fontSize: 14,
          fontWeight: "bold",
          textColor: "#FFFFFF",
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-concl-bullet-${idx}`,
          type: "text",
          role: "bullet",
          x: 190,
          y: contentStartY + 48 + idx * 65,
          width: 1000,
          height: 48,
          text: b,
          fontFamily: fontBody,
          fontSize: 15,
          fontWeight: "500",
          textColor: cardText,
          lineHeight: 1.3,
          zIndex: zIndex++,
        });
      });
      break;
    }

    default: {
      // Standard bullets / content
      const bullets = slide.bullets || ["Key analysis and findings."];
      if (bullets.length <= 2) {
        // High-impact single wide card
        elements.push({
          id: `${slide.id}-content-card`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: 100,
          y: contentStartY + 25,
          width: 1133,
          height: contentMaxH - 50,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 20,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-content-stripe`,
          type: "shape",
          role: "shape",
          shapeType: "rect",
          x: 100,
          y: contentStartY + 25,
          width: 8,
          height: contentMaxH - 50,
          fillColor: accent,
          zIndex: zIndex++,
        });

        bullets.forEach((b, idx) => {
          elements.push({
            id: `${slide.id}-bullet-${idx}`,
            type: "text",
            role: "bullet",
            x: 140,
            y: contentStartY + 70 + idx * 110,
            width: 1050,
            height: 90,
            text: `• ${b}`,
            fontFamily: fontBody,
            fontSize: 18,
            fontWeight: "500",
            textColor: cardText,
            lineHeight: 1.4,
            zIndex: zIndex++,
          });
        });
      } else {
        // 2-column bento content cards
        const half = Math.ceil(bullets.length / 2);
        const colW = 540;

        // Left Card
        elements.push({
          id: `${slide.id}-content-card-left`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: 100,
          y: contentStartY + 15,
          width: colW,
          height: contentMaxH - 30,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 16,
          zIndex: zIndex++,
        });

        bullets.slice(0, half).forEach((b, idx) => {
          elements.push({
            id: `${slide.id}-bullet-l-${idx}`,
            type: "text",
            role: "bullet",
            x: 125,
            y: contentStartY + 40 + idx * 70,
            width: colW - 50,
            height: 60,
            text: `• ${b}`,
            fontFamily: fontBody,
            fontSize: 14,
            fontWeight: "500",
            textColor: cardText,
            lineHeight: 1.35,
            zIndex: zIndex++,
          });
        });

        // Right Card
        const rX = 100 + colW + 35;
        elements.push({
          id: `${slide.id}-content-card-right`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: rX,
          y: contentStartY + 15,
          width: colW,
          height: contentMaxH - 30,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 16,
          zIndex: zIndex++,
        });

        bullets.slice(half).forEach((b, idx) => {
          elements.push({
            id: `${slide.id}-bullet-r-${idx}`,
            type: "text",
            role: "bullet",
            x: rX + 25,
            y: contentStartY + 40 + idx * 70,
            width: colW - 50,
            height: 60,
            text: `• ${b}`,
            fontFamily: fontBody,
            fontSize: 14,
            fontWeight: "500",
            textColor: cardText,
            lineHeight: 1.35,
            zIndex: zIndex++,
          });
        });
      }
      break;
    }
  }

  // Common Slide Footer
  if (slide.layout !== "title") {
    elements.push({
      id: `${slide.id}-footer-text`,
      type: "text",
      role: "footer",
      x: 100,
      y: 695,
      width: 750,
      height: 24,
      text: `${tokens.name}  |  Slide ${slide.slideNumber}`,
      fontFamily: fontBody,
      fontSize: 10,
      textColor: textMuted,
      zIndex: zIndex++,
    });
  }

  return elements;
}

/**
 * Synchronizes element changes back to the top-level slide properties
 * (title, subtitle, bullets) to maintain synchronization with thumbnails and session.
 */
export function syncElementsToSlide(
  elements: SlideElement[],
  slide: SlidePreviewItem,
): SlidePreviewItem {
  const updatedSlide = { ...slide, elements: [...elements] };

  // Sync title
  const titleEl = elements.find((e) => e.role === "title" || e.id?.includes("title"));
  if (titleEl && titleEl.text !== undefined) {
    updatedSlide.title = titleEl.text;
    if (titleEl.fontSize) updatedSlide.titleFontSize = titleEl.fontSize;
    if (titleEl.fontWeight) updatedSlide.isTitleBold = titleEl.fontWeight === "bold" || titleEl.fontWeight === "700" || titleEl.fontWeight === "800";
    if (titleEl.textColor) updatedSlide.textColor = titleEl.textColor;
  }

  // Sync subtitle
  const subtitleEl = elements.find((e) => e.role === "subtitle" || e.id?.includes("subtitle"));
  if (subtitleEl && subtitleEl.text !== undefined) {
    updatedSlide.subtitle = subtitleEl.text;
    if (subtitleEl.fontStyle) updatedSlide.isSubtitleItalic = subtitleEl.fontStyle === "italic";
  }

  // Sync bullets
  const bulletEls = elements
    .filter((e) => e.role === "bullet" && e.text)
    .sort((a, b) => a.y - b.y);

  if (bulletEls.length > 0) {
    updatedSlide.bullets = bulletEls.map((e) => e.text!.replace(/^[•✓✔︎\d.\s]+/, "").trim());
  }

  // Sync visual image if an image was updated
  const imgEl = elements.find((e) => e.type === "image" && e.imageUrl);
  if (imgEl && imgEl.imageUrl) {
    updatedSlide.visual = {
      ...(updatedSlide.visual || { concept: updatedSlide.title }),
      type: "picture",
      concept: updatedSlide.visual?.concept || updatedSlide.title,
      imageUrl: imgEl.imageUrl,
    };
  }

  return updatedSlide;
}
