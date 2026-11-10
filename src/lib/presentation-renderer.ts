/**
 * DocuMind Canonical Presentation PPTX Renderer
 *
 * Renders every slide through one canonical 16:9 widescreen (13.333" x 7.5")
 * element pipeline (`convertSlideToElements` / manual `slide.elements`),
 * guaranteeing 1:1 parity between in-browser editor previews and exported PowerPoint files.
 */

import PptxGenJS from "pptxgenjs";
import { validateBase64DataUrl } from "./image-verifier";
import {
  type ThemeTokens,
  resolveSlideSurfaceTokens,
  stripHex,
} from "./presentation-theme";
import type { SlidePreviewItem } from "./presentation-session-client";
import { convertSlideToElements, type SlideElement } from "./slide-element-model";

/**
 * Safely adds an image to a PPTX slide with format verification and error containment.
 * Prevents crashes, 0-byte corrupt assets, and broken/invisible placeholders.
 */
export function safeAddImageToSlide(
  slide: any,
  _pptx: any,
  imgSource: string | undefined,
  opts: { x: number; y: number; w: number; h: number },
  fallback?: () => void,
): boolean {
  if (!imgSource || typeof imgSource !== "string" || imgSource.trim().length === 0) {
    fallback?.();
    return false;
  }

  const trimmed = imgSource.trim();
  try {
    if (trimmed.startsWith("data:image/")) {
      if (trimmed.startsWith("data:image/webp")) {
        fallback?.();
        return false;
      }
      const check = validateBase64DataUrl(trimmed);
      if (!check.valid) {
        fallback?.();
        return false;
      }
      slide.addImage({
        data: trimmed,
        x: opts.x,
        y: opts.y,
        w: opts.w,
        h: opts.h,
      });
      return true;
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      slide.addImage({
        path: trimmed,
        x: opts.x,
        y: opts.y,
        w: opts.w,
        h: opts.h,
      });
      return true;
    }
  } catch (err) {
    console.warn("Failed to insert image into PPTX slide, invoking graceful fallback:", err);
    fallback?.();
    return false;
  }
  fallback?.();
  return false;
}

/**
 * Normalizes CSS hex (6-digit, 8-digit #RRGGBBAA, or #RGB) into 6-digit PptxGenJS hex
 * plus optional `transparency` percentage (0-100) so PptxGenJS never falls back to #000000.
 */
function toPptxColor(
  raw: string | undefined,
  fallbackHex = "0F172A",
): { color: string; transparency?: number } {
  if (!raw || typeof raw !== "string") return { color: fallbackHex };
  const hex = raw.trim().replace(/^#/, "").toUpperCase();
  if (/^[0-9A-F]{6}$/.test(hex)) {
    return { color: hex };
  }
  if (/^[0-9A-F]{8}$/.test(hex)) {
    const rgb = hex.slice(0, 6);
    const alphaByte = parseInt(hex.slice(6, 8), 16);
    const transparency = Math.max(0, Math.min(99, Math.round((1 - alphaByte / 255) * 100)));
    return transparency > 0 ? { color: rgb, transparency } : { color: rgb };
  }
  if (/^[0-9A-F]{3}$/.test(hex)) {
    return { color: `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` };
  }
  return { color: stripHex(raw).slice(0, 6) || fallbackHex };
}

/**
 * Dynamically computes non-overlapping vertical coordinates for titles,
 * subtitles, and body cards based on text length and typography hierarchy.
 */
export function computeHeaderGeometry(
  title: string,
  subtitle?: string,
  baseTitleSize: number = 24,
  baseSubtitleSize: number = 13,
) {
  const titleText = (title || "").trim();
  const titleLen = titleText.length;

  let titleFontSize = baseTitleSize;
  let titleH = 0.65;
  if (titleLen > 80) {
    titleFontSize = Math.max(16, baseTitleSize - 7);
    titleH = 0.95;
  } else if (titleLen > 45) {
    titleFontSize = Math.max(18, baseTitleSize - 4);
    titleH = 0.8;
  }

  const titleY = 0.95;
  const subtitleY = titleY + titleH + 0.05;
  let subtitleH = 0;
  let subtitleFontSize = baseSubtitleSize;

  if (subtitle && subtitle.trim().length > 0) {
    const subLen = subtitle.trim().length;
    if (subLen > 80) {
      subtitleFontSize = Math.max(10, baseSubtitleSize - 2);
      subtitleH = 0.55;
    } else {
      subtitleH = 0.38;
    }
  }

  const dividerY = subtitleY + subtitleH + 0.06;
  const contentStartY = dividerY + 0.16;
  const contentMaxH = Math.max(3.0, 6.75 - contentStartY);

  return {
    titleY,
    titleH,
    titleFontSize,
    subtitleY,
    subtitleH,
    subtitleFontSize,
    dividerY,
    contentStartY,
    contentMaxH,
  };
}

function renderCanvasElementToPptx(
  pptx: PptxGenJS,
  slide: any,
  el: SlideElement,
  surfaceTokens: ThemeTokens,
  isRtlSlide: boolean,
) {
  // Exact 100px = 1.0 inch 1:1 coordinate mapping (1333px -> 13.33", 750px -> 7.5")
  const x = Math.max(0, el.x / 100);
  const y = Math.max(0, el.y / 100);
  const w = Math.max(0.05, Math.min(13.333 - x, el.width / 100));
  const h = Math.max(0.04, Math.min(7.5 - y, el.height / 100));

  if (el.type === "shape" || el.type === "card") {
    const isCircle = el.shapeType === "circle";
    const isRounded =
      el.shapeType === "roundRect" || el.shapeType === "pill" || Boolean(el.borderRadius);
    const shapeType = isCircle
      ? pptx.ShapeType.ellipse
      : isRounded
        ? pptx.ShapeType.roundRect
        : pptx.ShapeType.rect;

    const fillSpec =
      el.fillColor && el.fillColor !== "transparent"
        ? toPptxColor(el.fillColor, surfaceTokens.cardBgHex)
        : undefined;
    const borderSpec =
      el.borderWidth && el.borderColor
        ? toPptxColor(el.borderColor, surfaceTokens.cardBorderHex)
        : undefined;

    const radiusInches =
      el.shapeType === "pill"
        ? Math.min(h / 2, 0.35)
        : el.borderRadius
          ? Math.min(0.35, Math.max(0.04, el.borderRadius / 100))
          : undefined;

    slide.addShape(shapeType, {
      x,
      y,
      w,
      h,
      ...(isRounded && !isCircle && radiusInches ? { rectRadius: radiusInches } : {}),
      fill: fillSpec
        ? {
            color: fillSpec.color,
            ...(fillSpec.transparency !== undefined
              ? { transparency: fillSpec.transparency }
              : {}),
          }
        : undefined,
      line: borderSpec
        ? {
            color: borderSpec.color,
            width: Math.max(0.75, el.borderWidth ?? 1),
            ...(borderSpec.transparency !== undefined
              ? { transparency: borderSpec.transparency }
              : {}),
          }
        : undefined,
    });
    return;
  }

  if (el.type === "line") {
    const lineFill = toPptxColor(el.fillColor || surfaceTokens.accentHex, surfaceTokens.accentHex);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h: Math.max(0.03, h),
      fill: {
        color: lineFill.color,
        ...(lineFill.transparency !== undefined ? { transparency: lineFill.transparency } : {}),
      },
    });
    return;
  }

  if (el.type === "image" && el.imageUrl) {
    safeAddImageToSlide(slide, pptx, el.imageUrl, { x, y, w, h }, () => {
      // Graceful non-broken border frame only if image failed validation
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w,
        h,
        rectRadius: 0.14,
        fill: { color: surfaceTokens.cardBgHex },
        line: { color: surfaceTokens.cardBorderHex, width: 1 },
      });
      if (el.altText) {
        slide.addText(el.altText, {
          x: x + 0.2,
          y: y + h / 2 - 0.25,
          w: Math.max(0.5, w - 0.4),
          h: 0.5,
          fontSize: 10,
          color: surfaceTokens.cardMutedHex,
          align: "center",
          valign: "middle",
        });
      }
    });
    return;
  }

  if (el.type === "text" && el.text && el.text.trim().length > 0) {
    const fontSize = Math.max(8, el.fontSize || 14);
    const isBadgeCentered =
      el.role === "badge" ||
      el.role === "step-number" ||
      (el.role === "category" && el.textAlign === "center");

    const textOpts: Record<string, any> = {
      x,
      y,
      w,
      h,
      fontSize,
      bold:
        el.fontWeight === "bold" ||
        el.fontWeight === "700" ||
        el.fontWeight === "800",
      italic: el.fontStyle === "italic",
      underline: el.underline ? { style: "sng" } : undefined,
      color: el.textColor
        ? toPptxColor(el.textColor, surfaceTokens.textPrimaryHex).color
        : surfaceTokens.textPrimaryHex,
      fontFace: el.fontFamily || surfaceTokens.fontBody || "Inter",
      align: el.textAlign || (isRtlSlide ? "right" : "left"),
      valign: isBadgeCentered ? "middle" : "top",
      wrap: true,
    };

    // Eliminate PowerPoint's default horizontal padding on small badges & pill labels so "01" / "01 // SCIENCE" never wrap vertically
    if (isBadgeCentered || w <= 1.2) {
      textOpts["margin"] = 0;
    }

    if (el.letterSpacing && el.letterSpacing > 0) {
      textOpts["charSpacing"] = el.letterSpacing;
    }
    if (el.lineHeight && el.lineHeight >= 1.0 && el.lineHeight <= 2.2) {
      textOpts["lineSpacingMultiple"] = el.lineHeight;
    }
    if (isRtlSlide) {
      textOpts["rtlMode"] = true;
    }

    slide.addText(el.text, textOpts);
  }
}

export async function renderSlideDeckToPptx(
  title: string,
  _purpose: string,
  slides: SlidePreviewItem[],
  tokens: ThemeTokens,
): Promise<PptxGenJS> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333" x 7.5"
  pptx.author = "";
  pptx.company = "";
  pptx.title = title;

  for (const s of slides) {
    const slide = pptx.addSlide();
    const surfaceTokens = resolveSlideSurfaceTokens(tokens, s.slideSurface, s.customBgColor);
    slide.background = { color: surfaceTokens.bgHex };

    // Always render through the canonical 1333x750 element model for 1:1 editor-to-PPTX parity
    const canonicalElements =
      s.elements && s.elements.length > 0
        ? s.elements
        : convertSlideToElements(s, tokens, slides.length);

    const sorted = [...canonicalElements].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    for (const el of sorted) {
      renderCanvasElementToPptx(pptx, slide, el, surfaceTokens, Boolean(s.isRtl));
    }

    if (s.notes && s.notes.trim()) {
      slide.addNotes(s.notes);
    }
  }

  return pptx;
}
