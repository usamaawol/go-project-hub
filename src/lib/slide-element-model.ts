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
import {
  type ThemeTokens,
  getLuminance,
  resolveSlideSurfaceTokens,
  stripHex,
} from "./presentation-theme";
import { buildContextualVisual, generateGamma3DMeshSvg } from "./presentation-visual-generator";
import { parseNumericMetricValue } from "./presentation-pipeline/diagram-synthesizer";
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
  | "caption"
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
  tokens?: ThemeTokens,
  totalSlides?: number,
): SlideElement[] {
  if (!slide) return [];

  // If slide already has manual elements, return them
  if (slide.elements && slide.elements.length > 0) {
    return slide.elements;
  }

  const elements: SlideElement[] = [];
  const W = SLIDE_CANVAS_WIDTH;
  const H = SLIDE_CANVAS_HEIGHT;

  const baseTokens = tokens || ({} as ThemeTokens);
  const safeTokens =
    baseTokens && baseTokens.bg
      ? resolveSlideSurfaceTokens(baseTokens, slide.slideSurface, slide.customBgColor)
      : baseTokens;

  const fontTitle = safeTokens.fontTitle || "Inter";
  const fontBody = safeTokens.fontBody || "Inter";
  const textPrimary = safeTokens.textPrimary || "#0F172A";
  const textSecondary = safeTokens.textSecondary || "#475569";
  const textMuted = safeTokens.textMuted || "#94A3B8";
  const accent = safeTokens.accent || "#2563EB";
  const accentTint = safeTokens.accentTint || `${accent}18`;
  const badgeTextColor = getLuminance(accent) > 0.45 ? "#090D16" : "#FFFFFF";
  const textAlignDir: "left" | "right" = slide.isRtl ? "right" : "left";
  const cardBg = safeTokens.cardBg || (safeTokens.isDark ? "#1E293B" : "#F8FAFC");
  const cardBorder = safeTokens.cardBorder || (safeTokens.isDark ? "#334155" : "#E2E8F0");
  const cardText = safeTokens.cardText || textPrimary;
  const cardMuted = safeTokens.cardMuted || textSecondary;

  let zIndex = 1;

  // 1. Assignment Cover Slide (Native 16:9 widescreen layout when not custom-positioned; respects optional fields cleanly)
  if (slide.layout === "assignment-cover") {
    const meta = slide.assignmentMetadata || getDefaultAssignmentMetadata();
    if (meta.customCoverElements && meta.customCoverElements.length > 0) {
      return meta.customCoverElements.map((ce, idx) => ({
        id: ce.id || `cover-el-${idx}`,
        type: (ce.type as any) || "shape",
        role: ce.isMetadataField ? (ce.isMetadataField as any) : "custom",
        x: Math.round((ce.x / 794) * W),
        y: Math.round((ce.y / 1123) * H),
        width: Math.round((ce.width / 794) * W),
        height: Math.round((ce.height / 1123) * H),
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

    const coverAccent = meta.accentColor && /^#[0-9a-f]{6}$/i.test(meta.accentColor) ? meta.accentColor : accent;
    const coverEls: SlideElement[] = [
      {
        id: `${slide.id}-ac-top-bar`,
        type: "shape",
        role: "shape",
        shapeType: "rect",
        x: 0,
        y: 0,
        width: W,
        height: 10,
        fillColor: coverAccent,
        zIndex: zIndex++,
      },
      {
        id: `${slide.id}-ac-frame`,
        type: "shape",
        role: "card",
        shapeType: "roundRect",
        x: 72,
        y: 52,
        width: W - 144,
        height: H - 104,
        fillColor: cardBg,
        borderColor: coverAccent,
        borderWidth: 1.5,
        borderRadius: 20,
        zIndex: zIndex++,
      },
      {
        id: `${slide.id}-ac-side-stripe`,
        type: "shape",
        role: "shape",
        shapeType: "rect",
        x: 72,
        y: 52,
        width: 14,
        height: H - 104,
        fillColor: coverAccent,
        zIndex: zIndex++,
      },
    ];

    const instLines = [meta.universityName, meta.collegeOrFaculty, meta.department]
      .map((s) => (s || "").trim())
      .filter(Boolean);
    if (instLines.length > 0) {
      coverEls.push({
        id: `${slide.id}-ac-inst`,
        type: "text",
        role: "universityName",
        x: 132,
        y: 92,
        width: W - 240,
        height: 36,
        text: instLines.join("  •  ").toUpperCase(),
        fontFamily: fontTitle,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.4,
        textColor: coverAccent,
        zIndex: zIndex++,
      });
    }

    const typeLabel =
      meta.customTypeLabel?.trim() ||
      (meta.assignmentType
        ? meta.assignmentType.replace(/-/g, " ").toUpperCase()
        : "PRESENTATION");
    coverEls.push({
      id: `${slide.id}-ac-pill`,
      type: "shape",
      role: "badge",
      shapeType: "pill",
      x: 132,
      y: instLines.length > 0 ? 148 : 112,
      width: Math.min(380, Math.max(180, typeLabel.length * 10 + 44)),
      height: 32,
      fillColor: accentTint,
      borderColor: coverAccent,
      borderWidth: 1,
      borderRadius: 16,
      zIndex: zIndex++,
    });
    coverEls.push({
      id: `${slide.id}-ac-pill-txt`,
      type: "text",
      role: "badge",
      x: 142,
      y: (instLines.length > 0 ? 148 : 112) + 6,
      width: Math.min(360, Math.max(160, typeLabel.length * 10 + 24)),
      height: 20,
      text: typeLabel,
      fontFamily: fontTitle,
      fontSize: 10,
      fontWeight: "700",
      textColor: coverAccent,
      textAlign: "center",
      zIndex: zIndex++,
    });

    const titleY = instLines.length > 0 ? 210 : 178;
    const coverTitle = slide.title || meta.assignmentTitle || "Academic Presentation";
    coverEls.push({
      id: `${slide.id}-ac-title`,
      type: "text",
      role: "assignmentTitle",
      x: 132,
      y: titleY,
      width: W - 260,
      height: 150,
      text: coverTitle,
      fontFamily: fontTitle,
      fontSize: coverTitle.length > 52 ? 30 : 38,
      fontWeight: "800",
      textColor: cardText,
      lineHeight: 1.18,
      zIndex: zIndex++,
    });

    const courseStr = [meta.courseCode, meta.courseName].map((s) => (s || "").trim()).filter(Boolean).join(" — ");
    if (courseStr) {
      coverEls.push({
        id: `${slide.id}-ac-course`,
        type: "text",
        role: "courseName",
        x: 132,
        y: titleY + 162,
        width: W - 260,
        height: 40,
        text: courseStr,
        fontFamily: fontBody,
        fontSize: 17,
        fontWeight: "600",
        textColor: cardMuted,
        zIndex: zIndex++,
      });
    }

    const metaPairs: string[] = [];
    if (meta.studentName?.trim()) {
      metaPairs.push(
        `Prepared by: ${meta.studentName.trim()}${meta.studentId?.trim() ? ` (${meta.studentId.trim()})` : ""}`,
      );
    } else if (meta.groupMembers && meta.groupMembers.length > 0) {
      metaPairs.push(`Prepared by: ${meta.groupMembers.map((g) => g.fullName).filter(Boolean).join(", ")}`);
    }
    if (meta.instructorName?.trim()) metaPairs.push(`Instructor: ${meta.instructorName.trim()}`);
    const termStr = [meta.semester, meta.academicYear, meta.submissionDate]
      .map((s) => (s || "").trim())
      .filter(Boolean)
      .join("  •  ");
    if (termStr) metaPairs.push(termStr);

    if (metaPairs.length > 0) {
      coverEls.push({
        id: `${slide.id}-ac-meta-divider`,
        type: "shape",
        role: "shape",
        shapeType: "rect",
        x: 132,
        y: 515,
        width: W - 264,
        height: 2,
        fillColor: cardBorder,
        zIndex: zIndex++,
      });
      coverEls.push({
        id: `${slide.id}-ac-meta-details`,
        type: "text",
        role: "studentName",
        x: 132,
        y: 536,
        width: W - 264,
        height: 110,
        text: metaPairs.join("\n"),
        fontFamily: fontBody,
        fontSize: 14,
        fontWeight: "500",
        textColor: cardText,
        lineHeight: 1.5,
        zIndex: zIndex++,
      });
    }

    return coverEls;
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
    const tagLabel = (slide.categoryTag || "PRESENTATION").toUpperCase();
    const pillW = Math.min(480, Math.max(170, tagLabel.length * 10 + 44));
    const pillX = slide.isRtl ? W - 100 - pillW : 100;
    elements.push({
      id: `${slide.id}-category-badge`,
      type: "shape",
      role: "badge",
      shapeType: "pill",
      x: pillX,
      y: 42,
      width: pillW,
      height: 28,
      fillColor: accentTint,
      borderColor: accent,
      borderWidth: 1,
      borderRadius: 14,
      zIndex: zIndex++,
    });

    elements.push({
      id: `${slide.id}-category-text`,
      type: "text",
      role: "category",
      x: pillX + 10,
      y: 47,
      width: pillW - 20,
      height: 18,
      text: tagLabel,
      fontFamily: fontTitle,
      fontSize: 9.5,
      fontWeight: "700",
      textColor: accent,
      textAlign: "center",
      letterSpacing: 1.2,
      zIndex: zIndex++,
    });

    const numStr = totalSlides ? `SLIDE ${String(slide.slideNumber).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}` : `SLIDE ${String(slide.slideNumber).padStart(2, "0")}`;
    elements.push({
      id: `${slide.id}-slide-num`,
      type: "text",
      role: "category",
      x: slide.isRtl ? 100 : W - 280,
      y: 47,
      width: 180,
      height: 18,
      text: numStr,
      fontFamily: fontTitle,
      fontSize: 9.5,
      fontWeight: "600",
      textColor: textMuted,
      textAlign: slide.isRtl ? "left" : "right",
      letterSpacing: 1,
      zIndex: zIndex++,
    });
  }

  let contentStartY = 160;
  let contentMaxH = 512;

  // Common Slide Header (Title + Subtitle)
  if (slide.layout === "title") {
    // 2. HERO TITLE SLIDE (Gamma Benchmark Layout)
    const coverTag = (slide.categoryTag || "OVERVIEW").toUpperCase();
    const coverPillW = Math.min(460, Math.max(180, coverTag.length * 9 + 44));
    elements.push({
      id: `${slide.id}-tag-pill`,
      type: "shape",
      role: "badge",
      shapeType: "pill",
      x: 100,
      y: 105,
      width: coverPillW,
      height: 34,
      fillColor: accentTint,
      borderColor: accent,
      borderWidth: 1,
      borderRadius: 17,
      zIndex: zIndex++,
    });

    elements.push({
      id: `${slide.id}-tag-text`,
      type: "text",
      role: "category",
      x: 112,
      y: 112,
      width: coverPillW - 24,
      height: 20,
      text: coverTag,
      fontFamily: fontTitle,
      fontSize: 10.5,
      fontWeight: "700",
      textColor: accent,
      textAlign: "center",
      letterSpacing: 1.5,
      zIndex: zIndex++,
    });

    const titleStr = slide.title || "Untitled Slide";
    const heroFont = slide.titleFontSize || (titleStr.length > 52 ? 32 : titleStr.length > 34 ? 36 : 42);
    const heroTitleH = titleStr.length > 42 ? 175 : 130;
    elements.push({
      id: `${slide.id}-title`,
      type: "text",
      role: "title",
      x: 100,
      y: 168,
      width: 680,
      height: heroTitleH,
      text: titleStr,
      fontFamily: fontTitle,
      fontSize: heroFont,
      fontWeight: "800",
      textColor: textPrimary,
      textAlign: textAlignDir,
      lineHeight: 1.15,
      zIndex: zIndex++,
    });

    const coverSubY = 168 + heroTitleH + 16;
    if (slide.subtitle) {
      elements.push({
        id: `${slide.id}-subtitle`,
        type: "text",
        role: "subtitle",
        x: 100,
        y: coverSubY,
        width: 680,
        height: 92,
        text: slide.subtitle,
        fontFamily: fontBody,
        fontSize: 16.5,
        fontWeight: "normal",
        fontStyle: "italic",
        textColor: textSecondary,
        textAlign: textAlignDir,
        lineHeight: 1.32,
        zIndex: zIndex++,
      });
    }

    elements.push({
      id: `${slide.id}-divider`,
      type: "shape",
      role: "shape",
      shapeType: "rect",
      x: 100,
      y: coverSubY + (slide.subtitle ? 108 : 16),
      width: 240,
      height: 5,
      fillColor: accent,
      zIndex: zIndex++,
    });

    // Right Visual Asset (Verified image or 3D wireframe mesh)
    const meshData = generateGamma3DMeshSvg({
      isDark: Boolean(safeTokens.isDark),
      accentColor: accent,
    }).dataUrl;
    elements.push({
      id: `${slide.id}-hero-visual`,
      type: "image",
      role: "image",
      x: 820,
      y: 120,
      width: 413,
      height: 500,
      borderRadius: 24,
      borderColor: cardBorder,
      borderWidth: 1.5,
      imageUrl: slide.visual?.imageUrl || meshData,
      zIndex: zIndex++,
    });
  } else {
    // Standard Title & Subtitle with dynamic non-overlapping vertical layout
    const titleStr = slide.title || "Untitled Slide";
    const resolvedTitleSize =
      slide.titleFontSize || (titleStr.length > 48 ? 22 : titleStr.length > 36 ? 25 : 28);
    const estTitleLines =
      titleStr.length > 42 || (titleStr.length > 32 && titleStr === titleStr.toUpperCase()) ? 2 : 1;
    const titleH = estTitleLines > 1 ? 80 : 50;
    elements.push({
      id: `${slide.id}-title`,
      type: "text",
      role: "title",
      x: 100,
      y: 84,
      width: 1133,
      height: titleH,
      text: titleStr,
      fontFamily: fontTitle,
      fontSize: resolvedTitleSize,
      fontWeight: slide.isTitleBold === false ? "600" : "800",
      textColor: slide.textColor || textPrimary,
      textAlign: textAlignDir,
      lineHeight: 1.18,
      zIndex: zIndex++,
    });

    const subtitleY = 84 + titleH + 6;
    let subtitleH = 0;
    if (slide.subtitle) {
      subtitleH = slide.subtitle.length > 92 ? 46 : 30;
      elements.push({
        id: `${slide.id}-subtitle`,
        type: "text",
        role: "subtitle",
        x: 100,
        y: subtitleY,
        width: 1133,
        height: subtitleH,
        text: slide.subtitle,
        fontFamily: fontBody,
        fontSize: 13.5,
        fontStyle: slide.isSubtitleItalic === false ? "normal" : "italic",
        textColor: textSecondary,
        textAlign: textAlignDir,
        lineHeight: 1.25,
        zIndex: zIndex++,
      });
    }

    contentStartY = subtitleY + subtitleH + 14;
    contentMaxH = Math.max(360, 682 - contentStartY);
  }

  // 3. Layout Specific Element Decomposition
  switch (slide.layout) {
    case "title":
    case "assignment-cover": {
      // Hero cover elements are already constructed above; never fall through into default content cards.
      break;
    }

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
          textColor: badgeTextColor,
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
      const meshData = generateGamma3DMeshSvg({ isDark: safeTokens.isDark, accentColor: accent }).dataUrl;
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
        borderColor: cardBorder,
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

      const headlineStr = slide.heroSplit?.headline?.trim();
      const showSubHeadline = Boolean(
        headlineStr &&
          headlineStr.length <= 62 &&
          headlineStr.toLowerCase() !== (slide.title || "").trim().toLowerCase() &&
          headlineStr.toLowerCase() !== (slide.subtitle || "").trim().toLowerCase(),
      );

      if (showSubHeadline && headlineStr) {
        elements.push({
          id: `${slide.id}-split-headline`,
          type: "text",
          role: "subtitle",
          x: rightX,
          y: contentStartY + 10,
          width: rightW,
          height: 40,
          text: headlineStr,
          fontFamily: fontTitle,
          fontSize: 16,
          fontWeight: "700",
          textColor: textPrimary,
          zIndex: zIndex++,
        });
      }

      const rawPillText = slide.calloutPill?.text || slide.heroSplit?.highlight;
      const pillText =
        rawPillText &&
        rawPillText.trim().toLowerCase() !== (slide.subtitle || "").trim().toLowerCase()
          ? rawPillText
          : undefined;
      const cardStartY = contentStartY + (showSubHeadline ? 58 : 10);
      const pillReserve = pillText ? 60 : 0;
      const availSplitH = contentMaxH - (cardStartY - contentStartY) - pillReserve;
      const cardCount = Math.min(3, Math.max(1, details.length));
      const cardH = Math.min(120, Math.floor((availSplitH - (cardCount - 1) * 14) / cardCount));
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
          width: 40,
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
          width: 40,
          height: 20,
          text: `0${idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 11,
          fontWeight: "700",
          textColor: badgeTextColor,
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-split-text-${idx}`,
          type: "text",
          role: "bullet",
          x: rightX + 68,
          y: cY + 16,
          width: rightW - 84,
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

      // Bottom Callout Pill (only shown when non-duplicate highlight exists)
      if (pillText) {
        const pillFill = safeTokens.isDark ? "#064E3B" : "#ECFDF5";
        const pillBorder = safeTokens.isDark ? "#10B981" : "#6EE7B7";
        const pillInk = safeTokens.isDark ? "#6EE7B7" : "#047857";
        elements.push({
          id: `${slide.id}-split-pill-bg`,
          type: "shape",
          role: "shape",
          shapeType: "roundRect",
          x: rightX,
          y: contentStartY + contentMaxH - 58,
          width: rightW,
          height: 52,
          fillColor: pillFill,
          borderColor: pillBorder,
          borderWidth: 1,
          borderRadius: 12,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-split-pill-text`,
          type: "text",
          role: "badge",
          x: rightX + 16,
          y: contentStartY + contentMaxH - 50,
          width: rightW - 32,
          height: 36,
          text: `💡 ${pillText.length > 86 ? pillText.slice(0, 83).replace(/\s+\S*$/, "") + "…" : pillText}`,
          fontFamily: fontBody,
          fontSize: 11.5,
          fontWeight: "600",
          textColor: pillInk,
          lineHeight: 1.25,
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

        // Title (clean wrapping with optional icon)
        elements.push({
          id: `${slide.id}-bento-title-${idx}`,
          type: "text",
          role: "step-title",
          x: bX + 22,
          y: bY + 16,
          width: bW - 100,
          height: 40,
          text: item.icon ? `${item.icon} ${item.title}` : item.title,
          fontFamily: fontTitle,
          fontSize: 15,
          fontWeight: "700",
          textColor: cardText,
          lineHeight: 1.2,
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
          y: bY + 62,
          width: bW - 44,
          height: 98,
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
        { label: "Key Figure 01", value: "—", description: slide.bullets?.[0] || "" },
      ];

      const count = Math.min(4, metricsList.length);
      const numericPairs = metricsList
        .slice(0, count)
        .map((m) => ({ m, num: parseNumericMetricValue(m.value) }))
        .filter((p) => p.num !== null && p.num > 0);
      const showChartBars = numericPairs.length >= 2;

      const mW = (W - 200 - (count - 1) * 24) / count;
      const mH = showChartBars ? 210 : Math.min(340, contentMaxH - 60);
      const mY = contentStartY + (showChartBars ? 14 : 36);

      metricsList.slice(0, count).forEach((m, idx) => {
        const mX = 100 + idx * (mW + 24);

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
          borderRadius: 18,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-metric-line-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "rect",
          x: mX + 24,
          y: mY + 20,
          width: 48,
          height: 4,
          fillColor: accent,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-metric-val-${idx}`,
          type: "text",
          role: "metric-value",
          x: mX + 24,
          y: mY + 36,
          width: mW - 48,
          height: 54,
          text: m.value,
          fontFamily: fontTitle,
          fontSize: count >= 4 ? 30 : 36,
          fontWeight: "800",
          textColor: accent,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-metric-lbl-${idx}`,
          type: "text",
          role: "metric-label",
          x: mX + 24,
          y: mY + 98,
          width: mW - 48,
          height: 36,
          text: m.label,
          fontFamily: fontTitle,
          fontSize: 15,
          fontWeight: "700",
          textColor: cardText,
          zIndex: zIndex++,
        });

        if (m.description) {
          elements.push({
            id: `${slide.id}-metric-desc-${idx}`,
            type: "text",
            role: "bullet",
            x: mX + 24,
            y: mY + 138,
            width: mW - 48,
            height: mH - 152,
            text: m.description,
            fontFamily: fontBody,
            fontSize: 11.5,
            textColor: cardMuted,
            lineHeight: 1.3,
            zIndex: zIndex++,
          });
        }
      });

      // Native editable quantitative comparison bars underneath when >= 2 numeric figures exist
      if (showChartBars) {
        const chartY = mY + mH + 22;
        const chartH = Math.max(150, 670 - chartY);
        elements.push({
          id: `${slide.id}-metric-chart-panel`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: 100,
          y: chartY,
          width: W - 200,
          height: chartH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 16,
          zIndex: zIndex++,
        });

        const maxNum = Math.max(...numericPairs.map((p) => Math.abs(p.num!)), 1);
        const rowH = Math.min(44, Math.floor((chartH - 28) / numericPairs.length));
        const barMaxW = W - 200 - 380;

        numericPairs.forEach((pair, bIdx) => {
          const rY = chartY + 18 + bIdx * rowH;
          const pct = Math.max(0.08, Math.min(1, Math.abs(pair.num!) / maxNum));
          const bW = Math.round(pct * barMaxW);

          elements.push({
            id: `${slide.id}-bar-lbl-${bIdx}`,
            type: "text",
            role: "metric-label",
            x: 124,
            y: rY + 4,
            width: 220,
            height: rowH - 8,
            text: pair.m.label,
            fontFamily: fontBody,
            fontSize: 12,
            fontWeight: "600",
            textColor: cardText,
            zIndex: zIndex++,
          });

          elements.push({
            id: `${slide.id}-bar-track-${bIdx}`,
            type: "shape",
            role: "shape",
            shapeType: "roundRect",
            x: 356,
            y: rY + 7,
            width: barMaxW,
            height: Math.max(14, rowH - 20),
            fillColor: accentTint,
            borderRadius: 7,
            zIndex: zIndex++,
          });

          elements.push({
            id: `${slide.id}-bar-fill-${bIdx}`,
            type: "shape",
            role: "shape",
            shapeType: "roundRect",
            x: 356,
            y: rY + 7,
            width: Math.max(18, bW),
            height: Math.max(14, rowH - 20),
            fillColor: accent,
            borderRadius: 7,
            zIndex: zIndex++,
          });

          elements.push({
            id: `${slide.id}-bar-val-${bIdx}`,
            type: "text",
            role: "metric-value",
            x: 356 + barMaxW + 14,
            y: rY + 4,
            width: 96,
            height: rowH - 8,
            text: pair.m.value,
            fontFamily: fontTitle,
            fontSize: 12,
            fontWeight: "700",
            textColor: accent,
            textAlign: "right",
            zIndex: zIndex++,
          });
        });
      }
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
          x: 118,
          y: bY + 14,
          width: 38,
          height: 30,
          fillColor: accent,
          borderRadius: 8,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-vis-badge-txt-${idx}`,
          type: "text",
          role: "badge",
          x: 118,
          y: bY + 19,
          width: 38,
          height: 20,
          text: `0${idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 10.5,
          fontWeight: "700",
          textColor: badgeTextColor,
          textAlign: "center",
          zIndex: zIndex++,
        });

        const safeVisBullet = b.length > 122 ? b.slice(0, 120).replace(/\s+\S*$/, "") + "…" : b;
        elements.push({
          id: `${slide.id}-vis-txt-${idx}`,
          type: "text",
          role: "bullet",
          x: 168,
          y: bY + 11,
          width: leftW - 88,
          height: Math.max(40, bH - 22),
          text: safeVisBullet,
          fontFamily: fontBody,
          fontSize: bullets.length >= 4 && safeVisBullet.length > 92 ? 12 : 13,
          fontWeight: "500",
          textColor: cardText,
          lineHeight: 1.26,
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

      const hasRasterPhoto = Boolean(
        slide.visual?.imageUrl && /^data:image\/(?:png|jpeg|jpg);base64,/i.test(slide.visual.imageUrl),
      );
      const useNativeDiagramShapes =
        slide.layout === "diagram-explainer" &&
        !hasRasterPhoto &&
        Boolean(slide.diagramData && slide.diagramData.nodes.length >= 2);

      if (useNativeDiagramShapes && slide.diagramData) {
        // Render native editable rounded nodes & connectors directly on canvas & PowerPoint
        const nodes = slide.diagramData.nodes.slice(0, 4);
        const panelPad = 24;
        const innerX = vX + panelPad;
        const innerW = rightW - panelPad * 2;

        elements.push({
          id: `${slide.id}-diag-hdr-pill`,
          type: "shape",
          role: "badge",
          shapeType: "pill",
          x: innerX,
          y: contentStartY + 18,
          width: 190,
          height: 24,
          fillColor: accentTint,
          borderRadius: 12,
          zIndex: zIndex++,
        });
        elements.push({
          id: `${slide.id}-diag-hdr-txt`,
          type: "text",
          role: "badge",
          x: innerX + 8,
          y: contentStartY + 21,
          width: 174,
          height: 18,
          text: `${slide.diagramData.kind.toUpperCase()} STRUCTURE`,
          fontFamily: fontTitle,
          fontSize: 9.5,
          fontWeight: "700",
          textColor: accent,
          textAlign: "center",
          zIndex: zIndex++,
        });

        const listTop = contentStartY + 56;
        const listAvailH = contentMaxH - 108;
        const gapH = 14;
        const nodeH = Math.min(92, Math.floor((listAvailH - gapH * (nodes.length - 1)) / nodes.length));

        nodes.forEach((node, nIdx) => {
          const nY = listTop + nIdx * (nodeH + gapH);
          elements.push({
            id: `${slide.id}-diag-node-box-${nIdx}`,
            type: "shape",
            role: "card",
            shapeType: "roundRect",
            x: innerX,
            y: nY,
            width: innerW,
            height: nodeH,
            fillColor: safeTokens.bg || "#FFFFFF",
            borderColor: accent,
            borderWidth: 1.5,
            borderRadius: 12,
            zIndex: zIndex++,
          });

          elements.push({
            id: `${slide.id}-diag-node-num-${nIdx}`,
            type: "shape",
            role: "shape",
            shapeType: "roundRect",
            x: innerX + 12,
            y: nY + Math.max(10, Math.round((nodeH - 28) / 2)),
            width: 40,
            height: 28,
            fillColor: accent,
            borderRadius: 8,
            zIndex: zIndex++,
          });

          elements.push({
            id: `${slide.id}-diag-node-num-txt-${nIdx}`,
            type: "text",
            role: "badge",
            x: innerX + 12,
            y: nY + Math.max(13, Math.round((nodeH - 20) / 2)),
            width: 40,
            height: 20,
            text: node.value ? String(node.value).slice(0, 5) : `0${nIdx + 1}`,
            fontFamily: fontTitle,
            fontSize: 10.5,
            fontWeight: "700",
            textColor: badgeTextColor,
            textAlign: "center",
            zIndex: zIndex++,
          });

          elements.push({
            id: `${slide.id}-diag-node-title-${nIdx}`,
            type: "text",
            role: "step-title",
            x: innerX + 64,
            y: nY + 8,
            width: innerW - 78,
            height: node.detail ? 24 : nodeH - 16,
            text: node.label,
            fontFamily: fontTitle,
            fontSize: 13,
            fontWeight: "700",
            textColor: cardText,
            zIndex: zIndex++,
          });

          if (node.detail) {
            const maxDetailChars = nodeH < 90 ? 64 : 78;
            const trimmedDetail =
              node.detail.length <= maxDetailChars
                ? node.detail
                : node.detail.slice(0, maxDetailChars).replace(/\s+\S*$/, "") + "…";
            elements.push({
              id: `${slide.id}-diag-node-detail-${nIdx}`,
              type: "text",
              role: "step-desc",
              x: innerX + 64,
              y: nY + 32,
              width: innerW - 78,
              height: Math.max(24, nodeH - 38),
              text: trimmedDetail,
              fontFamily: fontBody,
              fontSize: 10.5,
              textColor: cardMuted,
              lineHeight: 1.22,
              zIndex: zIndex++,
            });
          }

          if (nIdx < nodes.length - 1) {
            elements.push({
              id: `${slide.id}-diag-conn-${nIdx}`,
              type: "shape",
              role: "shape",
              shapeType: "rect",
              x: innerX + 27,
              y: nY + nodeH,
              width: 4,
              height: gapH,
              fillColor: accent,
              zIndex: zIndex++,
            });
          }
        });
      } else {
        // Verified Image or Conceptual SVG Diagram
        const vImg =
          slide.visual?.imageUrl ||
          buildContextualVisual({
            title: slide.title,
            subtitle: slide.subtitle,
            bullets: slide.bullets,
            concept: slide.visual?.concept || slide.title,
            accentColor: accent,
            isDark: safeTokens.isDark,
          }).imageUrl;

        elements.push({
          id: `${slide.id}-visual-image`,
          type: "image",
          role: "image",
          x: vX + 16,
          y: contentStartY + 14,
          width: rightW - 32,
          height: contentMaxH - 76,
          borderRadius: 12,
          imageUrl: vImg,
          zIndex: zIndex++,
        });
      }

      // Caption (strictly single-line trimmed inside bottom pad)
      const rawCap = slide.visual?.caption || slide.visual?.concept || slide.title || "";
      const cleanCap = rawCap.length <= 68 ? rawCap : rawCap.slice(0, 66).replace(/\s+\S*$/, "") + "…";
      elements.push({
        id: `${slide.id}-visual-caption`,
        type: "text",
        role: "caption",
        x: vX + 16,
        y: contentStartY + contentMaxH - 46,
        width: rightW - 32,
        height: 30,
        text: cleanCap,
        fontFamily: fontBody,
        fontSize: 10.5,
        fontStyle: "italic",
        textColor: cardMuted,
        textAlign: "center",
        zIndex: zIndex++,
      });
      break;
    }

    case "three-card": {
      const cards =
        slide.cards && slide.cards.length > 0
          ? slide.cards
          : (slide.bullets || []).slice(0, 3).map((b, bIdx) => {
              const colonIdx = b.indexOf(":");
              if (colonIdx > 1 && colonIdx <= 34) {
                return {
                  title: b.slice(0, colonIdx).trim(),
                  description: b.slice(colonIdx + 1).trim(),
                  tag: `0${bIdx + 1}`,
                };
              }
              return {
                title: `Focus 0${bIdx + 1}`,
                description: b,
                tag: `0${bIdx + 1}`,
              };
            });

      const count = Math.min(3, Math.max(1, cards.length));
      const gap = 34;
      const cW = (W - 200 - (count - 1) * gap) / count;
      const cY = contentStartY + 20;
      const cH = Math.min(430, contentMaxH - 35);

      cards.slice(0, count).forEach((card, idx) => {
        const cX = 100 + idx * (cW + gap);

        elements.push({
          id: `${slide.id}-card-bg-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: cX,
          y: cY,
          width: cW,
          height: cH,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 18,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-card-stripe-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "rect",
          x: cX,
          y: cY,
          width: cW,
          height: 5,
          fillColor: accent,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-card-badge-bg-${idx}`,
          type: "shape",
          role: "badge",
          shapeType: "pill",
          x: cX + 24,
          y: cY + 24,
          width: Math.max(76, Math.min(140, (card.tag || `0${idx + 1}`).length * 9 + 24)),
          height: 26,
          fillColor: accentTint,
          borderRadius: 13,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-card-badge-${idx}`,
          type: "text",
          role: "badge",
          x: cX + 24,
          y: cY + 29,
          width: Math.max(76, Math.min(140, (card.tag || `0${idx + 1}`).length * 9 + 24)),
          height: 18,
          text: (card.tag || `0${idx + 1}`).toUpperCase(),
          fontFamily: fontTitle,
          fontSize: 10,
          fontWeight: "700",
          textColor: accent,
          textAlign: "center",
          zIndex: zIndex++,
        });

        const estTitleLines = Math.max(
          1,
          Math.min(3, Math.ceil((card.title.length * 10.2) / Math.max(120, cW - 48))),
        );
        const titleH = Math.max(46, estTitleLines * 24 + 8);
        const descY = cY + 62 + titleH + 6;

        elements.push({
          id: `${slide.id}-card-title-${idx}`,
          type: "text",
          role: "step-title",
          x: cX + 24,
          y: cY + 62,
          width: cW - 48,
          height: titleH,
          text: card.title,
          fontFamily: fontTitle,
          fontSize: 16.5,
          fontWeight: "700",
          textColor: cardText,
          lineHeight: 1.25,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-card-desc-${idx}`,
          type: "text",
          role: "bullet",
          x: cX + 24,
          y: descY,
          width: cW - 48,
          height: Math.max(60, cY + cH - descY - 20),
          text: card.description,
          fontFamily: fontBody,
          fontSize: 13.5,
          textColor: cardMuted,
          lineHeight: 1.4,
          zIndex: zIndex++,
        });
      });
      break;
    }

    case "timeline": {
      const phases =
        slide.timeline && slide.timeline.length > 0
          ? slide.timeline
          : (slide.bullets || []).slice(0, 4).map((b, idx) => ({
              phase: `Phase 0${idx + 1}`,
              title: b.split(/[:.-]/)[0]?.trim() || `Milestone ${idx + 1}`,
              description: b,
            }));

      const count = Math.min(4, Math.max(1, phases.length));
      const itemW = (W - 200) / count;
      const lineY = contentStartY + 110;

      elements.push({
        id: `${slide.id}-timeline-line`,
        type: "shape",
        role: "shape",
        shapeType: "rect",
        x: 160,
        y: lineY + 18,
        width: W - 320,
        height: 4,
        fillColor: cardBorder,
        zIndex: zIndex++,
      });

      phases.slice(0, count).forEach((p, idx) => {
        const pX = 100 + idx * itemW;
        const centerX = pX + itemW / 2;

        elements.push({
          id: `${slide.id}-tl-phase-${idx}`,
          type: "text",
          role: "badge",
          x: pX + 12,
          y: lineY - 40,
          width: itemW - 24,
          height: 24,
          text: p.phase.toUpperCase(),
          fontFamily: fontTitle,
          fontSize: 11,
          fontWeight: "700",
          textColor: accent,
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-tl-dot-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "circle",
          x: centerX - 20,
          y: lineY,
          width: 40,
          height: 40,
          fillColor: accent,
          borderColor: safeTokens.bg || "#FFFFFF",
          borderWidth: 2,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-tl-num-${idx}`,
          type: "text",
          role: "step-number",
          x: centerX - 20,
          y: lineY + 10,
          width: 40,
          height: 20,
          text: `0${idx + 1}`,
          fontFamily: fontTitle,
          fontSize: 12,
          fontWeight: "700",
          textColor: badgeTextColor,
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-tl-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: pX + 12,
          y: lineY + 60,
          width: itemW - 24,
          height: 230,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 14,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-tl-title-${idx}`,
          type: "text",
          role: "step-title",
          x: pX + 26,
          y: lineY + 78,
          width: itemW - 52,
          height: 48,
          text: p.title,
          fontFamily: fontTitle,
          fontSize: 14,
          fontWeight: "700",
          textColor: cardText,
          textAlign: "center",
          lineHeight: 1.25,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-tl-desc-${idx}`,
          type: "text",
          role: "step-desc",
          x: pX + 26,
          y: lineY + 132,
          width: itemW - 52,
          height: 140,
          text: p.description,
          fontFamily: fontBody,
          fontSize: 12.5,
          textColor: cardMuted,
          textAlign: "center",
          lineHeight: 1.35,
          zIndex: zIndex++,
        });
      });
      break;
    }

    case "headline-hero": {
      const topY = contentStartY + 12;
      const rawStat = slide.statCallout?.stat?.trim() || "";
      const statText =
        rawStat && !/^\d{1,2}$/.test(rawStat)
          ? rawStat
          : slide.bullets?.[0] || "Primary Takeaway";
      const rawContext =
        slide.statCallout?.context ||
        (slide.bullets && slide.bullets.length > 0 && statText !== slide.bullets[0]
          ? slide.bullets[0]!
          : "");
      const rawContextClean = rawContext.trim().toLowerCase();
      const statClean = statText.trim().toLowerCase();
      const subClean = (slide.subtitle || "").trim().toLowerCase();
      const isPrefixOrSame = (a: string, b: string) =>
        Boolean(a && b) &&
        (a === b || (a.length >= 28 && b.length >= 28 && a.slice(0, 36) === b.slice(0, 36)));
      const contextText =
        rawContextClean && !isPrefixOrSame(rawContextClean, statClean) && !isPrefixOrSame(rawContextClean, subClean)
          ? rawContext
          : "";

      const statFontSize = statText.length > 90 ? 19 : statText.length > 48 ? 22 : 28;
      const statLines = Math.min(4, Math.max(1, Math.ceil((statText.length * (statFontSize * 0.65)) / 1040)));
      const statH = Math.max(46, statLines * Math.round(statFontSize * 1.48));
      const contextH = contextText ? (contextText.length > 90 ? 52 : 34) : 0;
      const topH = Math.max(140, 24 + statH + (contextText ? 12 + contextH : 0) + 22);

      elements.push({
        id: `${slide.id}-hh-banner`,
        type: "shape",
        role: "card",
        shapeType: "roundRect",
        x: 100,
        y: topY,
        width: 1133,
        height: topH,
        fillColor: cardBg,
        borderColor: accent,
        borderWidth: 1.5,
        borderRadius: 18,
        zIndex: zIndex++,
      });

      elements.push({
        id: `${slide.id}-hh-stripe`,
        type: "shape",
        role: "shape",
        shapeType: "rect",
        x: 100,
        y: topY,
        width: 12,
        height: topH,
        fillColor: accent,
        zIndex: zIndex++,
      });

      elements.push({
        id: `${slide.id}-hh-stat`,
        type: "text",
        role: "metric-value",
        x: 138,
        y: contextText ? topY + 22 : topY + Math.max(20, Math.round((topH - statH) / 2)),
        width: 1065,
        height: statH,
        text: statText,
        fontFamily: fontTitle,
        fontSize: statFontSize,
        fontWeight: "800",
        textColor: textPrimary,
        lineHeight: 1.25,
        zIndex: zIndex++,
      });

      if (contextText) {
        elements.push({
          id: `${slide.id}-hh-context`,
          type: "text",
          role: "bullet",
          x: 138,
          y: topY + 22 + statH + 10,
          width: 1065,
          height: contextH,
          text: contextText,
          fontFamily: fontBody,
          fontSize: 14.5,
          textColor: textSecondary,
          lineHeight: 1.35,
          zIndex: zIndex++,
        });
      }

      const bottomBullets =
        slide.statCallout?.bullets && slide.statCallout.bullets.length > 0
          ? slide.statCallout.bullets
          : slide.bullets && slide.bullets.length > 1
            ? slide.bullets.slice(1, 4)
            : slide.bullets || [];

      if (bottomBullets.length > 0) {
        const bCount = Math.min(3, bottomBullets.length);
        const bGap = 28;
        const bW = (1133 - (bCount - 1) * bGap) / bCount;
        const bY = topY + topH + 24;
        const bH = Math.min(260, contentMaxH - topH - 42);

        bottomBullets.slice(0, bCount).forEach((bText, bIdx) => {
          const bX = 100 + bIdx * (bW + bGap);
          elements.push({
            id: `${slide.id}-hh-card-${bIdx}`,
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

          elements.push({
            id: `${slide.id}-hh-bar-${bIdx}`,
            type: "shape",
            role: "shape",
            shapeType: "rect",
            x: bX + 24,
            y: bY + 22,
            width: 56,
            height: 4,
            fillColor: accent,
            zIndex: zIndex++,
          });

          elements.push({
            id: `${slide.id}-hh-txt-${bIdx}`,
            type: "text",
            role: "bullet",
            x: bX + 24,
            y: bY + 40,
            width: bW - 48,
            height: bH - 60,
            text: bText,
            fontFamily: fontBody,
            fontSize: 14,
            fontWeight: "500",
            textColor: cardText,
            lineHeight: 1.4,
            zIndex: zIndex++,
          });
        });
      }
      break;
    }

    case "section-header": {
      elements.push({
        id: `${slide.id}-sec-card`,
        type: "shape",
        role: "card",
        shapeType: "roundRect",
        x: 100,
        y: contentStartY + 30,
        width: 1133,
        height: contentMaxH - 60,
        fillColor: cardBg,
        borderColor: cardBorder,
        borderWidth: 1,
        borderRadius: 24,
        zIndex: zIndex++,
      });

      elements.push({
        id: `${slide.id}-sec-stripe`,
        type: "shape",
        role: "shape",
        shapeType: "rect",
        x: 100,
        y: contentStartY + 30,
        width: 14,
        height: contentMaxH - 60,
        fillColor: accent,
        zIndex: zIndex++,
      });

      const secBullets = slide.bullets || [slide.subtitle || slide.title];
      secBullets.slice(0, 4).forEach((b, bIdx) => {
        elements.push({
          id: `${slide.id}-sec-bullet-${bIdx}`,
          type: "text",
          role: "bullet",
          x: 150,
          y: contentStartY + 70 + bIdx * 82,
          width: 1040,
          height: 68,
          text: `• ${b}`,
          fontFamily: fontBody,
          fontSize: 16,
          fontWeight: "500",
          textColor: cardText,
          lineHeight: 1.35,
          zIndex: zIndex++,
        });
      });
      break;
    }

    case "table": {
      const headers = slide.table?.headers || ["Parameter", "Details"];
      const rows = slide.table?.rows ||
        (slide.bullets || []).map((b, i) => [b.split(":")[0] || `Item ${i + 1}`, b.split(":")[1]?.trim() || b]);

      const colCount = Math.max(1, headers.length);
      const colW = 1133 / colCount;
      const startY = contentStartY + 15;
      const rowH = Math.min(68, Math.floor((contentMaxH - 70) / Math.max(1, rows.length)));

      // Header Row BG
      elements.push({
        id: `${slide.id}-tbl-hdr-bg`,
        type: "shape",
        role: "shape",
        shapeType: "roundRect",
        x: 100,
        y: startY,
        width: 1133,
        height: 48,
        fillColor: accent,
        borderRadius: 10,
        zIndex: zIndex++,
      });

      headers.forEach((hText, cIdx) => {
        elements.push({
          id: `${slide.id}-tbl-hdr-${cIdx}`,
          type: "text",
          role: "badge",
          x: 116 + cIdx * colW,
          y: startY + 12,
          width: colW - 32,
          height: 26,
          text: hText,
          fontFamily: fontTitle,
          fontSize: 13,
          fontWeight: "700",
          textColor: badgeTextColor,
          zIndex: zIndex++,
        });
      });

      rows.slice(0, 6).forEach((row, rIdx) => {
        const rY = startY + 56 + rIdx * rowH;
        elements.push({
          id: `${slide.id}-tbl-row-bg-${rIdx}`,
          type: "shape",
          role: "card",
          shapeType: "rect",
          x: 100,
          y: rY,
          width: 1133,
          height: rowH - 6,
          fillColor: rIdx % 2 === 0 ? cardBg : safeTokens.bg || "#FFFFFF",
          borderColor: cardBorder,
          borderWidth: 1,
          zIndex: zIndex++,
        });

        row.slice(0, colCount).forEach((cell, cIdx) => {
          elements.push({
            id: `${slide.id}-tbl-cell-${rIdx}-${cIdx}`,
            type: "text",
            role: "bullet",
            x: 116 + cIdx * colW,
            y: rY + 10,
            width: colW - 32,
            height: rowH - 22,
            text: cell,
            fontFamily: fontBody,
            fontSize: 12.5,
            textColor: cardText,
            lineHeight: 1.3,
            zIndex: zIndex++,
          });
        });
      });
      break;
    }

    case "references": {
      const refs =
        slide.bullets && slide.bullets.length > 0
          ? slide.bullets
          : ((slide as any).references as string[] | undefined) || [
              "Primary source material and supporting documentation.",
            ];
      refs.slice(0, 6).forEach((ref, idx) => {
        const rY = contentStartY + 15 + idx * 72;
        elements.push({
          id: `${slide.id}-ref-card-${idx}`,
          type: "shape",
          role: "card",
          shapeType: "roundRect",
          x: 100,
          y: rY,
          width: 1133,
          height: 58,
          fillColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: 12,
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-ref-txt-${idx}`,
          type: "text",
          role: "bullet",
          x: 124,
          y: rY + 14,
          width: 1085,
          height: 36,
          text: `[${idx + 1}] ${ref}`,
          fontFamily: fontBody,
          fontSize: 13.5,
          textColor: cardText,
          zIndex: zIndex++,
        });
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

      const shownBullets = bullets.slice(0, 5);
      const rowStep = Math.min(82, Math.max(68, Math.floor((contentMaxH - 64) / Math.max(1, shownBullets.length))));
      shownBullets.forEach((b, idx) => {
        const rowY = contentStartY + 34 + idx * rowStep;
        elements.push({
          id: `${slide.id}-concl-check-${idx}`,
          type: "shape",
          role: "shape",
          shapeType: "circle",
          x: 140,
          y: rowY + 2,
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
          y: rowY + 7,
          width: 32,
          height: 22,
          text: "✓",
          fontFamily: fontTitle,
          fontSize: 13,
          fontWeight: "bold",
          textColor: badgeTextColor,
          textAlign: "center",
          zIndex: zIndex++,
        });

        elements.push({
          id: `${slide.id}-concl-bullet-${idx}`,
          type: "text",
          role: "bullet",
          x: 190,
          y: rowY,
          width: 1000,
          height: Math.max(48, rowStep - 12),
          text: b,
          fontFamily: fontBody,
          fontSize: 15,
          fontWeight: "500",
          textColor: cardText,
          lineHeight: 1.32,
          zIndex: zIndex++,
        });
      });
      break;
    }

    default: {
      // Standard bullets / content
      const bullets =
        slide.bullets && slide.bullets.length > 0
          ? slide.bullets
          : [slide.subtitle || `Overview & key takeaways for ${slide.title || "this section"}.`];
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
  if (slide.layout !== "title" && slide.layout !== "assignment-cover") {
    const deckLabel = safeTokens.name || baseTokens.name || "DocuMind Presentation";
    const slideTotalStr = totalSlides ? ` of ${totalSlides}` : "";
    elements.push({
      id: `${slide.id}-footer-text`,
      type: "text",
      role: "footer",
      x: 100,
      y: 698,
      width: 1133,
      height: 22,
      text: `${deckLabel}  |  Slide ${slide.slideNumber}${slideTotalStr}`,
      fontFamily: fontBody,
      fontSize: 9.5,
      textColor: textMuted,
      textAlign: textAlignDir,
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
  if (!slide) return slide;
  const updatedSlide = { ...slide, elements: [...elements], isManuallyEdited: true };

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
