/**
 * DocuMind Universal Presentation PPTX Renderer
 * Renders all 14+ slide layouts using strict design tokens, guaranteed contrast,
 * widescreen 16:9 (13.333" x 7.5") dimensions, and zero off-slide coordinates.
 */

import PptxGenJS from "pptxgenjs";
import { type ThemeTokens, stripHex } from "./presentation-theme";
import type { SlidePreviewItem } from "./presentation-session-client";
import { buildContextualVisual } from "./presentation-visual-generator";
import { getCoverTemplateById, generateDefaultCoverElements } from "./cover-templates-registry";
import { getDefaultAssignmentMetadata } from "./assignment-types";

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

  let subtitleY = titleY + titleH + 0.05;
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

export async function renderSlideDeckToPptx(
  title: string,
  purpose: string,
  slides: SlidePreviewItem[],
  tokens: ThemeTokens,
): Promise<PptxGenJS> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333" x 7.5"
  pptx.author = "";
  pptx.company = "";
  pptx.title = title;

  const fontTitle = tokens.fontTitle;
  const fontBody = tokens.fontBody;
  const sizes = tokens.fontSizes;

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: tokens.bgHex };

    // Common footer on all slides except cover
    const isCover = s.layout === "title" || s.layout === "assignment-cover";
    const geo = computeHeaderGeometry(s.title, s.subtitle, sizes.slideTitle, sizes.subtitle);

    if (!isCover) {
      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 0.08,
        fill: { color: tokens.accentHex },
      });

      // Section tag / slide indicator
      slide.addText(
        `${(s.categoryTag || purpose || "PRESENTATION").toUpperCase()}  //  SLIDE 0${s.slideNumber}`,
        {
          x: 1.0,
          y: 0.55,
          w: 8.0,
          h: 0.32,
          fontSize: sizes.sectionTag,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
          charSpacing: 2,
        },
      );

      // Slide Title (dynamic non-overlapping placement, honoring user edits)
      slide.addText(s.title, {
        x: 1.0,
        y: geo.titleY,
        w: 11.333,
        h: geo.titleH,
        fontSize: s.titleFontSize || geo.titleFontSize,
        bold: s.isTitleBold !== undefined ? s.isTitleBold : true,
        color: s.textColor ? stripHex(s.textColor) : tokens.textPrimaryHex,
        fontFace: fontTitle,
      });

      // Subtitle if present (dynamic non-overlapping placement)
      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: 1.0,
          y: geo.subtitleY,
          w: 11.333,
          h: geo.subtitleH,
          fontSize: geo.subtitleFontSize,
          color: tokens.textSecondaryHex,
          fontFace: fontBody,
          italic: s.isSubtitleItalic !== undefined ? s.isSubtitleItalic : true,
        });
      }

      // Presenter Notes
      if (s.notes) {
        slide.addNotes(s.notes);
      }

      // Slide Footer (left & middle)
      slide.addText(
        `${tokens.name}  |  Slide ${s.slideNumber} of ${slides.length}`,
        {
          x: 1.0,
          y: 6.9,
          w: 7.5,
          h: 0.3,
          fontSize: sizes.caption,
          color: tokens.textMutedHex,
          fontFace: fontBody,
        },
      );
    }

    // Render Layout Specific Content
    switch (s.layout) {
      case "title": {
        const heroTitleLen = (s.title || "").length;
        let heroTitleSize = sizes.heroTitle;
        let heroTitleH = 2.0;

        if (heroTitleLen > 70) {
          heroTitleSize = Math.max(22, sizes.heroTitle - 10);
          heroTitleH = 1.6;
        } else if (heroTitleLen > 40) {
          heroTitleSize = Math.max(26, sizes.heroTitle - 6);
          heroTitleH = 1.8;
        }

        const heroTitleY = 1.8;
        const subY = heroTitleY + heroTitleH + 0.15;
        const divY = subY + 0.8;

        // Decorative accent pill
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: 1.1,
          w: 2.4,
          h: 0.36,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.accentHex, width: 1 },
        });
        slide.addText((s.categoryTag || purpose || "STRATEGIC OVERVIEW").toUpperCase(), {
          x: 1.1,
          y: 1.15,
          w: 2.2,
          h: 0.28,
          fontSize: sizes.sectionTag,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
          charSpacing: 1.5,
        });

        // Hero Title
        slide.addText(s.title, {
          x: 1.0,
          y: heroTitleY,
          w: 11.333,
          h: heroTitleH,
          fontSize: heroTitleSize,
          bold: true,
          color: tokens.textPrimaryHex,
          fontFace: fontTitle,
        });

        // Subtitle
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 1.0,
            y: subY,
            w: 11.0,
            h: 0.7,
            fontSize: sizes.subtitle + 2,
            color: tokens.textSecondaryHex,
            fontFace: fontBody,
          });
        }

        // Horizontal divider
        slide.addShape(pptx.ShapeType.rect, {
          x: 1.0,
          y: divY,
          w: 3.5,
          h: 0.05,
          fill: { color: tokens.accentHex },
        });

        // Footer info
        slide.addText(
          `${tokens.name}  •  ${tokens.category}`,
          {
            x: 1.0,
            y: 6.5,
            w: 11.333,
            h: 0.4,
            fontSize: sizes.caption + 1,
            color: tokens.textMutedHex,
            fontFace: fontBody,
          },
        );
        break;
      }

      case "assignment-cover": {
        const meta = s.assignmentMetadata || getDefaultAssignmentMetadata();
        const tplId = meta?.coverTemplateId || "classic-university";
        const template = getCoverTemplateById(tplId);
        const canvasW = 1333;
        const canvasH = 750;

        const rawElements = (meta.customCoverElements && meta.customCoverElements.length > 0)
          ? meta.customCoverElements.map((el) => ({
              ...el,
              x: (el.x / 794) * canvasW,
              y: (el.y / 1123) * canvasH,
              width: (el.width / 794) * canvasW,
              height: (el.height / 1123) * canvasH,
            }))
          : generateDefaultCoverElements(template, meta, canvasW, canvasH);

        const sorted = [...rawElements].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

        for (const el of sorted) {
          const x = (el.x / canvasW) * 13.333;
          const y = (el.y / canvasH) * 7.5;
          const w = (el.width / canvasW) * 13.333;
          const h = (el.height / canvasH) * 7.5;

          if (el.type === "shape") {
            if (el.id === "canvas-bg") {
              slide.background = { color: stripHex(el.fillColor || "#FFFFFF") };
            } else if (el.shapeType === "circle") {
              slide.addShape(pptx.ShapeType.ellipse, {
                x,
                y,
                w,
                h,
                fill: el.fillColor && el.fillColor !== "transparent" ? { color: stripHex(el.fillColor) } : undefined,
                line: el.borderWidth ? { color: stripHex(el.borderColor || tokens.accentHex), width: el.borderWidth } : undefined,
              });
            } else {
              const isRounded = el.shapeType === "rounded-card" || el.shapeType === "badge-pill" || Boolean(el.borderRadius);
              slide.addShape(isRounded ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
                x,
                y,
                w,
                h,
                fill: el.fillColor && el.fillColor !== "transparent" ? { color: stripHex(el.fillColor) } : undefined,
                line: el.borderWidth ? { color: stripHex(el.borderColor || tokens.accentHex), width: el.borderWidth } : undefined,
              });
            }
          } else if (el.type === "image" && el.imageUrl) {
            if (el.imageUrl.startsWith("data:image")) {
              try {
                slide.addImage({
                  data: el.imageUrl,
                  x,
                  y,
                  w,
                  h,
                });
              } catch {
                // graceful image fallback
              }
            }
          } else if (el.type === "text" && el.text && el.text.trim()) {
            const fontPt = Math.max(9, Math.round((el.fontSize || 14) * 0.95));
            slide.addText(el.text, {
              x,
              y,
              w,
              h,
              fontSize: fontPt,
              bold: el.fontWeight === "bold" || el.fontWeight === "700" || el.fontWeight === "800",
              italic: el.fontStyle === "italic",
              color: stripHex(el.textColor || "#0F172A"),
              fontFace: fontTitle,
              align: el.textAlign || "left",
              valign: "top",
            });
          } else if (el.type === "divider") {
            slide.addShape(pptx.ShapeType.rect, {
              x,
              y,
              w,
              h: Math.max(0.04, h),
              fill: { color: stripHex(el.fillColor || tokens.accentHex) },
            });
          }
        }

        if (s.notes) {
          slide.addNotes(s.notes);
        }
        break;
      }

      case "agenda": {
        const bullets = s.bullets || [];
        const cardW = 5.4;
        const cardH = 1.1;
        const startY = geo.contentStartY;

        for (let idx = 0; idx < Math.min(6, bullets.length); idx++) {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = 1.0 + col * (cardW + 0.5);
          const y = startY + row * (cardH + 0.3);

          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y,
            w: cardW,
            h: cardH,
            fill: { color: tokens.cardBgHex },
            line: { color: tokens.cardBorderHex, width: 1 },
          });

          // Number badge
          slide.addShape(pptx.ShapeType.roundRect, {
            x: x + 0.2,
            y: y + 0.25,
            w: 0.6,
            h: 0.6,
            fill: { color: tokens.accentHex },
          });
          slide.addText(`0${idx + 1}`, {
            x: x + 0.2,
            y: y + 0.35,
            w: 0.6,
            h: 0.4,
            fontSize: 14,
            bold: true,
            color: "FFFFFF",
            fontFace: fontTitle,
            align: "center",
          });

          // Topic text
          slide.addText(bullets[idx]!, {
            x: x + 1.0,
            y: y + 0.2,
            w: cardW - 1.2,
            h: 0.7,
            fontSize: sizes.body,
            bold: true,
            color: tokens.cardTextHex,
            fontFace: fontBody,
          });
        }
        break;
      }

      case "section-header": {
        // High impact section divider
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: startY,
          w: 11.333,
          h: cardH,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.accentHex, width: 2 },
        });

        slide.addText(`0${s.slideNumber}`, {
          x: 1.5,
          y: startY + 0.4,
          w: 2.0,
          h: 1.5,
          fontSize: 64,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
        });

        slide.addText(s.title, {
          x: 3.8,
          y: startY + 0.5,
          w: 8.0,
          h: 1.2,
          fontSize: sizes.slideTitle + 6,
          bold: true,
          color: tokens.textPrimaryHex,
          fontFace: fontTitle,
        });

        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 3.8,
            y: startY + 1.8,
            w: 8.0,
            h: 1.0,
            fontSize: sizes.subtitle + 1,
            color: tokens.textSecondaryHex,
            fontFace: fontBody,
          });
        }
        break;
      }

      case "metrics": {
        const metrics = s.metrics || [];
        const count = Math.min(4, Math.max(2, metrics.length || 3));
        const totalW = 11.333;
        const gap = 0.4;
        const cardW = (totalW - (count - 1) * gap) / count;
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;

        for (let idx = 0; idx < count; idx++) {
          const m = metrics[idx] || {
            value: "100%",
            label: "Indicator",
            description: "Metric measurement",
          };
          const x = 1.0 + idx * (cardW + gap);

          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y: startY,
            w: cardW,
            h: cardH,
            fill: { color: tokens.cardBgHex },
            line: { color: tokens.cardBorderHex, width: 1 },
          });

          // Top highlight line inside card
          slide.addShape(pptx.ShapeType.rect, {
            x: x + 0.3,
            y: startY + 0.25,
            w: 0.8,
            h: 0.05,
            fill: { color: tokens.accentHex },
          });

          // Metric Value
          slide.addText(m.value, {
            x: x + 0.25,
            y: startY + 0.45,
            w: cardW - 0.5,
            h: 1.0,
            fontSize: sizes.statNumber,
            bold: true,
            color: tokens.accentHex,
            fontFace: fontTitle,
          });

          // Label
          slide.addText(m.label, {
            x: x + 0.25,
            y: startY + 1.5,
            w: cardW - 0.5,
            h: 0.7,
            fontSize: sizes.body,
            bold: true,
            color: tokens.cardTextHex,
            fontFace: fontTitle,
          });

          // Description
          if (m.description) {
            slide.addText(m.description, {
              x: x + 0.25,
              y: startY + 2.3,
              w: cardW - 0.5,
              h: cardH - 2.4,
              fontSize: sizes.bodySmall,
              color: tokens.cardMutedHex,
              fontFace: fontBody,
            });
          }
        }
        break;
      }

      case "two-column": {
        const startY = 2.4;
        const cardW = 5.4;
        const cardH = 4.0;

        // Left Column
        const left = s.leftColumn || { title: "Primary Analysis", bullets: s.bullets || [] };
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: startY,
          w: cardW,
          h: cardH,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.cardBorderHex, width: 1 },
        });

        slide.addText(left.title, {
          x: 1.3,
          y: startY + 0.3,
          w: cardW - 0.6,
          h: 0.5,
          fontSize: sizes.body + 1,
          bold: true,
          color: tokens.textPrimaryHex,
          fontFace: fontTitle,
        });

        const leftBullets = (left.bullets || []).slice(0, 4).map((b) => ({
          text: b,
          options: { breakLine: true },
        }));
        if (leftBullets.length > 0) {
          slide.addText(leftBullets, {
            x: 1.3,
            y: startY + 0.9,
            w: cardW - 0.6,
            h: 2.8,
            fontSize: sizes.body - 1,
            color: tokens.cardTextHex,
            bullet: true,
            lineSpacing: 26,
            fontFace: fontBody,
          });
        }

        // Right Column
        const right = s.rightColumn || { title: "Contrasting Perspective", bullets: [] };
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 6.9,
          y: startY,
          w: cardW,
          h: cardH,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.accentHex, width: 1.5 },
        });

        slide.addText(right.title, {
          x: 7.2,
          y: startY + 0.3,
          w: cardW - 0.6,
          h: 0.5,
          fontSize: sizes.body + 1,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
        });

        const rightBullets = (right.bullets || []).slice(0, 4).map((b) => ({
          text: b,
          options: { breakLine: true },
        }));
        if (rightBullets.length > 0) {
          slide.addText(rightBullets, {
            x: 7.2,
            y: startY + 0.9,
            w: cardW - 0.6,
            h: 2.8,
            fontSize: sizes.body - 1,
            color: tokens.cardTextHex,
            bullet: true,
            lineSpacing: 26,
            fontFace: fontBody,
          });
        }
        break;
      }

      case "three-card": {
        const cards = s.cards || [
          { title: "Pillar 1", description: "First core element and strategy" },
          { title: "Pillar 2", description: "Second core element and execution" },
          { title: "Pillar 3", description: "Third core element and results" },
        ];
        const cardW = 3.5;
        const gap = 0.4;
        const startY = 2.4;

        for (let idx = 0; idx < Math.min(3, cards.length); idx++) {
          const c = cards[idx]!;
          const x = 1.0 + idx * (cardW + gap);

          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y: startY,
            w: cardW,
            h: 4.0,
            fill: { color: tokens.cardBgHex },
            line: { color: tokens.cardBorderHex, width: 1 },
          });

          // Top badge
          slide.addShape(pptx.ShapeType.roundRect, {
            x: x + 0.3,
            y: startY + 0.3,
            w: 1.2,
            h: 0.32,
            fill: { color: tokens.accentHex },
          });
          slide.addText(c.tag || `PILLAR 0${idx + 1}`, {
            x: x + 0.3,
            y: startY + 0.34,
            w: 1.2,
            h: 0.26,
            fontSize: 9,
            bold: true,
            color: "FFFFFF",
            fontFace: fontTitle,
            align: "center",
          });

          slide.addText(c.title, {
            x: x + 0.3,
            y: startY + 0.8,
            w: cardW - 0.6,
            h: 0.8,
            fontSize: sizes.body + 2,
            bold: true,
            color: tokens.cardTextHex,
            fontFace: fontTitle,
          });

          slide.addText(c.description, {
            x: x + 0.3,
            y: startY + 1.7,
            w: cardW - 0.6,
            h: 2.0,
            fontSize: sizes.body - 1,
            color: tokens.cardMutedHex,
            lineSpacing: 22,
            fontFace: fontBody,
          });
        }
        break;
      }

      case "timeline": {
        const timeline = s.timeline || [
          { phase: "Phase 1", title: "Initiation", description: "Discovery & requirements" },
          { phase: "Phase 2", title: "Execution", description: "Implementation & roll-out" },
          { phase: "Phase 3", title: "Scale", description: "Optimization & governance" },
        ];
        const count = Math.min(4, timeline.length);
        const itemW = 11.333 / count;
        const startY = 3.2;

        // Connecting horizontal bar
        slide.addShape(pptx.ShapeType.rect, {
          x: 1.5,
          y: startY + 0.45,
          w: 10.333,
          h: 0.08,
          fill: { color: tokens.cardBorderHex },
        });

        for (let idx = 0; idx < count; idx++) {
          const t = timeline[idx]!;
          const x = 1.0 + idx * itemW;

          // Milestone circle marker
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x + itemW / 2 - 0.3,
            y: startY + 0.24,
            w: 0.5,
            h: 0.5,
            fill: { color: tokens.accentHex },
            line: { color: tokens.bgHex, width: 2 },
          });

          // Phase badge
          slide.addText(t.phase.toUpperCase(), {
            x,
            y: startY - 0.6,
            w: itemW,
            h: 0.35,
            fontSize: 11,
            bold: true,
            color: tokens.accentHex,
            fontFace: fontTitle,
            align: "center",
          });

          // Title
          slide.addText(t.title, {
            x: x + 0.1,
            y: startY + 0.9,
            w: itemW - 0.2,
            h: 0.6,
            fontSize: sizes.body,
            bold: true,
            color: tokens.textPrimaryHex,
            fontFace: fontTitle,
            align: "center",
          });

          // Description
          slide.addText(t.description, {
            x: x + 0.1,
            y: startY + 1.5,
            w: itemW - 0.2,
            h: 1.2,
            fontSize: sizes.bodySmall,
            color: tokens.textMutedHex,
            fontFace: fontBody,
            align: "center",
          });
        }
        break;
      }

      case "process": {
        const steps = s.processSteps || [
          { stepNumber: 1, title: "Ingestion", description: "Extract raw document text" },
          { stepNumber: 2, title: "Analysis", description: "Map key sections and metrics" },
          { stepNumber: 3, title: "Theme", description: "Apply typography and palette" },
          { stepNumber: 4, title: "Export", description: "Generate vector PowerPoint deck" },
        ];
        const count = Math.min(4, steps.length);
        const cardW = (11.333 - (count - 1) * 0.4) / count;
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;

        for (let idx = 0; idx < count; idx++) {
          const step = steps[idx]!;
          const x = 1.0 + idx * (cardW + 0.4);

          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y: startY,
            w: cardW,
            h: cardH,
            fill: { color: tokens.cardBgHex },
            line: { color: tokens.cardBorderHex, width: 1 },
          });

          // Number Circle
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x + 0.3,
            y: startY + 0.35,
            w: 0.7,
            h: 0.7,
            fill: { color: tokens.accentHex },
          });
          slide.addText(`${step.stepNumber || idx + 1}`, {
            x: x + 0.3,
            y: startY + 0.45,
            w: 0.7,
            h: 0.5,
            fontSize: 16,
            bold: true,
            color: "FFFFFF",
            fontFace: fontTitle,
            align: "center",
          });

          slide.addText(step.title, {
            x: x + 0.3,
            y: startY + 1.25,
            w: cardW - 0.6,
            h: 0.6,
            fontSize: sizes.body + 1,
            bold: true,
            color: tokens.cardTextHex,
            fontFace: fontTitle,
          });

          slide.addText(step.description, {
            x: x + 0.3,
            y: startY + 1.9,
            w: cardW - 0.6,
            h: cardH - 2.05,
            fontSize: sizes.bodySmall,
            color: tokens.cardMutedHex,
            lineSpacing: 22,
            fontFace: fontBody,
          });
        }
        break;
      }

      case "quote": {
        const q = s.quote || {
          text: s.subtitle || s.bullets?.[0] || "Exceptional presentation clarity.",
          author: "Executive Leadership",
          role: "Strategic Review",
        };
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;

        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.5,
          y: startY,
          w: 10.333,
          h: cardH,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.accentHex, width: 1.5 },
        });

        // Large quotation mark
        slide.addText("“", {
          x: 2.0,
          y: startY + 0.2,
          w: 1.5,
          h: 1.0,
          fontSize: 72,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
        });

        // Quote text
        slide.addText(q.text, {
          x: 2.2,
          y: startY + 1.0,
          w: 8.9,
          h: cardH - 1.8,
          fontSize: 20,
          italic: true,
          color: tokens.cardTextHex,
          fontFace: fontTitle,
          lineSpacing: 30,
        });

        // Author & Role
        if (q.author) {
          slide.addText(`— ${q.author}${q.role ? `  •  ${q.role}` : ""}`, {
            x: 2.2,
            y: startY + cardH - 0.6,
            w: 8.9,
            h: 0.45,
            fontSize: sizes.body,
            bold: true,
            color: tokens.accentHex,
            fontFace: fontBody,
          });
        }
        break;
      }

      case "hero-split": {
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;
        const heroW = 4.8;
        const detailW = 6.133;
        const detailX = 1.0 + heroW + 0.4;

        // Left Hero Container
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: startY,
          w: heroW,
          h: cardH,
          fill: { color: tokens.isDark ? "1E293B" : "F1F5F9" },
          line: { color: tokens.accentHex, width: 2 },
        });

        // Left Hero Accent Stripe
        slide.addShape(pptx.ShapeType.rect, {
          x: 1.0,
          y: startY,
          w: 0.18,
          h: cardH,
          fill: { color: tokens.accentHex },
        });

        // Left Hero Tag
        slide.addText((s.categoryTag || "STRATEGIC IMPERATIVE").toUpperCase(), {
          x: 1.35,
          y: startY + 0.3,
          w: heroW - 0.6,
          h: 0.35,
          fontSize: sizes.sectionTag,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
          charSpacing: 2,
        });

        // Left Hero Headline
        const heroHeadline = s.heroSplit?.headline || s.title;
        slide.addText(heroHeadline, {
          x: 1.35,
          y: startY + 0.75,
          w: heroW - 0.6,
          h: 1.8,
          fontSize: Math.min(26, sizes.heroTitle - 8),
          bold: true,
          color: tokens.textPrimaryHex,
          fontFace: fontTitle,
          lineSpacing: 30,
        });

        // Left Hero Highlight
        const heroHighlight = s.heroSplit?.highlight || s.subtitle || (s.bullets?.[0] || "");
        if (heroHighlight) {
          slide.addText(heroHighlight, {
            x: 1.35,
            y: startY + 2.7,
            w: heroW - 0.6,
            h: cardH - 2.9,
            fontSize: sizes.body,
            color: tokens.textSecondaryHex,
            fontFace: fontBody,
            lineSpacing: 22,
          });
        }

        // Right Detail Cards
        const details = s.heroSplit?.details || (s.bullets && s.bullets.length > 0 ? s.bullets.slice(0, 3) : [
          "Operational validation across implementation checkpoints.",
          "Targeted execution framework supporting end-to-end deliverables.",
        ]);
        const dCount = Math.min(3, Math.max(1, details.length));
        const gap = 0.25;
        const dCardH = (cardH - (dCount - 1) * gap) / dCount;

        for (let di = 0; di < dCount; di++) {
          const dy = startY + di * (dCardH + gap);
          slide.addShape(pptx.ShapeType.roundRect, {
            x: detailX,
            y: dy,
            w: detailW,
            h: dCardH,
            fill: { color: tokens.cardBgHex },
            line: { color: tokens.cardBorderHex, width: 1 },
          });

          // Index badge
          slide.addShape(pptx.ShapeType.roundRect, {
            x: detailX + 0.3,
            y: dy + 0.25,
            w: 0.8,
            h: 0.32,
            fill: { color: tokens.accentHex },
          });
          slide.addText(`0${di + 1}`, {
            x: detailX + 0.3,
            y: dy + 0.27,
            w: 0.8,
            h: 0.28,
            fontSize: 10,
            bold: true,
            color: "FFFFFF",
            fontFace: fontTitle,
            align: "center",
          });

          // Detail text
          slide.addText(details[di]!, {
            x: detailX + 1.3,
            y: dy + 0.2,
            w: detailW - 1.6,
            h: dCardH - 0.4,
            fontSize: sizes.body,
            bold: di === 0,
            color: tokens.cardTextHex,
            fontFace: fontBody,
            lineSpacing: 22,
          });
        }
        break;
      }

      case "bento-grid": {
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;
        const gridW = 5.466;
        const gridH = (cardH - 0.3) / 2;
        const col2X = 6.866;

        const defaultBento = [
          { title: "Core Architecture", description: s.bullets?.[0] || "Foundational service layer and interface boundaries.", tag: "FOUNDATION" },
          { title: "Telemetry & Performance", description: s.bullets?.[1] || "Real-time metrics tracking throughput and latency.", tag: "TELEMETRY" },
          { title: "Security & Guardrails", description: s.bullets?.[2] || "Enterprise access controls and verification gates.", tag: "SECURITY" },
          { title: "Scalability Roadmap", description: s.bullets?.[3] || "Horizontal expansion and resilient failover topology.", tag: "ROADMAP" },
        ];
        const bentoItems = s.bentoGrid && s.bentoGrid.length >= 4 ? s.bentoGrid : (
          s.bullets && s.bullets.length >= 4
            ? s.bullets.slice(0, 4).map((b, idx) => {
                const parts = b.split(/:\s*/);
                let itemTitle = "";
                let itemDesc = "";
                if (parts.length > 1) {
                  itemTitle = parts[0]!.trim();
                  itemDesc = parts.slice(1).join(": ").trim();
                } else {
                  const words = b.split(/\s+/);
                  itemTitle = words.slice(0, 3).join(" ");
                  itemDesc = b;
                }
                return {
                  title: itemTitle,
                  description: itemDesc,
                  tag: `0${idx + 1}`,
                };
              })
            : defaultBento
        );

        for (let bi = 0; bi < 4; bi++) {
          const item = bentoItems[bi]!;
          const isLeft = bi % 2 === 0;
          const isTop = bi < 2;
          const bx = isLeft ? 1.0 : col2X;
          const by = isTop ? startY : startY + gridH + 0.3;

          slide.addShape(pptx.ShapeType.roundRect, {
            x: bx,
            y: by,
            w: gridW,
            h: gridH,
            fill: { color: tokens.cardBgHex },
            line: { color: tokens.cardBorderHex, width: 1 },
          });

          // Accent corner pill
          slide.addShape(pptx.ShapeType.rect, {
            x: bx + 0.3,
            y: by + 0.2,
            w: 0.6,
            h: 0.06,
            fill: { color: tokens.accentHex },
          });

          // Tag
          if (item.tag) {
            slide.addText(item.tag.toUpperCase(), {
              x: bx + 1.1,
              y: by + 0.16,
              w: gridW - 1.4,
              h: 0.25,
              fontSize: sizes.sectionTag - 1,
              bold: true,
              color: tokens.accentHex,
              fontFace: fontTitle,
              charSpacing: 1.5,
            });
          }

          // Card Title
          slide.addText(item.title, {
            x: bx + 0.3,
            y: by + 0.42,
            w: gridW - 0.6,
            h: 0.4,
            fontSize: sizes.body + 1,
            bold: true,
            color: tokens.cardTextHex,
            fontFace: fontTitle,
          });

          // Card Description
          slide.addText(item.description, {
            x: bx + 0.3,
            y: by + 0.85,
            w: gridW - 0.6,
            h: gridH - 0.95,
            fontSize: sizes.bodySmall,
            color: tokens.cardMutedHex,
            fontFace: fontBody,
            lineSpacing: 20,
          });
        }
        break;
      }

      case "headline-hero": {
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;

        // Top Headline Banner
        const topH = 1.8;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: startY,
          w: 11.333,
          h: topH,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.accentHex, width: 1.5 },
        });

        // Top Accent indicator
        slide.addShape(pptx.ShapeType.rect, {
          x: 1.0,
          y: startY,
          w: 0.18,
          h: topH,
          fill: { color: tokens.accentHex },
        });

        const headlineStat = s.statCallout?.stat || (s.title.length < 35 ? s.title : "DECISIVE INSIGHT");
        const headlineContext = s.statCallout?.context || s.subtitle || (s.bullets?.[0] || "");

        slide.addText(headlineStat, {
          x: 1.4,
          y: startY + 0.25,
          w: 10.5,
          h: 0.75,
          fontSize: Math.min(32, sizes.heroTitle - 4),
          bold: true,
          color: tokens.textPrimaryHex,
          fontFace: fontTitle,
        });

        slide.addText(headlineContext, {
          x: 1.4,
          y: startY + 1.05,
          w: 10.5,
          h: 0.6,
          fontSize: sizes.body + 1,
          color: tokens.textSecondaryHex,
          fontFace: fontBody,
        });

        // Bottom Row of Supporting Takeaway Cards
        const bottomBullets = s.statCallout?.bullets || (s.bullets && s.bullets.length > 1 ? s.bullets.slice(1, 4) : [
          "Strategic requirement validated by telemetry benchmarks.",
          "Target milestone readiness confirmed for release gates.",
        ]);
        const bCount = Math.min(3, Math.max(1, bottomBullets.length));
        const bGap = 0.3;
        const bCardW = (11.333 - (bCount - 1) * bGap) / bCount;
        const bY = startY + topH + 0.3;
        const bCardH = cardH - topH - 0.3;

        for (let bi = 0; bi < bCount; bi++) {
          const bx = 1.0 + bi * (bCardW + bGap);
          slide.addShape(pptx.ShapeType.roundRect, {
            x: bx,
            y: bY,
            w: bCardW,
            h: bCardH,
            fill: { color: tokens.cardBgHex },
            line: { color: tokens.cardBorderHex, width: 1 },
          });

          slide.addShape(pptx.ShapeType.rect, {
            x: bx + 0.3,
            y: bY + 0.2,
            w: 0.6,
            h: 0.05,
            fill: { color: tokens.accentHex },
          });

          slide.addText(bottomBullets[bi]!, {
            x: bx + 0.3,
            y: bY + 0.35,
            w: bCardW - 0.6,
            h: bCardH - 0.5,
            fontSize: sizes.bodySmall,
            bold: bi === 0,
            color: tokens.cardTextHex,
            fontFace: fontBody,
            lineSpacing: 20,
          });
        }
        break;
      }

      case "diagram-explainer":
      case "text-visual":
      case "image-led": {
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;
        const leftW = 5.8;
        const rightW = 5.0;

        // Left Structured Content Cards (fills vertical height with modern card primitives)
        if (s.bullets && s.bullets.length > 0) {
          const count = Math.min(4, s.bullets.length);
          const gap = 0.2;
          const itemH = (cardH - (count - 1) * gap) / count;

          s.bullets.slice(0, count).forEach((b, bIdx) => {
            const itemY = startY + bIdx * (itemH + gap);

            // Card background container
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 1.0,
              y: itemY,
              w: leftW,
              h: itemH,
              fill: { color: tokens.cardBgHex },
              line: { color: tokens.cardBorderHex, width: 1 },
            });

            // Accent indicator / badge
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 1.2,
              y: itemY + Math.max(0.12, (itemH - 0.35) / 2),
              w: 0.5,
              h: 0.35,
              fill: { color: tokens.accentHex },
              line: { color: tokens.accentHex, width: 0 },
            });

            slide.addText(`0${bIdx + 1}`, {
              x: 1.2,
              y: itemY + Math.max(0.12, (itemH - 0.35) / 2),
              w: 0.5,
              h: 0.35,
              fontSize: 10,
              bold: true,
              color: "FFFFFF",
              align: "center",
              valign: "middle",
              fontFace: fontTitle,
            });

            // Formatted text
            const parts = b.split(/:\s*(.+)/);
            if (parts.length > 1 && parts[0] && parts[1]) {
              slide.addText(
                [
                  { text: parts[0] + ": ", options: { bold: true, color: tokens.accentHex, fontSize: sizes.body } },
                  { text: parts[1], options: { bold: false, color: tokens.cardTextHex, fontSize: sizes.body } },
                ],
                {
                  x: 1.85,
                  y: itemY + 0.1,
                  w: leftW - 1.05,
                  h: itemH - 0.2,
                  valign: "middle",
                  fontFace: fontBody,
                },
              );
            } else {
              slide.addText(b, {
                x: 1.85,
                y: itemY + 0.1,
                w: leftW - 1.05,
                h: itemH - 0.2,
                fontSize: sizes.body,
                color: tokens.cardTextHex,
                valign: "middle",
                fontFace: fontBody,
              });
            }
          });
        }

        // Right Visual Card
        const visualX = 7.333;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: visualX,
          y: startY,
          w: rightW,
          h: cardH,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.cardBorderHex, width: 1 },
        });

        // Visual Asset Header
        const visTypeLabel = (s.visual?.type || "VISUAL").toUpperCase();
        slide.addText(`${visTypeLabel} // ${s.visual?.concept || "CONCEPT MATRIX"}`, {
          x: visualX + 0.3,
          y: startY + 0.2,
          w: rightW - 0.6,
          h: 0.3,
          fontSize: 9,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
          charSpacing: 2,
        });

        // High quality contextual image or vector diagram
        const visualImg =
          s.visual?.imageUrl ||
          buildContextualVisual({
            title: s.title,
            subtitle: s.subtitle,
            bullets: s.bullets,
            accentColor: tokens.accentHex,
            isDark: tokens.isDark,
          }).imageUrl;

        slide.addImage({
          data: visualImg,
          x: visualX + 0.3,
          y: startY + 0.55,
          w: rightW - 0.6,
          h: cardH - 1.15,
        });

        // Caption / Notes below diagram
        const captionText =
          s.visual?.caption || s.visual?.concept || s.subtitle || "Conceptual design and topology";
        slide.addText(captionText, {
          x: visualX + 0.3,
          y: startY + cardH - 0.45,
          w: rightW - 0.6,
          h: 0.4,
          fontSize: 10,
          color: tokens.cardMutedHex,
          fontFace: fontBody,
          align: "center",
          italic: true,
        });
        break;
      }

      case "conclusion": {
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;
        const bullets = s.bullets || [
          "Decisive insights synthesized from document material.",
          "Core strategic alignments verified for execution.",
          "Actionable roadmap configured for deployment.",
        ];

        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: startY,
          w: 11.333,
          h: cardH,
          fill: { color: tokens.cardBgHex },
          line: { color: tokens.cardBorderHex, width: 1 },
        });

        // Top tag inside conclusion card
        slide.addText("FINAL SYNTHESIS & ACTION CHECKLIST", {
          x: 1.5,
          y: startY + 0.35,
          w: 8.0,
          h: 0.3,
          fontSize: 10,
          bold: true,
          color: tokens.accentHex,
          fontFace: fontTitle,
          charSpacing: 2,
        });

        const stepSpacing = Math.min(0.7, (cardH - 1.0) / Math.max(1, bullets.length));
        for (let idx = 0; idx < Math.min(4, bullets.length); idx++) {
          const bY = startY + 0.8 + idx * stepSpacing;

          // Checkmark badge
          slide.addShape(pptx.ShapeType.ellipse, {
            x: 1.5,
            y: bY,
            w: 0.35,
            h: 0.35,
            fill: { color: tokens.accentHex },
          });
          slide.addText("✓", {
            x: 1.5,
            y: bY + 0.03,
            w: 0.35,
            h: 0.3,
            fontSize: 12,
            bold: true,
            color: "FFFFFF",
            fontFace: fontTitle,
            align: "center",
          });

          slide.addText(bullets[idx]!, {
            x: 2.1,
            y: bY - 0.05,
            w: 9.8,
            h: 0.55,
            fontSize: sizes.body,
            bold: idx === 0,
            color: tokens.cardTextHex,
            fontFace: fontBody,
          });
        }
        break;
      }

      default: {
        // Standard Content Slide
        const startY = geo.contentStartY;
        const cardH = geo.contentMaxH;
        if (s.bullets && s.bullets.length > 0) {
          if (s.bullets.length <= 2) {
            // Render as an Executive Key Takeaway Card with prominent styling so slide is never empty
            const boxH = Math.min(cardH, 3.2);
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 1.0,
              y: startY,
              w: 11.333,
              h: boxH,
              fill: { color: tokens.cardBgHex },
              line: { color: tokens.accentHex, width: 1.5 },
            });
            slide.addShape(pptx.ShapeType.rect, {
              x: 1.0,
              y: startY,
              w: 0.15,
              h: boxH,
              fill: { color: tokens.accentHex },
            });
            slide.addText("KEY STRATEGIC FOCUS", {
              x: 1.4,
              y: startY + 0.25,
              w: 10.5,
              h: 0.35,
              fontSize: sizes.sectionTag,
              bold: true,
              color: tokens.accentHex,
              fontFace: fontTitle,
              charSpacing: 1.5,
            });
            const bulletItems = s.bullets.map((b) => ({
              text: b,
              options: { breakLine: true },
            }));
            slide.addText(bulletItems, {
              x: 1.4,
              y: startY + 0.7,
              w: 10.5,
              h: boxH - 0.9,
              fontSize: sizes.body + 2,
              bold: true,
              color: tokens.cardTextHex,
              bullet: true,
              lineSpacing: 32,
              fontFace: fontBody,
            });
          } else if (s.bullets.length >= 4) {
            // Render as Dual-Column Structured Cards so slide area is intelligently balanced with zero empty space
            const colW = 5.466;
            const col2X = 6.866;
            const mid = Math.ceil(s.bullets.length / 2);
            const col1Bullets = s.bullets.slice(0, mid);
            const col2Bullets = s.bullets.slice(mid, 6);

            // Left Card
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 1.0,
              y: startY,
              w: colW,
              h: cardH,
              fill: { color: tokens.cardBgHex },
              line: { color: tokens.cardBorderHex, width: 1.2 },
            });
            slide.addShape(pptx.ShapeType.rect, {
              x: 1.0,
              y: startY,
              w: 0.12,
              h: cardH,
              fill: { color: tokens.accentHex },
            });
            slide.addText("STRATEGIC FRAMEWORK", {
              x: 1.3,
              y: startY + 0.25,
              w: colW - 0.5,
              h: 0.3,
              fontSize: sizes.sectionTag,
              bold: true,
              color: tokens.accentHex,
              fontFace: fontTitle,
              charSpacing: 1.5,
            });
            slide.addText(
              col1Bullets.map((b) => ({ text: b, options: { breakLine: true } })),
              {
                x: 1.3,
                y: startY + 0.65,
                w: colW - 0.5,
                h: cardH - 0.9,
                fontSize: sizes.body,
                color: tokens.cardTextHex,
                bullet: true,
                lineSpacing: 26,
                fontFace: fontBody,
              },
            );

            // Right Card
            slide.addShape(pptx.ShapeType.roundRect, {
              x: col2X,
              y: startY,
              w: colW,
              h: cardH,
              fill: { color: tokens.cardBgHex },
              line: { color: tokens.cardBorderHex, width: 1.2 },
            });
            slide.addShape(pptx.ShapeType.rect, {
              x: col2X,
              y: startY,
              w: 0.12,
              h: cardH,
              fill: { color: tokens.accentHex },
            });
            slide.addText("OPERATIONAL IMPACT", {
              x: col2X + 0.3,
              y: startY + 0.25,
              w: colW - 0.5,
              h: 0.3,
              fontSize: sizes.sectionTag,
              bold: true,
              color: tokens.accentHex,
              fontFace: fontTitle,
              charSpacing: 1.5,
            });
            slide.addText(
              col2Bullets.map((b) => ({ text: b, options: { breakLine: true } })),
              {
                x: col2X + 0.3,
                y: startY + 0.65,
                w: colW - 0.5,
                h: cardH - 0.9,
                fontSize: sizes.body,
                color: tokens.cardTextHex,
                bullet: true,
                lineSpacing: 26,
                fontFace: fontBody,
              },
            );
          } else {
            // Render as an Executive Content Card with rounded border, accent edge, and balanced spacing
            const fittedH = Math.min(cardH, 1.4 + s.bullets.length * 0.95);
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 1.0,
              y: startY,
              w: 11.333,
              h: fittedH,
              fill: { color: tokens.cardBgHex },
              line: { color: tokens.cardBorderHex, width: 1.2 },
            });
            slide.addShape(pptx.ShapeType.rect, {
              x: 1.0,
              y: startY,
              w: 0.15,
              h: fittedH,
              fill: { color: tokens.accentHex },
            });
            slide.addText("CORE ANALYSIS & DELIVERABLES", {
              x: 1.4,
              y: startY + 0.25,
              w: 10.5,
              h: 0.35,
              fontSize: sizes.sectionTag,
              bold: true,
              color: tokens.accentHex,
              fontFace: fontTitle,
              charSpacing: 1.5,
            });
            const bulletItems = s.bullets.slice(0, 6).map((b) => ({
              text: b,
              options: { breakLine: true },
            }));
            slide.addText(bulletItems, {
              x: 1.4,
              y: startY + 0.65,
              w: 10.5,
              h: fittedH - 0.8,
              fontSize: sizes.body,
              color: tokens.cardTextHex,
              bullet: true,
              lineSpacing: 28,
              fontFace: fontBody,
            });
          }
        }
        break;
      }
    }
  }

  return pptx;
}
