import React from "react";
import type { ThemeKind } from "@/lib/presentation-theme";

export { type ThemeKind };

export type SlideType = 0 | 1 | 2 | 3;

export const SLIDE_LABELS: Record<SlideType, string> & readonly string[] = [
  "Cover / Title",
  "Structure & Agenda",
  "Data & Analysis",
  "Summary & Takeaways",
];

export interface ThemeThumbTemplate {
  id?: string;
  name?: string;
  category?: string;
  kind?: ThemeKind;
  fonts?: string;
  colors?: {
    primary: string;
    accent: string;
    bg: string;
  };
  description?: string;
}

export interface ThemeThumbProps {
  kind?: ThemeKind;
  slideIndex?: SlideType;
  slide?: SlideType;
  className?: string;
  template?: ThemeThumbTemplate | null;
  templateId?: string;
  name?: string;
  category?: string;
  colors?: {
    primary: string;
    accent: string;
    bg: string;
  };
  fonts?: string;
}

function getLuminance(hex: string): number {
  const clean = (hex || "").replace("#", "").trim();
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Modern Slidesgo-Inspired Presentation Slide Thumbnail
 * Accurately renders Slidesgo minimalist aesthetic with high-contrast typography,
 * organic curves, geometric cutouts, frosted mesh gradients, and palette switchers.
 */
export function ThemeThumb({
  kind,
  slideIndex = 0,
  slide,
  className = "",
  template,
  templateId,
  name,
  category,
  colors,
}: ThemeThumbProps) {
  const activeSlide: SlideType = slide !== undefined ? slide : slideIndex;
  const base = `relative aspect-video w-full overflow-hidden rounded-md select-none ${className}`;

  const id = template?.id || templateId || "";

  // 1. Bespoke Slidesgo Minimalist Template Renderers (Matching User's Reference Screenshots)
  switch (id) {
    case "slidesgo-minimalist-grayscale":
      return renderSlidesgoMinimalistGrayscale(base, activeSlide);
    case "slidesgo-minimalist-business":
      return renderSlidesgoMinimalistBusiness(base, activeSlide);
    case "slidesgo-korean-aesthetic":
      return renderSlidesgoKoreanAesthetic(base, activeSlide);
    case "slidesgo-minimal-gradient":
      return renderSlidesgoMinimalGradient(base, activeSlide);
    case "slidesgo-lead-funnel":
      return renderSlidesgoLeadFunnel(base, activeSlide);
    case "slidesgo-interior-design":
      return renderSlidesgoInteriorDesign(base, activeSlide);
    case "slidesgo-minimalist-pitch":
      return renderSlidesgoMinimalistPitch(base, activeSlide);
    case "slidesgo-work-life":
      return renderSlidesgoWorkLife(base, activeSlide);
    case "slidesgo-thesis-defense":
      return renderSlidesgoThesisDefense(base, activeSlide);
    case "slidesgo-minimal-charm":
      return renderSlidesgoMinimalCharm(base, activeSlide);
    case "slidesgo-industrial-project":
      return renderSlidesgoIndustrialProject(base, activeSlide);
    case "slidesgo-engineering-proposal":
      return renderSlidesgoEngineeringProposal(base, activeSlide);
    case "slidesgo-oncology-breakthrough":
      return renderSlidesgoOncologyBreakthrough(base, activeSlide);
    case "slidesgo-clean-portfolio":
      return renderSlidesgoCleanPortfolio(base, activeSlide);
    case "slidesgo-green-slides":
      return renderSlidesgoGreenSlides(base, activeSlide);
    case "slidesgo-argumentative-fallacy":
      return renderSlidesgoArgumentativeFallacy(base, activeSlide);
    case "slidesgo-hs-planner":
      return renderSlidesgoHsPlanner(base, activeSlide);
    case "slidesgo-elegant-thesis":
      return renderSlidesgoElegantThesis(base, activeSlide);
    case "slidesgo-case-report":
      return renderSlidesgoCaseReport(base, activeSlide);
    case "slidesgo-formal-portfolio":
      return renderSlidesgoFormalPortfolio(base, activeSlide);
  }

  // 2. Dynamic Modern Slidesgo-Grade Renderer for Any of the 100+ Catalog Templates
  if (template || colors || name) {
    const effectiveTemplate: ThemeThumbTemplate = {
      id: id || "custom-template",
      name: template?.name || name || "Modern Presentation",
      category: template?.category || category || "Business",
      kind: template?.kind || kind || "minimal",
      fonts: template?.fonts || "Inter",
      colors: template?.colors || colors || { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
    };
    return renderModernDynamicTemplate(base, activeSlide, effectiveTemplate);
  }

  // 3. Fallback when only `kind` is provided (with upgraded Slidesgo-level aesthetics)
  switch (kind) {
    case "academic":
      return renderModernAcademic(base, activeSlide);
    case "business":
      return renderModernBusiness(base, activeSlide);
    case "tech":
      return renderModernTech(base, activeSlide);
    case "pitch":
      return renderModernPitch(base, activeSlide);
    case "research":
      return renderModernResearch(base, activeSlide);
    case "education":
      return renderModernEducation(base, activeSlide);
    case "creative":
      return renderModernCreative(base, activeSlide);
    case "minimal":
    default:
      return renderSlidesgoMinimalistBusiness(base, activeSlide);
  }
}

// -----------------------------------------------------------------------------
// 1. BESPOKE SLIDESGO MINIMALIST RENDERERS (From User's Screenshots)
// -----------------------------------------------------------------------------

/** 1. Minimalist Grayscale Pitch Deck (Stark diagonal black triangle, crisp architectural lines) */
function renderSlidesgoMinimalistGrayscale(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-[#F8FAFC]`}>
        {/* Left Stark Architecture */}
        <div className="absolute left-[7%] top-[14%] flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-xs bg-zinc-200 text-zinc-800 font-mono text-[8px] font-bold">16:9</span>
          <span className="font-mono text-[7px] text-zinc-400">PITCH DECK</span>
        </div>
        <div className="absolute left-[7%] top-[30%] space-y-1">
          <div className="h-[2px] w-8 bg-zinc-300" />
          <div className="h-[1.5px] w-12 bg-zinc-200" />
        </div>
        {/* Diagonal Dark Charcoal Wedge */}
        <div
          style={{ clipPath: "polygon(34% 0, 100% 0, 100% 100%, 14% 100%)", backgroundColor: "#18181B" }}
          className="absolute inset-0 flex flex-col justify-center items-end pr-[8%] pl-[35%]"
        >
          <h3 className="font-sans font-black text-white text-[12px] sm:text-[14px] tracking-tight uppercase leading-tight text-right">
            MINIMALIST<br />GRAYSCALE<br />PITCH DECK
          </h3>
          <p className="text-[6.5px] sm:text-[7.5px] text-zinc-400 mt-2 font-light text-right">
            Here is where your presentation begins
          </p>
        </div>
        {/* Razor-thin diagonal line overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(114deg, transparent 33.6%, #71717A 33.8%, transparent 34.2%)" }}
        />
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-[#FFFFFF] flex`}>
        <div className="w-[30%] bg-[#18181B] p-[4%] flex flex-col justify-between text-white">
          <span className="font-mono text-[8px] tracking-widest text-zinc-400">01 // ROADMAP</span>
          <h4 className="font-sans font-black text-[11px] leading-tight uppercase">AGENDA</h4>
        </div>
        <div className="w-[70%] p-[5%] flex flex-col justify-center space-y-2">
          {["01. The Problem Space", "02. Minimalist Architecture", "03. Unit Economics & Scale", "04. Capital Horizon"].map(
            (item, i) => (
              <div key={i} className="flex items-center justify-between border-b border-zinc-200 pb-1 text-[7.5px] text-zinc-800 font-medium">
                <span>{item}</span>
                <span className="font-mono text-zinc-400 text-[6.5px]">0{i + 1}</span>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-[#F8FAFC] p-[5%]`}>
        <div className="flex items-center justify-between border-b border-zinc-300 pb-1">
          <span className="font-sans font-bold text-[9px] uppercase text-zinc-900">Key Traction Metrics</span>
          <span className="font-mono text-[7px] text-zinc-400">16:9 • Q4 2026</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { val: "+148%", label: "YoY Growth" },
            { val: "3.8x", label: "Capital Efficiency" },
            { val: "94%", label: "Net Retention" },
          ].map((m, i) => (
            <div key={i} className="border border-zinc-300 bg-white p-2 rounded-xs flex flex-col justify-between">
              <span className="font-sans font-black text-[13px] text-zinc-900">{m.val}</span>
              <span className="font-sans text-[6.5px] text-zinc-500 uppercase mt-1">{m.label}</span>
              <div className="h-1 w-full bg-zinc-100 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-zinc-800" style={{ width: i === 0 ? "80%" : i === 1 ? "65%" : "90%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-[#18181B] text-white p-[6%] flex flex-col justify-between`}>
      <span className="font-mono text-[7.5px] tracking-widest text-zinc-400">CONCLUSION</span>
      <div className="max-w-[80%]">
        <p className="font-serif italic text-[11px] sm:text-[13px] text-zinc-100 leading-snug">
          &ldquo;Truth is ever to be found in simplicity, and not in the multiplicity and confusion of things.&rdquo;
        </p>
        <span className="text-[7.5px] font-sans text-zinc-400 block mt-1.5">— Isaac Newton</span>
      </div>
      <div className="border-t border-zinc-800 pt-1 flex justify-between font-mono text-[6.5px] text-zinc-500">
        <span>Strategic Synthesis</span>
        <span>Open for Questions</span>
      </div>
    </div>
  );
}

/** 2. Minimalist Business Slides (Organic flowing line, editorial serif, pastel switcher dots) */
function renderSlidesgoMinimalistBusiness(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-[#FAF8F5]`}>
        {/* Organic curved contour lines */}
        <svg viewBox="0 0 400 225" className="absolute inset-0 w-full h-full pointer-events-none opacity-85">
          <path d="M-20,45 Q70,-10 150,45 T300,25 Q370,60 420,30" fill="none" stroke="#27272A" strokeWidth="1.2" />
          <path d="M260,235 Q320,180 370,195 T430,165" fill="none" stroke="#27272A" strokeWidth="1.2" />
        </svg>

        {/* Centered Editorial Typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-[6%] text-center">
          <h3 className="font-serif font-bold text-zinc-900 text-[13px] sm:text-[16px] tracking-tight leading-tight">
            Minimalist<br />
            <span className="font-serif italic font-normal text-zinc-800">Business Slides</span>
          </h3>
          <p className="text-[7px] sm:text-[8px] text-zinc-500 font-sans mt-1.5">
            Here is where your presentation begins
          </p>

          {/* Slidesgo signature pastel color switchers */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <span className="h-2 w-2 rounded-full border-2 border-blue-500 bg-white" />
            <span className="h-2 w-2 rounded-full border border-zinc-300 bg-zinc-200" />
            <span className="h-2 w-2 rounded-full border border-purple-200 bg-purple-100" />
            <span className="h-2 w-2 rounded-full border border-emerald-200 bg-emerald-100" />
            <span className="h-2 w-2 rounded-full border border-rose-200 bg-rose-100" />
          </div>
        </div>
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-[#FAF8F5] p-[5%]`}>
        <div className="border-b border-zinc-300/80 pb-1 flex justify-between items-baseline">
          <h4 className="font-serif font-bold text-[10px] text-zinc-900">Agenda &amp; Structure</h4>
          <span className="font-mono text-[7px] text-zinc-400">Minimalist Business</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { num: "01", t: "Corporate Vision", desc: "Foundational philosophy & core principles" },
            { num: "02", t: "Operating Plan", desc: "Resource allocation & milestone delivery" },
            { num: "03", t: "Market Dynamics", desc: "Competitive landscape & unit moats" },
            { num: "04", t: "Forward Outlook", desc: "Projections & organizational rollout" },
          ].map((item) => (
            <div key={item.num} className="bg-white/80 border border-zinc-200 p-2 rounded-sm space-y-0.5">
              <span className="font-mono text-[7.5px] font-bold text-blue-600">{item.num}</span>
              <p className="font-serif font-semibold text-[8px] text-zinc-900">{item.t}</p>
              <p className="font-sans text-[6px] text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-[#FAF8F5] p-[5%]`}>
        <div className="flex items-center justify-between border-b border-zinc-300/80 pb-1">
          <h4 className="font-serif font-bold text-[10px] text-zinc-900">Key Performance Drivers</h4>
          <span className="text-[6.5px] font-mono text-blue-600 font-semibold">+32% EFFICIENCY</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Client Satisfaction", score: "98.4%", color: "#2563EB" },
            { label: "Margin Expansion", score: "+14.2%", color: "#10B981" },
            { label: "On-Time Velocity", score: "96.1%", color: "#8B5CF6" },
          ].map((col, i) => (
            <div key={i} className="bg-white border border-zinc-200 p-2 rounded-sm text-center">
              <span className="font-serif font-bold text-[12px] text-zinc-900">{col.score}</span>
              <p className="text-[6.5px] font-sans text-zinc-500 mt-0.5">{col.label}</p>
              <div className="h-1 w-8 mx-auto mt-1 rounded-full" style={{ backgroundColor: col.color }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-[#FAF8F5] p-[6%] flex flex-col justify-between text-center`}>
      <span className="font-mono text-[7px] text-zinc-400 tracking-widest uppercase">Takeaway Summary</span>
      <div className="max-w-[75%] mx-auto">
        <h4 className="font-serif text-[11px] sm:text-[13px] text-zinc-900 font-bold leading-snug">
          &ldquo;Clarity precedes mastery. Eliminate the non-essential to reveal true value.&rdquo;
        </h4>
        <p className="text-[7.5px] font-sans text-zinc-500 mt-1">Ready for executive review</p>
      </div>
      <div className="flex items-center justify-center gap-1 text-[6.5px] font-mono text-zinc-400">
        <span>DocuMind Studio</span>
        <span>•</span>
        <span>Minimalist Business Slides</span>
      </div>
    </div>
  );
}

/** 3. Minimalist Korean Aesthetic Pitch Deck (Soft fluid organic nude/blush clay blobs) */
function renderSlidesgoKoreanAesthetic(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FBF8F5] relative`}>
      {/* Soft Clay Blobs */}
      <div className="absolute -top-8 -left-8 w-36 h-36 rounded-[45%_55%_65%_35%] bg-[#EFE6DC] opacity-80" />
      <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-[60%_40%_35%_65%] bg-[#E8DDD3] opacity-75" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-[6%] text-center z-10">
        <span className="font-sans font-light tracking-[0.25em] text-zinc-700 text-[10px] sm:text-[11px] uppercase">
          MINIMALIST KOREAN
        </span>
        <h3 className="font-sans font-bold tracking-[0.15em] text-zinc-900 text-[9px] sm:text-[10px] uppercase mt-0.5">
          AESTHETIC PITCH DECK
        </h3>
        <div className="w-8 h-px bg-amber-700/40 my-2" />
        <p className="text-[7px] text-zinc-500 font-sans">Tactile Simplicity &amp; Soft Earthen Tones</p>
      </div>
    </div>
  );
}

/** 4. Minimal Gradient (Luminous ambient mesh blur with luxury italic serif) */
function renderSlidesgoMinimalGradient(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-white relative`}>
      <div className="absolute right-[8%] top-[15%] w-44 h-44 rounded-full bg-gradient-to-tr from-emerald-200/60 via-teal-100/50 to-yellow-100/50 blur-xl pointer-events-none" />
      <div className="absolute inset-0 flex flex-col justify-center px-[8%] z-10">
        <h3 className="font-serif text-zinc-950 text-[15px] sm:text-[18px] tracking-tight leading-tight">
          <span className="uppercase tracking-widest font-normal text-[11px] block text-zinc-800">MINIMAL</span>
          <span className="italic font-normal">GRADIENT</span>
        </h3>
        <p className="text-[7.5px] text-zinc-400 font-sans mt-1">Here is where your presentation begins</p>
      </div>
    </div>
  );
}

/** 5. Lead Funnel (Deep bold typography with cyan ambient glow aura & arrow) */
function renderSlidesgoLeadFunnel(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FAFAFA] relative`}>
      <div className="absolute right-[5%] top-[10%] w-40 h-40 rounded-full bg-cyan-200/50 blur-2xl pointer-events-none" />
      <div className="absolute left-[7%] top-[14%] font-mono text-zinc-400 text-[11px]">→</div>
      <div className="absolute inset-0 flex flex-col justify-center px-[8%] z-10">
        <h3 className="font-sans font-black text-zinc-950 text-[18px] sm:text-[22px] tracking-tighter leading-tight">
          Lead<br />Funnel
        </h3>
        <p className="text-[7.5px] text-zinc-500 font-sans mt-1">Here is where your presentation begins</p>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="h-2 w-2 rounded-full border-2 border-blue-500 bg-white" />
          <span className="h-2 w-2 rounded-full border border-pink-200 bg-pink-100" />
          <span className="h-2 w-2 rounded-full border border-emerald-200 bg-emerald-100" />
          <span className="h-2 w-2 rounded-full border border-purple-200 bg-purple-100" />
          <span className="h-2 w-2 rounded-full border border-yellow-200 bg-yellow-100" />
        </div>
      </div>
    </div>
  );
}

/** 6. Minimal Interior Design Guide (Ochre outline frame intersecting architectural card) */
function renderSlidesgoInteriorDesign(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FDFDFC] relative`}>
      <div className="absolute right-[12%] top-[16%] bottom-[16%] w-[38%] border-2 border-amber-600/80 rounded-xs z-10" />
      <div className="absolute right-[16%] top-[22%] bottom-[10%] w-[38%] bg-zinc-200 rounded-xs overflow-hidden flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-zinc-300 flex items-center justify-center font-mono text-[8px] text-zinc-500">
          PHOTO
        </div>
      </div>
      <div className="absolute left-[8%] top-[22%] w-[45%] z-20">
        <h3 className="font-sans font-bold text-amber-700 text-[13px] sm:text-[15px] leading-tight">
          Minimal<br />Interior<br />Design Guide
        </h3>
        <div className="h-0.5 w-6 bg-amber-600 mt-2" />
        <p className="text-[6.5px] text-zinc-400 mt-1">Here is where your presentation begins</p>
      </div>
    </div>
  );
}

/** 7. Minimalist Pitch Deck (Yellow with bold black line-art) */
function renderSlidesgoMinimalistPitch(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FACC15] relative p-[6%] flex items-center justify-between`}>
      <div className="z-10 max-w-[55%]">
        <div className="h-0.5 w-6 bg-black mb-2" />
        <h3 className="font-sans font-black text-black text-[14px] sm:text-[17px] uppercase tracking-tight leading-tight">
          MINIMALIST<br />PITCH DECK
        </h3>
        <p className="text-[7px] text-black/80 font-sans mt-1">Here is where your presentation begins</p>
      </div>
      {/* Minimal line-art monitor & desk */}
      <div className="w-[38%] flex flex-col items-center justify-center">
        <div className="w-16 h-10 border-2 border-black rounded-xs bg-white/40 flex items-center justify-center text-[6px] font-mono">
          DECK
        </div>
        <div className="w-4 h-2 border-r-2 border-l-2 border-black" />
        <div className="w-12 h-0.5 bg-black" />
      </div>
    </div>
  );
}

/** 8. Work-Life Integration (Terracotta brick red with italic editorial serif) */
function renderSlidesgoWorkLife(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#B94726] relative p-[6%] text-white flex items-center justify-between`}>
      <div className="w-[32%] h-[75%] bg-white/15 border border-white/30 rounded-xs flex items-center justify-center text-[7px] font-mono">
        TEAM
      </div>
      <div className="w-[62%] text-right">
        <h3 className="font-serif text-[14px] sm:text-[18px] tracking-tight leading-tight">
          WORK-<span className="italic font-serif">life</span><br />
          INTEGRATION
        </h3>
        <p className="text-[7px] text-white/70 font-sans mt-1">Building Sustainable Career Ecologies</p>
      </div>
    </div>
  );
}

/** 9. Minimalist Thesis Defense (Blush pink with coral dot matrix grid) */
function renderSlidesgoThesisDefense(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FCE7E7] relative p-[6%] flex flex-col justify-center`}>
      {/* Dot matrix grid */}
      <div className="absolute right-[8%] top-[18%] grid grid-cols-5 gap-1.5 opacity-60">
        {Array.from({ length: 25 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-rose-500" />
        ))}
      </div>
      <div className="z-10 max-w-[65%]">
        <h3 className="font-sans font-extrabold text-rose-900 text-[14px] sm:text-[17px] tracking-tight leading-tight">
          Minimalist<br />Thesis Defense.
        </h3>
        <p className="text-[7.5px] text-rose-700/80 font-sans mt-1">Here is where your presentation begins</p>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="h-2 w-2 rounded-full border-2 border-blue-500 bg-white" />
          <span className="h-2 w-2 rounded-full border border-teal-900 bg-teal-950" />
          <span className="h-2 w-2 rounded-full border border-yellow-300 bg-yellow-200" />
          <span className="h-2 w-2 rounded-full border border-cyan-300 bg-cyan-200" />
          <span className="h-2 w-2 rounded-full border border-emerald-300 bg-emerald-200" />
        </div>
      </div>
    </div>
  );
}

/** 10. Minimal Charm (Mint cyan split block with outline box) */
function renderSlidesgoMinimalCharm(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-white relative flex`}>
      <div className="w-[55%] h-full bg-white" />
      <div className="w-[45%] h-full bg-[#5EEAD4]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-[6%] z-10">
        <div className="border-2 border-black bg-white/70 px-4 py-2 text-center rounded-xs">
          <span className="text-[6.5px] font-sans text-zinc-500 uppercase tracking-widest block">HERE IS WHERE YOUR</span>
          <h3 className="font-sans font-bold text-black text-[12px] sm:text-[14px]">presentation begins</h3>
        </div>
      </div>
    </div>
  );
}

/** 11. Industrial Preliminary Project (Steel blue curve & dot matrix line) */
function renderSlidesgoIndustrialProject(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#F8FAFC] relative flex flex-col justify-between p-[6%]`}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-blue-600" />
        ))}
      </div>
      <div className="text-center">
        <h3 className="font-sans font-black text-slate-900 text-[13px] sm:text-[15px] uppercase tracking-tight">
          INDUSTRIAL<br />PRELIMINARY PROJECT
        </h3>
        <p className="text-[7px] text-slate-500 font-sans mt-1">Here is where your presentation begins</p>
      </div>
      <div className="h-1.5 w-24 bg-blue-600 rounded-full mx-auto" />
    </div>
  );
}

/** 12. Engineering Project Proposal (Olive green with photographic card) */
function renderSlidesgoEngineeringProposal(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#365314] relative p-[6%] flex items-center justify-between text-white`}>
      <div className="w-[40%] h-[75%] bg-white/20 border border-white/30 rounded-xs flex items-center justify-center text-[7px] font-mono">
        ROAD
      </div>
      <div className="w-[55%] text-right">
        <h3 className="font-sans font-black text-[12px] sm:text-[15px] uppercase leading-tight tracking-tight">
          ENGINEERING<br />PROJECT<br />PROPOSAL
        </h3>
        <p className="text-[7px] text-white/70 font-sans mt-1">Civil &amp; Sustainable Infrastructure</p>
      </div>
    </div>
  );
}

/** 13. Oncology Breakthrough (Topographic contour wave lines) */
function renderSlidesgoOncologyBreakthrough(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#F5F5F0] relative overflow-hidden`}>
      {/* Topographic Lines */}
      <svg viewBox="0 0 400 225" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <path d="M-10,30 Q60,10 120,40 T260,20 Q340,50 410,20" fill="none" stroke="#0D9488" strokeWidth="1.5" />
        <path d="M-10,50 Q70,30 130,60 T270,40 Q350,70 410,40" fill="none" stroke="#0D9488" strokeWidth="1.2" />
        <path d="M-10,180 Q80,160 160,190 T300,170 Q370,200 410,180" fill="none" stroke="#0D9488" strokeWidth="1.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-[6%] z-10">
        <h3 className="font-sans font-bold text-slate-900 text-[14px] sm:text-[17px] tracking-tight">
          Oncology<br />Breakthrough
        </h3>
        <p className="text-[7.5px] text-teal-800 font-sans mt-1">Here is where your presentation begins</p>
      </div>
    </div>
  );
}

/** 14. Clean and Elegant Portfolio (Hairline dividers with diamond sparkle) */
function renderSlidesgoCleanPortfolio(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-white relative p-[6%] flex flex-col items-center justify-center text-center`}>
      <h3 className="font-serif italic font-normal text-zinc-900 text-[14px] sm:text-[18px]">
        Clean and<br />
        <span className="not-italic font-bold">Elegant Portfolio</span>
      </h3>
      <div className="flex items-center gap-2 w-32 my-2">
        <div className="flex-1 h-px bg-zinc-300" />
        <span className="text-[8px] text-zinc-400">✧</span>
        <div className="flex-1 h-px bg-zinc-300" />
      </div>
      <p className="text-[7px] text-zinc-400 font-sans">Here is where your presentation begins</p>
    </div>
  );
}

/** 15. Minimalist Green Slides (Sage green split card) */
function renderSlidesgoGreenSlides(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#F4F7F4] relative flex p-[6%]`}>
      <div className="w-[45%] h-full bg-emerald-900/10 border border-emerald-900/20 rounded-xs flex items-center justify-center text-[7px] font-mono text-emerald-800">
        NATURE
      </div>
      <div className="w-[55%] flex flex-col justify-center items-center text-center pl-3">
        <h3 className="font-serif font-bold text-emerald-950 text-[13px] sm:text-[16px] leading-tight">
          Minimalist<br />Green Slides
        </h3>
        <p className="text-[7px] text-emerald-800 font-sans mt-1">Sustainability &amp; Ecology</p>
      </div>
    </div>
  );
}

/** 16. Argumentative Fallacy (Deep navy arch frame with quote mark) */
function renderSlidesgoArgumentativeFallacy(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#0F172A] relative flex flex-col items-center justify-center text-center text-white p-[6%]`}>
      <div className="absolute bottom-0 w-[70%] h-[75%] border-t-2 border-r-2 border-l-2 border-amber-400/40 rounded-t-full pointer-events-none" />
      <span className="font-serif text-[18px] text-amber-400 leading-none mb-1">&ldquo;</span>
      <h3 className="font-serif font-bold text-white text-[12px] sm:text-[14px] uppercase tracking-wider">
        ARGUMENTATIVE<br />FALLACY
      </h3>
      <p className="text-[7px] text-slate-400 font-sans mt-1">Deductive Logic &amp; Philosophy</p>
    </div>
  );
}

/** 17. Minimalist HS Weekly Planner */
function renderSlidesgoHsPlanner(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FAFAFA] relative p-[5%] flex flex-col items-center justify-center`}>
      <div className="w-[85%] h-[80%] border border-zinc-300 rounded-xs flex flex-col items-center justify-center p-2 text-center bg-white shadow-xs">
        <span className="font-mono text-[6.5px] text-zinc-400 uppercase tracking-widest block mb-0.5">- MINIMALIST -</span>
        <h3 className="font-sans font-black text-slate-800 text-[11px] sm:text-[13px] tracking-tight uppercase">
          HIGH SCHOOL<br />WEEKLY PLANNER
        </h3>
        <p className="text-[6.5px] text-zinc-500 font-sans mt-0.5">Here is where your presentation begins</p>
      </div>
    </div>
  );
}

/** 18. Elegant Bachelor Thesis */
function renderSlidesgoElegantThesis(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FAF9F6] relative p-[5%] flex flex-col items-center justify-center`}>
      <div className="w-[88%] h-[84%] border-2 border-double border-slate-300 rounded-xs flex flex-col items-center justify-center p-2 text-center">
        <span className="text-[8px] text-slate-400 mb-1">✦</span>
        <h3 className="font-serif font-bold text-slate-900 text-[12px] sm:text-[15px] leading-tight">
          Elegant<br />Bachelor Thesis
        </h3>
        <div className="h-px w-10 bg-slate-300 my-1.5" />
        <p className="text-[6.5px] text-slate-500 font-serif italic">Senior Capstone Defense</p>
      </div>
    </div>
  );
}

/** 19. Elegant and Clean Case Report */
function renderSlidesgoCaseReport(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-[#FAF8F5] relative p-[6%] flex flex-col justify-center`}>
      <span className="font-mono text-[7px] text-blue-700 tracking-wider font-bold uppercase mb-1">CASE BRIEF</span>
      <h3 className="font-serif font-bold text-[#0F294A] text-[14px] sm:text-[17px] leading-tight">
        Elegant and Clean<br />Case Report
      </h3>
      <div className="h-0.5 w-8 bg-blue-600 mt-2" />
      <p className="text-[7px] text-slate-500 mt-1 font-sans">Diagnostic &amp; Turnaround Strategy</p>
    </div>
  );
}

/** 20. Formal and Clean Portfolio */
function renderSlidesgoFormalPortfolio(base: string, slide: SlideType) {
  return (
    <div className={`${base} bg-white relative p-[6%] flex flex-col justify-between`}>
      <div className="flex justify-between items-baseline border-b border-zinc-200 pb-1">
        <span className="font-mono text-[6.5px] text-zinc-400">PORTFOLIO 2026</span>
        <span className="font-mono text-[6.5px] text-zinc-400">16:9</span>
      </div>
      <div>
        <h3 className="font-serif font-bold text-zinc-900 text-[13px] sm:text-[16px] tracking-widest uppercase">
          FORMAL AND<br />CLEAN
        </h3>
        <p className="text-[7px] text-zinc-500 font-sans mt-0.5">Architecture &amp; Spatial Monograph</p>
      </div>
      <div className="flex gap-1 text-[6.5px] font-mono text-zinc-400">
        <span>Structure</span>
        <span>•</span>
        <span>Materiality</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. MODERN DYNAMIC TEMPLATE RENDERER (For all remaining 100+ catalog themes)
// -----------------------------------------------------------------------------

function renderModernDynamicTemplate(
  base: string,
  slide: SlideType,
  t: ThemeThumbTemplate,
) {
  const bg = t.colors?.bg || "#FFFFFF";
  const primary = t.colors?.primary || "#0F172A";
  const accent = t.colors?.accent || "#2563EB";
  const isDark = getLuminance(bg) < 0.35;
  const textColor = isDark ? "#F8FAFC" : primary;
  const subtitleColor = isDark ? "#94A3B8" : "#64748B";

  if (slide === 0) {
    return (
      <div className={base} style={{ backgroundColor: bg }}>
        {/* Subtle geometric corner accent */}
        <div
          className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-20 pointer-events-none"
          style={{ backgroundColor: accent }}
        />

        {/* Top Badges */}
        <div className="absolute top-[8%] left-[7%] right-[7%] flex items-center justify-between">
          <span
            className="px-1.5 py-0.5 rounded-xs font-mono text-[7px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              color: accent,
            }}
          >
            {t.category || "PRESENTATION"}
          </span>
          <span className="font-mono text-[7px] text-zinc-400">16:9</span>
        </div>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-[8%] pt-3">
          <div className="h-0.5 w-6 mb-2 rounded-full" style={{ backgroundColor: accent }} />
          <h3
            className="font-sans font-extrabold text-[12px] sm:text-[14px] leading-tight tracking-tight line-clamp-2"
            style={{ color: textColor }}
          >
            {t.name}
          </h3>
          <p className="text-[7px] font-sans mt-1 line-clamp-1" style={{ color: subtitleColor }}>
            {t.description || "Here is where your presentation begins"}
          </p>

          {/* Slidesgo signature palette switchers */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="h-2 w-2 rounded-full border border-zinc-400/30" style={{ backgroundColor: primary }} />
            <span className="h-2 w-2 rounded-full border border-zinc-400/30" style={{ backgroundColor: accent }} />
            <span className="h-2 w-2 rounded-full border border-zinc-400/30" style={{ backgroundColor: bg }} />
            <span className="h-2 w-2 rounded-full bg-zinc-200" />
          </div>
        </div>
      </div>
    );
  }

  if (slide === 1) {
    return (
      <div className={base} style={{ backgroundColor: bg }}>
        <div className="p-[5%] flex flex-col justify-between h-full">
          <div className="flex justify-between items-baseline border-b pb-1" style={{ borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }}>
            <span className="font-sans font-bold text-[9px]" style={{ color: textColor }}>
              Roadmap &amp; Agenda
            </span>
            <span className="font-mono text-[6.5px]" style={{ color: accent }}>01 / 04</span>
          </div>
          <div className="space-y-1 my-auto">
            {["Context & Strategy", "Operating Framework", "Traction Milestones", "Forward Roadmap"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[7.5px]" style={{ color: textColor }}>
                <span className="font-mono font-bold text-[7px]" style={{ color: accent }}>0{i + 1}</span>
                <span className="font-medium truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (slide === 2) {
    return (
      <div className={base} style={{ backgroundColor: bg }}>
        <div className="p-[5%] flex flex-col justify-between h-full">
          <div className="flex justify-between items-baseline border-b pb-1" style={{ borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }}>
            <span className="font-sans font-bold text-[9px]" style={{ color: textColor }}>
              Performance Metrics
            </span>
            <span className="font-mono text-[6.5px]" style={{ color: accent }}>DATA</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 my-auto">
            {[
              { v: "+142%", l: "Growth" },
              { v: "3.8x", l: "Scale" },
              { v: "98.4%", l: "Uptime" },
            ].map((col, i) => (
              <div
                key={i}
                className="p-1.5 rounded-xs text-center border"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                }}
              >
                <span className="font-sans font-bold text-[10px] block" style={{ color: accent }}>
                  {col.v}
                </span>
                <span className="text-[6px] font-sans uppercase" style={{ color: subtitleColor }}>
                  {col.l}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={base} style={{ backgroundColor: bg }}>
      <div className="p-[6%] flex flex-col justify-between h-full text-center">
        <span className="font-mono text-[6.5px] tracking-widest uppercase" style={{ color: accent }}>
          CONCLUSION
        </span>
        <div className="max-w-[80%] mx-auto my-auto">
          <p className="font-serif italic text-[10px] sm:text-[12px] leading-snug" style={{ color: textColor }}>
            &ldquo;Decisive insight leads to decisive action.&rdquo;
          </p>
          <span className="text-[6.5px] font-sans block mt-1" style={{ color: subtitleColor }}>
            {t.name} Synthesis
          </span>
        </div>
        <div className="text-[6px] font-mono" style={{ color: subtitleColor }}>
          Created with DocuMind
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 3. UPGRADED FALLBACKS FOR EXISTING KINDS (Academic, Business, Tech, etc.)
// -----------------------------------------------------------------------------

function renderModernAcademic(base: string, slide: SlideType) {
  return renderModernDynamicTemplate(base, slide, {
    name: "Academic Research Presentation",
    category: "Academic",
    kind: "academic",
    colors: { primary: "#0F294A", accent: "#2563EB", bg: "#FAF8F5" },
    description: "Rigorous scholarly presentation deck for thesis defense and research symposia.",
  });
}

function renderModernBusiness(base: string, slide: SlideType) {
  return renderSlidesgoMinimalistBusiness(base, slide);
}

function renderModernTech(base: string, slide: SlideType) {
  return renderSlidesgoIndustrialProject(base, slide);
}

function renderModernPitch(base: string, slide: SlideType) {
  return renderSlidesgoMinimalistGrayscale(base, slide);
}

function renderModernResearch(base: string, slide: SlideType) {
  return renderSlidesgoOncologyBreakthrough(base, slide);
}

function renderModernEducation(base: string, slide: SlideType) {
  return renderSlidesgoThesisDefense(base, slide);
}

function renderModernCreative(base: string, slide: SlideType) {
  return renderSlidesgoMinimalGradient(base, slide);
}
