import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowRightLeft,
  FileText,
  Sparkles,
  Gauge,
  CheckCircle2,
  Sliders,
  ChevronRight,
  BookOpen,
  FileDown,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onCreatePresentation?: () => void;
  onImproveDocument?: () => void;
}

export function Hero({ onCreatePresentation, onImproveDocument }: HeroProps) {
  const handleCreatePresentation = () => {
    if (onCreatePresentation) {
      onCreatePresentation();
    } else {
      document.getElementById("presentation-maker")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleImproveDocument = () => {
    if (onImproveDocument) {
      onImproveDocument();
    } else {
      document.getElementById("document-studio")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTools = () => {
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToCompression = () => {
    document.getElementById("compression")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
      {/* Subtle paper grid background */}
      <div className="pointer-events-none absolute inset-0 paper-sheet opacity-40" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1.1fr] lg:items-center">
          {/* Editorial Headline Column */}
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs text-foreground/80 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-medium">The Intelligent Paper Studio</span>
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.8rem] font-serif font-normal leading-[1.08] text-foreground tracking-tight">
              Your ideas deserve{" "}
              <span className="italic font-normal text-primary">better documents.</span>
            </h1>

            <p className="mt-6 text-lg text-foreground/75 leading-relaxed max-w-xl">
              Turn your text and documents into polished presentations, improve document formatting,
              and make everyday file tasks simpler.
            </p>

            {/* Two Clear Primary Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              {onCreatePresentation ? (
                <Button
                  variant="hero"
                  size="lg"
                  onClick={onCreatePresentation}
                  className="gap-2 px-6"
                >
                  <Sparkles className="h-4 w-4" /> Create a Presentation
                </Button>
              ) : (
                <Button variant="hero" size="lg" className="gap-2 px-6" asChild>
                  <Link to="/presentation-maker">
                    <Sparkles className="h-4 w-4" /> Create a Presentation
                  </Link>
                </Button>
              )}

              {onImproveDocument ? (
                <Button
                  variant="glass"
                  size="lg"
                  onClick={onImproveDocument}
                  className="gap-2 px-6"
                >
                  <BookOpen className="h-4 w-4 text-primary" /> Improve a Document
                </Button>
              ) : (
                <Button variant="glass" size="lg" className="gap-2 px-6" asChild>
                  <Link to="/document-studio">
                    <BookOpen className="h-4 w-4 text-primary" /> Improve a Document
                  </Link>
                </Button>
              )}
            </div>

            {/* Simple 3-Step Workflow Explanation */}
            <div className="mt-8 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-xs">
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                How It Works in 3 Steps
              </p>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-start gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Provide Content</p>
                    <p className="text-[10px] text-muted-foreground">Paste text or upload file</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">We Understand It</p>
                    <p className="text-[10px] text-muted-foreground">Semantic structure & tone</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Review & Generate</p>
                    <p className="text-[10px] text-muted-foreground">Vector PPTX or DOCX</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tool Shortcuts */}
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Quick Shortcuts:</span>
              <Link
                to="/converter"
                className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] text-foreground hover:border-primary/40 transition-colors"
              >
                File Conversion (PDF ↔ DOCX)
              </Link>
              <Link
                to="/pdf-compressor"
                className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] text-foreground hover:border-primary/40 transition-colors"
              >
                Lossless Compression
              </Link>
              <Link
                to="/text-extractor"
                className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] text-foreground hover:border-primary/40 transition-colors"
              >
                Text Extractor
              </Link>
              <Link
                to="/templates"
                className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] text-foreground hover:border-primary/40 transition-colors"
              >
                50 Free Themes
              </Link>
            </div>
          </div>

          {/* Layered Paper Studio Composition */}
          <HeroPaperStudioComposition />
        </div>
      </div>
    </section>
  );
}

function HeroPaperStudioComposition() {
  const [selectedFormat, setSelectedFormat] = useState("DOCX");
  const [compressed, setCompressed] = useState(false);

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-6 duration-1000 lg:pl-4">
      {/* Background shadow layer */}
      <div className="absolute -inset-4 rounded-3xl bg-amber-900/5 blur-2xl pointer-events-none" />

      {/* Main Container Stage */}
      <div className="relative">
        {/* Layer 1: Main Beautiful Document Report Preview */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-lift transition-all">
          {/* Document Header Chrome */}
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Global_Energy_Transition_Report.pdf
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Formatted · 24 Pages · A4 Layout
                </p>
              </div>
            </div>
            <span className="rounded bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Polished Layout
            </span>
          </div>

          {/* Formatted Report Sheet Preview */}
          <div className="rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 p-5 font-sans space-y-3 shadow-inner">
            <div className="border-b border-stone-200 dark:border-stone-800 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-primary font-bold">
                Executive Synthesis // Q3 2026
              </span>
              <h3 className="font-serif text-lg font-bold text-foreground mt-0.5">
                Decarbonization Pathways Across European Manufacturing
              </h3>
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed">
              Industrial electrification accelerated by{" "}
              <span className="font-semibold text-primary">34%</span> over historical baselines.
              Unified policy mandates combined with localized thermal storage reduced peak fossil
              dependence.
            </p>

            {/* Micro visual data table & column breakdown */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border border-border bg-card p-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mb-1">
                  <span>Adoption Index</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+28.4%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[74%]" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mb-1">
                  <span>Carbon Offset</span>
                  <span className="text-primary font-bold">1.4 Mt</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full w-[62%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Panel A (Top-Right / Overlap): Conversion Selector */}
        <div className="mt-4 sm:mt-0 sm:absolute sm:-top-5 sm:-right-4 w-full sm:w-64 rounded-xl border border-border bg-card/95 p-3.5 shadow-lift backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" /> Convert Format
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">PDF →</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {["DOCX", "PPTX", "TXT"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => {
                  setSelectedFormat(fmt);
                  toast.success(`Target format: ${fmt}`, {
                    description: "Layout structure and vector tables mapped for export.",
                  });
                }}
                className={`py-1 rounded text-xs font-mono font-semibold transition-all ${
                  selectedFormat === fmt
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface-2 border border-border text-foreground hover:bg-muted"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Floating Panel B (Bottom-Left / Overlap): Compression Preview */}
        <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-6 sm:-left-5 w-full sm:w-72 rounded-xl border border-border bg-card/95 p-4 shadow-lift backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-emerald-600" /> Compression Optimizer
            </span>
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              {compressed ? "−45% Strong" : "−33% Balanced"}
            </span>
          </div>
          <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-muted-foreground">
              <span>Original File</span>
              <span>12 MB</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
              <span>Optimized Preview</span>
              <span>{compressed ? "6.6 MB" : "8.0 MB"}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: compressed ? "55%" : "67%" }}
              />
            </div>
          </div>
          <button
            onClick={() => setCompressed(!compressed)}
            className="mt-2.5 text-[10px] font-mono text-primary font-semibold hover:underline flex items-center gap-1"
          >
            <Sliders className="h-3 w-3" />
            Toggle mode: {compressed ? "Switch to Balanced" : "Switch to Strong"}
          </button>
        </div>

        {/* Floating Panel C (Bottom-Right / Overlap): Contextual Suggestion Card */}
        <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-8 sm:right-4 w-full sm:w-64 rounded-xl border border-primary/20 bg-primary/5 p-3 shadow-lift backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Presentation Recommendation
          </div>
          <p className="mt-1 text-[11px] text-foreground/80 leading-snug">
            “Recommended theme: Nordic Minimalist for technical clarity.”
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[9px] text-muted-foreground">50 Free Themes</span>
            <button
              onClick={() => {
                document
                  .getElementById("presentation-maker")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-[10px] font-bold text-primary hover:underline flex items-center"
            >
              Open Maker <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
