import { describe, expect, it } from "vitest";
import { generateGamma3DMeshSvg } from "../lib/presentation-visual-generator";
import { buildSlideDeckContent } from "../lib/presentation-session-client";
import { renderSlideDeckToPptx } from "../lib/presentation-renderer";
import { computeThemeTokens } from "../lib/presentation-theme";
import { TEMPLATES } from "../data/templates";

describe("Gamma.ai Quality Benchmark — DocuMind Presentation Maker Transformation", () => {
  it("1. Generates undulating 3D wireframe mesh SVG with radiant cyan-emerald gradients and nodes", () => {
    const mesh = generateGamma3DMeshSvg({
      width: 800,
      height: 800,
      isDark: true,
      accentColor: "#22D3EE",
    });

    expect(mesh.svg).toContain("<svg");
    expect(mesh.svg).toContain("gammaMeshGrad");
    expect(mesh.svg).toContain("#06B6D4");
    expect(mesh.svg).toContain("#10B981");
    expect(mesh.svg).toContain("gammaNeonGlow");
    expect(mesh.svg).toContain("<circle");
    expect(mesh.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(mesh.svg.length).toBeGreaterThan(15000);
  });

  it("2. Eliminates robotic corporate boilerplate and fake Pillar titles", () => {
    const rawContent = `
Task: Integrate EXAONE AI as the Dedicated AI Engine for Four DocuMind Modules
1. Understand the presentation topic and audience requirements.
2. Develop logical presentation structure with meaningful titles.
3. Write complete and relevant slide content without leaving blank areas.
4. Identify where diagrams and illustrations improve comprehension.
    `.trim();

    const deck = buildSlideDeckContent(
      "AI Integration Task",
      rawContent,
      6,
      "balanced",
      "Technology & Engineering",
    );

    expect(deck.length).toBe(6);

    // Verify ZERO robotic filler in any slide
    for (const slide of deck) {
      // Check title
      expect(slide.title).not.toMatch(/Pillar\s*0\d/i);
      expect(slide.title).not.toMatch(/Core Standard:/i);

      // Check bullets
      if (slide.bullets) {
        for (const bullet of slide.bullets) {
          expect(bullet).not.toMatch(/Core Standard:/i);
          expect(bullet).not.toMatch(/Execution Framework:/i);
          expect(bullet).not.toMatch(/Verification Standards:/i);
          expect(bullet).not.toMatch(/Operational Readiness:/i);
        }
      }

      // Check bento grid if present
      if (slide.bentoGrid) {
        for (const card of slide.bentoGrid) {
          expect(card.title).not.toMatch(/^Pillar\s*0\d$/i);
          expect(card.tag).not.toMatch(/^PILLAR\s*0\d$/i);
        }
      }
    }
  });

  it("3. Native Arabic and RTL handling matching Gamma reference presentation", () => {
    const arabicContent = `
كيف يتعلم طلاب العلم المسلمون القرآن والحديث في عام 2026 باستخدام التكنولوجيا؟
من الكتاب والقلم إلى الهاتف والذكاء الاصطناعي: كيف نخدم العلم دون أن نفقد منهجه؟

إذا كان طالب العلم في الماضي يحتاج إلى كتاب وشيخ ومجلس علم، فماذا أصبح لديه اليوم؟
- المصادر الأصيلة: القرآن والكتب والعلماء والمعلمون
- الوسائط الصوتية: التلاوات والدروس المسجلة
- الأجهزة الذكية: الهاتف والحاسوب والإنترنت
- الذكاء الاصطناعي: أدوات حديثة بإمكانيات واسعة

الإسلام والعلم: البداية كانت "اقرأ"
﴿اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ﴾
بدأ الوحي بكلمة "اقرأ"، وذكر القلم والتعليم.

تنبيه هام ومقارنة:
قديمًا: كتاب، شيخ، مسجد، حلقة علم، دفتر
اليوم: مصحف إلكتروني، تسجيلات، تطبيقات، مكتبات رقمية
تحذير: ليس كل حديث يظهر على الإنترنت حديثًا صحيحًا.
    `.trim();

    const arabicDeck = buildSlideDeckContent(
      "كيف يتعلم طلاب العلم المسلمون",
      arabicContent,
      6,
      "balanced",
      "التعليم والتكنولوجيا",
    );

    expect(arabicDeck.length).toBe(6);

    // Verify RTL is detected and set
    expect(arabicDeck[0]?.isRtl).toBe(true);
    expect(arabicDeck[0]?.visualMesh).toBe(true);

    // Verify no English boilerplate leaked into Arabic slides
    for (const slide of arabicDeck) {
      if (slide.bullets) {
        for (const b of slide.bullets) {
          expect(b).not.toMatch(/Core Standard:/i);
          expect(b).not.toMatch(/Workspace Setup:/i);
          expect(b).not.toMatch(/Secret Protection:/i);
        }
      }
    }
  });

  it("4. Generates PowerPoint (.pptx) with modern Gamma layout tokens and 3D visual assets", async () => {
    const testContent = `
# Executive Strategic Review
DocuMind accelerates document workflows and presentation design.

# Core Architectural Quadrants
- Cognitive Pipeline: Ingestion and structural AST decomposition
- Generative Mesh: 3D vector wireframe synthesis and visual storytelling
- Telemetry & Speed: 18ms processing latency with zero server retention
- Universal Export: Publication-grade PDF and genuine vector PowerPoint

# Key Insight & Thesis
The AI must act as the genuine creative director of every page and slide.
    `.trim();

    const deck = buildSlideDeckContent(
      "Executive Strategic Review",
      testContent,
      5,
      "balanced",
      "Executive Briefing",
    );

    const theme = TEMPLATES.find((t) => t.id === "executive-brief") || TEMPLATES[0]!;
    const tokens = computeThemeTokens(theme);

    const pptx = await renderSlideDeckToPptx("Executive Strategic Review", "Briefing", deck, tokens);
    expect(pptx).toBeDefined();

    const rawData = await pptx.write({ outputType: "nodebuffer" });
    const buffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer);

    expect(buffer.length).toBeGreaterThan(10000);
    // PPTX header is a ZIP archive starting with PK (0x50 0x4B)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
